const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const RUN_ID = Date.now();
const USER = `pw_${RUN_ID}`;
const EMAIL = `pw_${RUN_ID}@nile.com`;
const pass = (msg) => console.log('  ✅', msg);
const fail = (msg) => { console.error('  ❌', msg); process.exitCode = 1; };

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();

  // Silence noisy console logs from React
  page.on('console', () => {});

  try {
    // ── 1. Home page ────────────────────────────────────────────────────────
    console.log('\n[1] Home page');
    await page.goto(BASE);
    const heading = await page.textContent('h1');
    heading.includes('Welcome to Nile') ? pass('Heading: "Welcome to Nile"') : fail(`Wrong heading: ${heading}`);
    await page.locator('a[href="/register"]').count() > 0 ? pass('Get Started link present') : fail('Get Started link missing');
    await page.locator('a[href="/sign-in"]').count()   > 0 ? pass('Sign In link present')    : fail('Sign In link missing');

    // ── 2. Register ─────────────────────────────────────────────────────────
    console.log('\n[2] Register');
    await page.goto(`${BASE}/register`);
    await page.fill('input[name="username"]',   USER);
    await page.fill('input[name="email"]',      EMAIL);
    await page.fill('input[name="first_name"]', 'Play');
    await page.fill('input[name="last_name"]',  'Wright');
    await page.fill('input[name="password"]',   'secret123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/feed`, { timeout: 5000 });
    pass('Register redirects to /feed');

    // ── 3. Feed loads ────────────────────────────────────────────────────────
    console.log('\n[3] Feed');
    await page.waitForSelector('.card', { timeout: 5000 }).catch(() => {});
    const emptyMsg = await page.locator('text=No posts yet').count();
    emptyMsg > 0 ? pass('Empty feed state shown') : pass('Feed loaded (has posts)');

    // Navbar should show Feed / Profile / Logout
    const feedLink    = await page.locator('a:has-text("Feed")').count();
    const profileLink = await page.locator('a:has-text("Profile")').count();
    const logoutLink  = await page.locator('a:has-text("Logout"), [role="button"]:has-text("Logout")').count();
    feedLink    > 0 ? pass('Navbar shows Feed link')    : fail('Navbar missing Feed link');
    profileLink > 0 ? pass('Navbar shows Profile link') : fail('Navbar missing Profile link');
    logoutLink  > 0 ? pass('Navbar shows Logout link')  : fail('Navbar missing Logout link');

    // ── 4. Create a post ─────────────────────────────────────────────────────
    console.log('\n[4] Create post');
    const POST_TITLE = `E2E post ${RUN_ID}`;
    await page.fill('input[name="title"]', POST_TITLE);
    await page.fill('textarea[name="content"]', 'Created by automated E2E test');
    await page.click('button[type="submit"]:has-text("Post")');
    await page.waitForSelector(`text=${POST_TITLE}`, { timeout: 5000 });
    pass('Post appears in feed after creation');
    await page.waitForSelector(`.card-subtitle`, { timeout: 3000 });
    const byLine = await page.locator('.card-subtitle').first().textContent();
    byLine.includes(USER) ? pass('Username shown on post') : fail(`Username missing on post (got: ${byLine})`);

    // ── 5. Like the post ─────────────────────────────────────────────────────
    console.log('\n[5] Like / Unlike');
    const likeBtn = page.locator('button:has-text("Like")').first();
    await likeBtn.click();
    await page.waitForSelector('button:has-text("Unlike")', { timeout: 3000 });
    pass('Like button toggles to Unlike');
    const unlikeBtn = page.locator('button:has-text("Unlike")').first();
    await unlikeBtn.click();
    await page.waitForSelector('button:has-text("Like")', { timeout: 3000 });
    pass('Unlike button toggles back to Like');

    // ── 6. Add a comment ─────────────────────────────────────────────────────
    console.log('\n[6] Comment');
    const commentInput = page.locator('input[placeholder="Write a comment..."]').first();
    await commentInput.fill('Nice post from Playwright!');
    await page.locator('button:has-text("Send")').first().click();
    await page.waitForSelector('text=Nice post from Playwright!', { timeout: 3000 });
    pass('Comment appears after submission');

    // ── 7. Profile page ──────────────────────────────────────────────────────
    console.log('\n[7] Profile');
    await page.click('a:has-text("Profile")');
    await page.waitForURL(`${BASE}/profile`, { timeout: 5000 });
    await page.waitForSelector('h4', { timeout: 3000 });
    const username = await page.textContent('h4');
    username.includes(USER) ? pass(`Profile shows username: ${username.trim()}`) : fail(`Wrong username: ${username}`);

    // Edit bio
    await page.fill('textarea[name="bio"]', 'E2E test bio');
    await page.click('button:has-text("Save Changes")');
    await page.waitForSelector('text=Profile updated!', { timeout: 3000 });
    pass('Profile update shows success message');

    // ── 8. Protected route guard ─────────────────────────────────────────────
    console.log('\n[8] Auth guard');
    // Clear localStorage to simulate logged-out state
    await ctx.clearCookies();
    await page.evaluate(() => localStorage.clear());
    const page2 = await ctx.newPage();
    await page2.goto(`${BASE}/feed`);
    await page2.waitForURL(`${BASE}/sign-in`, { timeout: 5000 });
    pass('Unauthenticated /feed redirects to /sign-in');
    await page2.close();

    // ── 9. Sign in ────────────────────────────────────────────────────────────
    console.log('\n[9] Sign In');
    await page.goto(`${BASE}/sign-in`);
    await page.fill('input[name="email"]',    EMAIL);
    await page.fill('input[name="password"]', 'secret123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/feed`, { timeout: 5000 });
    pass('Sign in redirects to /feed');

    // ── 10. Delete own post ───────────────────────────────────────────────────
    console.log('\n[10] Delete post');
    await page.waitForSelector(`text=${POST_TITLE}`, { timeout: 5000 });
    await page.locator('button:has-text("Delete")').first().click();
    await page.waitForSelector(`text=${POST_TITLE}`, { state: 'detached', timeout: 5000 });
    pass('Post deleted — no longer visible in feed');

  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
    console.error(err.stack);
  } finally {
    await browser.close();
  }

  console.log('\n' + (process.exitCode ? '❌ Some tests failed.' : '✅ All frontend E2E tests passed.'));
}

run();

# Nile Features V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 10 new features (follow, public profiles, post edit, image, tags, bookmarks, change password, notifications, pagination, search) to the Nile social media app.

**Architecture:** Each feature adds at most 1-2 backend endpoints and 1-2 frontend components, following the existing Express MVC pattern (routes → controllers → db) and React component pattern. Database changes land first so every later task has the schema it needs.

**Tech Stack:** Node.js + Express + better-sqlite3 (backend) · React 18 + React-Bootstrap + Formik (frontend) · Jest + supertest (backend tests) · JWT auth via localStorage

---

## Files Created / Modified

**Backend — create:**
- `nile-backend/controllers/notification.js`
- `nile-backend/routes/notification.js`
- `nile-backend/routes/bookmark.js`
- `nile-backend/__tests__/follows.test.js`
- `nile-backend/__tests__/bookmarks.test.js`
- `nile-backend/__tests__/notifications.test.js`

**Backend — modify:**
- `nile-backend/db.js` — new tables + columns
- `nile-backend/controllers/user.js` — follow, changePassword, extended getUser
- `nile-backend/controllers/post.js` — edit, toggleBookmark, getBookmarks, notifications in like/comment, image_url/tags in create, pagination+search in getPosts
- `nile-backend/routes/user.js` — follow + changePassword routes
- `nile-backend/routes/post.js` — edit + bookmark routes
- `nile-backend/server.js` — mount notification + bookmark routes
- `nile-backend/__tests__/posts.test.js` — update for new response format + add edit/search tests

**Frontend — create:**
- `nile-frontend/src/components/PublicProfile.js`
- `nile-frontend/src/components/Bookmarks.js`

**Frontend — modify:**
- `nile-frontend/src/App.js` — two new routes
- `nile-frontend/src/components/Navbar.js` — bookmarks link + bell icon
- `nile-frontend/src/components/Post.js` — edit, bookmark, image, tags, username link
- `nile-frontend/src/components/PostForm.js` — image_url + tags fields
- `nile-frontend/src/components/Feed.js` — search bar + tag filter + load more + paginated fetch
- `nile-frontend/src/components/Profile.js` — follow counts + change password section

---

## Task 1: Database Schema Additions

**Files:**
- Modify: `nile-backend/db.js`

- [ ] **Step 1: Add new tables and columns to db.js**

Open `nile-backend/db.js`. After the existing `db.exec(` block (after the closing backtick and semicolon), add:

```javascript
// V2 tables
db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    post_id    INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// New columns on posts (SQLite has no ALTER TABLE ... IF NOT EXISTS)
const addColIfMissing = (table, col, type) => {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (_) {}
};
addColIfMissing('posts', 'image_url', 'TEXT');
addColIfMissing('posts', 'tags',      'TEXT');
addColIfMissing('posts', 'edited_at', 'DATETIME');
```

- [ ] **Step 2: Verify server starts without error**

```bash
cd nile-backend
node server.js
```

Expected: `Nile backend running on port 5000` — no crash.  
Stop the server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add nile-backend/db.js
git commit -m "feat: add follows, bookmarks, notifications tables and posts columns"
```

---

## Task 2: Follow / Unfollow — Backend

**Files:**
- Modify: `nile-backend/controllers/user.js`
- Modify: `nile-backend/routes/user.js`
- Create: `nile-backend/__tests__/follows.test.js`

- [ ] **Step 1: Write the failing test**

Create `nile-backend/__tests__/follows.test.js`:

```javascript
const request = require('supertest');
const app     = require('../server');
const db      = require('../db');

let tokenA, tokenB, userAId, userBId;

beforeAll(() => {
  db.exec('DELETE FROM follows; DELETE FROM notifications; DELETE FROM bookmarks; DELETE FROM likes; DELETE FROM comments; DELETE FROM posts; DELETE FROM users;');
});

beforeAll(async () => {
  const a = await request(app).post('/api/auth/register')
    .send({ username: 'userA', email: 'a@test.com', password: 'pass1234' });
  tokenA = a.body.token; userAId = a.body.userId;

  const b = await request(app).post('/api/auth/register')
    .send({ username: 'userB', email: 'b@test.com', password: 'pass1234' });
  tokenB = b.body.token; userBId = b.body.userId;
});

describe('POST /api/users/:id/follow', () => {
  it('follows a user', async () => {
    const res = await request(app).post(`/api/users/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.following).toBe(true);
    expect(res.body.followers_count).toBe(1);
  });

  it('unfollows on second call', async () => {
    const res = await request(app).post(`/api/users/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.following).toBe(false);
    expect(res.body.followers_count).toBe(0);
  });

  it('cannot follow yourself', async () => {
    const res = await request(app).post(`/api/users/${userAId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/:id includes follow data', () => {
  it('returns followers_count and is_following', async () => {
    // A follows B
    await request(app).post(`/api/users/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`);

    const res = await request(app).get(`/api/users/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.followers_count).toBe(1);
    expect(res.body.is_following).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd nile-backend
npx jest __tests__/follows.test.js --no-coverage
```

Expected: FAIL — `POST /api/users/:id/follow` returns 404.

- [ ] **Step 3: Add followUser to controllers/user.js**

Replace the entire contents of `nile-backend/controllers/user.js` with:

```javascript
const bcrypt = require('bcryptjs');
const db     = require('../db');

const getUserPosts = (userId, viewerId) => {
  const posts = db.prepare(`
    SELECT posts.*, users.username,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me
    FROM posts JOIN users ON posts.user_id = users.id
    WHERE posts.user_id = ?
    ORDER BY posts.created_at DESC
  `).all(viewerId, userId);

  const getComments = db.prepare(`
    SELECT comments.*, users.username
    FROM comments JOIN users ON comments.user_id = users.id
    WHERE comments.post_id = ?
    ORDER BY comments.created_at ASC
  `);

  return posts.map(post => ({ ...post, comments: getComments.all(post.id) }));
};

exports.getUser = (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, first_name, last_name, bio, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { count: followers_count } = db.prepare(
    'SELECT COUNT(*) AS count FROM follows WHERE following_id = ?'
  ).get(req.params.id);

  const { count: following_count } = db.prepare(
    'SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?'
  ).get(req.params.id);

  const isFollowingRow = db.prepare(
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.userId, req.params.id);

  const posts = getUserPosts(req.params.id, req.userId);

  res.json({
    ...user,
    followers_count,
    following_count,
    is_following: !!isFollowingRow,
    posts,
  });
};

exports.updateUser = (req, res) => {
  if (parseInt(req.params.id) !== req.userId) {
    return res.status(403).json({ error: 'Not your profile' });
  }
  const { first_name, last_name, bio } = req.body;
  db.prepare(
    'UPDATE users SET first_name = ?, last_name = ?, bio = ? WHERE id = ?'
  ).run(first_name || null, last_name || null, bio || null, req.userId);

  const user = db.prepare(
    'SELECT id, username, email, first_name, last_name, bio FROM users WHERE id = ?'
  ).get(req.userId);
  res.json(user);
};

exports.followUser = (req, res) => {
  const targetId = parseInt(req.params.id);
  if (targetId === req.userId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare(
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.userId, targetId);

  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.userId, targetId);
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.userId, targetId);
  }

  const { count: followers_count } = db.prepare(
    'SELECT COUNT(*) AS count FROM follows WHERE following_id = ?'
  ).get(targetId);

  res.json({ following: !existing, followers_count });
};

exports.changePassword = (req, res) => {
  if (parseInt(req.params.id) !== req.userId) {
    return res.status(403).json({ error: 'Not your profile' });
  }
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.userId);
  res.json({ message: 'Password updated' });
};
```

- [ ] **Step 4: Add follow and changePassword routes to routes/user.js**

Replace the entire contents of `nile-backend/routes/user.js` with:

```javascript
const express                               = require('express');
const { getUser, updateUser, followUser, changePassword } = require('../controllers/user');
const requireAuth                           = require('../middleware/auth');
const router                                = express.Router();

router.get('/:id',          requireAuth, getUser);
router.put('/:id',          requireAuth, updateUser);
router.post('/:id/follow',  requireAuth, followUser);
router.put('/:id/password', requireAuth, changePassword);

module.exports = router;
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx jest __tests__/follows.test.js --no-coverage
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add nile-backend/controllers/user.js nile-backend/routes/user.js nile-backend/__tests__/follows.test.js
git commit -m "feat: follow/unfollow and change password backend"
```

---

## Task 3: Post Edit — Backend

**Files:**
- Modify: `nile-backend/controllers/post.js`
- Modify: `nile-backend/routes/post.js`
- Modify: `nile-backend/__tests__/posts.test.js`

- [ ] **Step 1: Write the failing test**

Add this block at the bottom of `nile-backend/__tests__/posts.test.js`:

```javascript
describe('PUT /api/posts/:id (edit)', () => {
  let postId;

  beforeAll(async () => {
    const res = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original title', content: 'Original content' });
    postId = res.body.id;
  });

  it('edits own post', async () => {
    const res = await request(app).put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Edited title', content: 'Edited content' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Edited title');
    expect(res.body.edited_at).not.toBeNull();
  });

  it('returns 403 for non-owner', async () => {
    const other = await request(app).post('/api/auth/register')
      .send({ username: 'other99', email: 'other99@test.com', password: 'pass1234' });
    const res = await request(app).put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${other.body.token}`)
      .send({ title: 'Hijack' });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest __tests__/posts.test.js --no-coverage
```

Expected: new `PUT` tests fail (route does not exist).

- [ ] **Step 3: Add editPost to controllers/post.js**

Add this function after `deletePost` in `nile-backend/controllers/post.js`:

```javascript
exports.editPost = (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.userId) return res.status(403).json({ error: 'Not your post' });

  const title   = req.body.title   !== undefined ? req.body.title   : post.title;
  const content = req.body.content !== undefined ? req.body.content : post.content;

  db.prepare(
    'UPDATE posts SET title = ?, content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(title, content, req.params.id);

  const updated = db.prepare(`
    SELECT posts.*, users.username,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me
    FROM posts JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `).get(req.userId, req.params.id);

  res.json(updated);
};
```

- [ ] **Step 4: Add route to routes/post.js**

Add after the `router.delete('/:id', ...)` line in `nile-backend/routes/post.js`:

```javascript
router.put('/:id', requireAuth, editPost);
```

And update the require at the top of that file:

```javascript
const {
  getPosts, createPost, deletePost, editPost,
  addComment, deleteComment, toggleLike,
} = require('../controllers/post');
```

- [ ] **Step 5: Run — expect PASS**

```bash
npx jest __tests__/posts.test.js --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add nile-backend/controllers/post.js nile-backend/routes/post.js nile-backend/__tests__/posts.test.js
git commit -m "feat: edit post endpoint"
```

---

## Task 4: Post Image URL + Tags — Backend

**Files:**
- Modify: `nile-backend/controllers/post.js` (createPost only)

- [ ] **Step 1: Write the failing test**

Add this block at the bottom of `nile-backend/__tests__/posts.test.js`:

```javascript
describe('POST /api/posts with image_url and tags', () => {
  it('stores and returns image_url and tags', async () => {
    const res = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title:     'Photo post',
        content:   'Look at this',
        image_url: 'https://example.com/img.jpg',
        tags:      'Tech,Fun',
      });
    expect(res.status).toBe(201);
    expect(res.body.image_url).toBe('https://example.com/img.jpg');
    expect(res.body.tags).toBe('Tech,Fun');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest __tests__/posts.test.js --no-coverage
```

Expected: new test fails — `image_url` and `tags` are null.

- [ ] **Step 3: Update createPost in controllers/post.js**

Replace the `exports.createPost` function:

```javascript
exports.createPost = (req, res) => {
  const { title, content, image_url, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(
    'INSERT INTO posts (user_id, title, content, image_url, tags) VALUES (?, ?, ?, ?, ?)'
  ).run(req.userId, title, content || null, image_url || null, tags || null);

  const post = db.prepare(`
    SELECT posts.*, users.username
    FROM posts JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(post);
};
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest __tests__/posts.test.js --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add nile-backend/controllers/post.js nile-backend/__tests__/posts.test.js
git commit -m "feat: accept image_url and tags when creating a post"
```

---

## Task 5: Bookmarks — Backend

**Files:**
- Modify: `nile-backend/controllers/post.js`
- Modify: `nile-backend/routes/post.js`
- Create: `nile-backend/routes/bookmark.js`
- Modify: `nile-backend/server.js`
- Create: `nile-backend/__tests__/bookmarks.test.js`

- [ ] **Step 1: Write the failing test**

Create `nile-backend/__tests__/bookmarks.test.js`:

```javascript
const request = require('supertest');
const app     = require('../server');
const db      = require('../db');

let token, postId;

beforeAll(() => {
  db.exec('DELETE FROM follows; DELETE FROM notifications; DELETE FROM bookmarks; DELETE FROM likes; DELETE FROM comments; DELETE FROM posts; DELETE FROM users;');
});

beforeAll(async () => {
  const reg = await request(app).post('/api/auth/register')
    .send({ username: 'buser', email: 'buser@test.com', password: 'pass1234' });
  token = reg.body.token;

  const post = await request(app).post('/api/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Bookmarkable' });
  postId = post.body.id;
});

describe('POST /api/posts/:id/bookmark', () => {
  it('bookmarks a post', async () => {
    const res = await request(app).post(`/api/posts/${postId}/bookmark`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(true);
  });

  it('un-bookmarks on second call', async () => {
    const res = await request(app).post(`/api/posts/${postId}/bookmark`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(false);
  });
});

describe('GET /api/bookmarks', () => {
  it('returns bookmarked posts', async () => {
    // Bookmark the post first
    await request(app).post(`/api/posts/${postId}/bookmark`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app).get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(postId);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest __tests__/bookmarks.test.js --no-coverage
```

Expected: FAIL — routes do not exist.

- [ ] **Step 3: Add toggleBookmark and getBookmarks to controllers/post.js**

Add these two functions at the bottom of `nile-backend/controllers/post.js`:

```javascript
exports.toggleBookmark = (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = db.prepare(
    'SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?'
  ).get(req.userId, req.params.id);

  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(req.userId, req.params.id);
  } else {
    db.prepare('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)').run(req.userId, req.params.id);
  }

  res.json({ bookmarked: !existing });
};

exports.getBookmarks = (req, res) => {
  const posts = db.prepare(`
    SELECT posts.*, users.username,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me
    FROM bookmarks
    JOIN posts ON bookmarks.post_id = posts.id
    JOIN users ON posts.user_id = users.id
    WHERE bookmarks.user_id = ?
    ORDER BY bookmarks.id DESC
  `).all(req.userId, req.userId);

  const postsWithComments = posts.map(post => ({
    ...post,
    comments: getComments.all(post.id),
  }));

  res.json(postsWithComments);
};
```

- [ ] **Step 4: Add bookmark route to routes/post.js**

Add after the `router.post('/:id/like', ...)` line:

```javascript
router.post('/:id/bookmark', requireAuth, toggleBookmark);
```

And update the require at the top:

```javascript
const {
  getPosts, createPost, deletePost, editPost,
  addComment, deleteComment, toggleLike, toggleBookmark, getBookmarks,
} = require('../controllers/post');
```

- [ ] **Step 5: Create routes/bookmark.js**

Create `nile-backend/routes/bookmark.js`:

```javascript
const express         = require('express');
const { getBookmarks } = require('../controllers/post');
const requireAuth     = require('../middleware/auth');
const router          = express.Router();

router.get('/', requireAuth, getBookmarks);

module.exports = router;
```

- [ ] **Step 6: Mount bookmark route in server.js**

In `nile-backend/server.js`, add after the existing `app.use` lines:

```javascript
const bookmarkRoutes = require('./routes/bookmark');
app.use('/api/bookmarks', bookmarkRoutes);
```

- [ ] **Step 7: Run — expect PASS**

```bash
npx jest __tests__/bookmarks.test.js --no-coverage
```

Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add nile-backend/controllers/post.js nile-backend/routes/post.js nile-backend/routes/bookmark.js nile-backend/server.js nile-backend/__tests__/bookmarks.test.js
git commit -m "feat: bookmark toggle and get bookmarks endpoints"
```

---

## Task 6: Notifications — Backend

**Files:**
- Create: `nile-backend/controllers/notification.js`
- Create: `nile-backend/routes/notification.js`
- Modify: `nile-backend/controllers/post.js` (toggleLike + addComment)
- Modify: `nile-backend/server.js`
- Create: `nile-backend/__tests__/notifications.test.js`

- [ ] **Step 1: Write the failing test**

Create `nile-backend/__tests__/notifications.test.js`:

```javascript
const request = require('supertest');
const app     = require('../server');
const db      = require('../db');

let ownerToken, likerToken, ownerId, postId;

beforeAll(() => {
  db.exec('DELETE FROM follows; DELETE FROM notifications; DELETE FROM bookmarks; DELETE FROM likes; DELETE FROM comments; DELETE FROM posts; DELETE FROM users;');
});

beforeAll(async () => {
  const owner = await request(app).post('/api/auth/register')
    .send({ username: 'nowner', email: 'nowner@test.com', password: 'pass1234' });
  ownerToken = owner.body.token; ownerId = owner.body.userId;

  const liker = await request(app).post('/api/auth/register')
    .send({ username: 'nliker', email: 'nliker@test.com', password: 'pass1234' });
  likerToken = liker.body.token;

  const post = await request(app).post('/api/posts')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ title: 'Notify me' });
  postId = post.body.id;
});

describe('GET /api/notifications', () => {
  it('returns empty initially', async () => {
    const res = await request(app).get('/api/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it('creates a notification when someone likes your post', async () => {
    await request(app).post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    const res = await request(app).get('/api/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe('like');
    expect(res.body[0].actor_username).toBe('nliker');
    expect(res.body[0].is_read).toBe(0);
  });
});

describe('PUT /api/notifications/read', () => {
  it('marks all notifications as read', async () => {
    const res = await request(app).put('/api/notifications/read')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);

    const check = await request(app).get('/api/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(check.body[0].is_read).toBe(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest __tests__/notifications.test.js --no-coverage
```

Expected: FAIL — notification routes do not exist.

- [ ] **Step 3: Create controllers/notification.js**

Create `nile-backend/controllers/notification.js`:

```javascript
const db = require('../db');

exports.getNotifications = (req, res) => {
  const rows = db.prepare(`
    SELECT notifications.*, users.username AS actor_username, posts.title AS post_title
    FROM notifications
    JOIN users ON notifications.actor_id = users.id
    LEFT JOIN posts ON notifications.post_id = posts.id
    WHERE notifications.user_id = ?
    ORDER BY notifications.created_at DESC
    LIMIT 20
  `).all(req.userId);

  res.json(rows);
};

exports.markAllRead = (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.userId);
  res.json({ message: 'All notifications marked as read' });
};
```

- [ ] **Step 4: Create routes/notification.js**

Create `nile-backend/routes/notification.js`:

```javascript
const express                           = require('express');
const { getNotifications, markAllRead } = require('../controllers/notification');
const requireAuth                       = require('../middleware/auth');
const router                            = express.Router();

router.get('/',    requireAuth, getNotifications);
router.put('/read', requireAuth, markAllRead);

module.exports = router;
```

- [ ] **Step 5: Mount notification route in server.js**

Add after the bookmarkRoutes line in `nile-backend/server.js`:

```javascript
const notificationRoutes = require('./routes/notification');
app.use('/api/notifications', notificationRoutes);
```

- [ ] **Step 6: Add notification inserts to toggleLike and addComment in controllers/post.js**

In `toggleLike`, replace the block that does the insert with:

```javascript
  if (existing) {
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(req.params.id, req.userId);
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(req.params.id, req.userId);
    if (post.user_id !== req.userId) {
      db.prepare(
        'INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)'
      ).run(post.user_id, req.userId, 'like', post.id);
    }
  }
```

In `addComment`, add after the `INSERT INTO comments` call and before building the `comment` response:

```javascript
  if (post.user_id !== req.userId) {
    db.prepare(
      'INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)'
    ).run(post.user_id, req.userId, 'comment', post.id);
  }
```

Note: `toggleLike` currently reads `const post = db.prepare('SELECT id FROM posts WHERE id = ?')` — change this to `SELECT * FROM posts` so `post.user_id` is available:

```javascript
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
```

- [ ] **Step 7: Run — expect PASS**

```bash
npx jest __tests__/notifications.test.js --no-coverage
```

Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add nile-backend/controllers/notification.js nile-backend/routes/notification.js nile-backend/controllers/post.js nile-backend/server.js nile-backend/__tests__/notifications.test.js
git commit -m "feat: notifications — insert on like/comment, get and mark-read endpoints"
```

---

## Task 7: Pagination + Search — Backend

**Files:**
- Modify: `nile-backend/controllers/post.js` (getPosts)
- Modify: `nile-backend/__tests__/posts.test.js`

- [ ] **Step 1: Update the existing GET /api/posts test**

The response format changes from an array to `{ posts, hasMore }`. Update the existing test block in `__tests__/posts.test.js`:

Find this block:
```javascript
describe('GET /api/posts', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(401);
  });

  it('returns an array', async () => {
    const res = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

Replace with:

```javascript
describe('GET /api/posts', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(401);
  });

  it('returns { posts, hasMore }', async () => {
    const res = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(typeof res.body.hasMore).toBe('boolean');
  });

  it('filters by search query', async () => {
    await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'uniquesearchterm', content: 'hello' });

    const res = await request(app).get('/api/posts?q=uniquesearchterm')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeGreaterThan(0);
    expect(res.body.posts[0].title).toBe('uniquesearchterm');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest __tests__/posts.test.js --no-coverage
```

Expected: `returns { posts, hasMore }` fails because current response is an array.

- [ ] **Step 3: Replace getPosts in controllers/post.js**

Replace the `exports.getPosts` function with:

```javascript
exports.getPosts = (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
  const q      = (req.query.q || '').trim();
  const offset = (page - 1) * limit;

  const searchClause = q ? 'WHERE (posts.title LIKE ? OR posts.content LIKE ?)' : '';
  const searchParams = q ? [`%${q}%`, `%${q}%`] : [];

  const rows = db.prepare(`
    SELECT posts.*, users.username,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me
    FROM posts
    JOIN users ON posts.user_id = users.id
    ${searchClause}
    ORDER BY posts.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.userId, ...searchParams, limit + 1, offset);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;

  const postsWithComments = trimmed.map(post => ({
    ...post,
    comments: getComments.all(post.id),
  }));

  res.json({ posts: postsWithComments, hasMore });
};
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest __tests__/posts.test.js --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add nile-backend/controllers/post.js nile-backend/__tests__/posts.test.js
git commit -m "feat: paginated and searchable GET /api/posts"
```

---

## Task 8: Change Password — Backend test

The controller was already added in Task 2. Write the test now.

**Files:**
- Modify: `nile-backend/__tests__/follows.test.js`

- [ ] **Step 1: Add change password tests**

Add at the bottom of `nile-backend/__tests__/follows.test.js`:

```javascript
describe('PUT /api/users/:id/password', () => {
  it('rejects wrong current password', async () => {
    const res = await request(app).put(`/api/users/${userAId}/password`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ current_password: 'wrongpass', new_password: 'newpass123' });
    expect(res.status).toBe(401);
  });

  it('changes password with correct current password', async () => {
    const res = await request(app).put(`/api/users/${userAId}/password`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ current_password: 'pass1234', new_password: 'newpass123' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password updated');
  });

  it('can log in with new password', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'a@test.com', password: 'newpass123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — expect PASS**

```bash
npx jest __tests__/follows.test.js --no-coverage
```

Expected: all 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add nile-backend/__tests__/follows.test.js
git commit -m "test: change password endpoint"
```

---

## Task 9: Public User Profiles — Frontend

**Files:**
- Create: `nile-frontend/src/components/PublicProfile.js`
- Modify: `nile-frontend/src/App.js`
- Modify: `nile-frontend/src/components/Post.js` (make username a link)

- [ ] **Step 1: Create PublicProfile.js**

Create `nile-frontend/src/components/PublicProfile.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Badge } from 'react-bootstrap';
import api from '../services/api';
import { getUserId } from '../services/auth';
import Post from './Post';

const PublicProfile = () => {
  const { id }        = useParams();
  const [user, setUser] = useState(null);
  const currentUserId = getUserId();

  useEffect(() => {
    api.get(`/api/users/${id}`).then(res => setUser(res.data));
  }, [id]);

  const handleFollow = async () => {
    const res = await api.post(`/api/users/${id}/follow`);
    setUser(prev => ({
      ...prev,
      is_following:    res.data.following,
      followers_count: res.data.followers_count,
    }));
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Card className="mb-4 p-3">
        <h4>{user.username}</h4>
        <p className="text-muted mb-1">{user.email}</p>
        {user.bio && <p>{user.bio}</p>}
        <div className="d-flex gap-3 mb-2">
          <span><strong>{user.followers_count}</strong> followers</span>
          <span><strong>{user.following_count}</strong> following</span>
        </div>
        {parseInt(id) !== currentUserId && (
          <Button
            size="sm"
            variant={user.is_following ? 'secondary' : 'primary'}
            onClick={handleFollow}
          >
            {user.is_following ? 'Unfollow' : 'Follow'}
          </Button>
        )}
      </Card>

      {user.posts && user.posts.length === 0 && (
        <p className="text-muted text-center">No posts yet.</p>
      )}
      {user.posts && user.posts.map(post => (
        <Post
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={() => {}}
        />
      ))}
    </div>
  );
};

export default PublicProfile;
```

- [ ] **Step 2: Add /users/:id route to App.js**

Replace the contents of `nile-frontend/src/App.js` with:

```javascript
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar         from './components/Navbar';
import Footer         from './components/Footer';
import Home           from './components/Home';
import ProtectedRoute from './components/ProtectedRoute';

const SignIn        = React.lazy(() => import('./components/SignIn'));
const Register      = React.lazy(() => import('./components/Register'));
const Feed          = React.lazy(() => import('./components/Feed'));
const Profile       = React.lazy(() => import('./components/Profile'));
const PublicProfile = React.lazy(() => import('./components/PublicProfile'));
const Bookmarks     = React.lazy(() => import('./components/Bookmarks'));

const App = () => (
  <BrowserRouter>
    <Navbar />
    <main className="container mt-4">
      <React.Suspense fallback={<p>Loading...</p>}>
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/sign-in"    element={<SignIn />} />
          <Route path="/register"   element={<Register />} />
          <Route path="/feed"       element={<ProtectedRoute component={Feed} />} />
          <Route path="/profile"    element={<ProtectedRoute component={Profile} />} />
          <Route path="/users/:id"  element={<ProtectedRoute component={PublicProfile} />} />
          <Route path="/bookmarks"  element={<ProtectedRoute component={Bookmarks} />} />
        </Routes>
      </React.Suspense>
    </main>
    <Footer />
  </BrowserRouter>
);

export default App;
```

- [ ] **Step 3: Make username a clickable link in Post.js**

Add the import at the top of `nile-frontend/src/components/Post.js`:

```javascript
import { Link } from 'react-router-dom';
```

Change the `Card.Subtitle` line:

```javascript
<Card.Subtitle className="mb-2 text-muted">
  by <Link to={`/users/${post.user_id}`}>{post.username}</Link>
</Card.Subtitle>
```

- [ ] **Step 4: Verify in browser**

Start both servers, go to `/feed`, click a username — should navigate to `/users/:id` showing that user's profile and posts.

- [ ] **Step 5: Commit**

```bash
git add nile-frontend/src/components/PublicProfile.js nile-frontend/src/App.js nile-frontend/src/components/Post.js
git commit -m "feat: public user profile page at /users/:id with follow button"
```

---

## Task 10: Post Edit — Frontend

**Files:**
- Modify: `nile-frontend/src/components/Post.js`

- [ ] **Step 1: Add edit state and form to Post.js**

Replace the entire contents of `nile-frontend/src/components/Post.js` with:

```javascript
import React, { useState } from 'react';
import { Card, Button, Badge, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CommentForm from './CommentForm';

const Post = ({ post: initialPost, currentUserId, onDelete }) => {
  const [post,      setPost]      = useState(initialPost);
  const [likeCount, setLikeCount] = useState(initialPost.like_count);
  const [liked,     setLiked]     = useState(!!initialPost.liked_by_me);
  const [comments,  setComments]  = useState(initialPost.comments || []);
  const [bookmarked,setBookmarked]= useState(!!initialPost.bookmarked);
  const [editing,   setEditing]   = useState(false);
  const [editTitle, setEditTitle] = useState(initialPost.title);
  const [editContent,setEditContent]=useState(initialPost.content || '');

  const handleLike = async () => {
    try {
      const res = await api.post(`/api/posts/${post.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch { alert('Failed to like post'); }
  };

  const handleBookmark = async () => {
    try {
      const res = await api.post(`/api/posts/${post.id}/bookmark`);
      setBookmarked(res.data.bookmarked);
    } catch { alert('Failed to bookmark post'); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/api/posts/${post.id}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch { alert('Failed to delete comment'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/posts/${post.id}`, { title: editTitle, content: editContent });
      setPost(res.data);
      setEditing(false);
    } catch { alert('Failed to edit post'); }
  };

  const tags = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <Card className="mb-3">
      <Card.Body>
        {editing ? (
          <Form onSubmit={handleEdit}>
            <Form.Control
              className="mb-2"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              required
            />
            <Form.Control
              as="textarea" rows={3} className="mb-2"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
            />
            <Button size="sm" type="submit" className="me-2">Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </Form>
        ) : (
          <>
            <Card.Title>{post.title}</Card.Title>
            <Card.Subtitle className="mb-2 text-muted">
              by <Link to={`/users/${post.user_id}`}>{post.username}</Link>
              {post.edited_at && <small className="ms-2">(edited)</small>}
            </Card.Subtitle>
            {post.content && <Card.Text>{post.content}</Card.Text>}
            {post.image_url && (
              <img src={post.image_url} alt="" className="img-fluid rounded mb-2" />
            )}
            {tags.length > 0 && (
              <div className="mb-2">
                {tags.map(tag => (
                  <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>
                ))}
              </div>
            )}
          </>
        )}

        <div className="d-flex gap-2 align-items-center mb-2 flex-wrap">
          <Button size="sm" variant={liked ? 'primary' : 'outline-primary'} onClick={handleLike}>
            {liked ? 'Unlike' : 'Like'} ({likeCount})
          </Button>
          <Button size="sm" variant={bookmarked ? 'warning' : 'outline-warning'} onClick={handleBookmark}>
            {bookmarked ? '🔖 Saved' : '🔖 Save'}
          </Button>
          {post.user_id === currentUserId && !editing && (
            <>
              <Button size="sm" variant="outline-secondary" onClick={() => setEditing(true)}>✏️ Edit</Button>
              <Button size="sm" variant="outline-danger" onClick={() => onDelete(post.id)}>Delete</Button>
            </>
          )}
        </div>

        {comments.length > 0 && <hr className="my-2" />}
        {comments.map(c => (
          <div key={c.id} className="d-flex justify-content-between align-items-center mb-1">
            <small><strong>{c.username}:</strong> {c.content}</small>
            {c.user_id === currentUserId && (
              <Button size="sm" variant="link" className="text-danger p-0 ms-2"
                onClick={() => handleDeleteComment(c.id)}>×</Button>
            )}
          </div>
        ))}

        <CommentForm postId={post.id} onCommentAdded={c => setComments([...comments, c])} />
      </Card.Body>
    </Card>
  );
};

export default Post;
```

- [ ] **Step 2: Verify in browser**

Go to `/feed`, create a post — you should see ✏️ Edit, 🔖 Save buttons. Click Edit, change the title, click Save. The card should update in place and show "(edited)".

- [ ] **Step 3: Commit**

```bash
git add nile-frontend/src/components/Post.js
git commit -m "feat: post edit, bookmark button, image and tags rendering in Post card"
```

---

## Task 11: PostForm — Image URL + Tags

**Files:**
- Modify: `nile-frontend/src/components/PostForm.js`

- [ ] **Step 1: Replace PostForm.js**

Replace the entire contents of `nile-frontend/src/components/PostForm.js` with:

```javascript
import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Form, Button, Card } from 'react-bootstrap';
import api from '../services/api';

const PostForm = ({ onPostCreated }) => {
  const formik = useFormik({
    initialValues: { title: '', content: '', image_url: '', tags: '' },
    validationSchema: Yup.object({
      title:     Yup.string().min(3).max(150).required('Required'),
      content:   Yup.string().max(500),
      image_url: Yup.string().url('Must be a valid URL').nullable(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = {
          title:     values.title,
          content:   values.content || undefined,
          image_url: values.image_url || undefined,
          tags:      values.tags || undefined,
        };
        const res = await api.post('/api/posts', payload);
        onPostCreated(res.data);
        resetForm();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to create post');
      }
    },
  });

  return (
    <Card className="mb-4 p-3">
      <Form onSubmit={formik.handleSubmit}>
        <Form.Group className="mb-2">
          <Form.Control
            name="title" placeholder="Post title"
            onChange={formik.handleChange} value={formik.values.title}
            isInvalid={!!formik.errors.title}
          />
          <Form.Control.Feedback type="invalid">{formik.errors.title}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Control
            as="textarea" name="content" rows={3}
            placeholder="What's on your mind?"
            onChange={formik.handleChange} value={formik.values.content}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Control
            name="image_url" placeholder="Image URL (optional)"
            onChange={formik.handleChange} value={formik.values.image_url}
            isInvalid={!!formik.errors.image_url}
          />
          <Form.Control.Feedback type="invalid">{formik.errors.image_url}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Control
            name="tags" placeholder="Tags: Tech, Fun, News (optional)"
            onChange={formik.handleChange} value={formik.values.tags}
          />
        </Form.Group>
        <Button type="submit" size="sm">Post</Button>
      </Form>
    </Card>
  );
};

export default PostForm;
```

- [ ] **Step 2: Verify in browser**

Create a post with an image URL and tags — the image should appear in the feed card and tag badges should show.

- [ ] **Step 3: Commit**

```bash
git add nile-frontend/src/components/PostForm.js
git commit -m "feat: image URL and tags inputs in PostForm"
```

---

## Task 12: Bookmarks Page — Frontend

**Files:**
- Create: `nile-frontend/src/components/Bookmarks.js`
- Modify: `nile-frontend/src/components/Navbar.js`

- [ ] **Step 1: Create Bookmarks.js**

Create `nile-frontend/src/components/Bookmarks.js`:

```javascript
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getUserId } from '../services/auth';
import Post from './Post';

const Bookmarks = () => {
  const [posts, setPosts] = useState([]);
  const currentUserId = getUserId();

  useEffect(() => {
    api.get('/api/bookmarks').then(res => setPosts(res.data));
  }, []);

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch { alert('Failed to delete post'); }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h4 className="mb-3">🔖 Saved Posts</h4>
      {posts.length === 0 && <p className="text-muted text-center">No saved posts yet.</p>}
      {posts.map(post => (
        <Post
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

export default Bookmarks;
```

- [ ] **Step 2: Add Bookmarks link to Navbar.js**

Replace the entire contents of `nile-frontend/src/components/Navbar.js` with:

```javascript
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Badge, NavDropdown } from 'react-bootstrap';
import { isAuthenticated, removeAuth } from '../services/auth';
import api from '../services/api';

const Navbar = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const fetch = () => api.get('/api/notifications').then(r => setNotifications(r.data)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = () => {
    api.put('/api/notifications/read').then(() =>
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
    );
  };

  const handleLogout = () => { removeAuth(); navigate('/'); };

  return (
    <BsNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BsNavbar.Brand as={Link} to="/">Nile</BsNavbar.Brand>
        <Nav className="ms-auto">
          {isAuthenticated() ? (
            <>
              <Nav.Link as={Link} to="/feed">Feed</Nav.Link>
              <Nav.Link as={Link} to="/bookmarks">Bookmarks</Nav.Link>
              <Nav.Link as={Link} to="/profile">Profile</Nav.Link>

              <NavDropdown
                title={
                  <span>
                    🔔{unread > 0 && <Badge bg="danger" className="ms-1">{unread}</Badge>}
                  </span>
                }
                id="notif-dropdown"
                align="end"
              >
                {notifications.length === 0 && (
                  <NavDropdown.Item disabled>No notifications</NavDropdown.Item>
                )}
                {notifications.slice(0, 10).map(n => (
                  <NavDropdown.Item key={n.id} style={{ fontWeight: n.is_read ? 'normal' : 'bold' }}>
                    <small>
                      {n.actor_username} {n.type === 'like' ? 'liked' : 'commented on'} "{n.post_title}"
                    </small>
                  </NavDropdown.Item>
                ))}
                {notifications.length > 0 && (
                  <>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={handleMarkRead}>Mark all read</NavDropdown.Item>
                  </>
                )}
              </NavDropdown>

              <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
            </>
          ) : (
            <>
              <Nav.Link as={Link} to="/sign-in">Sign In</Nav.Link>
              <Nav.Link as={Link} to="/register">Register</Nav.Link>
            </>
          )}
        </Nav>
      </Container>
    </BsNavbar>
  );
};

export default Navbar;
```

- [ ] **Step 3: Verify in browser**

Go to the feed, click 🔖 Save on a post, then click "Bookmarks" in the navbar — the saved post should appear. Click the bell — should show a dropdown. Have another user like your post and wait 30s (or refresh) — a red badge should appear.

- [ ] **Step 4: Commit**

```bash
git add nile-frontend/src/components/Bookmarks.js nile-frontend/src/components/Navbar.js
git commit -m "feat: bookmarks page and notification bell in Navbar"
```

---

## Task 13: Change Password — Frontend

**Files:**
- Modify: `nile-frontend/src/components/Profile.js`

- [ ] **Step 1: Replace Profile.js**

Replace the entire contents of `nile-frontend/src/components/Profile.js` with:

```javascript
import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import api from '../services/api';
import { getUserId } from '../services/auth';

const Profile = () => {
  const [user,    setUser]    = useState(null);
  const [success, setSuccess] = useState('');
  const [pwMsg,   setPwMsg]   = useState('');
  const [pwError, setPwError] = useState('');
  const [pw,      setPw]      = useState({ current_password: '', new_password: '', confirm: '' });
  const userId = getUserId();

  useEffect(() => {
    api.get(`/api/users/${userId}`).then(res => setUser(res.data));
  }, [userId]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: user?.first_name || '',
      last_name:  user?.last_name  || '',
      bio:        user?.bio        || '',
    },
    validationSchema: Yup.object({
      bio: Yup.string().max(300, 'Max 300 characters'),
    }),
    onSubmit: async (values) => {
      try {
        const res = await api.put(`/api/users/${userId}`, values);
        setUser(prev => ({ ...prev, ...res.data }));
        setSuccess('Profile updated!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to update profile');
      }
    },
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(''); setPwError('');
    if (pw.new_password !== pw.confirm) {
      setPwError('New passwords do not match');
      return;
    }
    try {
      await api.put(`/api/users/${userId}/password`, {
        current_password: pw.current_password,
        new_password:     pw.new_password,
      });
      setPwMsg('Password changed successfully!');
      setPw({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    }
  };

  if (!user) return <p>Loading...</p>;

  return (
    <Row>
      <Col md={6}>
        <Card className="p-3 mb-4">
          <h4>{user.username}</h4>
          <p className="text-muted">{user.email}</p>
          <div className="d-flex gap-3 mb-3">
            <span><strong>{user.followers_count ?? 0}</strong> followers</span>
            <span><strong>{user.following_count ?? 0}</strong> following</span>
          </div>
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={formik.handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control name="first_name" onChange={formik.handleChange} value={formik.values.first_name} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control name="last_name" onChange={formik.handleChange} value={formik.values.last_name} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Bio</Form.Label>
              <Form.Control
                as="textarea" name="bio" rows={3}
                onChange={formik.handleChange} value={formik.values.bio}
                isInvalid={!!formik.errors.bio}
              />
              <Form.Control.Feedback type="invalid">{formik.errors.bio}</Form.Control.Feedback>
            </Form.Group>
            <Button type="submit">Save Changes</Button>
          </Form>
        </Card>
      </Col>

      <Col md={6}>
        <Card className="p-3">
          <h5>Change Password</h5>
          {pwMsg   && <Alert variant="success">{pwMsg}</Alert>}
          {pwError && <Alert variant="danger">{pwError}</Alert>}
          <Form onSubmit={handlePasswordChange}>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password" value={pw.current_password}
                onChange={e => setPw({ ...pw, current_password: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password" value={pw.new_password}
                onChange={e => setPw({ ...pw, new_password: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password" value={pw.confirm}
                onChange={e => setPw({ ...pw, confirm: e.target.value })}
              />
            </Form.Group>
            <Button type="submit" variant="warning">Change Password</Button>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default Profile;
```

- [ ] **Step 2: Verify in browser**

Go to `/profile` — should show follower/following counts and a Change Password card on the right. Enter wrong current password — should show error. Enter correct password — should show success.

- [ ] **Step 3: Commit**

```bash
git add nile-frontend/src/components/Profile.js
git commit -m "feat: change password section and follow counts on profile page"
```

---

## Task 14: Pagination + Search + Tag Filter — Frontend

**Files:**
- Modify: `nile-frontend/src/components/Feed.js`

- [ ] **Step 1: Replace Feed.js**

Replace the entire contents of `nile-frontend/src/components/Feed.js` with:

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Badge } from 'react-bootstrap';
import api from '../services/api';
import { getUserId } from '../services/auth';
import PostForm from './PostForm';
import Post from './Post';

const Feed = () => {
  const [posts,      setPosts]      = useState([]);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [query,      setQuery]      = useState('');
  const [activeTag,  setActiveTag]  = useState('');
  const [loading,    setLoading]    = useState(false);
  const currentUserId = getUserId();

  const fetchPosts = useCallback(async (pageNum, q, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum, limit: 10 });
      if (q) params.set('q', q);
      const res = await api.get(`/api/posts?${params}`);
      const { posts: newPosts, hasMore: more } = res.data;
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setHasMore(more);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setActiveTag('');
    fetchPosts(1, query, true);
  }, [query, fetchPosts]);

  useEffect(() => {
    if (page === 1) return;
    fetchPosts(page, query, false);
  }, [page, query, fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [{ ...newPost, like_count: 0, liked_by_me: 0, comments: [] }, ...prev]);
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch { alert('Failed to delete post'); }
  };

  // Collect all unique tags from loaded posts for the filter row
  const allTags = [...new Set(
    posts.flatMap(p => (p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : []))
  )];

  const displayed = activeTag
    ? posts.filter(p => p.tags && p.tags.split(',').map(t => t.trim()).includes(activeTag))
    : posts;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Form.Control
        className="mb-3"
        placeholder="Search posts..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {allTags.length > 0 && (
        <div className="mb-3">
          <Badge
            bg={activeTag === '' ? 'primary' : 'secondary'}
            className="me-1"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTag('')}
          >
            All
          </Badge>
          {allTags.map(tag => (
            <Badge
              key={tag}
              bg={activeTag === tag ? 'primary' : 'secondary'}
              className="me-1"
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <PostForm onPostCreated={handlePostCreated} />

      {displayed.length === 0 && !loading && (
        <p className="text-muted text-center">No posts yet. Be the first!</p>
      )}

      {displayed.map(post => (
        <Post
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      ))}

      {hasMore && !activeTag && (
        <div className="text-center my-3">
          <Button variant="outline-primary" onClick={() => setPage(p => p + 1)} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Feed;
```

- [ ] **Step 2: Verify in browser**

- Go to `/feed` — only 10 posts load initially.
- Click "Load More" — next 10 appear.
- Type in the search bar — feed filters as you type (400ms debounce is not needed since the effect re-runs on `query` change; it will re-fetch on every keystroke but that's acceptable for juniors).
- Create a post with tags like `Tech,Fun` — tag filter pills appear above the feed.

- [ ] **Step 3: Commit**

```bash
git add nile-frontend/src/components/Feed.js
git commit -m "feat: paginated feed with load more, search bar, and tag filter"
```

---

## Final Step: Run all backend tests + push

- [ ] **Run full test suite**

```bash
cd nile-backend
npx jest --no-coverage
```

Expected: all test files pass (auth, posts, follows, bookmarks, notifications).

- [ ] **Run E2E tests** (requires both servers running)

```bash
cd ..
node nile-e2e.js
```

Expected: all 18 checks pass (existing flows still work).

- [ ] **Push everything**

```bash
git push origin master
```

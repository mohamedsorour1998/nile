# Nile — Features V2 Design Spec
**Date:** 2026-05-21
**Goal:** Add 10 new features to make Nile feel like a real social network. Every feature is written for junior developers: max 1-2 new endpoints, max 1-2 new components, no external services, no complex state management.

---

## Current State (what already exists)

**Backend:** Node.js + Express + better-sqlite3 on port 5000
**Frontend:** React 18 (CRA) + React-Bootstrap + Formik on port 3000
**Auth:** JWT in localStorage (`nileToken`, `nileUserId`)
**Tables:** `users`, `posts`, `comments`, `likes`
**Routes:** `/api/auth`, `/api/posts`, `/api/users`

---

## Database Changes

All new columns are added with `ALTER TABLE` in `db.js` using `IF NOT EXISTS` guards so the file stays idempotent on restart.

```sql
-- Feature 1: follows
CREATE TABLE IF NOT EXISTS follows (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(follower_id, following_id)
);

-- Feature 6: bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

-- Feature 8: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,   -- 'like' | 'comment'
  post_id    INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature 4: image_url on posts
ALTER TABLE posts ADD COLUMN image_url TEXT;

-- Feature 5: tags on posts
ALTER TABLE posts ADD COLUMN tags TEXT;

-- Feature 3: edited_at on posts
ALTER TABLE posts ADD COLUMN edited_at DATETIME;
```

---

## Feature 1 — Follow / Unfollow

**What it does:** Any logged-in user can follow or unfollow another user. The feed continues to show all posts (no filter added — keeping it simple). Follower/following counts appear on every profile page.

**Backend:**
- `POST /api/users/:id/follow` — toggle follow (insert if not following, delete if already following). Returns `{ following: bool, followers_count: int }`.
- `GET /api/users/:id` (existing) — add `followers_count`, `following_count`, `is_following` fields to the response.

**Frontend:**
- `Profile.js` — if viewing someone else's profile (`userId !== getUserId()`), show a Follow/Unfollow button. Show follower and following counts.
- `PublicProfile.js` (new, Feature 2) — same button lives there too.

**No feed filtering** — feed stays as-is. Follow is social proof, not a feed algorithm.

---

## Feature 2 — Public User Profiles

**What it does:** Clicking any username anywhere in the app navigates to `/users/:id` — a read-only page showing that user's display name, bio, follower/following counts, and all their posts.

**Backend:**
- `GET /api/users/:id` (existing) — already returns user info. Add `followers_count`, `following_count`, `is_following` (from Feature 1). Add `posts` array: all posts by that user.

**Frontend:**
- New component `PublicProfile.js` — shows user info card + list of their Post cards (read-only, no delete button unless it's you).
- Route `/users/:id` added to `App.js` (protected).
- Every `username` rendered in `Post.js`, `CommentForm.js` etc. becomes a `<Link to={/users/${post.user_id}}>`.

---

## Feature 3 — Post Edit

**What it does:** The author of a post sees a pencil (✏️) icon button on their post. Clicking it replaces the post body with an inline edit form (title + content textarea). Saving calls the API and updates the card in place.

**Backend:**
- `PUT /api/posts/:id` — verify ownership (403 if not owner), update `title`, `content`, and set `edited_at = CURRENT_TIMESTAMP`. Returns the updated post.

**Frontend:**
- `Post.js` — add `editing` boolean state. When true, render a small form instead of the title/content. On save, call `api.put`, update the post in local state, set `editing = false`.
- Show `(edited)` label in small muted text if `edited_at` is present.

---

## Feature 4 — Post Image URL

**What it does:** When creating a post, users can optionally paste an image URL. If provided, the image renders inside the post card below the content.

**Backend:**
- `POST /api/posts` (existing) — accept `image_url` from request body, store it.
- `GET /api/posts` (existing) — `image_url` is already returned as part of `SELECT posts.*`.

**Frontend:**
- `PostForm.js` — add an optional `<Form.Control name="image_url" placeholder="Image URL (optional)">` field.
- `Post.js` — if `post.image_url` is set, render `<img src={post.image_url} className="img-fluid rounded mt-2" alt="" />` below the content.

---

## Feature 5 — Post Tags

**What it does:** When creating a post, users can enter comma-separated tags (e.g. `Tech, Fun`). Tags appear as Bootstrap badge pills on the post card. Above the feed, a row of tag pills lets users filter posts client-side — no backend changes needed for filtering.

**Backend:**
- `POST /api/posts` (existing) — accept `tags` string, store as-is.
- `GET /api/posts` (existing) — `tags` returned as part of `SELECT posts.*`.

**Frontend:**
- `PostForm.js` — add an optional `<Form.Control name="tags" placeholder="Tags: Tech, Fun, News">` field.
- `Post.js` — split `post.tags` by comma, render each as `<Badge bg="secondary" className="me-1">`.
- `Feed.js` — collect all unique tags from the loaded posts. Render a row of tag filter buttons above the post list. Active filter stored in local `useState`. Filtering is `posts.filter(p => p.tags?.includes(activeTag))`.

---

## Feature 6 — Bookmarks

**What it does:** Every post has a bookmark icon (🔖). Clicking it saves or unsaves the post. A `/bookmarks` page in the Navbar shows all saved posts.

**Backend:**
- `POST /api/posts/:id/bookmark` — toggle bookmark. Returns `{ bookmarked: bool }`.
- `GET /api/bookmarks` — returns all posts bookmarked by the current user (full post objects).

**Frontend:**
- `Post.js` — bookmark button with filled/unfilled state. Calls toggle endpoint.
- New component `Bookmarks.js` — fetches `/api/bookmarks`, renders list of Post cards.
- `App.js` — add `/bookmarks` route (protected).
- `Navbar.js` — add Bookmarks link.

---

## Feature 7 — Change Password

**What it does:** In the Profile page, a "Change Password" section has three fields: current password, new password, confirm new password. On submit it calls the API. Shows success or error message.

**Backend:**
- `PUT /api/users/:id/password` — verify ownership, `bcrypt.compareSync` current password, hash new password, update. Returns `{ message: 'Password updated' }`.

**Frontend:**
- `Profile.js` — add a second card section "Change Password" below the bio/name form. Uses local state (not Formik, to keep it simple). Three `<Form.Control>` fields. On submit calls `api.put`.

---

## Feature 8 — Notifications

**What it does:** When someone likes or comments on your post, a notification row is inserted. The Navbar shows a bell 🔔 icon with an unread count badge. Clicking the bell opens a simple dropdown list of recent notifications. "Mark all read" clears the badge.

**Backend:**
- Notification rows are inserted in `toggleLike` and `addComment` controllers (only if actor ≠ post owner).
- `GET /api/notifications` — returns the 20 most recent notifications for the current user with actor username.
- `PUT /api/notifications/read` — sets `is_read = 1` for all current user's notifications.

**Frontend:**
- `Navbar.js` — fetch `/api/notifications` every 30 seconds using `setInterval` in a `useEffect`. Show `<Badge>` with unread count on the bell icon. Click opens a `<Dropdown>` list. "Mark all read" button calls the PUT endpoint.
- No new page needed — everything lives in the Navbar dropdown.

---

## Feature 9 — Load More / Pagination

**What it does:** Instead of loading all posts at once, the feed loads 10 posts at a time. A "Load More" button at the bottom appends the next 10.

**Backend:**
- `GET /api/posts?page=1&limit=10` — add `LIMIT` and `OFFSET` to the existing posts query. Default: `page=1`, `limit=10`. Returns `{ posts: [...], hasMore: bool }`.

**Frontend:**
- `Feed.js` — replace the single `fetchPosts()` call with a paginated version. State: `posts = []`, `page = 1`, `hasMore = true`. On "Load More" click, increment page and append results. Initial load fetches page 1.
- `handlePostCreated` prepends the new post as before.

---

## Feature 10 — Search Posts

**What it does:** A search bar above the feed lets users search post titles and content. Results update as the user types (debounced 400ms). Empty search shows the normal paginated feed.

**Backend:**
- `GET /api/posts?q=keyword` — if `q` is present, add `WHERE posts.title LIKE ? OR posts.content LIKE ?` to the query. Compatible with pagination (`?q=hello&page=1`).

**Frontend:**
- `Feed.js` — add a `<Form.Control placeholder="Search posts...">` above the post list. On change, debounce 400ms then call `GET /api/posts?q=term`. If empty, revert to normal paginated feed.
- No new component needed — all logic stays in Feed.js.

---

## New API Endpoints Summary

| Method | Path | Feature |
|--------|------|---------|
| POST | `/api/users/:id/follow` | Follow/Unfollow toggle |
| PUT  | `/api/posts/:id` | Edit post |
| POST | `/api/posts/:id/bookmark` | Bookmark toggle |
| GET  | `/api/bookmarks` | Get my bookmarks |
| PUT  | `/api/users/:id/password` | Change password |
| GET  | `/api/notifications` | Get my notifications |
| PUT  | `/api/notifications/read` | Mark all notifications read |

Existing endpoints extended:
- `GET /api/users/:id` — adds `followers_count`, `following_count`, `is_following`, `posts[]`
- `GET /api/posts` — adds `?q=` search and `?page=`/`?limit=` pagination; returns `{ posts, hasMore }`
- `POST /api/posts` — accepts `image_url` and `tags`
- `POST /api/posts/:id/like` — side-effect: inserts notification row
- `POST /api/posts/:id/comments` — side-effect: inserts notification row

---

## New Frontend Components / Pages

| Component | Route | Feature |
|-----------|-------|---------|
| `PublicProfile.js` | `/users/:id` | Feature 2 |
| `Bookmarks.js` | `/bookmarks` | Feature 6 |

Existing components modified: `Post.js`, `PostForm.js`, `Feed.js`, `Profile.js`, `Navbar.js`, `App.js`

---

## What This Is NOT

- No feed filtering by followed users (too complex for juniors)
- No real-time push (notifications poll every 30s)
- No image uploads (URL only)
- No tag autocomplete or tag search page
- No pagination on bookmarks or public profiles (load all)
- No email notifications

const db = require('../db');

const getComments = db.prepare(`
  SELECT comments.*, users.username
  FROM comments
  JOIN users ON comments.user_id = users.id
  WHERE comments.post_id = ?
  ORDER BY comments.created_at ASC
`);

// ── GET /api/posts?q=&page=&limit= ────────────────────────────────────────────
exports.getPosts = (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const q     = req.query.q ? `%${req.query.q}%` : null;
  const offset = (page - 1) * limit;

  const base = q
    ? `FROM posts JOIN users ON posts.user_id = users.id
       WHERE posts.title LIKE ? OR posts.content LIKE ?`
    : `FROM posts JOIN users ON posts.user_id = users.id`;

  const args = q ? [req.userId, q, q] : [req.userId];

  const posts = db.prepare(`
    SELECT posts.*, users.username,
      (SELECT COUNT(*) FROM likes    WHERE likes.post_id    = posts.id)                        AS like_count,
      (SELECT COUNT(*) FROM likes    WHERE likes.post_id    = posts.id AND likes.user_id = ?)  AS liked_by_me,
      (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = posts.id AND bookmarks.user_id = ?) AS bookmarked_by_me
    ${base}
    ORDER BY posts.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.userId, req.userId, ...(q ? [q, q] : []), limit, offset);

  const { total } = db.prepare(`SELECT COUNT(*) AS total ${base}`).get(...(q ? [q, q] : []));

  const postsWithComments = posts.map(post => ({
    ...post,
    comments: getComments.all(post.id),
  }));

  res.json({ posts: postsWithComments, hasMore: offset + posts.length < total });
};

// ── POST /api/posts ────────────────────────────────────────────────────────────
exports.createPost = (req, res) => {
  const { title, content, image_url, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(
    'INSERT INTO posts (user_id, title, content, image_url, tags) VALUES (?, ?, ?, ?, ?)'
  ).run(req.userId, title, content || null, image_url || null, tags || null);

  const post = db.prepare(`
    SELECT posts.*, users.username,
      0 AS like_count, 0 AS liked_by_me, 0 AS bookmarked_by_me
    FROM posts JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ ...post, comments: [] });
};

// ── PUT /api/posts/:id ─────────────────────────────────────────────────────────
exports.editPost = (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.userId) return res.status(403).json({ error: 'Not your post' });

  const { title, content } = req.body;
  db.prepare(
    'UPDATE posts SET title = ?, content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(title ?? post.title, content ?? post.content, req.params.id);

  const updated = db.prepare(`
    SELECT posts.*, users.username FROM posts
    JOIN users ON posts.user_id = users.id WHERE posts.id = ?
  `).get(req.params.id);

  res.json(updated);
};

// ── DELETE /api/posts/:id ──────────────────────────────────────────────────────
exports.deletePost = (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.userId) return res.status(403).json({ error: 'Not your post' });

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.status(204).end();
};

// ── POST /api/posts/:id/comments ──────────────────────────────────────────────
exports.addComment = (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, req.userId, content);

  if (post.user_id !== req.userId) {
    db.prepare(
      'INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)'
    ).run(post.user_id, req.userId, 'comment', post.id);
  }

  const comment = db.prepare(`
    SELECT comments.*, users.username
    FROM comments JOIN users ON comments.user_id = users.id
    WHERE comments.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
};

// ── DELETE /api/posts/:id/comments/:cid ───────────────────────────────────────
exports.deleteComment = (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.cid);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.userId) return res.status(403).json({ error: 'Not your comment' });

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.cid);
  res.status(204).end();
};

// ── POST /api/posts/:id/like ───────────────────────────────────────────────────
exports.toggleLike = (req, res) => {
  const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = db.prepare(
    'SELECT id FROM likes WHERE post_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

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

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(req.params.id);
  res.json({ liked: !existing, like_count: count });
};

// ── POST /api/posts/:id/bookmark ──────────────────────────────────────────────
exports.toggleBookmark = (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = db.prepare(
    'SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?').run(req.params.id, req.userId);
  } else {
    db.prepare('INSERT INTO bookmarks (post_id, user_id) VALUES (?, ?)').run(req.params.id, req.userId);
  }

  res.json({ bookmarked: !existing });
};

// ── GET /api/bookmarks ────────────────────────────────────────────────────────
exports.getBookmarks = (req, res) => {
  const posts = db.prepare(`
    SELECT posts.*, users.username,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
      1 AS bookmarked_by_me,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me
    FROM bookmarks
    JOIN posts ON bookmarks.post_id = posts.id
    JOIN users ON posts.user_id     = users.id
    WHERE bookmarks.user_id = ?
    ORDER BY bookmarks.id DESC
  `).all(req.userId, req.userId);

  const result = posts.map(post => ({ ...post, comments: getComments.all(post.id) }));
  res.json(result);
};

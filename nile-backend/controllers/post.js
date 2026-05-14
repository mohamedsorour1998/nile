const db = require('../db');

const getComments = db.prepare(`
  SELECT comments.*, users.username
  FROM comments
  JOIN users ON comments.user_id = users.id
  WHERE comments.post_id = ?
  ORDER BY comments.created_at ASC
`);

exports.getPosts = (req, res) => {
  const posts = db.prepare(`
    SELECT posts.*, users.username,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `).all(req.userId);

  const postsWithComments = posts.map(post => ({
    ...post,
    comments: getComments.all(post.id),
  }));

  res.json(postsWithComments);
};

exports.createPost = (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(
    'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)'
  ).run(req.userId, title, content || null);

  const post = db.prepare(`
    SELECT posts.*, users.username
    FROM posts JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(post);
};

exports.deletePost = (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.userId) return res.status(403).json({ error: 'Not your post' });

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.status(204).end();
};

exports.addComment = (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, req.userId, content);

  const comment = db.prepare(`
    SELECT comments.*, users.username
    FROM comments JOIN users ON comments.user_id = users.id
    WHERE comments.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
};

exports.deleteComment = (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.cid);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.userId) return res.status(403).json({ error: 'Not your comment' });

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.cid);
  res.status(204).end();
};

exports.toggleLike = (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = db.prepare(
    'SELECT id FROM likes WHERE post_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(req.params.id, req.userId);
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(req.params.id, req.userId);
  }

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(req.params.id);
  res.json({ liked: !existing, like_count: count });
};

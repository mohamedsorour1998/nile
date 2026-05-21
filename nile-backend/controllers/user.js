const db     = require('../db');
const bcrypt = require('bcryptjs');

const getUserPosts = (userId) =>
  db.prepare(
    `SELECT posts.*, users.username,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comments_count
     FROM posts
     JOIN users ON users.id = posts.user_id
     WHERE posts.user_id = ?
     ORDER BY posts.created_at DESC`
  ).all(userId);

exports.getUser = (req, res) => {
  const targetId = parseInt(req.params.id);
  const user = db.prepare(
    'SELECT id, username, email, first_name, last_name, bio, created_at FROM users WHERE id = ?'
  ).get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const followers_count = db.prepare(
    'SELECT COUNT(*) AS n FROM follows WHERE following_id = ?'
  ).get(targetId).n;

  const following_count = db.prepare(
    'SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?'
  ).get(targetId).n;

  const viewerId = req.userId || null;
  const is_following = viewerId
    ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(viewerId, targetId)
    : false;

  const posts = getUserPosts(targetId);

  res.json({ ...user, followers_count, following_count, is_following, posts });
};

exports.updateUser = (req, res) => {
  if (parseInt(req.params.id) !== req.userId) {
    return res.status(403).json({ error: "Cannot update another user's profile" });
  }

  const { first_name, last_name, bio } = req.body;
  db.prepare(
    'UPDATE users SET first_name = ?, last_name = ?, bio = ? WHERE id = ?'
  ).run(first_name || null, last_name || null, bio || null, req.userId);

  const user = db.prepare(
    'SELECT id, username, email, first_name, last_name, bio, created_at FROM users WHERE id = ?'
  ).get(req.userId);
  res.json(user);
};

exports.followUser = (req, res) => {
  const followingId = parseInt(req.params.id);
  const followerId  = req.userId;

  if (followerId === followingId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  const existing = db.prepare(
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(followerId, followingId);

  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(followerId, followingId);
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(followerId, followingId);
  }

  const followers_count = db.prepare(
    'SELECT COUNT(*) AS n FROM follows WHERE following_id = ?'
  ).get(followingId).n;

  res.json({ following: !existing, followers_count });
};

exports.changePassword = (req, res) => {
  if (parseInt(req.params.id) !== req.userId) {
    return res.status(403).json({ error: 'Cannot change password for another user' });
  }

  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.userId);

  res.json({ message: 'Password updated' });
};

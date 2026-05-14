const db = require('../db');

exports.getUser = (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, first_name, last_name, bio, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
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

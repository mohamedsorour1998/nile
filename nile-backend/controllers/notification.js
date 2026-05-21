const db = require('../db');

exports.getNotifications = (req, res) => {
  const rows = db.prepare(`
    SELECT notifications.*, users.username AS actor_username
    FROM notifications
    JOIN users ON users.id = notifications.actor_id
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

const express = require('express');
const { getNotifications, markAllRead } = require('../controllers/notification');
const requireAuth = require('../middleware/auth');
const router      = express.Router();

router.get('/',     requireAuth, getNotifications);
router.put('/read', requireAuth, markAllRead);

module.exports = router;

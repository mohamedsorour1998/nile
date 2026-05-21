const express = require('express');
const { getBookmarks } = require('../controllers/post');
const requireAuth = require('../middleware/auth');
const router      = express.Router();

router.get('/', requireAuth, getBookmarks);

module.exports = router;

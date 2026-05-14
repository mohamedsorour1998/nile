const express                 = require('express');
const { getUser, updateUser } = require('../controllers/user');
const requireAuth             = require('../middleware/auth');
const router                  = express.Router();

router.get('/:id',  requireAuth, getUser);
router.put('/:id',  requireAuth, updateUser);

module.exports = router;

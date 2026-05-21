const express                                        = require('express');
const { getUser, updateUser, followUser, changePassword } = require('../controllers/user');
const requireAuth                                    = require('../middleware/auth');
const router                                         = express.Router();

router.get('/:id',           requireAuth, getUser);
router.put('/:id',           requireAuth, updateUser);
router.post('/:id/follow',   requireAuth, followUser);
router.put('/:id/password',  requireAuth, changePassword);

module.exports = router;

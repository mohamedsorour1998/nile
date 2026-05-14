const express = require('express');
const {
  getPosts, createPost, deletePost,
  addComment, deleteComment, toggleLike,
} = require('../controllers/post');
const requireAuth = require('../middleware/auth');
const router      = express.Router();

router.get('/',                        requireAuth, getPosts);
router.post('/',                       requireAuth, createPost);
router.delete('/:id',                  requireAuth, deletePost);
router.post('/:id/comments',           requireAuth, addComment);
router.delete('/:id/comments/:cid',    requireAuth, deleteComment);
router.post('/:id/like',               requireAuth, toggleLike);

module.exports = router;

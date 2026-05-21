const express = require('express');
const {
  getPosts, createPost, editPost, deletePost,
  addComment, deleteComment, toggleLike, toggleBookmark,
} = require('../controllers/post');
const requireAuth = require('../middleware/auth');
const router      = express.Router();

router.get('/',                        requireAuth, getPosts);
router.post('/',                       requireAuth, createPost);
router.put('/:id',                     requireAuth, editPost);
router.delete('/:id',                  requireAuth, deletePost);
router.post('/:id/comments',           requireAuth, addComment);
router.delete('/:id/comments/:cid',    requireAuth, deleteComment);
router.post('/:id/like',               requireAuth, toggleLike);
router.post('/:id/bookmark',           requireAuth, toggleBookmark);

module.exports = router;

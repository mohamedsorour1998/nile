import React, { useState } from 'react';
import { Card, Button } from 'react-bootstrap';
import api from '../services/api';
import CommentForm from './CommentForm';

const Post = ({ post, currentUserId, onDelete }) => {
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [liked,     setLiked]     = useState(!!post.liked_by_me);
  const [comments,  setComments]  = useState(post.comments || []);

  const handleLike = async () => {
    try {
      const res = await api.post(`/api/posts/${post.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch {
      alert('Failed to like post');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/api/posts/${post.id}/comments/${commentId}`);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch {
      alert('Failed to delete comment');
    }
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <Card.Title>{post.title}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">by {post.username}</Card.Subtitle>
        {post.content && <Card.Text>{post.content}</Card.Text>}

        <div className="d-flex gap-2 align-items-center mb-2">
          <Button
            size="sm"
            variant={liked ? 'primary' : 'outline-primary'}
            onClick={handleLike}
          >
            {liked ? 'Unlike' : 'Like'} ({likeCount})
          </Button>
          {post.user_id === currentUserId && (
            <Button size="sm" variant="outline-danger" onClick={() => onDelete(post.id)}>
              Delete
            </Button>
          )}
        </div>

        {comments.length > 0 && <hr className="my-2" />}
        {comments.map((c) => (
          <div key={c.id} className="d-flex justify-content-between align-items-center mb-1">
            <small><strong>{c.username}:</strong> {c.content}</small>
            {c.user_id === currentUserId && (
              <Button
                size="sm" variant="link"
                className="text-danger p-0 ms-2"
                onClick={() => handleDeleteComment(c.id)}
              >
                ×
              </Button>
            )}
          </div>
        ))}

        <CommentForm
          postId={post.id}
          onCommentAdded={(c) => setComments([...comments, c])}
        />
      </Card.Body>
    </Card>
  );
};

export default Post;

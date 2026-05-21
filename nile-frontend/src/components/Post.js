import React, { useState } from 'react';
import { Card, Button, Badge, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CommentForm from './CommentForm';

const Post = ({ post, currentUserId, onDelete }) => {
  const [likeCount,    setLikeCount]    = useState(post.like_count || 0);
  const [liked,        setLiked]        = useState(!!post.liked_by_me);
  const [bookmarked,   setBookmarked]   = useState(!!post.bookmarked_by_me);
  const [comments,     setComments]     = useState(post.comments || []);
  const [editing,      setEditing]      = useState(false);
  const [editTitle,    setEditTitle]    = useState(post.title);
  const [editContent,  setEditContent]  = useState(post.content || '');
  const [displayTitle, setDisplayTitle] = useState(post.title);
  const [displayContent, setDisplayContent] = useState(post.content || '');
  const [editedAt,     setEditedAt]     = useState(post.edited_at);

  const handleLike = async () => {
    try {
      const res = await api.post(`/api/posts/${post.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch {
      alert('Failed to like post');
    }
  };

  const handleBookmark = async () => {
    try {
      const res = await api.post(`/api/posts/${post.id}/bookmark`);
      setBookmarked(res.data.bookmarked);
    } catch {
      alert('Failed to bookmark post');
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await api.put(`/api/posts/${post.id}`, { title: editTitle, content: editContent });
      setDisplayTitle(res.data.title);
      setDisplayContent(res.data.content || '');
      setEditedAt(res.data.edited_at);
      setEditing(false);
    } catch {
      alert('Failed to edit post');
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

  const tags = displayContent && post.tags
    ? post.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : (post.tags ? post.tags.split(',').map((t) => t.trim()).filter(Boolean) : []);

  return (
    <Card className="mb-3">
      <Card.Body>
        {editing ? (
          <>
            <Form.Control
              className="mb-2"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Form.Control
              as="textarea" rows={3} className="mb-2"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="d-flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <Card.Title>
              {displayTitle}
              {editedAt && <small className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>(edited)</small>}
            </Card.Title>
            <Card.Subtitle className="mb-2 text-muted">
              by <Link to={`/users/${post.user_id}`}>{post.username}</Link>
            </Card.Subtitle>
            {displayContent && <Card.Text>{displayContent}</Card.Text>}
            {post.image_url && (
              <img src={post.image_url} alt="" className="img-fluid rounded mt-2 mb-2" style={{ maxHeight: '300px' }} />
            )}
            {tags.length > 0 && (
              <div className="mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>
                ))}
              </div>
            )}
          </>
        )}

        <div className="d-flex gap-2 align-items-center mb-2 mt-2">
          <Button size="sm" variant={liked ? 'primary' : 'outline-primary'} onClick={handleLike}>
            {liked ? 'Unlike' : 'Like'} ({likeCount})
          </Button>
          <Button size="sm" variant={bookmarked ? 'warning' : 'outline-warning'} onClick={handleBookmark}>
            {bookmarked ? '🔖' : '🔖'}
          </Button>
          {post.user_id === currentUserId && !editing && (
            <>
              <Button size="sm" variant="outline-secondary" onClick={() => setEditing(true)}>✏️</Button>
              <Button size="sm" variant="outline-danger" onClick={() => onDelete(post.id)}>Delete</Button>
            </>
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

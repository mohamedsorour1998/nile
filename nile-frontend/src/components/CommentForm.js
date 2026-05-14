import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import api from '../services/api';

const CommentForm = ({ postId, onCommentAdded }) => {
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      const res = await api.post(`/api/posts/${postId}/comments`, { content });
      onCommentAdded(res.data);
      setContent('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add comment');
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="d-flex gap-2 mt-2">
      <Form.Control
        size="sm"
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button type="submit" size="sm" variant="outline-primary">Send</Button>
    </Form>
  );
};

export default CommentForm;

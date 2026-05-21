import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getUserId } from '../services/auth';
import Post from './Post';

const Bookmarks = () => {
  const [posts, setPosts]   = useState([]);
  const currentUserId       = getUserId();

  useEffect(() => {
    api.get('/api/bookmarks').then((res) => setPosts(res.data));
  }, []);

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch {
      alert('Failed to delete post');
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <h4 className="mb-3">Bookmarks</h4>
      {posts.length === 0 && <p className="text-muted">No bookmarked posts yet.</p>}
      {posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

export default Bookmarks;

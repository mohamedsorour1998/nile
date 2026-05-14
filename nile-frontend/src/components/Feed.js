import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getUserId } from '../services/auth';
import PostForm from './PostForm';
import Post from './Post';

const Feed = () => {
  const [posts,       setPosts]       = useState([]);
  const currentUserId = getUserId();

  useEffect(() => {
    api.get('/api/posts').then((res) => setPosts(res.data));
  }, []);

  const handlePostCreated = (newPost) => {
    setPosts([{ ...newPost, like_count: 0, liked_by_me: 0, comments: [] }, ...posts]);
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch {
      alert('Failed to delete post');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <PostForm onPostCreated={handlePostCreated} />
      {posts.length === 0 && <p className="text-muted text-center">No posts yet. Be the first!</p>}
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

export default Feed;

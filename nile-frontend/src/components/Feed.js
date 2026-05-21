import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Button, Badge } from 'react-bootstrap';
import api from '../services/api';
import { getUserId } from '../services/auth';
import PostForm from './PostForm';
import Post from './Post';

const Feed = () => {
  const [posts,      setPosts]      = useState([]);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [query,      setQuery]      = useState('');
  const [activeTag,  setActiveTag]  = useState('');
  const [loading,    setLoading]    = useState(false);
  const debounceRef                 = useRef(null);
  const currentUserId               = getUserId();

  const fetchPosts = useCallback(async (p, q, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (q) params.set('q', q);
      const res = await api.get(`/api/posts?${params}`);
      const { posts: newPosts, hasMore: more } = res.data;
      setPosts((prev) => reset ? newPosts : [...prev, ...newPosts]);
      setHasMore(more);
    } catch {
      alert('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, '', true);
  }, [fetchPosts]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveTag('');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPosts(1, val, true);
    }, 400);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, query);
  };

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      alert('Failed to delete post');
    }
  };

  const allTags = [...new Set(
    posts.flatMap((p) => (p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : []))
  )];

  const displayedPosts = activeTag
    ? posts.filter((p) => p.tags?.split(',').map((t) => t.trim()).includes(activeTag))
    : posts;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <PostForm onPostCreated={handlePostCreated} />

      <Form.Control
        className="mb-3"
        placeholder="Search posts..."
        value={query}
        onChange={handleSearchChange}
      />

      {allTags.length > 0 && (
        <div className="mb-3 d-flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Badge
              key={tag}
              bg={activeTag === tag ? 'primary' : 'secondary'}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveTag((t) => (t === tag ? '' : tag))}
            >
              {tag}
            </Badge>
          ))}
          {activeTag && (
            <Badge bg="light" text="dark" style={{ cursor: 'pointer' }} onClick={() => setActiveTag('')}>
              ✕ Clear
            </Badge>
          )}
        </div>
      )}

      {displayedPosts.length === 0 && !loading && (
        <p className="text-muted text-center">No posts found.</p>
      )}

      {displayedPosts.map((post) => (
        <Post
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      ))}

      {hasMore && !activeTag && (
        <div className="text-center mb-4">
          <Button variant="outline-primary" onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Feed;

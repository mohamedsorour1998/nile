import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Badge } from 'react-bootstrap';
import api from '../services/api';
import { getUserId } from '../services/auth';
import Post from './Post';

const PublicProfile = () => {
  const { id }       = useParams();
  const [user, setUser]   = useState(null);
  const currentUserId     = getUserId();

  useEffect(() => {
    api.get(`/api/users/${id}`).then((res) => setUser(res.data));
  }, [id]);

  const handleFollow = async () => {
    try {
      const res = await api.post(`/api/users/${id}/follow`);
      setUser((u) => ({ ...u, is_following: res.data.following, followers_count: res.data.followers_count }));
    } catch {
      alert('Failed to follow/unfollow');
    }
  };

  if (!user) return <p>Loading...</p>;

  const isOwnProfile = parseInt(id) === currentUserId;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <Card className="mb-4 p-3">
        <h4>{user.username}</h4>
        <p className="text-muted mb-1">{user.email}</p>
        {user.bio && <p className="mb-2">{user.bio}</p>}
        <div className="d-flex gap-3 mb-2">
          <span><strong>{user.followers_count}</strong> followers</span>
          <span><strong>{user.following_count}</strong> following</span>
        </div>
        {!isOwnProfile && (
          <Button
            size="sm"
            variant={user.is_following ? 'secondary' : 'primary'}
            onClick={handleFollow}
          >
            {user.is_following ? 'Unfollow' : 'Follow'}
          </Button>
        )}
      </Card>

      <h5 className="mb-3">Posts by {user.username}</h5>
      {user.posts.length === 0 && <p className="text-muted">No posts yet.</p>}
      {user.posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={() => {}}
        />
      ))}
    </div>
  );
};

export default PublicProfile;

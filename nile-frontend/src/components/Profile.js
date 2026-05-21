import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import api from '../services/api';
import { getUserId } from '../services/auth';

const Profile = () => {
  const [user,    setUser]    = useState(null);
  const [success, setSuccess] = useState('');
  const [pwState, setPwState] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg,   setPwMsg]   = useState('');
  const [pwErr,   setPwErr]   = useState('');
  const userId = getUserId();

  useEffect(() => {
    api.get(`/api/users/${userId}`).then((res) => setUser(res.data));
  }, [userId]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: user?.first_name || '',
      last_name:  user?.last_name  || '',
      bio:        user?.bio        || '',
    },
    validationSchema: Yup.object({
      bio: Yup.string().max(300, 'Max 300 characters'),
    }),
    onSubmit: async (values) => {
      try {
        const res = await api.put(`/api/users/${userId}`, values);
        setUser((u) => ({ ...u, ...res.data }));
        setSuccess('Profile updated!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to update profile');
      }
    },
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (pwState.newPw !== pwState.confirm) {
      setPwErr('New passwords do not match');
      return;
    }
    try {
      await api.put(`/api/users/${userId}/password`, {
        current_password: pwState.current,
        new_password:     pwState.newPw,
      });
      setPwMsg('Password updated!');
      setPwState({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      setPwErr(err.response?.data?.error || 'Failed to update password');
    }
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '500px' }}>
      <Card className="p-3 mb-4">
        <h4>{user.username}</h4>
        <p className="text-muted mb-1">{user.email}</p>
        <div className="d-flex gap-3 mb-3">
          <span><strong>{user.followers_count ?? 0}</strong> followers</span>
          <span><strong>{user.following_count ?? 0}</strong> following</span>
        </div>
        {success && <Alert variant="success">{success}</Alert>}
        <Form onSubmit={formik.handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>First Name</Form.Label>
            <Form.Control
              name="first_name"
              onChange={formik.handleChange} value={formik.values.first_name}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Last Name</Form.Label>
            <Form.Control
              name="last_name"
              onChange={formik.handleChange} value={formik.values.last_name}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Bio</Form.Label>
            <Form.Control
              as="textarea" name="bio" rows={3}
              onChange={formik.handleChange} value={formik.values.bio}
              isInvalid={!!formik.errors.bio}
            />
            <Form.Control.Feedback type="invalid">{formik.errors.bio}</Form.Control.Feedback>
          </Form.Group>
          <Button type="submit">Save Changes</Button>
        </Form>
      </Card>

      <Card className="p-3">
        <h5 className="mb-3">Change Password</h5>
        {pwMsg && <Alert variant="success">{pwMsg}</Alert>}
        {pwErr && <Alert variant="danger">{pwErr}</Alert>}
        <Form onSubmit={handlePasswordChange}>
          <Form.Group className="mb-2">
            <Form.Label>Current Password</Form.Label>
            <Form.Control
              type="password" value={pwState.current}
              onChange={(e) => setPwState((s) => ({ ...s, current: e.target.value }))}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>New Password</Form.Label>
            <Form.Control
              type="password" value={pwState.newPw}
              onChange={(e) => setPwState((s) => ({ ...s, newPw: e.target.value }))}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Confirm New Password</Form.Label>
            <Form.Control
              type="password" value={pwState.confirm}
              onChange={(e) => setPwState((s) => ({ ...s, confirm: e.target.value }))}
            />
          </Form.Group>
          <Button type="submit" variant="warning">Update Password</Button>
        </Form>
      </Card>
    </div>
  );
};

export default Profile;

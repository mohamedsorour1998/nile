import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import api from '../services/api';
import { getUserId } from '../services/auth';

const Profile = () => {
  const [user,    setUser]    = useState(null);
  const [success, setSuccess] = useState('');
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
        setUser(res.data);
        setSuccess('Profile updated!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to update profile');
      }
    },
  });

  if (!user) return <p>Loading...</p>;

  return (
    <Card className="p-3" style={{ maxWidth: '500px' }}>
      <h4>{user.username}</h4>
      <p className="text-muted">{user.email}</p>
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
  );
};

export default Profile;

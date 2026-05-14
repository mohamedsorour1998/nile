import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { saveAuth } from '../services/auth';

const Register = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: { username: '', email: '', password: '', first_name: '', last_name: '' },
    validationSchema: Yup.object({
      username: Yup.string().min(3).max(30).required('Required'),
      email:    Yup.string().email('Invalid email').required('Required'),
      password: Yup.string().min(6, 'At least 6 characters').required('Required'),
    }),
    onSubmit: async (values) => {
      try {
        const res = await api.post('/api/auth/register', values);
        saveAuth(res.data.token, res.data.userId);
        navigate('/feed');
      } catch (err) {
        setError(err.response?.data?.error || 'Registration failed');
      }
    },
  });

  return (
    <div className="d-flex justify-content-center">
      <Card style={{ width: '400px' }} className="p-3">
        <h4 className="mb-3">Create Account</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={formik.handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              name="username"
              onChange={formik.handleChange} value={formik.values.username}
              isInvalid={!!formik.errors.username}
            />
            <Form.Control.Feedback type="invalid">{formik.errors.username}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              name="email" type="email"
              onChange={formik.handleChange} value={formik.values.email}
              isInvalid={!!formik.errors.email}
            />
            <Form.Control.Feedback type="invalid">{formik.errors.email}</Form.Control.Feedback>
          </Form.Group>
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
            <Form.Label>Password</Form.Label>
            <Form.Control
              name="password" type="password"
              onChange={formik.handleChange} value={formik.values.password}
              isInvalid={!!formik.errors.password}
            />
            <Form.Control.Feedback type="invalid">{formik.errors.password}</Form.Control.Feedback>
          </Form.Group>
          <Button type="submit" className="w-100">Register</Button>
        </Form>
        <p className="mt-3 text-center">
          Have an account? <Link to="/sign-in">Sign In</Link>
        </p>
      </Card>
    </div>
  );
};

export default Register;

import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { saveAuth } from '../services/auth';

const SignIn = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: Yup.object({
      email:    Yup.string().email('Invalid email').required('Required'),
      password: Yup.string().required('Required'),
    }),
    onSubmit: async (values) => {
      try {
        const res = await api.post('/api/auth/login', values);
        saveAuth(res.data.token, res.data.userId);
        navigate('/feed');
      } catch (err) {
        setError(err.response?.data?.error || 'Login failed');
      }
    },
  });

  return (
    <div className="d-flex justify-content-center">
      <Card style={{ width: '400px' }} className="p-3">
        <h4 className="mb-3">Sign In</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={formik.handleSubmit}>
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
            <Form.Label>Password</Form.Label>
            <Form.Control
              name="password" type="password"
              onChange={formik.handleChange} value={formik.values.password}
              isInvalid={!!formik.errors.password}
            />
            <Form.Control.Feedback type="invalid">{formik.errors.password}</Form.Control.Feedback>
          </Form.Group>
          <Button type="submit" className="w-100">Sign In</Button>
        </Form>
        <p className="mt-3 text-center">
          No account? <Link to="/register">Register</Link>
        </p>
      </Card>
    </div>
  );
};

export default SignIn;

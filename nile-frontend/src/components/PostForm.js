import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Form, Button, Card } from 'react-bootstrap';
import api from '../services/api';

const PostForm = ({ onPostCreated }) => {
  const formik = useFormik({
    initialValues: { title: '', content: '' },
    validationSchema: Yup.object({
      title:   Yup.string().min(3).max(150).required('Required'),
      content: Yup.string().max(500),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await api.post('/api/posts', values);
        onPostCreated(res.data);
        resetForm();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to create post');
      }
    },
  });

  return (
    <Card className="mb-4 p-3">
      <Form onSubmit={formik.handleSubmit}>
        <Form.Group className="mb-2">
          <Form.Control
            name="title"
            placeholder="Post title"
            onChange={formik.handleChange}
            value={formik.values.title}
            isInvalid={!!formik.errors.title}
          />
          <Form.Control.Feedback type="invalid">{formik.errors.title}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Control
            as="textarea"
            name="content"
            rows={3}
            onChange={formik.handleChange}
            value={formik.values.content}
          />
        </Form.Group>
        <Button type="submit" size="sm">Post</Button>
      </Form>
    </Card>
  );
};

export default PostForm;

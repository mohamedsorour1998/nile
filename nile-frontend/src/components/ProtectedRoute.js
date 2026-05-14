import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';

const ProtectedRoute = ({ component: Component }) => {
  return isAuthenticated() ? <Component /> : <Navigate to="/sign-in" />;
};

export default ProtectedRoute;

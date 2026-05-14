import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => (
  <div className="text-center mt-5">
    <h1>Welcome to Nile</h1>
    <p className="lead">Connect with people around you.</p>
    <Link to="/register" className="btn btn-primary me-2">Get Started</Link>
    <Link to="/sign-in"  className="btn btn-outline-secondary">Sign In</Link>
  </div>
);

export default Home;

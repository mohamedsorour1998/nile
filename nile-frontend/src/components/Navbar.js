import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container } from 'react-bootstrap';
import { isAuthenticated, removeAuth } from '../services/auth';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeAuth();
    navigate('/');
  };

  return (
    <BsNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BsNavbar.Brand as={Link} to="/">Nile</BsNavbar.Brand>
        <Nav className="ms-auto">
          {isAuthenticated() ? (
            <>
              <Nav.Link as={Link} to="/feed">Feed</Nav.Link>
              <Nav.Link as={Link} to="/profile">Profile</Nav.Link>
              <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
            </>
          ) : (
            <>
              <Nav.Link as={Link} to="/sign-in">Sign In</Nav.Link>
              <Nav.Link as={Link} to="/register">Register</Nav.Link>
            </>
          )}
        </Nav>
      </Container>
    </BsNavbar>
  );
};

export default Navbar;

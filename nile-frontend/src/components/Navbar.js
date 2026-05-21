import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Badge, Dropdown } from 'react-bootstrap';
import api from '../services/api';
import { isAuthenticated, removeAuth } from '../services/auth';

const Navbar = () => {
  const navigate                  = useNavigate();
  const [notifications, setNotifs] = useState([]);
  const intervalRef               = useRef(null);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifs(res.data);
    } catch {}
  };

  useEffect(() => {
    if (!isAuthenticated()) return;
    fetchNotifs();
    intervalRef.current = setInterval(fetchNotifs, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleLogout = () => {
    removeAuth();
    clearInterval(intervalRef.current);
    navigate('/');
  };

  const markRead = async () => {
    try {
      await api.put('/api/notifications/read');
      setNotifs((n) => n.map((x) => ({ ...x, is_read: 1 })));
    } catch {}
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <BsNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BsNavbar.Brand as={Link} to="/">Nile</BsNavbar.Brand>
        <Nav className="ms-auto align-items-center">
          {isAuthenticated() ? (
            <>
              <Nav.Link as={Link} to="/feed">Feed</Nav.Link>
              <Nav.Link as={Link} to="/bookmarks">Bookmarks</Nav.Link>
              <Nav.Link as={Link} to="/profile">Profile</Nav.Link>

              <Dropdown align="end" className="ms-2">
                <Dropdown.Toggle variant="dark" size="sm" className="border-0 position-relative" onClick={markRead}>
                  🔔
                  {unread > 0 && (
                    <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.6rem' }}>
                      {unread}
                    </Badge>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ minWidth: '280px', maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 && (
                    <Dropdown.Item disabled>No notifications</Dropdown.Item>
                  )}
                  {notifications.map((n) => (
                    <Dropdown.Item key={n.id} className={n.is_read ? 'text-muted' : 'fw-semibold'} style={{ fontSize: '0.875rem' }}>
                      <strong>{n.actor_username}</strong> {n.type === 'like' ? 'liked' : 'commented on'} your post
                    </Dropdown.Item>
                  ))}
                  {notifications.length > 0 && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={markRead} className="text-center text-primary">Mark all read</Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>

              <Nav.Link onClick={handleLogout} className="ms-2">Logout</Nav.Link>
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

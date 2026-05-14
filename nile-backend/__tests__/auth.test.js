const request = require('supertest');
const app     = require('../server');
const db      = require('../db');

beforeEach(() => {
  db.exec('DELETE FROM likes; DELETE FROM comments; DELETE FROM posts; DELETE FROM users;');
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns token + userId', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@test.com', password: 'pass1234' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.userId).toBeDefined();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'pass1234' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on duplicate email', async () => {
    await request(app).post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@test.com', password: 'pass1234' });
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'alice2', email: 'alice@test.com', password: 'pass1234' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@test.com', password: 'pass1234' });
  });

  it('returns token with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@test.com', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.userId).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'pass1234' });
    expect(res.status).toBe(404);
  });
});

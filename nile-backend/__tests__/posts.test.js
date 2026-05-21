const request = require('supertest');
const app     = require('../server');
const db      = require('../db');

let token;
let userId;

beforeAll(() => {
  db.exec('DELETE FROM likes; DELETE FROM comments; DELETE FROM posts; DELETE FROM users;');
});

beforeAll(async () => {
  const res = await request(app).post('/api/auth/register')
    .send({ username: 'testuser', email: 'test@test.com', password: 'pass1234' });
  token  = res.body.token;
  userId = res.body.userId;
});

describe('GET /api/posts', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(401);
  });

  it('returns posts array with hasMore', async () => {
    const res = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(typeof res.body.hasMore).toBe('boolean');
  });
});

describe('POST /api/posts', () => {
  it('creates a post', async () => {
    const res = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hello Nile', content: 'First post' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Hello Nile');
    expect(res.body.username).toBe('testuser');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'no title here' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/posts/:id/like (toggle)', () => {
  let postId;

  beforeAll(async () => {
    const res = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Like me' });
    postId = res.body.id;
  });

  it('adds a like', async () => {
    const res = await request(app).post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(true);
    expect(res.body.like_count).toBe(1);
  });

  it('removes the like on second call', async () => {
    const res = await request(app).post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(false);
    expect(res.body.like_count).toBe(0);
  });
});

describe('POST /api/posts/:id/comments', () => {
  let postId;

  beforeAll(async () => {
    const res = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Comment here' });
    postId = res.body.id;
  });

  it('adds a comment', async () => {
    const res = await request(app).post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'nice post' });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('nice post');
    expect(res.body.username).toBe('testuser');
  });
});

describe('DELETE /api/posts/:id', () => {
  it('deletes own post', async () => {
    const create = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'delete me' });
    const del = await request(app).delete(`/api/posts/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });
});

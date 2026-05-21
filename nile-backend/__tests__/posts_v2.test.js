process.env.NODE_ENV = 'test';
const request = require('supertest');
const app     = require('../server');

let token, userId, otherToken, postId;

beforeAll(async () => {
  const res = await request(app).post('/api/auth/register').send({
    username: 'postsv2user', email: 'postsv2@test.com', password: 'pass1234',
  });
  token  = res.body.token;
  userId = res.body.userId;

  const res2 = await request(app).post('/api/auth/register').send({
    username: 'postsv2other', email: 'postsv2other@test.com', password: 'pass1234',
  });
  otherToken = res2.body.token;

  const postRes = await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Test Post', content: 'Hello world', image_url: 'http://img.test/x.jpg', tags: 'Tech,Fun' });
  postId = postRes.body.id;
});

describe('POST /api/posts accepts image_url and tags', () => {
  it('returns image_url and tags in created post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Tagged', content: 'hi', image_url: 'http://x.com/a.png', tags: 'News,Sport' });
    expect(res.status).toBe(201);
    expect(res.body.image_url).toBe('http://x.com/a.png');
    expect(res.body.tags).toBe('News,Sport');
  });
});

describe('PUT /api/posts/:id — edit post', () => {
  it('owner can edit title and content', async () => {
    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Edited Title', content: 'Edited content' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Edited Title');
    expect(res.body.edited_at).toBeTruthy();
  });

  it('non-owner gets 403', async () => {
    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hack' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/posts/:id/bookmark — toggle bookmark', () => {
  it('bookmarks a post', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/bookmark`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(true);
  });

  it('un-bookmarks on second call', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/bookmark`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.bookmarked).toBe(false);
  });
});

describe('GET /api/bookmarks', () => {
  beforeAll(async () => {
    await request(app)
      .post(`/api/posts/${postId}/bookmark`)
      .set('Authorization', `Bearer ${token}`);
  });

  it('returns bookmarked posts', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res)).toBe(false);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].bookmarked_by_me).toBe(1);
  });
});

describe('GET /api/posts — pagination', () => {
  it('returns posts with hasMore field', async () => {
    const res = await request(app)
      .get('/api/posts?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(typeof res.body.hasMore).toBe('boolean');
  });

  it('search by ?q= filters results', async () => {
    const res = await request(app)
      .get('/api/posts?q=Edited+Title')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.posts[0].title).toBe('Edited Title');
  });
});

describe('Notifications — like creates notification', () => {
  it('liking another user post creates notification', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(200);

    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.length).toBeGreaterThanOrEqual(1);
    expect(notifRes.body[0].type).toBe('like');
  });

  it('PUT /api/notifications/read marks all read', async () => {
    const res = await request(app)
      .put('/api/notifications/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

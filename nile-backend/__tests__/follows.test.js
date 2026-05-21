process.env.NODE_ENV = 'test';
const request = require('supertest');
const app     = require('../server');
const db      = require('../db');

let tokenA, tokenB, userAId, userBId;

beforeAll(async () => {
  const resA = await request(app).post('/api/auth/register').send({
    username: 'followA', email: 'followA@test.com', password: 'pass1234',
  });
  tokenA  = resA.body.token;
  userAId = resA.body.userId;

  const resB = await request(app).post('/api/auth/register').send({
    username: 'followB', email: 'followB@test.com', password: 'pass1234',
  });
  tokenB  = resB.body.token;
  userBId = resB.body.userId;
});

describe('Follow / Unfollow', () => {
  it('A follows B → following: true', async () => {
    const res = await request(app)
      .post(`/api/users/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.following).toBe(true);
    expect(res.body.followers_count).toBe(1);
  });

  it('A unfollows B on second call → following: false', async () => {
    const res = await request(app)
      .post(`/api/users/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.following).toBe(false);
    expect(res.body.followers_count).toBe(0);
  });

  it('Cannot follow yourself', async () => {
    const res = await request(app)
      .post(`/api/users/${userAId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/:id includes follow counts', () => {
  beforeAll(async () => {
    await request(app)
      .post(`/api/users/${userBId}/follow`)
      .set('Authorization', `Bearer ${tokenA}`);
  });

  it('returns followers_count, following_count, is_following', async () => {
    const res = await request(app)
      .get(`/api/users/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.followers_count).toBe(1);
    expect(res.body.following_count).toBe(0);
    expect(res.body.is_following).toBe(true);
    expect(Array.isArray(res.body.posts)).toBe(true);
  });
});

describe('Change Password', () => {
  it('rejects wrong current password', async () => {
    const res = await request(app)
      .put(`/api/users/${userAId}/password`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ current_password: 'wrongpass', new_password: 'newpass1234' });
    expect(res.status).toBe(401);
  });

  it('updates password with correct current password', async () => {
    const res = await request(app)
      .put(`/api/users/${userAId}/password`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ current_password: 'pass1234', new_password: 'newpass1234' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password updated');
  });

  it('can login with new password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'followA@test.com', password: 'newpass1234' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('cannot change another user password', async () => {
    const res = await request(app)
      .put(`/api/users/${userBId}/password`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ current_password: 'pass1234', new_password: 'hack' });
    expect(res.status).toBe(403);
  });
});

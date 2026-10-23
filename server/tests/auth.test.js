import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';

describe('Authentication & Authorization API', () => {
  it('should register a new reviewer and return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Reviewer',
        email: 'jane@marketplace.local',
        password: 'Password123!',
        role: 'reviewer',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('jane@marketplace.local');
    expect(res.body.user.role).toBe('reviewer');

    // Password must be hashed in DB, never plaintext
    const dbUser = await User.findOne({ email: 'jane@marketplace.local' });
    expect(dbUser).toBeDefined();
    expect(dbUser.passwordHash).not.toBe('Password123!');
  });

  it('should reject registration with duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'First User',
        email: 'duplicate@marketplace.local',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second User',
        email: 'duplicate@marketplace.local',
        password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should login an existing user with valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User',
        email: 'login@marketplace.local',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@marketplace.local',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('should reject login with invalid password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User 2',
        email: 'login2@marketplace.local',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login2@marketplace.local',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should enforce role-based authorization: reviewer cannot create policy documents', async () => {
    // Register reviewer
    const reviewerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Regular Reviewer',
        email: 'reviewer_only@marketplace.local',
        password: 'Password123!',
        role: 'reviewer',
      });
    const reviewerToken = reviewerRes.body.token;

    // Reviewer attempts to POST to /api/policies (admin only)
    const blockedRes = await request(app)
      .post('/api/policies')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        name: 'Unauthorized Policy Document',
        documentType: 'marketplace_policy',
      });

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.message).toContain('Forbidden');

    // Register Administrator
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Platform Admin',
        email: 'admin_only@marketplace.local',
        password: 'Password123!',
        role: 'administrator',
      });
    const adminToken = adminRes.body.token;

    // Admin attempts to POST to /api/policies
    const allowedRes = await request(app)
      .post('/api/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Authorized Admin Policy Document',
        documentType: 'marketplace_policy',
      });

    expect(allowedRes.status).toBe(201);
    expect(allowedRes.body.success).toBe(true);
  });
});

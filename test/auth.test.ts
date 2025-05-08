import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../index';
import { sign } from 'hono/jwt';
import { APP_HASH_ID, APP_JWT_SECRET } from '@app/config/setting';

describe('POST /auth/login', () => {
  const username = 'user_test_auth_login';
  let token: string;
  let userId: number;

  beforeAll(async () => {
    userId = Math.floor(Math.random() * 1000000); // Random id
    token = await sign(
      {
        id: userId,
        username,
        role: 'member',
        app_id: APP_HASH_ID,
        is_active: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      APP_JWT_SECRET,
      'HS256'
    );
  });

  it('should login successfully', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'user_test',
        password: '123456',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await res.json();

    expect(res.status).toBe(200);
    expect(result?.data?.token).toBeDefined();
  });

  it('should return 400 if credentials are wrong', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'wrong_username',
        password: 'wrong_password',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await res.json();

    expect(res.status).toBe(400);
    expect(result?.message).toBe('Invalid username or password');
  });

  it('should return 400 if request body invalid', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'ab',
        password: 'cd',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await res.json();

    expect(res.status).toBe(400);
    expect(result.message.username).toBe(
      'Username must be at least 3 characters'
    );
    expect(result.message.password).toBe(
      'Password must be at least 3 characters'
    );
  });
});

describe('GET /auth/verify', () => {
  const username = 'user_test_auth_verify';
  let token: string;
  let userId: number;

  beforeAll(async () => {
    userId = Math.floor(Math.random() * 1000000);

    token = await sign(
      {
        id: userId,
        username,
        role: 'member',
        app_id: APP_HASH_ID,
        is_active: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      APP_JWT_SECRET,
      'HS256'
    );
  });

  it('should verify and return user data', async () => {
    const res = await app.request('/auth/verify', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await res.json();

    expect(res.status).toBe(200);
    expect(result?.data?.username).toBe(username);
    expect(result?.data?.id).toBe(userId);
  });

  it('should return 401 if no token provided', async () => {
    const res = await app.request('/auth/verify', {
      method: 'GET',
    });

    const result = await res.json();

    expect(res.status).toBe(401);
    expect(result?.message).toBe('Invalid token');
  });
});

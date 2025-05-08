import { describe, it, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { sign } from 'hono/jwt';
import { resJSON, formatZodErrors } from '@app/helpers/function';
import { is_login, is_admin } from '@app/middleware/auth';
import { APP_HASH_ID, APP_JWT_SECRET } from '@app/config/setting';

const app = new Hono();

// Custom Not Found
app.notFound((c: Context) => {
  const resData = resJSON({ statusCode: 404, message: 'Page not found' });
  return c.json(resData, resData.status as 404);
});

// Error Handling
app.onError(async (err, c: Context) => {
  const resData = resJSON({
    statusCode: 500,
    message: err?.message,
  });

  if (err instanceof HTTPException) {
    resData.status = err?.status;
  } else if (err instanceof ZodError) {
    resData.status = 400;
    resData.message = formatZodErrors(err?.errors);
  }

  return c.json(resData, resData.status as 500);
});

// Routes
app.get('/auth/test-middleware-is-login', is_login, (c: Context) => {
  return c.json({ message: 'Middleware passed', user: c.get('userData') });
});

app.get('/auth/test-middleware-is-admin', is_admin, (c: Context) => {
  return c.json({ message: 'Middleware passed', user: c.get('userData') });
});

describe('Middleware is_login', () => {
  const username = 'user_test_middleware_is_login';
  let token: string;
  let bannedToken: string;
  let inactiveToken: string;
  let wrongAppToken: string;

  beforeAll(async () => {
    const basePayload = {
      id: 1,
      username,
      role: 'member',
      app_id: APP_HASH_ID,
      is_active: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    };

    token = await sign(basePayload, APP_JWT_SECRET, 'HS256');

    bannedToken = await sign(
      {
        ...basePayload,
        role: 'banned',
      },
      APP_JWT_SECRET,
      'HS256'
    );

    inactiveToken = await sign(
      {
        ...basePayload,
        is_active: false,
      },
      APP_JWT_SECRET,
      'HS256'
    );

    wrongAppToken = await sign(
      {
        ...basePayload,
        app_id: 'WRONG_APP_ID',
      },
      APP_JWT_SECRET,
      'HS256'
    );
  });

  it('should pass middleware and return user data', async () => {
    const res = await app.request('/auth/test-middleware-is-login', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data?.message).toBe('Middleware passed');
    expect(data?.user?.username).toBe(username);
  });

  it('should fail when token is missing', async () => {
    const res = await app.request('/auth/test-middleware-is-login', {
      method: 'GET',
    });

    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data?.message).toBe('Invalid token');
  });

  it('should fail when user is banned', async () => {
    const res = await app.request('/auth/test-middleware-is-login', {
      method: 'GET',
      headers: { Authorization: `Bearer ${bannedToken}` },
    });

    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data?.message).toBe('User already banned');
  });

  it('should fail when user is not active', async () => {
    const res = await app.request('/auth/test-middleware-is-login', {
      method: 'GET',
      headers: { Authorization: `Bearer ${inactiveToken}` },
    });

    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data?.message).toBe('User not active');
  });

  it('should fail when app_id is wrong', async () => {
    const res = await app.request('/auth/test-middleware-is-login', {
      method: 'GET',
      headers: { Authorization: `Bearer ${wrongAppToken}` },
    });

    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data?.message).toBe('Access denied, invalid app_id');
  });
});

describe('Middleware is_admin', () => {
  const username = 'user_test_middleware_is_admin';
  let adminToken: string;
  let memberToken: string;
  let bannedToken: string;
  let inactiveToken: string;
  let wrongAppToken: string;

  beforeAll(async () => {
    const basePayload = {
      id: 2,
      username,
      role: 'admin',
      app_id: APP_HASH_ID,
      is_active: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    };

    adminToken = await sign(basePayload, APP_JWT_SECRET, 'HS256');

    memberToken = await sign(
      {
        ...basePayload,
        role: 'member',
      },
      APP_JWT_SECRET,
      'HS256'
    );

    bannedToken = await sign(
      {
        ...basePayload,
        role: 'banned',
      },
      APP_JWT_SECRET,
      'HS256'
    );

    inactiveToken = await sign(
      {
        ...basePayload,
        is_active: false,
      },
      APP_JWT_SECRET,
      'HS256'
    );

    wrongAppToken = await sign(
      {
        ...basePayload,
        app_id: 'WRONG_APP_ID',
      },
      APP_JWT_SECRET,
      'HS256'
    );
  });

  it('should pass admin middleware for admin user', async () => {
    const res = await app.request('/auth/test-middleware-is-admin', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data?.message).toBe('Middleware passed');
    expect(data?.user?.username).toBe(username);
  });

  it('should fail when token is missing', async () => {
    const res = await app.request('/auth/test-middleware-is-admin', {
      method: 'GET',
    });

    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data?.message).toBe('Invalid token');
  });

  it('should fail for non-admin user', async () => {
    const res = await app.request('/auth/test-middleware-is-admin', {
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data?.message).toBe('Only admin can access this endpoint');
  });

  it('should fail when user is banned', async () => {
    const res = await app.request('/auth/test-middleware-is-admin', {
      method: 'GET',
      headers: { Authorization: `Bearer ${bannedToken}` },
    });

    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data?.message).toBe('User already banned');
  });

  it('should fail when user is not active', async () => {
    const res = await app.request('/auth/test-middleware-is-admin', {
      method: 'GET',
      headers: { Authorization: `Bearer ${inactiveToken}` },
    });

    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data?.message).toBe('User not active');
  });

  it('should fail when app_id is wrong', async () => {
    const res = await app.request('/auth/test-middleware-is-admin', {
      method: 'GET',
      headers: { Authorization: `Bearer ${wrongAppToken}` },
    });

    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data?.message).toBe('Access denied, invalid app_id');
  });
});

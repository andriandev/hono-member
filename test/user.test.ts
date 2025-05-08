import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { sign } from 'hono/jwt';
import { prismaClient } from '@app/config/database';
import { app } from '../index';
import { APP_JWT_SECRET, APP_HASH_ID } from '@app/config/setting';

describe('GET /user/:id?', () => {
  let tokenAdmin: string;
  let testUserId: number;

  beforeAll(async () => {
    const user = await prismaClient.user.create({
      data: {
        id: Math.floor(Math.random() * 1000000),
        premium: 0,
        created_at: new Date(),
        token: '',
      },
    });

    const jwt = await sign(
      {
        id: user.id,
        username: 'admin_test',
        role: 'admin',
        app_id: APP_HASH_ID,
        is_active: true,
      },
      APP_JWT_SECRET
    );
    await prismaClient.user.update({
      where: { id: user.id },
      data: { token: jwt },
    });

    tokenAdmin = jwt;
    testUserId = user.id;
  });

  afterAll(async () => {
    await prismaClient.user.deleteMany({
      where: { id: testUserId },
    });
  });

  it('should return detail user by ID', async () => {
    const res = await app.request(`/user/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });

    const result = await res.json();
    console.log(result);

    expect(res.status).toBe(200);
    expect(result.data.id).toBe(testUserId);
  });

  it('should return all users if no ID provided', async () => {
    const res = await app.request(`/user`, {
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });

    const result = await res.json();
    expect(res.status).toBe(200);
    expect(result.data.users.length).toBeGreaterThan(0);
  });

  it('should return 400 if ID is not a number', async () => {
    const res = await app.request(`/user/abc`, {
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 if user not found', async () => {
    const res = await app.request(`/user/999999999`, {
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });

    expect(res.status).toBe(400);
  });
});

describe('PUT /user/:id', () => {
  let tokenAdmin: string;
  let testUserId: number;

  beforeAll(async () => {
    testUserId = Math.floor(Math.random() * 1000000);

    const user = await prismaClient.user.create({
      data: {
        id: testUserId,
        premium: 0,
        created_at: new Date(),
        token: '',
      },
    });

    const jwt = await sign(
      {
        id: user.id,
        username: 'admin_test',
        role: 'admin',
        app_id: APP_HASH_ID,
        is_active: true,
      },
      APP_JWT_SECRET
    );

    await prismaClient.user.update({
      where: { id: user.id },
      data: { token: jwt },
    });

    tokenAdmin = jwt;
  });

  afterAll(async () => {
    await prismaClient.user.deleteMany({
      where: { id: testUserId },
    });
  });

  it('should update user successfully', async () => {
    const res = await app.request(`/user/${testUserId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        premium: 10,
      }),
    });

    const result = await res.json();

    expect(res.status).toBe(200);
    expect(result.data.premium).toBe(10);
  });

  it('should return 400 if ID is not a number', async () => {
    const res = await app.request(`/user/abc`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ premium: 1 }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 if user not found', async () => {
    const res = await app.request(`/user/99999999999`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ premium: 1 }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 if invalid body (e.g. missing premium)', async () => {
    const res = await app.request(`/user/${testUserId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // empty body
    });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /user/:id', () => {
  let tokenAdmin: string;
  let testUserId: number;

  beforeAll(async () => {
    testUserId = Math.floor(Math.random() * 1000000);

    const user = await prismaClient.user.create({
      data: {
        id: testUserId,
        premium: 0,
        created_at: new Date(),
        token: '',
      },
    });

    const jwt = await sign(
      {
        id: user.id,
        username: 'admin_test',
        role: 'admin',
        app_id: APP_HASH_ID,
        is_active: true,
      },
      APP_JWT_SECRET
    );

    await prismaClient.user.update({
      where: { id: user.id },
      data: { token: jwt },
    });

    tokenAdmin = jwt;
  });

  afterAll(async () => {
    // Just in case user not deleted
    await prismaClient.user.deleteMany({
      where: { id: testUserId },
    });
  });

  it('should delete user successfully', async () => {
    const res = await app.request(`/user/${testUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });

    const result = await res.json();

    expect(res.status).toBe(200);
    expect(result.message).toBe('Deleted user successfully');
  });

  it('should return 400 if user not found', async () => {
    const res = await app.request(`/user/9999999`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });

    const result = await res.json();
    expect(res.status).toBe(400);
    expect(result.message).toBe('User not found');
  });
});

describe('GET /count', () => {
  let tokenUser: string;
  let testUserId: number;

  beforeAll(async () => {
    testUserId = Math.floor(Math.random() * 1000000);

    const jwt = await sign(
      {
        id: testUserId,
        username: 'user_test_count',
        role: 'user',
        app_id: APP_HASH_ID,
        is_active: true,
      },
      APP_JWT_SECRET
    );

    await prismaClient.user.create({
      data: {
        id: testUserId,
        premium: 2,
        created_at: new Date(),
        token: jwt,
      },
    });

    tokenUser = jwt;
  });

  afterAll(async () => {
    await prismaClient.user.deleteMany({
      where: { id: testUserId },
    });
  });

  it('should decrement premium if greater than 0', async () => {
    const res = await app.request('/count', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenUser}`,
      },
    });

    const result = await res.json();

    expect(res.status).toBe(200);
    expect(result.data.premium).toBe(1);
  });

  it('should return 402 if premium already zero', async () => {
    // Set premium to 0
    await prismaClient.user.update({
      where: { id: testUserId },
      data: { premium: 0 },
    });

    const res = await app.request('/count', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenUser}`,
      },
    });

    const result = await res.json();

    expect(res.status).toBe(402);
    expect(result.message).toBe('Premium is already zero or user not found');
  });
});

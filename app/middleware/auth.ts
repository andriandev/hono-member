import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verify } from 'hono/jwt';
import { customJwtErrorMessage } from '@app/helpers/function';
import { APP_HASH_ID, APP_JWT_SECRET } from '@app/config/setting';

async function getUserFromToken(token: string) {
  try {
    const decoded = await verify(token, APP_JWT_SECRET, 'HS256');

    return decoded;
  } catch (err) {
    if (err.name.includes('Jwt')) {
      throw new HTTPException(401, { message: customJwtErrorMessage(err) });
    } else {
      throw err;
    }
  }
}

function validateUserStatus(user: any) {
  if (user.app_id !== APP_HASH_ID)
    throw new HTTPException(403, { message: 'Access denied, invalid app_id' });
  if (user.role === 'banned')
    throw new HTTPException(403, { message: 'User already banned' });
  if (!user.is_active)
    throw new HTTPException(401, { message: 'User not active' });
}

function validateAdmin(user: any) {
  if (user.role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Only admin can access this endpoint',
    });
  }
}

export async function is_login(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer '))
    throw new HTTPException(401, { message: 'Invalid token' });

  const token = authHeader.split(' ')[1];

  const user = await getUserFromToken(token);
  validateUserStatus(user);

  c.set('userData', user);

  await next();
}

export async function is_admin(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer '))
    throw new HTTPException(401, { message: 'Invalid token' });

  const token = authHeader.split(' ')[1];

  const user = await getUserFromToken(token);

  validateUserStatus(user);
  validateAdmin(user);

  c.set('userData', user);

  await next();
}

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { decode } from 'hono/jwt';
import { UserValidation } from '@app/validation/user';
import { APP_AUTH_URL, APP_HASH_ID } from '@app/config/setting';
import { prismaClient } from '@app/config/database';
import { resJSON } from '@app/helpers/function';

export async function Login(c: Context) {
  const rawJson = c.get('jsonData');

  const request = UserValidation.LOGIN.parse(rawJson);

  const res = await fetch(`${APP_AUTH_URL}/auth/login`, {
    headers: {
      'x-real-ip-from-app':
        c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || '',
      'user-agent': c.req.header('user-agent') || '',
    },
    method: 'POST',
    body: JSON.stringify({
      username: request.username,
      password: request.password,
      app_id: APP_HASH_ID,
    }),
  });

  const result = await res.json();

  if (result.status !== 200) {
    throw new HTTPException(result.status, {
      message: result.message,
    });
  }

  const { payload } = decode(result.data.token);

  const checkUser = await prismaClient.user.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (!checkUser) {
    await prismaClient.user.create({
      data: {
        id: Number(payload.id),
        token: result.data.token,
      },
    });
  } else {
    await prismaClient.user.update({
      where: {
        id: Number(payload.id),
      },
      data: {
        token: result.data.token,
      },
    });
  }

  return c.json(result, result.status as 200);
}

export async function Verify(c: Context) {
  const user = c.get('userData');

  const resData = resJSON({
    data: user,
  });

  return c.json(resData, resData.status as 200);
}

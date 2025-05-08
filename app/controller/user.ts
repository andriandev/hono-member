import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { decode } from 'hono/jwt';
import { UserValidation } from '@app/validation/user';
import { prismaClient } from '@app/config/database';
import { resJSON } from '@app/helpers/function';

export async function GetUser(c: Context) {
  const idUser: any = c.req.param('id');
  const rawQuery = c.req.query();
  const query = UserValidation.GET.parse(rawQuery);
  let data: any = {};

  if (idUser) {
    if (isNaN(idUser)) {
      throw new HTTPException(400, {
        message: 'User not found',
      });
    }

    const user = await prismaClient.user.findFirst({
      where: {
        id: Number(idUser),
      },
    });

    if (!user) {
      throw new HTTPException(400, {
        message: 'User not found',
      });
    }

    const { payload } = decode(user.token);

    const formattedUser = {
      id: user.id,
      username: payload.username,
      role: payload.role,
      premium: user.premium,
      created_at: user.created_at,
    };

    data = formattedUser;
  } else {
    const limit = query.limit ? Number(query.limit) : 10;
    const offset = query.offset ? Number(query.offset) : 0;

    const allUser = await prismaClient.user.findMany({
      skip: offset,
      take: limit,
    });

    if (allUser.length == 0) {
      throw new HTTPException(400, {
        message: 'User data not exist',
      });
    }

    const totalUsers = await prismaClient.user.count();
    const totalPages = Math.ceil(totalUsers / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    const formattedUsers = allUser.map((user) => {
      const { payload } = decode(user.token);
      return {
        id: user.id,
        username: payload.username,
        role: payload.role,
        premium: user.premium,
        created_at: user.created_at,
      };
    });

    data.users = formattedUsers;
    data.paging = {
      total_users: totalUsers,
      total_pages: totalPages,
      current_page: currentPage,
    };
  }

  const resData = resJSON({
    data: data,
  });

  return c.json(resData, resData.status as 200);
}

export async function UpdateUser(c: Context) {
  const idUser: any = c.req.param('id');
  let request = c.get('jsonData');

  if (isNaN(idUser)) {
    throw new HTTPException(400, {
      message: 'User not found',
    });
  }

  request = UserValidation.UPDATE.parse(request);

  const user = await prismaClient.user.findFirst({
    where: {
      id: Number(idUser),
    },
  });

  if (!user) {
    throw new HTTPException(400, {
      message: 'User not found',
    });
  }

  const newData = await prismaClient.user.update({
    where: {
      id: Number(idUser),
    },
    data: request,
  });

  const { payload } = decode(user.token);

  const formattedUser = {
    id: newData.id,
    username: payload.username,
    role: payload.role,
    premium: newData.premium,
    created_at: newData.created_at,
  };

  const resData = resJSON({
    data: formattedUser,
  });

  return c.json(resData, resData.status as 200);
}

export async function DeleteUser(c: Context) {
  const idUser: any = c.req.param('id');

  try {
    await prismaClient.user.delete({
      where: {
        id: Number(idUser),
      },
    });

    const resData = resJSON({
      message: 'Deleted user successfully',
    });

    return c.json(resData, resData.status as 200);
  } catch (err) {
    const resData = resJSON({
      statusCode: 400,
      message: 'User not found',
    });

    return c.json(resData, resData.status as 400);
  }
}

export async function CountPremium(c: Context) {
  const data = c.get('userData');

  try {
    const user = await prismaClient.user.update({
      where: {
        id: data?.id,
        premium: {
          gt: 0, // Only update if premium > 0
        },
      },
      data: {
        premium: {
          decrement: 1,
        },
      },
    });

    const resData = resJSON({
      data: {
        premium: user?.premium,
      },
    });

    return c.json(resData, resData.status);
  } catch (err) {
    const resData = resJSON({
      statusCode: 402,
      message: 'Premium is already zero or user not found',
    });

    return c.json(resData, resData.status);
  }
}

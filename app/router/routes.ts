import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { Login, Verify } from '@controller/auth';
import {
  GetUser,
  UpdateUser,
  DeleteUser,
  CountPremium,
} from '@app/controller/user';
import { is_admin, is_login } from '@app/middleware/auth';
import { check_json } from '@app/middleware/json';

const app = new Hono();

app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }));

app.post('/auth/login', check_json, Login);
app.get('/auth/verify', is_login, Verify);

app.get('/user/:id?', is_admin, GetUser);
app.put('/user/:id', check_json, is_admin, UpdateUser);
app.delete('/user/:id', is_admin, DeleteUser);

app.get('/count', is_login, CountPremium);

export default app;

import { z } from 'zod';

export class UserValidation {
  static LOGIN = z.object({
    username: z
      .string({
        required_error: 'Username is required',
      })
      .min(3, 'Username must be at least 3 characters')
      .max(100, 'Username max 100 characters'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(3, 'Password must be at least 3 characters')
      .max(100, 'Password max 100 characters'),
  });

  static GET = z.object({
    limit: z.coerce
      .number({
        invalid_type_error: 'Limit must be a number',
      })
      .min(1)
      .optional(),
    offset: z.coerce
      .number({
        invalid_type_error: 'Offset must be a number',
      })
      .min(0)
      .optional(),
  });

  static UPDATE = z.object({
    premium: z.coerce
      .number({
        invalid_type_error: 'Premium must be a number',
      })
      .min(0),
  });
}

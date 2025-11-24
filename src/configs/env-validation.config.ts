import * as Joi from 'joi';

export const configModuleValidationSchema = Joi.object({
  DB_HOST: Joi.string().required().messages({
    'any.required': 'DB_HOST is required',
    'string.empty': 'DB_HOST cannot be empty',
  }),
  DB_PORT: Joi.number().port().required().messages({
    'any.required': 'DB_PORT is required',
    'number.base': 'DB_PORT must be a number',
  }),
  DB_USERNAME: Joi.string().required().messages({
    'any.required': 'DB_USERNAME is required',
    'string.empty': 'DB_USERNAME cannot be empty',
  }),
  DB_PASSWORD: Joi.string().required().messages({
    'any.required': 'DB_PASSWORD is required',
    'string.empty': 'DB_PASSWORD cannot be empty',
  }),
  DB_NAME: Joi.string().required().messages({
    'any.required': 'DB_NAME is required',
    'string.empty': 'DB_NAME cannot be empty',
  }),
  SERVER_PORT: Joi.number().port().required().messages({
    'any.required': 'SERVER_PORT is required',
    'number.base': 'SERVER_PORT must be a number',
  }),
  PASSWORD_HASH: Joi.number().integer().min(4).max(31).required().messages({
    'any.required': 'PASSWORD_HASH is required',
    'number.base': 'PASSWORD_HASH must be a number',
  }),
  JWT_SECRET: Joi.string().min(10).required().messages({
    'any.required': 'JWT_SECRET is required',
    'string.empty': 'JWT_SECRET cannot be empty',
  }),

  JWT_EXPIRES_IN: Joi.number().integer().min(60).required().messages({
    'any.required': 'JWT_EXPIRES_IN is required',
    'number.base': 'JWT_EXPIRES_IN must be a number (seconds)',
  }),
  REFRESH_TOKEN_SECRET: Joi.string().min(10).required().messages({
    'any.required': 'REFRESH_SECRET is required',
    'string.empty': 'REFRESH_SECRET cannot be empty',
  }),
  REFRESH_TOKEN_EXPIRES_IN: Joi.number()
    .integer()
    .min(60 * 60) // 최소 1시간 이상
    .required()
    .messages({
      'any.required': 'REFRESH_TOKEN_EXPIRES_IN is required',
      'number.base': 'REFRESH_TOKEN_EXPIRES_IN must be a number (seconds)',
    }),
  REFRESH_TOKEN_HASH: Joi.number()
    .integer()
    .min(4)
    .max(15)
    .required()
    .messages({
      'any.required': 'REFRESH_TOKEN_HASH is required',
      'number.base': 'REFRESH_TOKEN_HASH must be a number',
    }),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .required()
    .messages({
      'any.only': 'NODE_ENV must be one of: development, production, test',
      'any.required': 'NODE_ENV is required',
    }),

  COOKIE_SAMESITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax')
    .messages({
      'any.only': 'COOKIE_SAMESITE must be one of: lax, strict, none',
    }),

  COOKIE_DOMAIN: Joi.string().allow('').optional().messages({
    'string.base': 'COOKIE_DOMAIN must be a string',
  }),
});

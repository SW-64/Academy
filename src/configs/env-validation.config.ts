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
});

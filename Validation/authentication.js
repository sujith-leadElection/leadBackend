import joi from "joi";

export const ValidateSignup = (userData) => {
    const Schema = joi.object({
      firstname: joi.string().required().min(3),
      lastname: joi.string().required().min(1),
      email: joi.string().email().required(),
      password: joi.string().min(8),
      address: joi.string().required(),
      phoneNumber: joi.string().required(),
    });
    return Schema.validateAsync(userData);
};

export const ValidateSignin = (userData) => {
  const Schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
  });

  return Schema.validateAsync(userData);
};

export const ValidateAC = (data) => {
  const schema = joi.object({
    name: joi.string().required().messages({
      'any.required': 'Name is required',
      'string.empty': 'Name cannot be empty',
    }),
    parliamentaryConstituency: joi.string().required().messages({
      'any.required': 'Parliamentary Constituency is required',
      'string.empty': 'Parliamentary Constituency cannot be empty',
    }),
    PCId: joi.string().required().messages({
      'any.required': 'PCId is required',
      'string.empty': 'PCId cannot be empty',
    }),
    pocMobileNumber: joi.string()
      .pattern(/^[0-9]{10}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please enter a valid 10-digit mobile number',
        'any.required': 'Mobile number is required',
        'string.empty': 'Mobile number cannot be empty',
      }),
  });
  
  return schema.validateAsync(data);
};
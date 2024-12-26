import joi from "joi";

// Employee Validation
export const ValidateEmployee = (employeeData) => {
    const Schema = joi.object({
      name: joi.string().required().min(3),                   // String with minimum length of 3
      age: joi.number().required().min(18).max(65),           // Number between 18 and 65
      fatherName: joi.string().required().min(3),             // Father’s name, string with minimum length of 3
      address: joi.string().required(),                       // Required string for address
      email: joi.string().email().required(),                 // Email, required
      phoneNumber: joi.string().required(), // Phone number must be 10 digits
      panId: joi.string().alphanum().required().min(10).max(10),   // PAN ID, alphanumeric and exactly 10 characters
      aadharId: joi
      .string()
      .pattern(/^\d{4}-\d{4}-\d{4}$/) // Aadhaar format: 1234-5678-9012
      .required().messages({
        'string.pattern.base': 'Please enter a valid 12-digit Aadhar-Card number',
        'any.required': 'Aadhar-Card number is required',
        'string.empty': 'Aadhar-Card number cannot be empty',
      }), // Aadhar ID must be exactly 12 digits
      scores: joi.object({
        xth: joi.number().required().min(0).max(100),         // Xth score between 0 and 100
        xiith: joi.number().required().min(0).max(100),       // XIIth score between 0 and 100
        bachelors: joi.number().required().min(0).max(100),   // Bachelor's score between 0 and 100
        masters: joi.number().min(0).max(100).optional()      // Optional Master’s score between 0 and 100
      }).required(),
      epf: joi.string().optional(),                           // EPF is optional
      password: joi.string().optional(),               // Optional password with a minimum of 8 characters
    });
  
    return Schema.validateAsync(employeeData);
  };
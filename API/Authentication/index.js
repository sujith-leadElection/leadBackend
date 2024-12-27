//Library
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//Models
import { UserModel, EmployeeModel } from "../../Database/allModels";
// Validation
import { ValidateSignup, ValidateSignin } from "../../Validation/authentication";
import { ValidateEmployee } from "../../Validation/employeeValidation";

import generateJwtToken from "../../Utils/generateJwtToken";

const router = express.Router();

/*
Route     /signup
Des       Register new user
Params    none
Access    Public
Method    POST  
*/
export const signup = async (req, res) => {
  try {
    // Validate the signup credentials
    await ValidateSignup(req.body.credentials);

    // Check if the user already exists (by email or phone)
    await UserModel.findByEmailAndPhone(req.body.credentials);

    // Create a new user
    const newUser = await UserModel.create(req.body.credentials);

    // If you need to generate a token (uncomment if applicable)
    // const token = newUser.generateJwtToken();

    // Send a success response
    return res.status(200).json({
      message: "Successfully Admin Signup",
      status: "success",
      // token, // Include the token if generated
    });
  } catch (error) {
    // Handle errors with appropriate status codes and messages
    const statusCode = error.statusCode || 500; // Default to 500 if no status code is provided
    const message = error.message || "Internal Server Error";

    return res.status(statusCode).json({ error: message });
  }
};

/*
Route     /signin
Des       Signin with email and password
Params    none
Access    Public
Method    POST  
*/
export const signin = async (req, res) => {
  try {
    await ValidateSignin(req.body.credentials);
    console.log("validation completed");

    const user = await UserModel.findByEmailAndPassword(req.body.credentials);
    console.log(user);

    // Pass the role (0 or 1) to the token generation function
    const token = generateJwtToken(user._id.toString(), user.role);
    console.log(token);
    
    return res.status(200).json({ token, status: "success" });
  } catch (error) {
    // Check if the error is an instance of our custom ErrorResponse class
    const statusCode = error.statusCode || 500; // Default to 500 if no status code is provided
    const message = error.message || "Internal Server Error";
    return res.status(statusCode).json({ error: message });
  }
};

export const createemp = async (req, res) => {
  try {
    await ValidateEmployee(req.body.credentials)
    //console.log("validation complete");
    await EmployeeModel.findByEmailAndPhone(req.body.credentials)
    //console.log("findByEmailAndPhone complete");
    const existingEmployee = await EmployeeModel.findOne({
      $or: [{ aadharId: req.body.credentials.aadharId }, { panId: req.body.credentials.panId }, { epf: req.body.credentials.epf }]
    });
    if (existingEmployee) {
      if (existingEmployee.aadharId === req.body.credentials.aadharId) {
        return res.status(400).json({ message: "AadharId Already Exist", status: "success" });
      }
      if (existingEmployee.panId === req.body.credentials.panId) {
        return res.status(400).json({ message: "PanId Already Exist", status: "success" });
      }
      if (existingEmployee.epf === req.body.credentials.epf) {
        return res.status(400).json({ message: "EPF Already Exist", status: "success" });
      }
    }
    const newEmp = EmployeeModel.create(req.body.credentials)
    return res.status(200).json({ message: "Employee Added Successfully", status: "success" });
  } catch (error) {
    //console.log(error);
    const statusCode = error.statusCode || 500; // Default to 500 if no status code is provided
    const message = error.message || "Internal Server Error";
    return res.status(statusCode).json({ message: message });
  }

};

export const getTokeninfo = async (req, res) => {
  // Now you can access userId and role
  //console.log(req.body);
  const token = req.body.token;
  //console.log(token);
  try {
    // Replace 'YOUR_SECRET_KEY' with your actual secret key
    const decoded = jwt.verify(token, 'LeadContactByElection');
    // Access user information from the decoded token
    const userId = decoded.user;
    const role = decoded.role;
    if (role) {
      let existingEmployee = await EmployeeModel.findOne({ _id: userId });
      if (!existingEmployee) {
        return res.status(404).json({ message: 'Employee Record Not available' });
      }
    }
    return res.json({
      userId,
      role
    });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid Token' });
  }
};

export default router;
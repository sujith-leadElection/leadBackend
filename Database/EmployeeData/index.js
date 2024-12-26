import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import ErrorResponse from "../../Utils/ErrorResponse";
import { UserModel } from "../allModels";

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    fatherName: { type: String, required: true },
    address: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    panId: { type: String, required: true },
    aadharId: { type: String, required: true },
    scores: {
      xth: { type: Number, required: true },
      xiith: { type: Number, required: true },
      bachelors: { type: Number, required: true },
      masters: { type: Number, required: false },
    },
    epf: { type: String, required: false },
    password: { type: String, required: false }
  }, 
  { 
    timestamps: true
  }   
);

employeeSchema.statics.findByEmailAndPhone = async ({ email, phoneNumber }) => {
    // check whether email exist
    const checkUserByEmail = await UserModel.findOne({ email });
    const checkUserByPhone = await UserModel.findOne({ phoneNumber });
    const checkEmplyByEmail = await EmployeeModel.findOne({ email });
    const checkEmplyByPhone = await EmployeeModel.findOne({ phoneNumber });
    if (checkUserByEmail || checkEmplyByEmail) {
        throw new ErrorResponse("Account Already Exist on entered Email!", 409);
    }
    if (checkUserByPhone || checkEmplyByPhone) {
        throw new ErrorResponse("Account Already Exist on entered PhoneNumber!", 409);
    }
    return false;
};

employeeSchema.pre("save", function (next) {
    const user = this;
  
    // password is modified
    if (!user.isModified("password")) return next();
  
    // generate bcrypt salt
    bcrypt.genSalt(8, (error, salt) => {
      if (error) return next(error);
  
      // hash the password
      bcrypt.hash(user.password, salt, (error, hash) => {
        if (error) return next(error);
  
        // assigning hashed password
        user.password = hash;
        return next();
      });
    });
});
  
const EmployeeModel = mongoose.model('EmployeeData', employeeSchema);
export default EmployeeModel;
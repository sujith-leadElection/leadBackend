//Sv02RDzCvIA6ctqX
import mongoose from "mongoose";
require("dotenv").config();
export default async () => {
  return await mongoose.connect(process.env.MONGO_URI, {});
};

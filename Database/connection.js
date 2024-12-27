//Sv02RDzCvIA6ctqX
import mongoose from "mongoose";
require("dotenv").config();
export default async () => {
  return await mongoose.connect("mongodb+srv://Sujith:Sv02RDzCvIA6ctqX@cluster0.g3igd2e.mongodb.net/LeadDB?retryWrites=true&w=majority", {
    serverSelectionTimeoutMS: 20000, // Increase timeout to 20 seconds
  });  
};

//Env Variables
require("dotenv").config();
//Libraries
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
// Database connection
//import ConnectDB from "./Database/connection";
mongoose.connect("mongodb+srv://Sujith:Sv02RDzCvIA6ctqX@cluster0.g3igd2e.mongodb.net/LeadDB?retryWrites=true&w=majority")
mongoose.Promise = global.Promise
mongoose.connection.on('error', (err) => {
  console.log("DB Connection failed")
})
//application middlewares
const port = "8000";
const lead = express();
lead.use(cors());
lead.use(express.json());
lead.use(express.urlencoded({ extended: false }));
lead.use(helmet());
mongoose.set('strictPopulate', false);
require('./Database/allModels');
//import all of our models
// require('./Database/ACWithEmployeeAllotment');
// require('./Database/Admin');
// require('./Database/Allotment');
// require('./Database/AssemblyConstituency');
// require('./Database/AssignedIdwithTrackingDocument');
// require('./Database/DailyCount');
// require('./Database/EmployeeData');
// require('./Database/EmployeeGrievancesTrack');
// require('./Database/LeaveData');
// require('./Database/LeaveHistory');
// microservice route
import Auth from "./API/Authentication";
import AC from "./API/ACWithMandalVillageAllocation";
import Allotment from './API/ACAllotmentWithEmployee';
import grievances from './API/Grievances';
import Employee from './API/EmployeeActions';
import { signup, signin, createemp, getTokeninfo } from './API/Authentication';
// Application Routes
//lead.use("/auth", Auth);

lead.get("/", (req, res) => res.json({ message: "Setup success" }));
lead.post("/auth/signup", signup);
lead.post("/auth/signin", signin);
lead.post("/auth/create-emp", createemp);
lead.post("/auth/getTokeninfo", getTokeninfo);
lead.use('/ac', AC);
lead.use('/allotment', Allotment);
lead.use('/grievances', grievances);
lead.use('/employee', Employee);

lead.listen(port, () =>
  console.log("Server is running")
);

module.exports = lead;
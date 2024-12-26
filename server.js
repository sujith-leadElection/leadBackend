//Env Variables
require("dotenv").config();

//Libraries
import express from 'express';
import pkg from 'body-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
// Database connection
import ConnectDB from "./Database/connection";

//application middlewares
const port ="8000";
const lead = express();
lead.use(cors());
lead.use(express.json());
lead.use(express.urlencoded({ extended: false }));
lead.use(helmet());
mongoose.set('strictPopulate', false);
// microservice route
import Auth from "./API/Authentication";
import AC from "./API/ACWithMandalVillageAllocation";
import Allotment from './API/ACAllotmentWithEmployee';
import grievances from './API/Grievances';
import Employee from './API/EmployeeActions';

// Application Routes
lead.use("/auth", Auth);
lead.use('/ac', AC);
lead.use('/allotment', Allotment);
lead.use('/grievances',grievances);
lead.use('/employee',Employee);

lead.get("/" , (req, res) => res.json({ message: "Setup success" }));

lead.listen(port, () =>
    ConnectDB()
    .then(() => console.log("Server is running"))
    .catch(() =>
      console.log("Server is running, but database connection failed.")
    )
);
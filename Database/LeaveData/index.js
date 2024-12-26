import mongoose from "mongoose";
const Schema = mongoose.Schema;

const leaveDataSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeData', required: true },
  month: [{
    month: { type: String },
    year:{type:String},
    sickLeave: { type: Number, default: 1 },
    casualLeave: { type: Number, default: 1 },
    totalLeaveLeft: { type: Number, default: 2 }
  }],
  extraLeaves: { type: Number, default: 0 }
});

const LeaveData = mongoose.model('LeaveData', leaveDataSchema);
export default LeaveData;
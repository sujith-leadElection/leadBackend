import mongoose from "mongoose";
const Schema = mongoose.Schema;

const otherScheme = new Schema({
  date: { type: Date, required: true },
  type: { type: String, enum: ['sick', 'casual', 'extra'], required: true },
  purpose: { type: String, required: true },
  approved: { type: String, default: "NOT YET APPROVED" }
}, { timestamps: true });

const leaveHistorySchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeData', required: true },
  leaveHistory: [otherScheme]
});

const LeaveHistory = mongoose.model('LeaveHistory', leaveHistorySchema);
export default LeaveHistory;
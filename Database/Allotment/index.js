import mongoose from 'mongoose';
import {AC, EmployeeModel} from "./index";
const allotmentSchema = new mongoose.Schema({
  ac: { type: mongoose.Schema.Types.ObjectId, ref: 'AC', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeData', required: true },
});

const Allotment = mongoose.model('Allotment', allotmentSchema);

export default Allotment;
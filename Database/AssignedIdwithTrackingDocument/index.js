import mongoose, { mongo } from "mongoose";

const assignedwithTrackingDocument = new mongoose.Schema({
    referenceGrievanceDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'LetterRequest', required: true },
    referenceTrackingDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeGrievancesTrack', required: true }
});

const AssignedwithTrackingDocument = mongoose.model("AssignedwithTrackingDocument",assignedwithTrackingDocument);
export default AssignedwithTrackingDocument;
const mongoose = require('mongoose');

const EmployeeGrievancesTrackSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // Assuming you have an Employee model
    required: true,
    unique: true,
  },
  grievanceCategories: {
    GrievanceRef: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LetterRequest' }],
    CMRF: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LetterRequest' }],
    JOBS: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LetterRequest' }],
    DEVELOPMENT: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LetterRequest' }],
    Transfer: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LetterRequest' }],
    Others: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LetterRequest' }]
  }
}, { timestamps: true });

const EmployeeGrievancesTrack = mongoose.model('EmployeeGrievancesTrack', EmployeeGrievancesTrackSchema);
export default EmployeeGrievancesTrack;
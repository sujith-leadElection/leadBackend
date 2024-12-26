const mongoose = require('mongoose');

// Allotment schema to associate employees with AC
const allotmentSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // Reference to Employee model
    required: true
  },
  acId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AC', // Reference to AC model
    required: true
  }
},
{ 
  timestamps: true // Automatically handle createdAt and updatedAt fields
});

// Export the Allotment model
const Allotment = mongoose.model('Allotment', allotmentSchema);

export default Allotment;
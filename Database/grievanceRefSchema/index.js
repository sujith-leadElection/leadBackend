const mongoose = require('mongoose');
import AC from "../AssemblyConstituency";
import DailyCount from '../DailyCount';
import date from 'date-and-time';
// Sub-schema for GrievanceRef and Others (Categories 1 & 6)
const grievanceRefSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  content: { type: String, required: true }
});
const GrievanceRef = mongoose.model('GrievanceRef', grievanceRefSchema);

const otherSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  content: { type: String, required: true }
});
const Others = mongoose.model('Others', otherSchema);


// Sub-schema for CMRF (Category 2)
const cmrfSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  relation: { type: String, enum: ['S/O', 'D/O', 'O/O'], required: true },  // Relation
  fatherName: { type: String, required: true },
  patientAadharId: { type: String, required: true },
  patientPhoneNumber: { type: String, required: true },
  address: { type: String, required: true },
  mandal: { type: mongoose.Schema.Types.ObjectId, ref: 'Mandal', required: true },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  hospitalName: { type: String, required: true },
  disease: { type: String, required: true },
  dateOfAdmission: { type: Date, required: true },
  dateOfDischarge: { type: Date, required: true },
  totalAmount: { type: Number, required: true }
});
const CMRF = mongoose.model('CMRF', cmrfSchema);

// Sub-schema for JOBS (Category 3)
const jobsSchema = new mongoose.Schema({
  referencePersonName: { type: String, required: true },
  referencePhoneNumber: { type: String, required: true },
  qualification: { type: String, required: true },
  otherQualification: { type: String}
});
const JOBS = mongoose.model('JOBS', jobsSchema);

// Sub-schema for Development (Category 4)
const developmentSchema = new mongoose.Schema({
  mandal: { type: mongoose.Schema.Types.ObjectId, ref: 'Mandal', required: true },
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  authority: { type: String, required: true },
  issue: { type: String, required: true },
  letterIssue: { type: Boolean, required: true }
});
const DEVELOPMENT = mongoose.model('DEVELOPMENT', developmentSchema);

// Sub-schema for Transfer (Category 5)
const transferSchema = new mongoose.Schema({
  transferType: { type: String, enum: ['transfer', 'retention', 'recommendation', 'new_post_recommended'], required: true },
  fromVillage: { type: String },  // Used only for Transfer
  toVillage: {type: String },    // Used only for Transfer
  retentionStartedAt: { type: Date },  // Used only for Retention
  recommendationPosition: { type: String }, // Used for Recommendation/New Post Recommended
  recommendationLocation: { type: String }  // Used for Recommendation/New Post Recommended
});
const Transfer = mongoose.model('Transfer', transferSchema);

// Main Schema
const letterRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relation: { type: String, enum: ['S/O', 'D/O', 'O/O'], required: true }, 
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  fatherName: { type: String, required: true },
  age: { type: Number, required: true },
  aadharId: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  letterRequired: { type: Boolean, required: true },
  to: {
    type: String,
    required: function () { return this.letterRequired; } // Only if letterRequired is true
  },
  purpose: {
    type: String,
    required: function () { return this.letterRequired; } // Only if letterRequired is true
  },

  // Category field
  category: { type: String, enum: ['GrievanceRef', 'CMRF', 'JOBS', 'DEVELOPMENT', 'Transfer', 'Others'], required: true },

  // Dynamic fields based on category selection
  grievanceRef: grievanceRefSchema,  // For categories 1 & 6
  cmrf: cmrfSchema,  // For category 2
  jobs: jobsSchema,  // For category 3
  development: developmentSchema,  // For category 4
  transfer: transferSchema,  // For category 5
  others: otherSchema,

  // Store the ac,mandal and village ids as a String
  acId:{ type: String},
  mandalId:{ type: String},
  villageId:{ type: String},
  
  // Token for tracking
  token: { type: String, unique: true }

}, { timestamps: true });

// Pre-save middleware for updating daily count and assigning token
// Pre-save middleware
letterRequestSchema.pre('save', async function (next) {
  try {
    // Get the global current date in the desired format
    const now = new Date();
    const formattedNow = date.format(now, 'YYYY/MM/DD'); // Format as YYYY/MM/DD for storing

    // Update the daily count for the current day or create a new one
    const dailyCountDoc = await DailyCount.findOneAndUpdate(
      { date: formattedNow }, // Use the formatted global date as the identifier
      { $inc: { count: 1 } }, // Increment count
      { new: true, upsert: true, setDefaultsOnInsert: true } // Create document if it doesn't exist
    );

    // Use the updated count to generate the token
    const countForDay = dailyCountDoc.count; // Get the updated count
    const formattedCount = countForDay < 10 ? `0${countForDay}` : `${countForDay}`;

    const getacName = await AC.findById(this.acId);
    if (!getacName) {
      throw new Error('AC not found for the given ID');
    }

    const getshortForm = getShortForm(this.category);
    if (!getshortForm) {
      throw new Error('Category short form could not be determined');
    }
    // Assign the token based on the formatted date and count
    this.token = `${getacName.name}/${getacName.PCId}/${getshortForm}/${formattedNow.replace(/\//g, '')}/${formattedCount}`;
    next(); // Proceed with saving the document
  } catch (error) {
    next(error); // Pass the error to the next middleware
  }
});

function getShortForm(fullform) {
  switch(fullform){
    case 'GrievanceRef':
      return 'GRF'
    case 'CMRF':
      return 'CMRF'
    case 'JOBS':
      return 'JBS' 
    case 'DEVELOPMENT':
      return 'DVLP'
    case 'Transfer':
      return 'TNS'
    case 'Others':
      return 'ORS'
    default:
      return '';
  }
}
// Create the model
const LetterRequest = mongoose.model('LetterRequest', letterRequestSchema);

export { LetterRequest};
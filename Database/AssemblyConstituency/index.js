import mongoose from 'mongoose';

// Define Village Schema
const villageSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

// Define Mandal Schema
const mandalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  villages: [villageSchema], // Array of villages for each mandal
});

// Define AssemblyConstituency (AC) Schema
const acSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parliamentaryConstituency: { type: String, required: true },
  PCId: { type: String, required: true },
  pocMobileNumber: { type: String, required: true },
  mandals: [mandalSchema], // Array of mandals for each AC
});

const AC = mongoose.model('AC', acSchema);

export default AC;
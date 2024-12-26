const mongoose = require('mongoose');

const dailyCountSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true, // Ensure each date is unique
  },
  count: {
    type: Number,
    default: 0, // Default count is 1 for a new entry
  },
});

const DailyCount = mongoose.model('DailyCount', dailyCountSchema);
export default DailyCount;
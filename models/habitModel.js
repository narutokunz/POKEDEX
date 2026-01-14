const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  streak: { type: Number, default: 0 },
  
  // CRITICAL CHANGE: Storing an array of dates instead of a single date
  completionHistory: [{ type: Date }],
});

module.exports = mongoose.model('Habit', habitSchema);
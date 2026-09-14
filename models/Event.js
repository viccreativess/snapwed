const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  id: String,
  guestName: String,
  message: String,
  photoIds: [String],
  photoNames: [String],
  uploadedAt: String,
});

const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  coupleNames: { type: String, required: true },
  date: String,
  welcomeMessage: String,
  coverColor: String,
  guestbook: [entrySchema],
  createdAt: String,
});

module.exports = mongoose.model('Event', eventSchema);

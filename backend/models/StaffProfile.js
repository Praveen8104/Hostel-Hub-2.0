const mongoose = require('mongoose');

const staffProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    required: true
  },
  department: {
    type: String,
    enum: ['hostel_administration', 'canteen', 'maintenance', 'security', 'other']
  },
  phone: {
    type: String,
    required: true
  },
  responsibilities: [{
    type: String
  }],
  hostelBlocks: [{
    type: String,
    enum: ['A', 'B', 'C', 'D', 'ALL']
  }],
  workingHours: {
    start: String,
    end: String
  },
  profileImage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

staffProfileSchema.index({ employeeId: 1 });
staffProfileSchema.index({ user: 1 });

module.exports = mongoose.model('StaffProfile', staffProfileSchema);
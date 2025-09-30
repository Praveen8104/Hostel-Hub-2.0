const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rollNumber: {
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
  course: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  roomNumber: {
    type: String,
    required: true
  },
  hostelBlock: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  phone: {
    type: String,
    required: true
  },
  parentPhone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  profileImage: {
    type: String,
    default: null
  },
  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },
  preferences: {
    notifications: {
      announcements: {
        type: Boolean,
        default: true
      },
      orders: {
        type: Boolean,
        default: true
      },
      outpass: {
        type: Boolean,
        default: true
      },
      maintenance: {
        type: Boolean,
        default: true
      }
    },
    dietary: {
      type: [String],
      enum: ['vegetarian', 'vegan', 'jain', 'non-vegetarian'],
      default: []
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
studentProfileSchema.index({ rollNumber: 1 });
studentProfileSchema.index({ hostelBlock: 1, roomNumber: 1 });
studentProfileSchema.index({ user: 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
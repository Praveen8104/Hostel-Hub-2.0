const mongoose = require('mongoose');

const outpassRequestSchema = new mongoose.Schema({
  // Basic Information
  reason: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  
  // Outpass Type
  type: {
    type: String,
    required: true,
    enum: [
      'home_visit',     // Going home
      'medical',        // Medical appointment/emergency
      'academic',       // Academic work, project, internship
      'personal',       // Personal work
      'family_event',   // Family function, wedding, etc.
      'emergency',      // Emergency situations
      'other'           // Other reasons
    ]
  },
  
  // Time Information
  outDate: {
    type: Date,
    required: true
  },
  outTime: {
    type: String,
    required: true,
    trim: true
  },
  inDate: {
    type: Date,
    required: true
  },
  inTime: {
    type: String,
    required: true,
    trim: true
  },
  
  // Duration calculation
  duration: {
    days: {
      type: Number,
      default: 0
    },
    hours: {
      type: Number,
      default: 0
    }
  },
  
  // Destination Information
  destination: {
    address: {
      type: String,
      required: true,
      trim: true,
      maxLength: 300
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    }
  },
  
  // Contact Information
  contactDuringLeave: {
    primaryNumber: {
      type: String,
      required: true,
      trim: true
    },
    alternateNumber: {
      type: String,
      trim: true
    },
    emailAddress: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  
  // Emergency Contact (different from student's contact)
  emergencyContact: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    relationship: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  
  // Transportation Details
  transportMode: {
    type: String,
    enum: ['bus', 'train', 'flight', 'private_vehicle', 'taxi', 'other'],
    required: true
  },
  vehicleDetails: {
    type: String,
    trim: true // Vehicle number, flight number, etc.
  },
  
  // Parent/Guardian Approval (for some hostels)
  parentApproval: {
    required: {
      type: Boolean,
      default: false
    },
    obtained: {
      type: Boolean,
      default: false
    },
    contactNumber: {
      type: String,
      trim: true
    }
  },
  
  // Status Management
  status: {
    type: String,
    enum: [
      'pending',       // Just submitted
      'under_review',  // Warden is reviewing
      'approved',      // Approved by warden
      'rejected',      // Rejected by warden
      'cancelled',     // Cancelled by student
      'checked_out',   // Student has left
      'overdue',       // Student hasn't returned on time
      'returned'       // Student has returned
    ],
    default: 'pending'
  },
  
  // Approval Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    trim: true,
    maxLength: 300
  },
  
  // Check-in/Check-out Information
  actualOutTime: {
    type: Date,
    default: null
  },
  actualInTime: {
    type: Date,
    default: null
  },
  checkedOutBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  checkedInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Request Origin
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Priority and Special Cases
  isEmergency: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: null
  },
  
  // Medical Certificate (for medical outpass)
  medicalCertificate: {
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date
  },
  
  // Status History
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'cancelled', 'checked_out', 'overdue', 'returned']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true // Gate number, security desk, etc.
    }
  }],
  
  // Additional Documentation
  supportingDocuments: [{
    type: {
      type: String,
      enum: ['medical_certificate', 'invitation_letter', 'travel_ticket', 'parent_letter', 'other']
    },
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Hostel Rules Compliance
  rulesAcknowledged: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Special Instructions
  specialInstructions: {
    type: String,
    trim: true,
    maxLength: 300
  }
}, {
  timestamps: true
});

// Indexes for performance
outpassRequestSchema.index({ requestedBy: 1 });
outpassRequestSchema.index({ status: 1 });
outpassRequestSchema.index({ type: 1 });
outpassRequestSchema.index({ outDate: 1 });
outpassRequestSchema.index({ inDate: 1 });
outpassRequestSchema.index({ reviewedBy: 1 });
outpassRequestSchema.index({ createdAt: -1 });

// Compound indexes
outpassRequestSchema.index({ status: 1, outDate: 1 });
outpassRequestSchema.index({ requestedBy: 1, status: 1 });
outpassRequestSchema.index({ reviewedBy: 1, status: 1 });

// Virtual for total duration in hours
outpassRequestSchema.virtual('totalDurationHours').get(function() {
  const outDateTime = new Date(`${this.outDate.toDateString()} ${this.outTime}`);
  const inDateTime = new Date(`${this.inDate.toDateString()} ${this.inTime}`);
  return Math.ceil((inDateTime - outDateTime) / (1000 * 60 * 60));
});

// Virtual for current status description
outpassRequestSchema.virtual('statusDescription').get(function() {
  const descriptions = {
    pending: 'Waiting for review',
    under_review: 'Under review by warden',
    approved: 'Approved - Ready for checkout',
    rejected: 'Rejected by warden',
    cancelled: 'Cancelled by student',
    checked_out: 'Student has left hostel',
    overdue: 'Return time exceeded',
    returned: 'Successfully returned'
  };
  return descriptions[this.status] || this.status;
});

// Virtual for overdue status
outpassRequestSchema.virtual('isOverdue').get(function() {
  if (this.status === 'checked_out') {
    const expectedReturn = new Date(`${this.inDate.toDateString()} ${this.inTime}`);
    return new Date() > expectedReturn;
  }
  return false;
});

// Static method to get outpass statistics
outpassRequestSchema.statics.getStats = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        checkedOut: { $sum: { $cond: [{ $eq: ['$status', 'checked_out'] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
        returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
        emergencyCount: { $sum: { $cond: ['$isEmergency', 1, 0] } }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    total: 0,
    pending: 0,
    approved: 0,
    checkedOut: 0,
    overdue: 0,
    returned: 0,
    emergencyCount: 0
  };
};

// Instance method to update status with history
outpassRequestSchema.methods.updateStatus = function(newStatus, changedBy, notes = '', location = '') {
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    changedBy: changedBy,
    notes: notes,
    location: location
  });
  
  // Update current status
  this.status = newStatus;
  
  // Set review information for approval/rejection
  if (newStatus === 'approved' || newStatus === 'rejected') {
    this.reviewedBy = changedBy;
    this.reviewedAt = new Date();
    if (notes) this.reviewNotes = notes;
  }
  
  // Set actual times
  if (newStatus === 'checked_out') {
    this.actualOutTime = new Date();
    this.checkedOutBy = changedBy;
  } else if (newStatus === 'returned') {
    this.actualInTime = new Date();
    this.checkedInBy = changedBy;
  }
  
  return this.save();
};

// Instance method to check if overdue
outpassRequestSchema.methods.checkOverdueStatus = function() {
  if (this.status === 'checked_out' && this.isOverdue) {
    return this.updateStatus('overdue', null, 'Automatic status update - Return time exceeded');
  }
  return Promise.resolve(this);
};

// Calculate duration before saving
outpassRequestSchema.pre('save', function(next) {
  if (this.outDate && this.inDate && this.outTime && this.inTime) {
    const outDateTime = new Date(`${this.outDate.toDateString()} ${this.outTime}`);
    const inDateTime = new Date(`${this.inDate.toDateString()} ${this.inTime}`);
    const diffMs = inDateTime - outDateTime;
    
    this.duration.days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    this.duration.hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  }
  
  // Add initial status to history for new requests
  if (this.isNew) {
    this.statusHistory.push({
      status: 'pending',
      changedBy: this.requestedBy,
      notes: 'Outpass request submitted'
    });
  }
  
  next();
});

module.exports = mongoose.model('OutpassRequest', outpassRequestSchema);
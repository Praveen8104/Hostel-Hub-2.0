const express = require('express');
const { body, param, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const OutpassRequest = require('../models/OutpassRequest');
const { authenticate, requireStudent, requireWarden } = require('../middleware/auth');

const router = express.Router();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/outpass');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'outpass-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 3 // Maximum 3 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// POST /api/outpass/request - Create outpass request (Students only)
router.post('/request', [
  authenticate,
  requireStudent,
  upload.array('documents', 3),
  body('reason').notEmpty().withMessage('Reason is required').isLength({ max: 500 }),
  body('type').isIn(['home_visit', 'medical', 'academic', 'personal', 'family_event', 'emergency', 'other']),
  body('outDate').isISO8601().withMessage('Valid out date required'),
  body('outTime').notEmpty().withMessage('Out time is required'),
  body('inDate').isISO8601().withMessage('Valid in date required'),
  body('inTime').notEmpty().withMessage('In time is required'),
  body('destination.address').notEmpty().withMessage('Destination address is required'),
  body('destination.city').notEmpty().withMessage('Destination city is required'),
  body('destination.state').notEmpty().withMessage('Destination state is required'),
  body('contactDuringLeave.primaryNumber').isMobilePhone().withMessage('Valid primary contact number required'),
  body('emergencyContact.name').notEmpty().withMessage('Emergency contact name is required'),
  body('emergencyContact.relationship').notEmpty().withMessage('Emergency contact relationship is required'),
  body('emergencyContact.phoneNumber').isMobilePhone().withMessage('Valid emergency contact number required'),
  body('transportMode').isIn(['bus', 'train', 'flight', 'private_vehicle', 'taxi', 'other']),
  body('rulesAcknowledged').isBoolean().withMessage('Rules acknowledgment required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      reason,
      type,
      outDate,
      outTime,
      inDate,
      inTime,
      destination,
      contactDuringLeave,
      emergencyContact,
      transportMode,
      vehicleDetails,
      parentApproval,
      isEmergency = false,
      specialInstructions,
      rulesAcknowledged
    } = req.body;

    // Validate dates
    const outDateTime = new Date(`${outDate}T${outTime}`);
    const inDateTime = new Date(`${inDate}T${inTime}`);
    
    if (outDateTime >= inDateTime) {
      return res.status(400).json({
        error: 'In date/time must be after out date/time'
      });
    }

    if (outDateTime < new Date()) {
      return res.status(400).json({
        error: 'Out date/time cannot be in the past'
      });
    }

    // Process uploaded documents
    const supportingDocuments = req.files ? req.files.map(file => ({
      type: 'other', // Can be enhanced to detect document type
      filename: file.filename,
      originalName: file.originalname,
      path: file.path
    })) : [];

    const outpassRequest = new OutpassRequest({
      reason,
      type,
      outDate: new Date(outDate),
      outTime,
      inDate: new Date(inDate),
      inTime,
      destination: {
        address: destination.address,
        city: destination.city,
        state: destination.state,
        pincode: destination.pincode
      },
      contactDuringLeave: {
        primaryNumber: contactDuringLeave.primaryNumber,
        alternateNumber: contactDuringLeave.alternateNumber,
        emailAddress: contactDuringLeave.emailAddress
      },
      emergencyContact: {
        name: emergencyContact.name,
        relationship: emergencyContact.relationship,
        phoneNumber: emergencyContact.phoneNumber,
        address: emergencyContact.address
      },
      transportMode,
      vehicleDetails,
      parentApproval: parentApproval || { required: false, obtained: false },
      isEmergency,
      specialInstructions,
      rulesAcknowledged,
      supportingDocuments,
      requestedBy: req.user.id
    });

    await outpassRequest.save();
    await outpassRequest.populate('requestedBy', 'firstName lastName identifier');

    res.status(201).json({
      success: true,
      message: 'Outpass request submitted successfully',
      data: outpassRequest
    });

  } catch (error) {
    console.error('Create outpass request error:', error);
    res.status(500).json({
      error: 'Failed to create outpass request',
      details: error.message
    });
  }
});

// GET /api/outpass/requests - Get outpass requests (Role-based access)
router.get('/requests', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter based on user role
    let filter = {};
    
    // Students can only see their own requests
    if (req.user.role === 'student') {
      filter.requestedBy = req.user.id;
    }
    // Wardens and admins can see all requests
    else if (req.user.role === 'warden' || req.user.role === 'admin') {
      // Can see all requests
    } else {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Apply additional filters
    if (status) filter.status = status;
    if (type) filter.type = type;

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const requests = await OutpassRequest.find(filter)
      .populate('requestedBy', 'firstName lastName identifier')
      .populate('reviewedBy', 'firstName lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await OutpassRequest.countDocuments(filter);

    res.json({
      success: true,
      message: 'Outpass requests retrieved successfully',
      data: {
        requests,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get outpass requests error:', error);
    res.status(500).json({
      error: 'Failed to fetch outpass requests',
      details: error.message
    });
  }
});

// GET /api/outpass/request/:id - Get specific outpass request
router.get('/request/:id', [
  authenticate,
  param('id').isMongoId().withMessage('Valid request ID required')
], async (req, res) => {
  try {
    const { id } = req.params;

    const request = await OutpassRequest.findById(id)
      .populate('requestedBy', 'firstName lastName identifier')
      .populate('reviewedBy', 'firstName lastName')
      .populate('checkedOutBy', 'firstName lastName')
      .populate('checkedInBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName');

    if (!request) {
      return res.status(404).json({
        error: 'Outpass request not found'
      });
    }

    // Check permissions - students can only view their own requests
    if (req.user.role === 'student' && request.requestedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      message: 'Outpass request retrieved successfully',
      data: request
    });

  } catch (error) {
    console.error('Get outpass request error:', error);
    res.status(500).json({
      error: 'Failed to fetch outpass request',
      details: error.message
    });
  }
});

// PUT /api/outpass/request/:id/review - Review outpass request (Warden only)
router.put('/request/:id/review', [
  authenticate,
  requireWarden,
  param('id').isMongoId().withMessage('Valid request ID required'),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reviewNotes').optional().isLength({ max: 300 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    const request = await OutpassRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        error: 'Outpass request not found'
      });
    }

    // Can only review pending or under_review requests
    if (!['pending', 'under_review'].includes(request.status)) {
      return res.status(400).json({
        error: 'Can only review pending or under review requests'
      });
    }

    // Update status using the model method
    await request.updateStatus(status, req.user.id, reviewNotes);

    await request.populate(['requestedBy', 'reviewedBy']);

    res.json({
      success: true,
      message: `Outpass request ${status} successfully`,
      data: request
    });

  } catch (error) {
    console.error('Review outpass request error:', error);
    res.status(500).json({
      error: 'Failed to review outpass request',
      details: error.message
    });
  }
});

// GET /api/outpass/stats - Get outpass statistics (Warden/Admin only)
router.get('/stats', requireWarden, async (req, res) => {
  try {
    const { period = 'month', type } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    if (period === 'week') {
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const filter = {};
    if (startDate) filter.createdAt = { $gte: startDate };
    if (type) filter.type = type;

    const stats = await OutpassRequest.getStats(filter);

    // Get type-wise breakdown
    const typeStats = await OutpassRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      }
    ]);

    // Get currently checked out students
    const checkedOutStudents = await OutpassRequest.find({
      status: 'checked_out'
    }).populate('requestedBy', 'firstName lastName identifier');

    // Get overdue students
    const overdueStudents = await OutpassRequest.find({
      status: 'overdue'
    }).populate('requestedBy', 'firstName lastName identifier');

    res.json({
      success: true,
      message: 'Outpass statistics retrieved successfully',
      data: {
        overview: stats,
        typeBreakdown: typeStats,
        currentlyOut: {
          checkedOut: checkedOutStudents,
          overdue: overdueStudents
        },
        period,
        dateRange: { start: startDate, end: now }
      }
    });

  } catch (error) {
    console.error('Get outpass stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

module.exports = router;
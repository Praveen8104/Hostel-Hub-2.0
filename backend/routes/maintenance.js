const express = require('express');
const { body, param, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MaintenanceRequest = require('../models/MaintenanceRequest');
const { authenticate, requireStudent, requireStaff, requireWarden } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/maintenance');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'maintenance-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
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

// POST /api/maintenance/request - Create maintenance request (Students only)
router.post('/request', [
  authenticate,
  requireStudent,
  upload.array('photos', 5),
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').notEmpty().withMessage('Description is required').isLength({ max: 1000 }),
  body('category').isIn(['electrical', 'plumbing', 'furniture', 'internet', 'ac_heating', 'lighting', 'door_window', 'cleaning', 'security', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('location.building').notEmpty().withMessage('Building is required'),
  body('location.floor').isInt({ min: 0 }).withMessage('Valid floor number required'),
  body('location.roomNumber').notEmpty().withMessage('Room number is required'),
  body('contactNumber').optional().isMobilePhone(),
  body('preferredTimeSlot').optional().isIn(['morning', 'afternoon', 'evening', 'anytime'])
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
      title,
      description,
      category,
      priority = 'medium',
      location,
      contactNumber,
      preferredTimeSlot = 'anytime',
      isEmergency = false
    } = req.body;

    // Process uploaded photos
    const photos = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size
    })) : [];

    const maintenanceRequest = new MaintenanceRequest({
      title,
      description,
      category,
      priority,
      location: {
        building: location.building,
        floor: parseInt(location.floor),
        roomNumber: location.roomNumber,
        specificLocation: location.specificLocation
      },
      photos,
      contactNumber,
      preferredTimeSlot,
      isEmergency,
      requestedBy: req.user.id
    });

    await maintenanceRequest.save();

    await maintenanceRequest.populate('requestedBy', 'firstName lastName identifier');

    res.status(201).json({
      success: true,
      message: 'Maintenance request submitted successfully',
      data: maintenanceRequest
    });

  } catch (error) {
    console.error('Create maintenance request error:', error);
    res.status(500).json({
      error: 'Failed to create maintenance request',
      details: error.message
    });
  }
});

// GET /api/maintenance/requests - Get maintenance requests (Role-based access)
router.get('/requests', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      building,
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter based on user role
    let filter = {};
    
    // Students can only see their own requests
    if (req.user.role === 'student') {
      filter.requestedBy = req.user.id;
    }
    // Staff can see assigned requests or all if admin/warden
    else if (req.user.role === 'warden' || req.user.role === 'admin') {
      // Wardens and admins can see all requests
    } else if (req.user.role === 'maintenance_staff') {
      // Maintenance staff see assigned requests and unassigned ones
      filter.$or = [
        { assignedTo: req.user.id },
        { assignedTo: null }
      ];
    }

    // Apply additional filters
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (building) filter['location.building'] = building;
    if (assignedTo) filter.assignedTo = assignedTo;

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const requests = await MaintenanceRequest.find(filter)
      .populate('requestedBy', 'firstName lastName identifier')
      .populate('assignedTo', 'firstName lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MaintenanceRequest.countDocuments(filter);

    res.json({
      success: true,
      message: 'Maintenance requests retrieved successfully',
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
    console.error('Get maintenance requests error:', error);
    res.status(500).json({
      error: 'Failed to fetch maintenance requests',
      details: error.message
    });
  }
});

// GET /api/maintenance/request/:id - Get specific maintenance request
router.get('/request/:id', [
  authenticate,
  param('id').isMongoId().withMessage('Valid request ID required')
], async (req, res) => {
  try {
    const { id } = req.params;

    const request = await MaintenanceRequest.findById(id)
      .populate('requestedBy', 'firstName lastName identifier')
      .populate('assignedTo', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName');

    if (!request) {
      return res.status(404).json({
        error: 'Maintenance request not found'
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
      message: 'Maintenance request retrieved successfully',
      data: request
    });

  } catch (error) {
    console.error('Get maintenance request error:', error);
    res.status(500).json({
      error: 'Failed to fetch maintenance request',
      details: error.message
    });
  }
});

// PUT /api/maintenance/request/:id/status - Update request status (Staff only)
router.put('/request/:id/status', [
  authenticate,
  requireStaff,
  param('id').isMongoId().withMessage('Valid request ID required'),
  body('status').isIn(['acknowledged', 'in_progress', 'waiting_parts', 'completed', 'cancelled', 'rejected']),
  body('notes').optional().isLength({ max: 500 })
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
    const { status, notes, resolutionNotes, estimatedCost, actualCost } = req.body;

    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        error: 'Maintenance request not found'
      });
    }

    // Update status using the model method
    await request.updateStatus(status, req.user.id, notes);

    // Update additional fields if provided
    if (resolutionNotes && status === 'completed') {
      request.resolutionNotes = resolutionNotes;
    }
    if (estimatedCost !== undefined) {
      request.estimatedCost = estimatedCost;
    }
    if (actualCost !== undefined) {
      request.actualCost = actualCost;
    }

    await request.save();
    await request.populate(['requestedBy', 'assignedTo']);

    res.json({
      success: true,
      message: 'Request status updated successfully',
      data: request
    });

  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({
      error: 'Failed to update request status',
      details: error.message
    });
  }
});

// PUT /api/maintenance/request/:id/assign - Assign request to staff (Warden/Admin only)
router.put('/request/:id/assign', [
  authenticate,
  requireWarden,
  param('id').isMongoId().withMessage('Valid request ID required'),
  body('assignedTo').isMongoId().withMessage('Valid staff ID required'),
  body('expectedCompletionDate').optional().isISO8601()
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
    const { assignedTo, expectedCompletionDate, notes } = req.body;

    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        error: 'Maintenance request not found'
      });
    }

    // Update assignment
    request.assignedTo = assignedTo;
    request.assignedAt = new Date();
    if (expectedCompletionDate) {
      request.expectedCompletionDate = new Date(expectedCompletionDate);
    }

    // Update status to acknowledged if still pending
    if (request.status === 'pending') {
      await request.updateStatus('acknowledged', req.user.id, notes || 'Request assigned to staff');
    }

    await request.save();
    await request.populate(['requestedBy', 'assignedTo']);

    res.json({
      success: true,
      message: 'Request assigned successfully',
      data: request
    });

  } catch (error) {
    console.error('Assign request error:', error);
    res.status(500).json({
      error: 'Failed to assign request',
      details: error.message
    });
  }
});

// POST /api/maintenance/request/:id/rating - Rate completed request (Students only)
router.post('/request/:id/rating', [
  authenticate,
  requireStudent,
  param('id').isMongoId().withMessage('Valid request ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isLength({ max: 500 })
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
    const { rating, feedback } = req.body;

    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        error: 'Maintenance request not found'
      });
    }

    // Check if request belongs to the student
    if (request.requestedBy.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Check if request is completed
    if (request.status !== 'completed') {
      return res.status(400).json({
        error: 'Can only rate completed requests'
      });
    }

    // Update rating
    request.studentRating = rating;
    if (feedback) request.studentFeedback = feedback;
    
    await request.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: { rating, feedback }
    });

  } catch (error) {
    console.error('Rate request error:', error);
    res.status(500).json({
      error: 'Failed to submit rating',
      details: error.message
    });
  }
});

// GET /api/maintenance/stats - Get maintenance statistics (Staff/Admin only)
router.get('/stats', requireStaff, async (req, res) => {
  try {
    const { period = 'month', building, category } = req.query;

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
    if (building) filter['location.building'] = building;
    if (category) filter.category = category;

    const stats = await MaintenanceRequest.getStats(filter);

    // Get category-wise breakdown
    const categoryStats = await MaintenanceRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$studentRating' },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    // Get priority-wise breakdown
    const priorityStats = await MaintenanceRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      message: 'Maintenance statistics retrieved successfully',
      data: {
        overview: stats,
        categoryBreakdown: categoryStats,
        priorityBreakdown: priorityStats,
        period,
        dateRange: { start: startDate, end: now }
      }
    });

  } catch (error) {
    console.error('Get maintenance stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

// DELETE /api/maintenance/request/:id - Cancel maintenance request (Student only, pending requests)
router.delete('/request/:id', [
  authenticate,
  requireStudent,
  param('id').isMongoId().withMessage('Valid request ID required')
], async (req, res) => {
  try {
    const { id } = req.params;

    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        error: 'Maintenance request not found'
      });
    }

    // Check ownership
    if (request.requestedBy.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Can only cancel pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only cancel pending requests'
      });
    }

    await request.updateStatus('cancelled', req.user.id, 'Cancelled by student');

    res.json({
      success: true,
      message: 'Maintenance request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel maintenance request error:', error);
    res.status(500).json({
      error: 'Failed to cancel request',
      details: error.message
    });
  }
});

module.exports = router;
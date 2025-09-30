const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const StaffProfile = require('../models/StaffProfile');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('identifier').notEmpty().withMessage('Roll number or Employee ID is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const registerValidation = [
  body('identifier').notEmpty().withMessage('Roll number or Employee ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required')
];

// Generate JWT tokens
const generateTokens = (user) => {
  const payload = {
    userId: user._id,
    identifier: user.identifier,
    role: user.role
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });

  return { accessToken, refreshToken };
};

// Determine user role from identifier
const determineRole = (identifier) => {
  if (identifier.match(/^\d{4}[A-Z]{3}\d{3}$/)) {
    return 'student';
  } else if (identifier.startsWith('EMP')) {
    return 'warden';
  } else if (identifier.startsWith('CANT')) {
    return 'canteen_owner';
  } else if (identifier.startsWith('ADM')) {
    return 'admin';
  }
  return 'student'; // default
};

// Extract hostel info from roll number
const extractHostelInfo = (rollNumber) => {
  const year = parseInt(rollNumber.substring(0, 4));
  const branch = rollNumber.substring(4, 7);
  const rollNum = parseInt(rollNumber.substring(7));
  
  // Simple logic for hostel block assignment
  let hostelBlock;
  if (rollNum <= 50) hostelBlock = 'A';
  else if (rollNum <= 100) hostelBlock = 'B';
  else if (rollNum <= 150) hostelBlock = 'C';
  else hostelBlock = 'D';
  
  return { year, branch, hostelBlock };
};

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { identifier, password, deviceToken, platform } = req.body;

    // Find user
    const user = await User.findOne({ 
      identifier: identifier.toUpperCase(),
      isActive: true 
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login and device token
    user.lastLogin = new Date();
    
    if (deviceToken && platform) {
      // Remove old tokens and add new one
      user.deviceTokens = user.deviceTokens.filter(dt => dt.token !== deviceToken);
      user.deviceTokens.push({
        token: deviceToken,
        platform: platform,
        lastUsed: new Date()
      });
    }
    
    await user.save();

    // Fetch profile data
    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfile.findOne({ user: user._id });
    } else {
      profile = await StaffProfile.findOne({ user: user._id });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        identifier: user.identifier,
        email: user.email,
        role: user.role,
        profile: profile
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      identifier, 
      email, 
      password, 
      name, 
      phone, 
      course, 
      year, 
      roomNumber,
      parentPhone,
      designation,
      department 
    } = req.body;

    const role = determineRole(identifier);

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { identifier: identifier.toUpperCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        field: existingUser.identifier === identifier.toUpperCase() ? 'identifier' : 'email',
        code: 'USER_EXISTS'
      });
    }

    // Create user
    const user = new User({
      identifier: identifier.toUpperCase(),
      email: email.toLowerCase(),
      password,
      role
    });

    await user.save();

    // Create profile based on role
    if (role === 'student') {
      const { branch, hostelBlock } = extractHostelInfo(identifier);
      
      const studentProfile = new StudentProfile({
        user: user._id,
        rollNumber: identifier.toUpperCase(),
        name,
        course: course || branch,
        year: year || new Date().getFullYear() - parseInt(identifier.substring(0, 4)) + 1,
        roomNumber: roomNumber || 'TBD',
        hostelBlock,
        phone,
        parentPhone
      });

      await studentProfile.save();
    } else {
      const staffProfile = new StaffProfile({
        user: user._id,
        employeeId: identifier.toUpperCase(),
        name,
        designation: designation || 'Staff',
        department: department || 'other',
        phone,
        hostelBlocks: ['ALL']
      });

      await staffProfile.save();
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        identifier: user.identifier,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.json({
      success: true,
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      code: 'REFRESH_FAILED'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { deviceToken } = req.body;
    
    if (deviceToken) {
      const user = await User.findById(req.user.id);
      user.deviceTokens = user.deviceTokens.filter(dt => dt.token !== deviceToken);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfile.findOne({ user: user._id });
    } else {
      profile = await StaffProfile.findOne({ user: user._id });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        identifier: user.identifier,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        profile: profile
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

module.exports = router;
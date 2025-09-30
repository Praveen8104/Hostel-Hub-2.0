const mongoose = require('mongoose');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const StaffProfile = require('../models/StaffProfile');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-hub');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await StaffProfile.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create Admin User
    const adminUser = new User({
      identifier: 'ADM001',
      email: 'admin@hostelhub.com',
      password: 'admin123456',
      role: 'admin'
    });
    await adminUser.save();

    const adminProfile = new StaffProfile({
      user: adminUser._id,
      employeeId: 'ADM001',
      name: 'System Administrator',
      designation: 'Super Admin',
      department: 'hostel_administration',
      phone: '9999999999',
      responsibilities: ['System Management', 'User Management', 'Analytics'],
      hostelBlocks: ['ALL']
    });
    await adminProfile.save();
    console.log('👨‍💻 Created admin user: ADM001 / admin123456');

    // Create Warden User
    const wardenUser = new User({
      identifier: 'EMP001',
      email: 'warden@hostelhub.com', 
      password: 'warden123456',
      role: 'warden'
    });
    await wardenUser.save();

    const wardenProfile = new StaffProfile({
      user: wardenUser._id,
      employeeId: 'EMP001',
      name: 'Mr. Rajesh Sharma',
      designation: 'Hostel Warden',
      department: 'hostel_administration',
      phone: '9876543210',
      responsibilities: ['Student Discipline', 'Outpass Approval', 'Maintenance Oversight'],
      hostelBlocks: ['A', 'B'],
      workingHours: { start: '08:00', end: '20:00' }
    });
    await wardenProfile.save();
    console.log('👨‍💼 Created warden user: EMP001 / warden123456');

    // Create Canteen Owner User
    const canteenUser = new User({
      identifier: 'CANT001',
      email: 'canteen@hostelhub.com',
      password: 'canteen123456', 
      role: 'canteen_owner'
    });
    await canteenUser.save();

    const canteenProfile = new StaffProfile({
      user: canteenUser._id,
      employeeId: 'CANT001',
      name: 'Mr. Suresh Patel',
      designation: 'Canteen Manager',
      department: 'canteen',
      phone: '9876543211',
      responsibilities: ['Food Service', 'Order Management', 'Menu Planning'],
      hostelBlocks: ['ALL'],
      workingHours: { start: '06:00', end: '22:00' }
    });
    await canteenProfile.save();
    console.log('👨‍🍳 Created canteen user: CANT001 / canteen123456');

    // Create Sample Students
    const students = [
      {
        rollNumber: '2022CSE001',
        name: 'Rahul Kumar',
        course: 'Computer Science Engineering',
        year: 3,
        email: 'rahul.kumar@student.edu',
        phone: '9876543212',
        parentPhone: '9876543213',
        roomNumber: '204'
      },
      {
        rollNumber: '2022CSE052',
        name: 'Priya Sharma',
        course: 'Computer Science Engineering', 
        year: 3,
        email: 'priya.sharma@student.edu',
        phone: '9876543214',
        parentPhone: '9876543215',
        roomNumber: '156'
      },
      {
        rollNumber: '2022ECE101',
        name: 'Amit Singh',
        course: 'Electronics & Communication',
        year: 3,
        email: 'amit.singh@student.edu',
        phone: '9876543216',
        parentPhone: '9876543217',
        roomNumber: '305'
      },
      {
        rollNumber: '2021ME151',
        name: 'Sneha Patel',
        course: 'Mechanical Engineering',
        year: 4,
        email: 'sneha.patel@student.edu',
        phone: '9876543218',
        parentPhone: '9876543219',
        roomNumber: '410'
      }
    ];

    for (const studentData of students) {
      const { rollNumber, name, course, year, email, phone, parentPhone, roomNumber } = studentData;
      
      // Determine hostel block based on roll number
      const rollNum = parseInt(rollNumber.substring(7));
      let hostelBlock;
      if (rollNum <= 50) hostelBlock = 'A';
      else if (rollNum <= 100) hostelBlock = 'B'; 
      else if (rollNum <= 150) hostelBlock = 'C';
      else hostelBlock = 'D';

      const user = new User({
        identifier: rollNumber,
        email: email,
        password: 'student123456',
        role: 'student'
      });
      await user.save();

      const profile = new StudentProfile({
        user: user._id,
        rollNumber,
        name,
        course,
        year,
        roomNumber,
        hostelBlock,
        phone,
        parentPhone,
        address: {
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001'
        },
        emergencyContact: {
          name: 'Parent',
          relation: 'Father',
          phone: parentPhone
        }
      });
      await profile.save();
      
      console.log(`👨‍🎓 Created student: ${rollNumber} / student123456`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('Admin: ADM001 / admin123456');
    console.log('Warden: EMP001 / warden123456'); 
    console.log('Canteen: CANT001 / canteen123456');
    console.log('Students: [rollNumber] / student123456');
    console.log('Example: 2022CSE001 / student123456');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
};

// Run seeder
seedDatabase();
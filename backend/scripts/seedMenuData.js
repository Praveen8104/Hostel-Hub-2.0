const mongoose = require('mongoose');
const MessMenu = require('../models/MessMenu');
const MealRating = require('../models/MealRating');
const User = require('../models/User');
require('dotenv').config();

const seedMenuData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-hub');
    console.log('✅ Connected to MongoDB for menu seeding');

    // Find admin user for menu creation
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run the main seeder first.');
      return;
    }

    // Clear existing menu data
    await MessMenu.deleteMany({});
    await MealRating.deleteMany({});
    console.log('🧹 Cleared existing menu data');

    // Sample menu items
    const menuItems = {
      breakfast: [
        {
          name: 'Aloo Paratha',
          description: 'Stuffed potato flatbread with butter',
          category: 'main',
          isVegetarian: true,
          calories: 320
        },
        {
          name: 'Curd',
          description: 'Fresh homemade yogurt',
          category: 'side',
          isVegetarian: true,
          calories: 80
        },
        {
          name: 'Pickle',
          description: 'Mixed vegetable pickle',
          category: 'side',
          isVegetarian: true,
          calories: 25
        },
        {
          name: 'Tea/Coffee',
          description: 'Hot beverage of choice',
          category: 'beverage',
          isVegetarian: true,
          calories: 50
        }
      ],
      lunch: [
        {
          name: 'Steamed Rice',
          description: 'Basmati rice',
          category: 'main',
          isVegetarian: true,
          calories: 205
        },
        {
          name: 'Dal Tadka',
          description: 'Tempered yellow lentils',
          category: 'main',
          isVegetarian: true,
          calories: 180
        },
        {
          name: 'Mixed Vegetable Curry',
          description: 'Seasonal vegetables in curry',
          category: 'main',
          isVegetarian: true,
          calories: 150
        },
        {
          name: 'Roti',
          description: 'Whole wheat flatbread (3 pieces)',
          category: 'bread',
          isVegetarian: true,
          calories: 240
        },
        {
          name: 'Salad',
          description: 'Fresh cucumber and tomato salad',
          category: 'side',
          isVegetarian: true,
          calories: 30
        }
      ],
      dinner: [
        {
          name: 'Jeera Rice',
          description: 'Cumin flavored rice',
          category: 'main',
          isVegetarian: true,
          calories: 220
        },
        {
          name: 'Paneer Butter Masala',
          description: 'Cottage cheese in rich tomato gravy',
          category: 'main',
          isVegetarian: true,
          calories: 300
        },
        {
          name: 'Rajma',
          description: 'Red kidney beans curry',
          category: 'main',
          isVegetarian: true,
          calories: 200
        },
        {
          name: 'Chapati',
          description: 'Soft wheat flatbread (3 pieces)',
          category: 'bread',
          isVegetarian: true,
          calories: 240
        },
        {
          name: 'Raita',
          description: 'Yogurt with cucumber and spices',
          category: 'side',
          isVegetarian: true,
          calories: 60
        }
      ]
    };

    const mealTimings = {
      breakfast: { start: '07:30', end: '09:30' },
      lunch: { start: '12:30', end: '14:30' },
      dinner: { start: '19:30', end: '21:30' }
    };

    // Create menus for the next 7 days
    const menus = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      
      // Create breakfast, lunch, and dinner for each day
      for (const [mealType, items] of Object.entries(menuItems)) {
        // Vary the menu slightly for different days
        let dayItems = [...items];
        
        // Add some variety for different days
        if (i % 2 === 0 && mealType === 'breakfast') {
          dayItems[0] = {
            name: 'Poha',
            description: 'Flattened rice with vegetables',
            category: 'main',
            isVegetarian: true,
            calories: 250
          };
        }
        
        if (i % 3 === 0 && mealType === 'lunch') {
          dayItems[2] = {
            name: 'Chicken Curry',
            description: 'Spicy chicken curry',
            category: 'main',
            isVegetarian: false,
            calories: 280
          };
        }

        const menu = new MessMenu({
          date: currentDate,
          mealType: mealType,
          items: dayItems,
          timings: mealTimings[mealType],
          specialNotes: i === 0 ? 'Fresh ingredients from local market' : '',
          queueStatus: ['light', 'medium', 'heavy'][Math.floor(Math.random() * 3)],
          estimatedWaitTime: Math.floor(Math.random() * 20) + 5,
          createdBy: adminUser._id
        });

        menus.push(menu);
      }
    }

    // Save all menus
    await MessMenu.insertMany(menus);
    console.log(`🍽️ Created ${menus.length} menu entries for 7 days`);

    // Create some sample ratings
    const students = await User.find({ role: 'student' }).limit(4);
    if (students.length > 0) {
      const ratings = [];
      
      // Get today's menus for rating
      const todayMenus = menus.filter(menu => {
        const menuDate = new Date(menu.date);
        const todayDate = new Date();
        return menuDate.toDateString() === todayDate.toDateString();
      });

      // Create ratings from different students
      for (const menu of todayMenus.slice(0, 2)) { // Rate only first 2 meals of today
        for (let i = 0; i < Math.min(students.length, 3); i++) {
          const student = students[i];
          
          const rating = new MealRating({
            user: student._id,
            menuId: menu._id,
            rating: Math.floor(Math.random() * 3) + 3, // Rating between 3-5
            taste: Math.floor(Math.random() * 2) + 4, // 4-5
            quality: Math.floor(Math.random() * 2) + 3, // 3-4
            quantity: Math.floor(Math.random() * 2) + 4, // 4-5
            feedback: [
              'Good taste and quality!',
              'Could be a bit spicier.',
              'Loved the variety of items.',
              'Fresh and hot food.',
              'Well cooked and tasty.'
            ][Math.floor(Math.random() * 5)],
            improvements: [['taste'], ['quality'], ['variety'], ['temperature']][Math.floor(Math.random() * 4)],
            wouldRecommend: Math.random() > 0.3, // 70% would recommend
            anonymous: Math.random() > 0.5 // 50% anonymous
          });

          ratings.push(rating);
        }
      }

      await MealRating.insertMany(ratings);
      console.log(`⭐ Created ${ratings.length} sample ratings`);
    }

    console.log('\n🎉 Menu data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created menus for 7 days (${menus.length} total menus)`);
    console.log('- Each day has breakfast, lunch, and dinner');
    console.log('- Added sample ratings from students');
    console.log('- Menus include nutritional information');
    console.log('- Queue status and wait times included');

    console.log('\n🍽️ Sample API Calls:');
    console.log('GET /api/dining/menu/2025-10-01 - Today\'s menu');
    console.log('GET /api/dining/menu/week/2025-10-01 - Weekly menu');
    console.log('POST /api/dining/rating - Rate a meal');

  } catch (error) {
    console.error('❌ Menu seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
};

// Run seeder
seedMenuData();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Order = require('../models/Order');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});

    const salt = await bcrypt.genSalt(12);

    const users = [
      {
        email: 'admin@delivery.com',
        password: await bcrypt.hash('admin123', salt),
        name: 'System Admin',
        role: 'admin',
        phone: '+1234567890'
      },
      {
        email: 'customer@test.com',
        password: await bcrypt.hash('customer123', salt),
        name: 'John Customer',
        role: 'customer',
        phone: '+1234567891'
      },
      {
        email: 'driver@test.com',
        password: await bcrypt.hash('driver123', salt),
        name: 'Mike Driver',
        role: 'driver',
        phone: '+1234567892',
        vehicleInfo: 'Honda Civic 2020',
        licenseNumber: 'DL123456789',
        expoPushToken: 'ExponentPushToken[demo-token-for-testing]',
        expoPushTokenUpdatedAt: new Date()
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log('✅ Users seeded successfully');
    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedOrders = async (users) => {
  try {
    // Clear existing orders
    await Order.deleteMany({});

    const customer = users.find(u => u.role === 'customer');
    const driver = users.find(u => u.role === 'driver');

    const orders = [
      {
        customerId: customer._id,
        address: '123 Main St, New York, NY',
        lat: 40.7128,
        lng: -74.0060,
        notes: 'Please ring the doorbell',
        status: 'pending'
      },
      {
        customerId: customer._id,
        driverId: driver._id,
        address: '456 Oak Ave, Brooklyn, NY',
        lat: 40.6782,
        lng: -73.9442,
        notes: 'Leave at front door',
        status: 'in-progress',
        assignedAt: new Date(Date.now() - 3600000), // 1 hour ago
        startedAt: new Date(Date.now() - 1800000)   // 30 minutes ago
      },
      {
        customerId: customer._id,
        driverId: driver._id,
        address: '789 Pine St, Queens, NY',
        lat: 40.7282,
        lng: -73.7949,
        notes: 'Apartment 4B',
        status: 'completed',
        assignedAt: new Date(Date.now() - 7200000), // 2 hours ago
        startedAt: new Date(Date.now() - 5400000),  // 1.5 hours ago
        completedAt: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ];

    await Order.insertMany(orders);
    console.log('✅ Orders seeded successfully');
  } catch (error) {
    console.error('Error seeding orders:', error);
  }
};

const seedData = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seeding...');
    
    const users = await seedUsers();
    await seedOrders(users);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('Admin: admin@delivery.com / admin123');
    console.log('Customer: customer@test.com / customer123');
    console.log('Driver: driver@test.com / driver123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
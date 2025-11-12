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
      // Admins
      {
        email: 'admin@delivery.com',
        password: await bcrypt.hash('admin123', salt),
        name: 'System Admin',
        role: 'admin',
        phone: '+1234567890'
      },
      {
        email: 'admin2@delivery.com',
        password: await bcrypt.hash('admin123', salt),
        name: 'Admin Manager',
        role: 'admin',
        phone: '+1234567891'
      },
      
      // Customers
      {
        email: 'customer1@test.com',
        password: await bcrypt.hash('customer123', salt),
        name: 'John Customer',
        role: 'customer',
        phone: '+1234567892'
      },
      {
        email: 'customer2@test.com',
        password: await bcrypt.hash('customer123', salt),
        name: 'Jane Smith',
        role: 'customer',
        phone: '+1234567893'
      },
      {
        email: 'customer3@test.com',
        password: await bcrypt.hash('customer123', salt),
        name: 'Bob Wilson',
        role: 'customer',
        phone: '+1234567894'
      },
      
      // Drivers
      {
        email: 'driver1@test.com',
        password: await bcrypt.hash('driver123', salt),
        name: 'Mike Driver',
        role: 'driver',
        phone: '+1234567895',
        vehicleInfo: 'Honda Civic 2020 - Blue',
        licenseNumber: 'DL123456789',
        fcmToken: 'demo-fcm-token-driver1-for-testing',
        fcmTokenUpdatedAt: new Date()
      },
      {
        email: 'driver2@test.com',
        password: await bcrypt.hash('driver123', salt),
        name: 'Sarah Johnson',
        role: 'driver',
        phone: '+1234567896',
        vehicleInfo: 'Toyota Camry 2021 - White',
        licenseNumber: 'DL987654321',
        fcmToken: 'demo-fcm-token-driver2-for-testing',
        fcmTokenUpdatedAt: new Date()
      },
      {
        email: 'driver3@test.com',
        password: await bcrypt.hash('driver123', salt),
        name: 'Carlos Rodriguez',
        role: 'driver',
        phone: '+1234567897',
        vehicleInfo: 'Ford Focus 2019 - Red',
        licenseNumber: 'DL456789123',
        fcmToken: 'demo-fcm-token-driver3-for-testing',
        fcmTokenUpdatedAt: new Date()
      },
      {
        email: 'driver4@test.com',
        password: await bcrypt.hash('driver123', salt),
        name: 'Lisa Chen',
        role: 'driver',
        phone: '+1234567898',
        vehicleInfo: 'Nissan Altima 2022 - Black',
        licenseNumber: 'DL789123456',
        fcmToken: 'demo-fcm-token-driver4-for-testing',
        fcmTokenUpdatedAt: new Date()
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

    const customers = users.filter(u => u.role === 'customer');
    const drivers = users.filter(u => u.role === 'driver');

    const orders = [
      // Pending orders (not assigned)
      {
        customerId: customers[0]._id,
        address: '123 Main St, New York, NY 10001',
        lat: 40.7128,
        lng: -74.0060,
        notes: 'Please ring the doorbell twice',
        status: 'pending'
      },
      {
        customerId: customers[1]._id,
        address: '456 Broadway, New York, NY 10013',
        lat: 40.7205,
        lng: -74.0052,
        notes: 'Leave at front desk',
        status: 'pending'
      },
      {
        customerId: customers[2]._id,
        address: '789 5th Ave, New York, NY 10022',
        lat: 40.7614,
        lng: -73.9776,
        notes: 'Apartment 15B, buzzer code 1234',
        status: 'pending'
      },
      
      // In-progress orders (assigned and started)
      {
        customerId: customers[0]._id,
        driverId: drivers[0]._id,
        address: '321 Park Ave, New York, NY 10010',
        lat: 40.7505,
        lng: -73.9934,
        notes: 'Office building, 12th floor',
        status: 'in-progress',
        assignedAt: new Date(Date.now() - 3600000), // 1 hour ago
        startedAt: new Date(Date.now() - 1800000)   // 30 minutes ago
      },
      {
        customerId: customers[1]._id,
        driverId: drivers[1]._id,
        address: '654 Wall St, New York, NY 10005',
        lat: 40.7074,
        lng: -74.0113,
        notes: 'Security will call up',
        status: 'in-progress',
        assignedAt: new Date(Date.now() - 5400000), // 1.5 hours ago
        startedAt: new Date(Date.now() - 3600000)   // 1 hour ago
      },
      
      // Completed orders
      {
        customerId: customers[2]._id,
        driverId: drivers[2]._id,
        address: '987 Madison Ave, New York, NY 10075',
        lat: 40.7736,
        lng: -73.9566,
        notes: 'Doorman will accept delivery',
        status: 'completed',
        assignedAt: new Date(Date.now() - 10800000), // 3 hours ago
        startedAt: new Date(Date.now() - 9000000),   // 2.5 hours ago
        completedAt: new Date(Date.now() - 7200000)  // 2 hours ago
      },
      {
        customerId: customers[0]._id,
        driverId: drivers[3]._id,
        address: '147 Central Park West, New York, NY 10023',
        lat: 40.7829,
        lng: -73.9654,
        notes: 'Ring apartment 8A',
        status: 'completed',
        assignedAt: new Date(Date.now() - 14400000), // 4 hours ago
        startedAt: new Date(Date.now() - 12600000),  // 3.5 hours ago
        completedAt: new Date(Date.now() - 10800000) // 3 hours ago
      }
    ];

    await Order.insertMany(orders);
    console.log('✅ Orders seeded successfully');
  } catch (error) {
    console.error('Error seeding orders:', error);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seeding...');
    
    const users = await seedUsers();
    await seedOrders(users);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('Admins:');
    console.log('  admin@delivery.com / admin123');
    console.log('  admin2@delivery.com / admin123');
    console.log('\nCustomers:');
    console.log('  customer1@test.com / customer123');
    console.log('  customer2@test.com / customer123');
    console.log('  customer3@test.com / customer123');
    console.log('\nDrivers:');
    console.log('  driver1@test.com / driver123');
    console.log('  driver2@test.com / driver123');
    console.log('  driver3@test.com / driver123');
    console.log('  driver4@test.com / driver123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
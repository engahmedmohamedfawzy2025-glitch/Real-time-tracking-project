// MongoDB initialization script for Docker
db = db.getSiblingDB('delivery_tracking');

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('orders');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "isActive": 1 });
db.users.createIndex({ "deviceTokens.token": 1 });

db.orders.createIndex({ "customerId": 1 });
db.orders.createIndex({ "driverId": 1 });
db.orders.createIndex({ "status": 1 });
db.orders.createIndex({ "orderNumber": 1 }, { unique: true });
db.orders.createIndex({ "createdAt": -1 });
db.orders.createIndex({ "priority": 1 });
db.orders.createIndex({ 
  "pickupLocation.coordinates.lat": 1, 
  "pickupLocation.coordinates.lng": 1 
});
db.orders.createIndex({ 
  "dropoffLocation.coordinates.lat": 1, 
  "dropoffLocation.coordinates.lng": 1 
});

// Create sample admin user (password: admin123)
db.users.insertOne({
  email: "admin@delivery.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewRBfGBdlEDBKLfK",
  name: "System Admin",
  role: "admin",
  phone: "+1234567890",
  isActive: true,
  deviceTokens: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

print("Database initialized with indexes and sample admin user");
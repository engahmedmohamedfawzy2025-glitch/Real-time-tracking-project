# Real-time Delivery Tracking Backend

A comprehensive Node.js backend system for real-time delivery tracking with WebSocket support, push notifications, and role-based authentication.

## 🚀 Features

- **JWT-based Authentication** with role management (Customer, Driver, Admin)
- **Real-time Location Tracking** using Socket.IO
- **Push Notifications** via Firebase Cloud Messaging (FCM)
- **RESTful API** for order management
- **MongoDB** for data persistence
- **Docker** support for easy deployment
- **Security** features including rate limiting and CORS

## 🏗️ Architecture

### User Roles
- **Customer**: Place orders, track deliveries
- **Driver**: Accept orders, update status, share location
- **Admin**: Manage orders, assign drivers, monitor system

### Tech Stack
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.IO for real-time communication
- Firebase Admin SDK for push notifications
- JWT for authentication
- Docker for containerization

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB
- Firebase project (for push notifications)

### Local Development

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB:**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# Or use local MongoDB installation
mongod
```

4. **Start the development server:**
```bash
npm run dev
```

### Docker Deployment

1. **Build and start services:**
```bash
docker-compose up -d
```

2. **View logs:**
```bash
docker-compose logs -f app
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | Yes |

### Expo Notifications Setup

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Login user and get JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {...},
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "customer",
  "phone": "+1234567890"
}
```

#### POST /api/drivers/:id/fcm-token
Save FCM device token for notifications.

**Request:**
```json
{
  "fcmToken": "fGzJ8K9L2mN3oP4qR5sT6uV7wX8yZ9aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1w"
}
```

### Order Management Endpoints

#### POST /api/orders (Customer only)
Create a new delivery order.

**Request:**
```json
{
  "pickupLocation": {
    "address": "123 Main St, City, State",
    "coordinates": { "lat": 40.7128, "lng": -74.0060 },
    "contactName": "John Doe",
    "contactPhone": "+1234567890"
  },
  "dropoffLocation": {
    "address": "456 Oak Ave, City, State",
    "coordinates": { "lat": 40.7589, "lng": -73.9851 }
  },
  "items": [{
    "name": "Package",
    "quantity": 1,
    "weight": 2.5
  }],
  "pricing": {
    "basePrice": 10.00,
    "totalPrice": 12.50
  }
}
```

#### GET /api/orders (Admin only)
Get all orders with pagination and filtering.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status
- `priority` - Filter by priority

#### PATCH /api/orders/:id/assign-driver (Admin only)
Assign a driver to an order.

**Request:**
```json
{
  "driverId": "driver_user_id"
}
```

#### PATCH /api/orders/:id/status (Driver only)
Update order status.

**Request:**
```json
{
  "status": "picked_up",
  "driverNotes": "Package collected successfully"
}
```

## 🔌 WebSocket Events

### Connection
Connect to the tracking namespace with authentication:

```javascript
const socket = io('/track', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Driver Events

#### Send Location Update
```javascript
socket.emit('driverLocation', {
  orderId: 'order_id',
  lat: 40.7128,
  lng: -74.0060,
  heading: 90,
  speed: 25
});
```

#### Join Order Room
```javascript
socket.emit('joinOrder', 'order_id');
```

### Customer Events

#### Track Order
```javascript
socket.emit('trackOrder', 'order_id');

socket.on('orderTrackingData', (data) => {
  console.log('Order tracking data:', data);
});

socket.on('customerLocationUpdate', (location) => {
  console.log('Driver location update:', location);
});
```

### Admin Events

#### Track All Orders
```javascript
socket.emit('trackAllOrders');

socket.on('allOrdersTrackingData', (orders) => {
  console.log('All orders tracking:', orders);
});
```

## 🔐 Security Features

- **JWT Authentication** with access and refresh tokens
- **Role-based Authorization** middleware
- **Rate Limiting** to prevent abuse
- **CORS** configuration
- **Helmet** for security headers
- **Input Validation** using Joi
- **Password Hashing** with bcrypt

## 📊 Database Schema

### User Schema
```javascript
{
  email: String (unique),
  password: String (hashed),
  name: String,
  role: 'customer' | 'driver' | 'admin',
  phone: String,
  deviceTokens: [{ token, platform, createdAt }],
  isActive: Boolean,
  profile: { avatar, address }
}
```

### Order Schema
```javascript
{
  customerId: ObjectId,
  driverId: ObjectId,
  orderNumber: String (unique),
  pickupLocation: LocationSchema,
  dropoffLocation: LocationSchema,
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled',
  items: [ItemSchema],
  pricing: PricingSchema,
  timeline: TimelineSchema,
  tracking: TrackingSchema
}
```

## 🧪 Testing

The API can be tested using tools like Postman or curl. Sample requests:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@delivery.com","password":"admin123"}'

# Create order (with JWT token)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"pickupLocation":{"address":"Test","coordinates":{"lat":40.7128,"lng":-74.0060}},...}'
```

## 🚀 Deployment

### Production Considerations
- Use strong JWT secrets
- Set up MongoDB with authentication
- Configure Firebase properly
- Use HTTPS in production
- Set up monitoring and logging
- Configure reverse proxy (nginx)

### Environment Variables for Production
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://username:password@host:port/database
JWT_SECRET=your_super_secure_secret
# ... Firebase configurations
```

## 📝 API Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "message": "Success message",
  "data": {...},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response:**
```json
{
  "message": "Error message",
  "error": "Detailed error (development only)",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 7. Test Push Notifications
Once a driver's FCM token is registered, test by assigning an order:

```bash
# Assign order to driver (this triggers FCM notification)
curl -X PATCH http://localhost:3000/api/orders/ORDER_ID/assign-driver \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"driverId":"DRIVER_ID"}'
```

**Common Issues:**

1. **"Invalid FCM token format"**
   - Ensure token is valid FCM device token
   - Check Firebase project configuration

2. **"DeviceNotRegistered" error**
   - Token is expired or invalid, system will auto-remove it
   - User needs to re-register token

3. **"Token registration failed"**
   - Ensure FCM is properly configured in your app
   - Check network connectivity from your app

4. **"Notification not received"**
   - Verify FCM token is correctly stored in database
   - Check Firebase Console for delivery status
   - Ensure app has notification permissions

### 10. Monitoring
Check your logs for notification operations:
```bash
tail -f logs/notifications-*.log
```

You should see logs like:
```
[2024-01-01 12:00:00] [INFO] [NOTIFICATIONS] FCM token registered successfully {"driverId":"...","tokenLength":163}
[2024-01-01 12:01:00] [INFO] [NOTIFICATIONS] FCM notification sent successfully {"messageId":"...","title":"New Delivery Assigned"}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
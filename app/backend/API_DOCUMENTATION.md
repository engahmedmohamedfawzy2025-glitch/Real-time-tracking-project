# 📄 API Documentation - Real-Time Delivery Backend

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### POST /auth/login
Login user and get JWT token.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer",
    "phone": "+1234567890"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Invalid input data
- **401 Unauthorized:** Invalid credentials

**Postman Test:**
```javascript
// Save token for subsequent requests
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("jwt_token", response.token);
    pm.environment.set("user_id", response.user.id);
}
```

---

## 📦 Order Management Endpoints

### POST /orders
Create a new delivery order (Customer only).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "address": "123 Main St, New York, NY 10001",
  "lat": 40.7128,
  "lng": -74.0060,
  "notes": "Please ring the doorbell twice"
}
```

**Success Response (201):**
```json
{
  "message": "Order created successfully",
  "order": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "customerId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "John Customer",
      "email": "customer@test.com"
    },
    "driverId": null,
    "status": "pending",
    "address": "123 Main St, New York, NY 10001",
    "lat": 40.7128,
    "lng": -74.0060,
    "notes": "Please ring the doorbell twice",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Invalid input data
- **401 Unauthorized:** No token or invalid token
- **403 Forbidden:** Not a customer role

---

### GET /orders
Get orders filtered by user role.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Success Response (200):**
```json
{
  "orders": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "customerId": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "John Customer",
        "email": "customer@test.com"
      },
      "driverId": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "name": "Mike Driver",
        "email": "driver@test.com"
      },
      "status": "assigned",
      "address": "123 Main St, New York, NY 10001",
      "lat": 40.7128,
      "lng": -74.0060,
      "notes": "Please ring the doorbell twice",
      "assignedAt": "2024-01-01T12:30:00.000Z",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:30:00.000Z"
    }
  ]
}
```

**Role-based Filtering:**
- **Customer:** Returns only their own orders
- **Driver:** Returns only orders assigned to them
- **Admin:** Returns all orders

**Order Status Flow:**
- **pending:** Order created by customer, not assigned to any driver
- **assigned:** Order assigned to a driver by admin
- **in-progress:** Driver has started the delivery
- **completed:** Driver has completed the delivery
- **cancelled:** Order was cancelled
---

### PATCH /orders/:id/assign-driver
Assign a driver to an order (Admin only).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "driverId": "64f8a1b2c3d4e5f6a7b8c9d2"
}
```

**Success Response (200):**
```json
{
  "message": "Driver assigned successfully",
  "order": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "customerId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "John Customer",
      "email": "customer@test.com"
    },
    "driverId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Mike Driver",
      "email": "driver@test.com"
    },
    "status": "assigned",
    "assignedAt": "2024-01-01T12:30:00.000Z"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Missing driverId or invalid order status
- **403 Forbidden:** Not an admin role
- **404 Not Found:** Order or driver not found

**Notes:**
- Only orders with status 'pending' can be assigned to drivers
- When assigned, order status changes from 'pending' to 'assigned'
- FCM notification is sent to the assigned driver
**Side Effects:**
- Sends FCM push notification to assigned driver
- Logs assignment event

---

### PATCH /orders/:id/start
Start delivery (Driver only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "message": "Order started successfully",
  "order": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "status": "in-progress",
    "startedAt": "2024-01-01T13:00:00.000Z"
  }
}
```

**Error Responses:**
- **403 Forbidden:** Not the assigned driver
- **400 Bad Request:** Order not in 'assigned' status
- **404 Not Found:** Order not found

**Notes:**
- Only orders with status 'assigned' can be started
- When started, order status changes from 'assigned' to 'in-progress'
---

### PATCH /orders/:id/complete
Complete delivery (Driver only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "message": "Order completed successfully",
  "order": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "status": "completed",
    "completedAt": "2024-01-01T14:00:00.000Z"
  }
}
```

---

## 🚗 Driver Endpoints

### POST /drivers/:id/fcm-token
Save FCM device token for push notifications (Driver only).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "fGzJ8K9L2mN3oP4qR5sT6uV7wX8yZ9aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1w"
}
```

**Success Response (200):**
```json
{
  "message": "FCM token saved successfully"
}
```

**Error Responses:**
- **400 Bad Request:** Missing or invalid FCM token
- **403 Forbidden:** Driver can only update their own token
- **404 Not Found:** Driver not found

**Notes:**
- FCM tokens are typically 163 characters long
- Duplicate tokens are automatically removed from other drivers
- Invalid tokens are auto-purged based on FCM API responses

---

### GET /drivers/online
Get list of online drivers (Admin only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "onlineDrivers": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Mike Driver",
      "email": "driver@test.com",
      "vehicleInfo": "Honda Civic 2020 - Blue",
      "currentLocation": {
        "lat": 40.7128,
        "lng": -74.0060,
        "updatedAt": "2024-01-01T13:00:00.000Z"
      },
      "isOnline": true,
      "lastSeen": "2024-01-01T13:05:00.000Z"
    }
  ]
}
```

**Notes:**
- Online status is determined by active Socket.IO connections
- No Redis required - uses in-memory tracking

---

### GET /drivers/:id/orders
Get active orders for a driver (Driver only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "orders": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "customerId": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "John Customer",
        "email": "customer@test.com",
        "phone": "+1234567890"
      },
      "status": "in-progress",
      "address": "123 Main St, New York, NY 10001",
      "lat": 40.7128,
      "lng": -74.0060,
      "notes": "Please ring the doorbell twice"
    }
  ]
}
```

---

## 🔌 WebSocket Events (Socket.IO)

### Connection
Connect to the tracking namespace:
```javascript
const socket = io('http://localhost:3000/track', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Driver Events

#### Send Location Update
```javascript
socket.emit('driverLocation', {
  driverId: 'driver_user_id',
  lat: 40.7128,
  lng: -74.0060,
  orderId: 'order_id'
});
```

### Customer Events

#### Receive Driver Location Updates
```javascript
socket.on('driverLocationUpdate', (data) => {
  console.log('Driver location:', data);
  // {
  //   driverId: 'driver_id',
  //   lat: 40.7128,
  //   lng: -74.0060,
  //   orderId: 'order_id',
  //   timestamp: '2024-01-01T13:00:00.000Z'
  // }
});
```

### Admin Events

#### Receive All Driver Updates
```javascript
socket.on('driverLocationAdminUpdate', (data) => {
  console.log('Driver location (admin view):', data);
});
```

---

## 🧪 Testing with Postman

### Environment Variables
Create a Postman environment with:
```
base_url: http://localhost:3000/api
jwt_token: (will be set automatically after login)
user_id: (will be set automatically after login)
```

### Test Sequence

1. **Login as Admin:**
   ```
   POST {{base_url}}/auth/login
   Body: {"email": "admin@delivery.com", "password": "admin123"}
   ```

2. **Get All Orders:**
   ```
   GET {{base_url}}/orders
   Headers: Authorization: Bearer {{jwt_token}}
   ```

3. **Login as Customer:**
   ```
   POST {{base_url}}/auth/login
   Body: {"email": "customer1@test.com", "password": "customer123"}
   ```

4. **Create Order:**
   ```
   POST {{base_url}}/orders
   Headers: Authorization: Bearer {{jwt_token}}
   Body: {
     "address": "Test Address",
     "lat": 40.7128,
     "lng": -74.0060,
     "notes": "Test order"
   }
   ```

5. **Login as Driver:**
   ```
   POST {{base_url}}/auth/login
   Body: {"email": "driver1@test.com", "password": "driver123"}
   ```

6. **Register FCM Token:**
   ```
   POST {{base_url}}/drivers/{{user_id}}/fcm-token
   Headers: Authorization: Bearer {{jwt_token}}
   Body: {"fcmToken": "test-fcm-token-123"}
   ```

### Pre-request Scripts
Add to login requests:
```javascript
// Clear previous tokens
pm.environment.unset("jwt_token");
pm.environment.unset("user_id");
```

### Test Scripts
Add to login requests:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("jwt_token", response.token);
    pm.environment.set("user_id", response.user.id);
    pm.test("Login successful", () => {
        pm.expect(response.token).to.be.a('string');
        pm.expect(response.user.role).to.be.oneOf(['admin', 'customer', 'driver']);
    });
}
```

---

## 🚀 Quick Start Testing

1. **Seed Database:**
   ```bash
   npm run seed
   ```

2. **Start Server:**
   ```bash
   npm run dev
   ```

3. **Run Simulations:**
   ```bash
   # Terminal 1: Start driver simulation
   npm run simulate:drivers
   
   # Terminal 2: Start admin simulation
   npm run simulate:admin
   ```

4. **Test with Postman:**
   - Import the API endpoints
   - Use the test accounts from seeding
   - Monitor logs in `/logs/` directory

---

## 📊 Monitoring & Logs

### Log Files Location
```
/logs/
├── auth-YYYY-MM-DD.log          # Authentication events
├── orders-YYYY-MM-DD.log        # Order management
├── socket-YYYY-MM-DD.log        # WebSocket events
├── notifications-YYYY-MM-DD.log # FCM notifications
├── error-YYYY-MM-DD.log         # System errors
└── combined-YYYY-MM-DD.log      # All logs combined
```

### Health Check
```
GET /health
```
Returns server status and uptime.

---

## 🔧 Error Handling

All endpoints return consistent error format:
```json
{
  "message": "Error description",
  "error": "Detailed error (development only)",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

Common HTTP status codes:
- **200:** Success
- **201:** Created
- **400:** Bad Request (validation errors)
- **401:** Unauthorized (missing/invalid token)
- **403:** Forbidden (insufficient permissions)
- **404:** Not Found
- **429:** Too Many Requests (rate limited)
- **500:** Internal Server Error
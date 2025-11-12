const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');
const { socketLogger } = require('../config/logger');

// Socket.IO authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      socketLogger.warn('Socket authentication failed - no token', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      socketLogger.warn('Socket authentication failed - invalid user', {
        socketId: socket.id,
        userId: decoded.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication error: Invalid user'));
    }

    socket.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name
    };
    
    socketLogger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: decoded.id,
      role: decoded.role,
      name: decoded.name,
      ip: socket.handshake.address
    });
    
    next();
  } catch (error) {
    socketLogger.error('Socket authentication error', {
      socketId: socket.id,
      error: error.message,
      ip: socket.handshake.address
    });
    next(new Error('Authentication error: Invalid token'));
  }
};

const setupTrackingSocket = (io) => {
  const trackingNamespace = io.of('/track');
  
  // Initialize global online drivers tracker
  if (!global.onlineDrivers) {
    global.onlineDrivers = {};
  }
  
  // Apply authentication middleware
  trackingNamespace.use(authenticateSocket);

  trackingNamespace.on('connection', (socket) => {
    socketLogger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.user.id,
      role: socket.user.role,
      name: socket.user.name,
      ip: socket.handshake.address,
      timestamp: new Date().toISOString()
    });

    // Join rooms based on role
    let roomName;
    if (socket.user.role === 'driver') {
      roomName = `driver_${socket.user.id}`;
      socket.join(roomName);
      
      // Mark driver as online
      global.onlineDrivers[socket.user.id] = {
        socketId: socket.id,
        lastSeen: new Date(),
        name: socket.user.name
      };
    } else if (socket.user.role === 'customer') {
      roomName = `customer_${socket.user.id}`;
      socket.join(roomName);
    } else if (socket.user.role === 'admin') {
      roomName = 'admins';
      socket.join(roomName);
    }
    
    socketLogger.info('Socket joined room', {
      socketId: socket.id,
      userId: socket.user.id,
      role: socket.user.role,
      roomName,
      timestamp: new Date().toISOString()
    });

    // Handle driver location updates
    if (socket.user.role === 'driver') {
      socket.on('driverLocation', async (data) => {
        try {
          const { driverId, lat, lng, orderId } = data;

          if (driverId !== socket.user.id) {
            socketLogger.warn('Driver location update failed - unauthorized', {
              socketId: socket.id,
              requestingDriverId: socket.user.id,
              providedDriverId: driverId
            });
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }

          if (!lat || !lng) {
            socketLogger.warn('Driver location update failed - missing coordinates', {
              socketId: socket.id,
              driverId,
              data
            });
            socket.emit('error', { message: 'Missing location data' });
            return;
          }

          // Update driver's last seen time
          if (global.onlineDrivers[driverId]) {
            global.onlineDrivers[driverId].lastSeen = new Date();
          }

          socketLogger.info('Driver location update received', {
            socketId: socket.id,
            driverId,
            orderId,
            coordinates: { lat, lng },
            timestamp: new Date().toISOString()
          });
          // Update driver's current location
          await User.findByIdAndUpdate(driverId, {
            currentLocation: {
              lat,
              lng,
              updatedAt: new Date()
            }
          });

          // Find active orders for this driver
          const activeOrders = await Order.find({
            driverId,
            status: 'in-progress'
          }).populate('customerId', 'name');

          const locationData = {
            driverId,
            lat,
            lng,
            orderId,
            timestamp: new Date().toISOString()
          };
          
          let customerBroadcasts = 0;
          let adminBroadcasts = 0;
          
          // Broadcast to customers of active orders
          for (const order of activeOrders) {
            trackingNamespace.to(`customer_${order.customerId._id}`).emit('driverLocationUpdate', locationData);
            customerBroadcasts++;
          }

          // Broadcast to admins
          trackingNamespace.to('admins').emit('driverLocationAdminUpdate', locationData);
          adminBroadcasts = trackingNamespace.adapter.rooms.get('admins')?.size || 0;
          
          socketLogger.info('Driver location broadcasted', {
            socketId: socket.id,
            driverId,
            coordinates: { lat, lng },
            orderId,
            activeOrdersCount: activeOrders.length,
            customerBroadcasts,
            adminBroadcasts,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          socketLogger.error('Driver location update system error', {
            socketId: socket.id,
            driverId: socket.user.id,
            error: error.message,
            stack: error.stack,
            data
          });
          socket.emit('error', { message: 'Failed to update location' });
        }
      });
    }

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      // Remove driver from online list
      if (socket.user.role === 'driver' && global.onlineDrivers[socket.user.id]) {
        delete global.onlineDrivers[socket.user.id];
      }
      
      socketLogger.info('Socket disconnected', {
        socketId: socket.id,
        userId: socket.user.id,
        role: socket.user.role,
        name: socket.user.name,
        reason,
        timestamp: new Date().toISOString()
      });
    });
  });

  return trackingNamespace;
};

module.exports = setupTrackingSocket;
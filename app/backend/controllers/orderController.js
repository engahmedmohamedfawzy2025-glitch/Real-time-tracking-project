const Joi = require('joi');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendFCMNotification } = require('../services/firebaseService');
const { ordersLogger } = require('../config/logger');

// Validation schemas
const createOrderSchema = Joi.object({
  address: Joi.string().required(),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  notes: Joi.string().optional()
});

const createOrder = async (req, res) => {
  try {
    const { error } = createOrderSchema.validate(req.body);
    if (error) {
      ordersLogger.warn('Order creation validation failed', {
        userId: req.user.id,
        error: error.details[0].message,
        payload: req.body
      });
      return res.status(400).json({ message: error.details[0].message });
    }

    const orderData = {
      customerId: req.user.id,
      status: 'pending', // Explicitly set status to pending
      driverId: null, // Not assigned to any driver initially
      ...req.body
    };

    const order = new Order(orderData);
    await order.save();

    await order.populate('customerId', 'name email');

    ordersLogger.info('Order created successfully', {
      userId: req.user.id,
      orderId: order._id,
      status: order.status,
      address: order.address,
      coordinates: { lat: order.lat, lng: order.lng },
      timestamp: new Date().toISOString(),
      payload: orderData
    });
    
    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    ordersLogger.error('Order creation system error', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack,
      payload: req.body
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getOrders = async (req, res) => {
  try {
    let filter = {};
    
    // Filter orders based on user role
    switch (req.user.role) {
      case 'customer':
        filter.customerId = req.user.id;
        break;
      case 'driver':
        filter.driverId = req.user.id;
        break;
      case 'admin':
        // Admin can see all orders
        break;
      default:
        ordersLogger.warn('Get orders failed - invalid role', {
          userId: req.user.id,
          role: req.user.role
        });
        return res.status(403).json({ message: 'Invalid role' });
    }

    const orders = await Order.find(filter)
      .populate('customerId', 'name email')
      .populate('driverId', 'name email')
      .sort({ createdAt: -1 });

    ordersLogger.info('Orders retrieved', {
      userId: req.user.id,
      role: req.user.role,
      orderCount: orders.length,
      filter
    });
    res.json({ orders });
  } catch (error) {
    ordersLogger.error('Get orders system error', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      ordersLogger.warn('Driver assignment failed - no driver ID', {
        adminId: req.user.id,
        orderId: id
      });
      return res.status(400).json({ message: 'Driver ID is required' });
    }

    const driver = await User.findOne({ _id: driverId, role: 'driver', isActive: true });
    if (!driver) {
      ordersLogger.warn('Driver assignment failed - driver not found', {
        adminId: req.user.id,
        orderId: id,
        driverId
      });
      return res.status(404).json({ message: 'Driver not found or inactive' });
    }

    const order = await Order.findById(id);
    if (!order) {
      ordersLogger.warn('Driver assignment failed - order not found', {
        adminId: req.user.id,
        orderId: id,
        driverId
      });
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      ordersLogger.warn('Driver assignment failed - invalid status', {
        adminId: req.user.id,
        orderId: id,
        driverId,
        currentStatus: order.status
      });
      return res.status(400).json({ 
        message: `Order cannot be assigned. Current status: ${order.status}` 
      });
    }

    order.driverId = driverId;
    order.status = 'assigned'; // Change status to assigned when driver is assigned
    await order.save();

    await order.populate(['customerId', 'driverId'], 'name email');

    ordersLogger.info('Driver assigned to order', {
      adminId: req.user.id,
      orderId: id,
      driverId,
      driverName: driver.name,
      customerId: order.customerId._id,
      newStatus: order.status,
      timestamp: new Date().toISOString()
    });
    
    // Send FCM push notification to driver
    if (driver.fcmToken) {
      const notificationResult = await sendFCMNotification(driver.fcmToken, {
        title: 'New Delivery Assigned',
        body: `Order #${order._id.toString().slice(-6)} has been assigned to you`,
        data: { orderId: order._id.toString() }
      });

      // If token is invalid, remove it from driver
      if (!notificationResult.success && notificationResult.shouldRemoveToken) {
        ordersLogger.warn('Removing invalid FCM token from driver', {
          driverId,
          error: notificationResult.error
        });
        driver.fcmToken = null;
        driver.fcmTokenUpdatedAt = null;
        await driver.save();
      }
    }

    res.json({
      message: 'Driver assigned successfully',
      order
    });
  } catch (error) {
    ordersLogger.error('Driver assignment system error', {
      adminId: req.user.id,
      orderId: req.params.id,
      driverId: req.body.driverId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const startOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      ordersLogger.warn('Start order failed - order not found', {
        driverId: req.user.id,
        orderId: id
      });
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify driver owns this order
    if (!order.driverId || order.driverId.toString() !== req.user.id) {
      ordersLogger.warn('Start order failed - access denied', {
        driverId: req.user.id,
        orderId: id,
        assignedDriverId: order.driverId
      });
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.status !== 'assigned') {
      ordersLogger.warn('Start order failed - invalid status', {
        driverId: req.user.id,
        orderId: id,
        currentStatus: order.status
      });
      return res.status(400).json({ 
        message: `Cannot start order with status: ${order.status}. Order must be assigned to you first.` 
      });
    }

    order.status = 'in-progress';
    await order.save();

    ordersLogger.info('Order started by driver', {
      driverId: req.user.id,
      orderId: id,
      customerId: order.customerId,
      address: order.address,
      newStatus: order.status,
      timestamp: new Date().toISOString()
    });
    res.json({
      message: 'Order started successfully',
      order
    });
  } catch (error) {
    ordersLogger.error('Start order system error', {
      driverId: req.user.id,
      orderId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      ordersLogger.warn('Complete order failed - order not found', {
        driverId: req.user.id,
        orderId: id
      });
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify driver owns this order
    if (!order.driverId || order.driverId.toString() !== req.user.id) {
      ordersLogger.warn('Complete order failed - access denied', {
        driverId: req.user.id,
        orderId: id,
        assignedDriverId: order.driverId
      });
      return res.status(403).json({ message: 'Access denied' });
    }

    if (order.status !== 'in-progress') {
      ordersLogger.warn('Complete order failed - invalid status', {
        driverId: req.user.id,
        orderId: id,
        currentStatus: order.status
      });
      return res.status(400).json({ 
        message: `Cannot complete order with status: ${order.status}` 
      });
    }

    order.status = 'completed';
    await order.save();

    ordersLogger.info('Order completed by driver', {
      driverId: req.user.id,
      orderId: id,
      customerId: order.customerId,
      address: order.address,
      timestamp: new Date().toISOString()
    });
    res.json({
      message: 'Order completed successfully',
      order
    });
  } catch (error) {
    ordersLogger.error('Complete order system error', {
      driverId: req.user.id,
      orderId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  assignDriver,
  startOrder,
  completeOrder
};
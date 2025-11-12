const express = require('express');
const {
  createOrder,
  getOrders,
  assignDriver,
  startOrder,
  completeOrder
} = require('../controllers/orderController');
const { verifyToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes accessible by role
router.post('/', authorizeRole('customer'), createOrder);
router.get('/', getOrders); // Role-based filtering handled in controller

// Admin only routes
router.patch('/:id/assign-driver', authorizeRole('admin'), assignDriver);

// Driver only routes
router.patch('/:id/start', authorizeRole('driver'), startOrder);
router.patch('/:id/complete', authorizeRole('driver'), completeOrder);

module.exports = router;
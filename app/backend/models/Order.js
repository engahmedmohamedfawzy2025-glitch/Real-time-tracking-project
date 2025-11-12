const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  address: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  assignedAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Update timestamps based on status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'assigned':
        if (!this.assignedAt) this.assignedAt = now;
        break;
      case 'in-progress':
        if (!this.startedAt) this.startedAt = now;
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = now;
        break;
    }
  }
  
  // Set assignedAt when driver is assigned
  if (this.isModified('driverId') && this.driverId && !this.assignedAt) {
    this.assignedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);
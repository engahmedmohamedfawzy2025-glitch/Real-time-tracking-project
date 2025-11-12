const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['customer', 'driver', 'admin'],
    default: 'customer'
  },
  phone: {
    type: String,
    trim: true
  },
  fcmToken: {
    type: String,
    default: null
  },
  fcmTokenUpdatedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Driver-specific fields
  vehicleInfo: {
    type: String,
    required: function() { return this.role === 'driver'; }
  },
  licenseNumber: {
    type: String,
    required: function() { return this.role === 'driver'; }
  },
  // FCM token for push notifications
  fcmToken: {
    type: String,
    default: null
  },
  fcmTokenUpdatedAt: {
    type: Date,
    default: null
  },
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.deviceTokens;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
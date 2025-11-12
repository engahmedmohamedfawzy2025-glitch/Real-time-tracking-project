const io = require('socket.io-client');
const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const SOCKET_URL = `${API_BASE}/track`;

// Driver credentials for simulation
const DRIVERS = [
  { email: 'driver1@test.com', password: 'driver123', name: 'Mike Driver' },
  { email: 'driver2@test.com', password: 'driver123', name: 'Sarah Johnson' },
  { email: 'driver3@test.com', password: 'driver123', name: 'Carlos Rodriguez' },
  { email: 'driver4@test.com', password: 'driver123', name: 'Lisa Chen' }
];

// NYC coordinates for realistic simulation
const NYC_BOUNDS = {
  north: 40.8176,
  south: 40.6892,
  east: -73.9442,
  west: -74.0479
};

class DriverSimulator {
  constructor(driverInfo) {
    this.driverInfo = driverInfo;
    this.token = null;
    this.socket = null;
    this.currentLocation = this.generateRandomLocation();
    this.isMoving = false;
    this.speed = 0.0001; // Degrees per update (roughly 10-15 mph)
    this.destination = null;
  }

  generateRandomLocation() {
    return {
      lat: NYC_BOUNDS.south + Math.random() * (NYC_BOUNDS.north - NYC_BOUNDS.south),
      lng: NYC_BOUNDS.west + Math.random() * (NYC_BOUNDS.east - NYC_BOUNDS.west)
    };
  }

  async login() {
    try {
      console.log(`🔐 Logging in driver: ${this.driverInfo.name}`);
      
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email: this.driverInfo.email,
        password: this.driverInfo.password
      });

      this.token = response.data.token;
      this.driverId = response.data.user.id;
      
      console.log(`✅ ${this.driverInfo.name} logged in successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Login failed for ${this.driverInfo.name}:`, error.response?.data?.message || error.message);
      return false;
    }
  }

  connectSocket() {
    console.log(`🔌 Connecting socket for ${this.driverInfo.name}`);
    
    this.socket = io(SOCKET_URL, {
      auth: {
        token: this.token
      }
    });

    this.socket.on('connect', () => {
      console.log(`🟢 ${this.driverInfo.name} connected to Socket.IO`);
      this.startLocationUpdates();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔴 ${this.driverInfo.name} disconnected:`, reason);
    });

    this.socket.on('error', (error) => {
      console.error(`❌ Socket error for ${this.driverInfo.name}:`, error);
    });
  }

  startLocationUpdates() {
    console.log(`📍 Starting location updates for ${this.driverInfo.name}`);
    
    // Update location every 5 seconds
    setInterval(() => {
      this.updateLocation();
      this.emitLocation();
    }, 5000);
  }

  updateLocation() {
    // Simulate realistic movement
    if (!this.destination || this.hasReachedDestination()) {
      this.destination = this.generateRandomLocation();
      this.isMoving = true;
    }

    if (this.isMoving) {
      // Move towards destination
      const latDiff = this.destination.lat - this.currentLocation.lat;
      const lngDiff = this.destination.lng - this.currentLocation.lng;
      
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      
      if (distance > this.speed) {
        // Move towards destination
        this.currentLocation.lat += (latDiff / distance) * this.speed;
        this.currentLocation.lng += (lngDiff / distance) * this.speed;
      } else {
        // Reached destination
        this.currentLocation = { ...this.destination };
        this.isMoving = false;
        
        // Pause for 10-30 seconds before moving to next destination
        setTimeout(() => {
          this.destination = this.generateRandomLocation();
          this.isMoving = true;
        }, 10000 + Math.random() * 20000);
      }
    }
  }

  hasReachedDestination() {
    if (!this.destination) return true;
    
    const distance = Math.sqrt(
      Math.pow(this.destination.lat - this.currentLocation.lat, 2) +
      Math.pow(this.destination.lng - this.currentLocation.lng, 2)
    );
    
    return distance < this.speed * 2;
  }

  emitLocation() {
    if (this.socket && this.socket.connected) {
      const locationData = {
        driverId: this.driverId,
        lat: this.currentLocation.lat,
        lng: this.currentLocation.lng,
        orderId: 'simulation-order-' + this.driverId // Mock order ID
      };

      this.socket.emit('driverLocation', locationData);
      
      console.log(`📡 ${this.driverInfo.name} location: ${this.currentLocation.lat.toFixed(4)}, ${this.currentLocation.lng.toFixed(4)}`);
    }
  }

  async start() {
    const loginSuccess = await this.login();
    if (loginSuccess) {
      this.connectSocket();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Main simulation function
async function startDriverSimulation() {
  console.log('🚗 Starting Driver Simulation...');
  console.log(`📡 Connecting to: ${SOCKET_URL}`);
  
  const simulators = [];

  // Create and start simulators for each driver
  for (const driverInfo of DRIVERS) {
    const simulator = new DriverSimulator(driverInfo);
    simulators.push(simulator);
    
    // Stagger the connections to avoid overwhelming the server
    setTimeout(() => {
      simulator.start();
    }, simulators.length * 2000);
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down driver simulation...');
    simulators.forEach(sim => sim.disconnect());
    process.exit(0);
  });

  console.log(`\n🎯 Simulation started with ${DRIVERS.length} drivers`);
  console.log('📍 Drivers will emit GPS locations every 5 seconds');
  console.log('🗽 Simulating movement within NYC bounds');
  console.log('Press Ctrl+C to stop simulation\n');
}

// Start the simulation
startDriverSimulation().catch(console.error);
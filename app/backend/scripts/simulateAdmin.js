const io = require('socket.io-client');
const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const SOCKET_URL = `${API_BASE}/track`;

class AdminSimulator {
  constructor() {
    this.token = null;
    this.socket = null;
    this.adminInfo = {
      email: 'admin@delivery.com',
      password: 'admin123',
      name: 'System Admin'
    };
  }

  async login() {
    try {
      console.log('🔐 Logging in as admin...');
      
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email: this.adminInfo.email,
        password: this.adminInfo.password
      });

      this.token = response.data.token;
      this.adminId = response.data.user.id;
      
      console.log('✅ Admin logged in successfully');
      return true;
    } catch (error) {
      console.error('❌ Admin login failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  connectSocket() {
    console.log('🔌 Connecting admin socket...');
    
    this.socket = io(SOCKET_URL, {
      auth: {
        token: this.token
      }
    });

    this.socket.on('connect', () => {
      console.log('🟢 Admin connected to Socket.IO');
      console.log('👥 Joined admins room for real-time updates');
    });

    this.socket.on('driverLocationAdminUpdate', (data) => {
      console.log(`📍 Driver location update: ${data.driverId} at (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 Admin disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  }

  async getOnlineDrivers() {
    try {
      console.log('\n🔍 Fetching online drivers...');
      
      const response = await axios.get(`${API_BASE}/api/drivers/online`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const drivers = response.data.onlineDrivers;
      console.log(`📊 Found ${drivers.length} online drivers:`);
      
      drivers.forEach(driver => {
        console.log(`  - ${driver.name} (${driver.vehicleInfo}) - Last seen: ${new Date(driver.lastSeen).toLocaleTimeString()}`);
      });

      return drivers;
    } catch (error) {
      console.error('❌ Failed to fetch online drivers:', error.response?.data?.message || error.message);
      return [];
    }
  }

  async getPendingOrders() {
    try {
      console.log('\n📦 Fetching pending orders...');
      
      const response = await axios.get(`${API_BASE}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const pendingOrders = response.data.orders.filter(order => order.status === 'pending');
      console.log(`📋 Found ${pendingOrders.length} pending orders:`);
      
      pendingOrders.forEach(order => {
        console.log(`  - Order ${order._id.slice(-6)}: ${order.address} (Customer: ${order.customerId.name})`);
      });

      return pendingOrders;
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error.response?.data?.message || error.message);
      return [];
    }
  }

  async assignOrderToDriver(orderId, driverId) {
    try {
      console.log(`\n🎯 Assigning order ${orderId.slice(-6)} to driver ${driverId.slice(-6)}...`);
      
      const response = await axios.patch(
        `${API_BASE}/api/orders/${orderId}/assign-driver`,
        { driverId },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Order assigned successfully!');
      console.log('📱 FCM push notification sent to driver');
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to assign order:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async simulateOrderAssignments() {
    console.log('\n🤖 Starting automatic order assignment simulation...');
    
    setInterval(async () => {
      try {
        const onlineDrivers = await this.getOnlineDrivers();
        const pendingOrders = await this.getPendingOrders();

        if (onlineDrivers.length > 0 && pendingOrders.length > 0) {
          // Pick random driver and order
          const randomDriver = onlineDrivers[Math.floor(Math.random() * onlineDrivers.length)];
          const randomOrder = pendingOrders[Math.floor(Math.random() * pendingOrders.length)];

          console.log(`\n🎲 Auto-assigning order ${randomOrder._id.slice(-6)} to ${randomDriver.name}`);
          
          await this.assignOrderToDriver(randomOrder._id, randomDriver._id);
        } else {
          console.log('\n⏳ No available drivers or pending orders for auto-assignment');
        }
      } catch (error) {
        console.error('❌ Error in auto-assignment:', error.message);
      }
    }, 30000); // Every 30 seconds
  }

  async start() {
    const loginSuccess = await this.login();
    if (!loginSuccess) return;

    this.connectSocket();
    
    // Initial data fetch
    await this.getOnlineDrivers();
    await this.getPendingOrders();

    // Start automatic assignment simulation
    this.simulateOrderAssignments();

    console.log('\n🎮 Admin simulation started!');
    console.log('📊 Monitoring online drivers and pending orders');
    console.log('🤖 Auto-assigning orders every 30 seconds');
    console.log('📱 FCM notifications will be sent to assigned drivers');
    console.log('Press Ctrl+C to stop\n');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Main simulation function
async function startAdminSimulation() {
  console.log('👑 Starting Admin Simulation...');
  console.log(`📡 Connecting to: ${SOCKET_URL}`);
  
  const adminSim = new AdminSimulator();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down admin simulation...');
    adminSim.disconnect();
    process.exit(0);
  });

  await adminSim.start();
}

// Start the simulation
startAdminSimulation().catch(console.error);
import { io, Socket } from 'socket.io-client';
import { DriverLocationUpdate } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    
    this.socket = io(`${API_BASE_URL}/track`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to tracking server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from tracking server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Customer: Listen for driver location updates for their orders
  onDriverLocationUpdate(callback: (update: DriverLocationUpdate) => void) {
    if (this.socket) {
      this.socket.on('driverLocationUpdate', callback);
    }
  }

  offDriverLocationUpdate() {
    if (this.socket) {
      this.socket.off('driverLocationUpdate');
    }
  }

  // Admin: Listen for all driver location updates
  onDriverLocationAdminUpdate(callback: (update: DriverLocationUpdate) => void) {
    if (this.socket) {
      this.socket.on('driverLocationAdminUpdate', callback);
    }
  }

  offDriverLocationAdminUpdate() {
    if (this.socket) {
      this.socket.off('driverLocationAdminUpdate');
    }
  }

  // Driver: Send location updates
  sendDriverLocation(data: {
    driverId: string;
    lat: number;
    lng: number;
    orderId?: string;
  }) {
    if (this.socket) {
      this.socket.emit('driverLocation', data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
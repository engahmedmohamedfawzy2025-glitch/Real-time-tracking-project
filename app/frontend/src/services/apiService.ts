import axios from 'axios';
import { Order, Driver, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Orders
  getOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    return response.data.orders || [];
  },

  createOrder: async (orderData: {
    address: string;
    lat: number;
    lng: number;
    notes?: string;
  }): Promise<Order> => {
    const response = await api.post('/orders', orderData);
    return response.data.order;
  },

  assignDriver: async (orderId: string, driverId: string): Promise<Order> => {
    const response = await api.patch(`/orders/${orderId}/assign-driver`, { driverId });
    return response.data.order;
  },

  // Get online drivers from orders data
  getOnlineDrivers: async (): Promise<Driver[]> => {
    try {
      const response = await api.get('/orders');
      const orders = response.data.orders || [];
      
      // Extract unique drivers from orders
      const driversMap = new Map<string, Driver>();
      orders.forEach((order: Order) => {
        if (order.driverId && typeof order.driverId === 'object') {
          const driver = order.driverId as any;
          driversMap.set(driver._id, {
            _id: driver._id,
            name: driver.name,
            email: driver.email,
            phone: driver.phone || '',
            isActive: true,
            isOnline: ['assigned', 'in-progress'].includes(order.status),
            vehicleInfo: driver.vehicleInfo || '',
            lastSeen: new Date().toISOString(),
          });
        }
      });
      
      return Array.from(driversMap.values());
    } catch (error) {
      console.error('Failed to get online drivers:', error);
      return [];
    }
  },
};
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  phone?: string;
}

export interface Order {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
  };
  driverId?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  address: string;
  lat: number;
  lng: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
  vehicleInfo?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface DriverLocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  orderId?: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  orders?: T;
  onlineDrivers?: T;
}

export interface OrderStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}
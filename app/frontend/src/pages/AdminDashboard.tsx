import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { socketService } from '../services/socketService';
import DashboardLayout from '../components/Layout/DashboardLayout';
import GoogleMap, { MapMarker } from '../components/GoogleMap';
import { Order, Driver, DriverLocationUpdate, OrderStats } from '../types';
import { Package, CheckCircle, MapPin, Users, Truck, Clock, Navigation, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocationUpdate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [focusedDriverId, setFocusedDriverId] = useState<string>('');
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    if (token) {
      socketService.connect(token);
      loadData();

      // Listen for driver location updates (admin view)
      socketService.onDriverLocationAdminUpdate((update: DriverLocationUpdate) => {
        setDriverLocations(prev => {
          const newMap = new Map(prev);
          newMap.set(update.driverId, update);
          return newMap;
        });
      });
    }

    return () => {
      socketService.offDriverLocationAdminUpdate();
      socketService.disconnect();
    };
  }, [token]);

  const loadData = async () => {
    try {
      const [ordersData, driversData] = await Promise.all([
        apiService.getOrders(),
        apiService.getOnlineDrivers(),
      ]);
      
      setOrders(ordersData.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setDrivers(driversData);
      
      // Calculate comprehensive stats
      const newStats = {
        total: ordersData.length,
        pending: ordersData.filter((o: Order) => o.status === 'pending').length,
        assigned: ordersData.filter((o: Order) => o.status === 'assigned').length,
        inProgress: ordersData.filter((o: Order) => o.status === 'in-progress').length,
        completed: ordersData.filter((o: Order) => o.status === 'completed').length,
        cancelled: ordersData.filter((o: Order) => o.status === 'cancelled').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedOrderId || !selectedDriverId) {
      toast.error('Please select both an order and a driver');
      return;
    }

    setIsAssigning(true);
    try {
      const updatedOrder = await apiService.assignDriver(selectedOrderId, selectedDriverId);
      setOrders(prev => prev.map(order => 
        order._id === updatedOrder._id ? updatedOrder : order
      ));
      setStats(prev => ({ 
        ...prev, 
        pending: prev.pending - 1, 
        assigned: prev.assigned + 1 
      }));
      setSelectedOrderId('');
      setSelectedDriverId('');
      toast.success('Driver assigned successfully!');
    } catch (error: any) {
      console.error('Failed to assign driver:', error);
      toast.error(error.response?.data?.message || 'Failed to assign driver');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMarkerClick = (markerId: string) => {
    const driverId = markerId.replace('driver-', '');
    setFocusedDriverId(driverId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'assigned':
        return <Navigation className="h-4 w-4" />;
      case 'in-progress':
        return <Truck className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getMapMarkers = () => {
    const markers: MapMarker[] = [];
    const colors = ['#F97316', '#8B5CF6', '#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#EC4899'];

    // Add enhanced driver location markers
    Array.from(driverLocations.values()).forEach((update, index) => {
      const driver = drivers.find(d => d._id === update.driverId);
      const assignedOrder = orders.find(o => o.driverId?._id === update.driverId && ['assigned', 'in-progress'].includes(o.status));
      
      markers.push({
        id: `driver-${update.driverId}`,
        position: { lat: update.lat, lng: update.lng },
        title: `Driver: ${driver?.name || 'Unknown Driver'}`,
        type: 'driver' as const,
        color: colors[index % colors.length],
        driverInfo: {
          name: driver?.name || 'Unknown Driver',
          status: assignedOrder?.status || 'available',
          orderId: assignedOrder?._id,
          vehicleInfo: driver?.vehicleInfo || 'Standard Vehicle',
          phone: driver?.phone || '+1 (555) 000-0000',
          estimatedArrival: assignedOrder?.status === 'in-progress' ? '15-20 min' : undefined,
        },
      });
    });

    return markers;
  };

  const getMapCenter = () => {
    if (driverLocations.size > 0) {
      const locations = Array.from(driverLocations.values());
      const avgLat = locations.reduce((sum, update) => sum + update.lat, 0) / locations.length;
      const avgLng = locations.reduce((sum, update) => sum + update.lng, 0) / locations.length;
      return { lat: avgLat, lng: avgLng };
    }
    // Default to New York City
    return { lat: 40.7128, lng: -74.0060 };
  };

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const availableDrivers = drivers.filter(driver => driver.isActive);
  const activeDriversCount = drivers.filter(driver => driver.isOnline).length;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-8">
        {/* Enhanced Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting assignment</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{activeDriversCount}</p>
                <p className="text-xs text-gray-500 mt-1">Currently online</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-xs text-gray-500 mt-1">Successfully delivered</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Driver Tracking Map */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Driver Locations</h3>
                  <p className="text-sm text-gray-600">Real-time tracking of all active drivers with simulated movement</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <Users className="h-4 w-4" />
                  <span>{driverLocations.size} drivers online</span>
                </div>
                {focusedDriverId && (
                  <button
                    onClick={() => setFocusedDriverId('')}
                    className="text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Show All Drivers
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
            <GoogleMap
              center={getMapCenter()}
              zoom={focusedDriverId ? 17 : 12}
              markers={getMapMarkers()}
              className="w-full h-96"
              onMarkerClick={handleMarkerClick}
              focusedDriverId={focusedDriverId}
              mode="admin"
            />
            {driverLocations.size === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 rounded-xl">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-lg font-medium">No drivers currently online</p>
                  <p className="text-gray-500 text-sm mt-1">Drivers will appear here when they come online</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Driver Assignment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Assign Driver to Order</h3>
            </div>
          </div>
          <div className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Pending Order
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isAssigning}
                >
                  <option value="">Choose an order...</option>
                  {pendingOrders.map((order) => (
                    <option key={order._id} value={order._id}>
                      #{order._id.slice(-6)} - {order.address} - {typeof order.customerId === 'object' ? order.customerId.name : 'Unknown Customer'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Active Driver
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isAssigning}
                >
                  <option value="">Choose a driver...</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.name} - {driver.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={handleAssignDriver}
                  disabled={!selectedOrderId || !selectedDriverId || isAssigning}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Driver'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">All Orders</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No orders yet</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order._id.slice(-6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">
                            {typeof order.customerId === 'object' ? order.customerId.name : 'Unknown Customer'}
                          </div>
                          <div className="text-gray-500">
                            {typeof order.customerId === 'object' ? order.customerId.email : 'No email'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          <div className="truncate">{order.address}</div>
                          <div className="text-xs text-gray-500">
                            {order.lat.toFixed(4)}, {order.lng.toFixed(4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.driverId && typeof order.driverId === 'object' ? (
                          <div>
                            <div className="font-medium">{order.driverId.name}</div>
                            <div className="text-gray-500">{order.driverId.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status.replace('-', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
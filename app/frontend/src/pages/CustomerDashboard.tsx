import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { socketService } from '../services/socketService';
import DashboardLayout from '../components/Layout/DashboardLayout';
import GoogleMap, { MapMarker } from '../components/GoogleMap';
import { Order, DriverLocationUpdate, OrderStats } from '../types';
import { Package, MapPin, Clock, CheckCircle, Plus, Truck, Navigation, AlertCircle, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocationUpdate>>(new Map());
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [newOrder, setNewOrder] = useState({
    address: '',
    lat: 0,
    lng: 0,
    notes: '',
  });

  useEffect(() => {
    if (token && user) {
      socketService.connect(token);
      loadOrders();

      // Listen for driver location updates
      socketService.onDriverLocationUpdate((update: DriverLocationUpdate) => {
        setDriverLocations(prev => {
          const newMap = new Map(prev);
          newMap.set(update.driverId, update);
          return newMap;
        });
      });
    }

    return () => {
      socketService.offDriverLocationUpdate();
      socketService.disconnect();
    };
  }, [token, user]);

  const loadOrders = async () => {
    try {
      const data = await apiService.getOrders();
      setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      // Calculate stats
      const newStats = {
        total: data.length,
        pending: data.filter(o => o.status === 'pending').length,
        assigned: data.filter(o => o.status === 'assigned').length,
        inProgress: data.filter(o => o.status === 'in-progress').length,
        completed: data.filter(o => o.status === 'completed').length,
        cancelled: data.filter(o => o.status === 'cancelled').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.address || !newOrder.lat || !newOrder.lng) {
      toast.error('Please provide address and coordinates');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const order = await apiService.createOrder(newOrder);
      setOrders(prev => [order, ...prev]);
      setStats(prev => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));
      setNewOrder({ address: '', lat: 0, lng: 0, notes: '' });
      setShowOrderForm(false);
      toast.success('Order placed successfully!');
    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleTrackOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseTracking = () => {
    setSelectedOrder(null);
  };

  const handleMapClick = (lat: number, lng: number, address: string) => {
    setNewOrder(prev => ({ ...prev, lat, lng, address }));
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
    if (!selectedOrder) return [];

    const markers: MapMarker[] = [];

    // Add delivery location marker
    markers.push({
      id: `delivery-${selectedOrder._id}`,
      position: { lat: selectedOrder.lat, lng: selectedOrder.lng },
      title: `Delivery Location: ${selectedOrder.address}`,
      type: 'delivery' as const,
    });

    // Add driver marker if available and order is active
    if (selectedOrder.driverId && ['assigned', 'in-progress'].includes(selectedOrder.status)) {
      const driverLocation = driverLocations.get(selectedOrder.driverId._id);
      if (driverLocation) {
        markers.push({
          id: `driver-${selectedOrder.driverId._id}`,
          position: { lat: driverLocation.lat, lng: driverLocation.lng },
          title: `Your Driver: ${selectedOrder.driverId.name}`,
          type: 'driver' as const,
          color: selectedOrder.status === 'in-progress' ? '#10B981' : '#3B82F6',
          driverInfo: {
            name: selectedOrder.driverId.name,
            status: selectedOrder.status,
            orderId: selectedOrder._id,
            vehicleInfo: 'Standard Delivery Vehicle',
            phone: '+1 (555) 123-4567',
            estimatedArrival: selectedOrder.status === 'in-progress' ? '10-15 min' : 'Preparing for pickup',
          },
        });
      }
    }

    return markers;
  };

  const getMapCenter = () => {
    if (selectedOrder) {
      const driverLocation = selectedOrder.driverId ? driverLocations.get(selectedOrder.driverId._id) : null;
      if (driverLocation) {
        return { lat: driverLocation.lat, lng: driverLocation.lng };
      }
      return { lat: selectedOrder.lat, lng: selectedOrder.lng };
    }
    // Default to New York City
    return { lat: 40.7128, lng: -74.0060 };
  };

  const activeDriversCount = orders.filter(o => 
    o.driverId && ['assigned', 'in-progress'].includes(o.status)
  ).length;

  return (
    <DashboardLayout title="Customer Dashboard">
      <div className="space-y-8">
        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Tracking Map */}
        {selectedOrder && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                    <Navigation className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Live Tracking - Order #{selectedOrder._id.slice(-6)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Driver: {selectedOrder.driverId?.name || 'Unassigned'} • Status: {selectedOrder.status}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseTracking}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <GoogleMap
                center={getMapCenter()}
                zoom={15}
                markers={getMapMarkers()}
                className="w-full h-96"
                mode="customer"
              />
            </div>
          </div>
        )}

        {/* Place New Order */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Place New Order</h3>
              </div>
              <button
                onClick={() => setShowOrderForm(!showOrderForm)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </button>
            </div>
          </div>

          {showOrderForm && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <form onSubmit={handleCreateOrder} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOrder.address}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter delivery address"
                      disabled={isCreatingOrder}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newOrder.lat || ''}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="40.7128"
                      disabled={isCreatingOrder}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newOrder.lng || ''}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="-74.0060"
                      disabled={isCreatingOrder}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={3}
                    placeholder="Any special delivery instructions..."
                    disabled={isCreatingOrder}
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={isCreatingOrder}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
                  >
                    {isCreatingOrder ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Placing Order...
                      </>
                    ) : (
                      'Place Order'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOrderForm(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isCreatingOrder}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Order History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Your Orders</h3>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No orders yet</p>
                <p className="text-gray-400">Place your first order to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order._id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">
                          Order #{order._id.slice(-6)}
                        </span>
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status.replace('-', ' ')}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        {['assigned', 'in-progress'].includes(order.status) && (
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Track Live
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-gray-600">Delivery to:</span>
                          <p className="text-gray-900 font-medium">{order.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Navigation className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-gray-600">Coordinates:</span>
                          <p className="text-gray-900 font-medium">{order.lat.toFixed(4)}, {order.lng.toFixed(4)}</p>
                        </div>
                      </div>
                    </div>
                    {order.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 italic">{order.notes}</p>
                      </div>
                    )}
                    {order.driverId && (
                      <div className="mt-3 flex items-center space-x-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Driver: <span className="font-medium text-gray-900">{order.driverId.name}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
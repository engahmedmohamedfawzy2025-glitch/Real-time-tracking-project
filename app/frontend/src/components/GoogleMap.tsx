import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, AlertCircle, Navigation, Truck, User, Clock, CheckCircle, Target, Zap } from 'lucide-react';

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  color?: string;
  type?: 'pickup' | 'delivery' | 'driver';
  driverInfo?: {
    name: string;
    status: string;
    orderId?: string;
    vehicleInfo?: string;
    phone?: string;
    estimatedArrival?: string;
  };
}

export type { MapMarker };

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  onMapLoad?: (map: google.maps.Map) => void;
  onMarkerClick?: (markerId: string) => void;
  focusedDriverId?: string;
  mode?: 'customer' | 'admin';
}

const GoogleMap: React.FC<MapProps> = ({
  center,
  zoom = 13,
  markers = [],
  className = "w-full h-96",
  onMapLoad,
  onMarkerClick,
  focusedDriverId,
  mode = 'admin',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markersMap, setMarkersMap] = useState<Map<string, google.maps.Marker>>(new Map());
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedMarker, setFocusedMarker] = useState<string | null>(null);
  const [animationInterval, setAnimationInterval] = useState<NodeJS.Timeout | null>(null);

  // Enhanced map styles for better visual appeal
  const mapStyles = [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#c9d6ff' }],
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ color: '#f8f9fa' }],
    },
  ];

  // Create custom driver icons with SVG
  const createDriverIcon = useCallback((color: string, status: string, isActive: boolean) => {
    const size = isActive ? 40 : 32;
    const pulseSize = isActive ? 60 : 48;
    
    const svgIcon = `
      <svg width="${pulseSize}" height="${pulseSize}" viewBox="0 0 ${pulseSize} ${pulseSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow-${color.replace('#', '')}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
          ${isActive ? `
          <animate id="pulse-${color.replace('#', '')}" attributeName="r" values="0;${pulseSize/2};0" dur="2s" repeatCount="indefinite"/>
          ` : ''}
        </defs>
        
        ${isActive ? `
        <circle cx="${pulseSize/2}" cy="${pulseSize/2}" r="0" fill="${color}" opacity="0.3">
          <animate attributeName="r" values="0;${pulseSize/2};0" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
        </circle>
        ` : ''}
        
        <circle cx="${pulseSize/2}" cy="${pulseSize/2}" r="${size/2}" fill="${color}" filter="url(#shadow-${color.replace('#', '')})" stroke="white" stroke-width="3"/>
        
        <g transform="translate(${pulseSize/2 - 8}, ${pulseSize/2 - 8})">
          ${status === 'in-progress' ? `
            <path d="M2 12L7 7L12 12L7 17L2 12Z" fill="white" stroke="none"/>
            <animateTransform attributeName="transform" type="rotate" values="0 8 8;360 8 8" dur="3s" repeatCount="indefinite"/>
          ` : status === 'assigned' ? `
            <path d="M8 2L12 6L8 10L4 6L8 2Z" fill="white"/>
            <circle cx="8" cy="6" r="1" fill="${color}"/>
          ` : `
            <circle cx="8" cy="8" r="6" fill="white" opacity="0.9"/>
            <circle cx="8" cy="8" r="3" fill="${color}"/>
          `}
        </g>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`,
      size: new google.maps.Size(pulseSize, pulseSize),
      scaledSize: new google.maps.Size(pulseSize, pulseSize),
      anchor: new google.maps.Point(pulseSize/2, pulseSize/2),
    };
  }, []);

  // Create enhanced info window content
  const createInfoWindowContent = useCallback((markerData: MapMarker) => {
    if (markerData.type === 'driver' && markerData.driverInfo) {
      const { name, status, orderId, vehicleInfo, phone, estimatedArrival } = markerData.driverInfo;
      
      return `
        <div class="p-4 max-w-sm">
          <div class="flex items-center space-x-3 mb-3">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-lg text-gray-900">${name}</h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                status === 'in-progress' ? 'bg-green-100 text-green-800' :
                status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }">
                ${status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
              </span>
            </div>
          </div>
          
          <div class="space-y-2 text-sm">
            ${orderId ? `
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
                <span class="text-gray-600">Order: <span class="font-medium">#${orderId.slice(-6)}</span></span>
              </div>
            ` : ''}
            
            ${vehicleInfo ? `
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-gray-600">${vehicleInfo}</span>
              </div>
            ` : ''}
            
            ${phone ? `
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <span class="text-gray-600">${phone}</span>
              </div>
            ` : ''}
            
            ${estimatedArrival ? `
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-gray-600">ETA: <span class="font-medium">${estimatedArrival}</span></span>
              </div>
            ` : ''}
          </div>
          
          <div class="mt-4 pt-3 border-t border-gray-200">
            <button onclick="window.focusOnDriver('${markerData.id}')" class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
              ${mode === 'admin' ? 'Focus on Driver' : 'Track This Driver'}
            </button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="p-3">
        <h3 class="font-semibold text-gray-900">${markerData.title}</h3>
        <p class="text-sm text-gray-600 mt-1">${markerData.type === 'pickup' ? 'Pickup Location' : 'Delivery Location'}</p>
      </div>
    `;
  }, [mode]);

  // Simulate driver movement for demo purposes
  const simulateDriverMovement = useCallback((driverId: string, marker: google.maps.Marker) => {
    if (animationInterval) {
      clearInterval(animationInterval);
    }

    let step = 0;
    const totalSteps = 100;
    const originalPosition = marker.getPosition();
    
    if (!originalPosition) return;

    const interval = setInterval(() => {
      step++;
      if (step > totalSteps) {
        step = 0; // Reset for continuous movement
      }

      // Create a circular movement pattern
      const angle = (step / totalSteps) * 2 * Math.PI;
      const radius = 0.002; // Small radius for realistic movement
      
      const newLat = originalPosition.lat() + Math.cos(angle) * radius;
      const newLng = originalPosition.lng() + Math.sin(angle) * radius;
      
      marker.setPosition({ lat: newLat, lng: newLng });
      
      // Update marker icon based on movement
      const isActive = focusedMarker === driverId;
      const markerData = markers.find(m => m.id === driverId);
      if (markerData && markerData.driverInfo) {
        const icon = createDriverIcon(
          markerData.color || '#3B82F6',
          markerData.driverInfo.status,
          isActive
        );
        marker.setIcon(icon);
      }
    }, 200); // Update every 200ms for smooth movement

    setAnimationInterval(interval);
  }, [markers, focusedMarker, createDriverIcon, animationInterval]);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          setError('Google Maps API key is not configured');
          setIsLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry'],
        });

        const { Map } = await loader.importLibrary('maps');
        
        if (mapRef.current) {
          const mapInstance = new Map(mapRef.current, {
            center,
            zoom,
            styles: mapStyles,
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
              position: google.maps.ControlPosition.TOP_CENTER,
            },
            zoomControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_CENTER,
            },
            scaleControl: true,
            streetViewControl: true,
            streetViewControlOptions: {
              position: google.maps.ControlPosition.RIGHT_TOP,
            },
            fullscreenControl: true,
          });
          
          const infoWindowInstance = new google.maps.InfoWindow({
            maxWidth: 350,
          });
          
          // Add global function for info window buttons
          (window as any).focusOnDriver = (markerId: string) => {
            onMarkerClick?.(markerId);
            infoWindowInstance.close();
          };
          
          setInfoWindow(infoWindowInstance);
          setMap(mapInstance);
          onMapLoad?.(mapInstance);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to load Google Maps');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!map || !infoWindow) return;

    // Clear existing markers and intervals
    markersMap.forEach((marker) => {
      marker.setMap(null);
    });
    markersMap.clear();

    if (animationInterval) {
      clearInterval(animationInterval);
    }

    // Add new markers
    markers.forEach((markerData, index) => {
      const markerOptions: google.maps.MarkerOptions = {
        position: markerData.position,
        map,
        title: markerData.title,
        zIndex: markerData.type === 'driver' ? 1000 : 100,
      };

      // Custom icons based on marker type
      if (markerData.type === 'pickup') {
        markerOptions.icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#3B82F6',
          fillOpacity: 0.9,
          strokeColor: 'white',
          strokeWeight: 3,
          scale: 12,
        };
      } else if (markerData.type === 'delivery') {
        markerOptions.icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#10B981',
          fillOpacity: 0.9,
          strokeColor: 'white',
          strokeWeight: 3,
          scale: 12,
        };
      } else if (markerData.type === 'driver') {
        const isActive = focusedMarker === markerData.id || focusedDriverId === markerData.id.replace('driver-', '');
        const status = markerData.driverInfo?.status || 'available';
        const color = markerData.color || '#3B82F6';
        
        markerOptions.icon = createDriverIcon(color, status, isActive);
      }

      const marker = new google.maps.Marker(markerOptions);

      // Enhanced click listener for driver markers
      if (markerData.type === 'driver') {
        marker.addListener('click', () => {
          setFocusedMarker(markerData.id);
          onMarkerClick?.(markerData.id);
          
          // Smooth pan to marker
          map.panTo(markerData.position);
          
          // Zoom in for better view
          if (map.getZoom()! < 16) {
            map.setZoom(16);
          }
          
          // Show enhanced info window
          const content = createInfoWindowContent(markerData);
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
          
          // Start movement simulation for this driver
          setTimeout(() => {
            simulateDriverMovement(markerData.id, marker);
          }, 500);
        });

        // Enhanced hover listener
        marker.addListener('mouseover', () => {
          // Quick info on hover
          const quickInfo = `
            <div class="p-2">
              <h4 class="font-medium text-gray-900">${markerData.driverInfo?.name || 'Driver'}</h4>
              <p class="text-xs text-gray-600">${markerData.driverInfo?.status || 'Available'}</p>
              <p class="text-xs text-blue-600 mt-1">Click for details</p>
            </div>
          `;
          infoWindow.setContent(quickInfo);
          infoWindow.open(map, marker);
        });

        marker.addListener('mouseout', () => {
          if (focusedMarker !== markerData.id) {
            infoWindow.close();
          }
        });

        // Start movement simulation for active drivers
        if (markerData.driverInfo?.status === 'in-progress') {
          setTimeout(() => {
            simulateDriverMovement(markerData.id, marker);
          }, index * 1000); // Stagger the start times
        }
      }

      markersMap.set(markerData.id, marker);
    });

    setMarkersMap(new Map(markersMap));
  }, [map, markers, infoWindow, focusedMarker, focusedDriverId, createDriverIcon, createInfoWindowContent, simulateDriverMovement]);

  // Focus on specific driver
  useEffect(() => {
    if (map && focusedDriverId) {
      const focusedMarker = markers.find(m => m.id === `driver-${focusedDriverId}`);
      if (focusedMarker) {
        map.panTo(focusedMarker.position);
        map.setZoom(17);
        setFocusedMarker(`driver-${focusedDriverId}`);
        
        // Show info window for focused driver
        const marker = markersMap.get(`driver-${focusedDriverId}`);
        if (marker && infoWindow) {
          const content = createInfoWindowContent(focusedMarker);
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        }
      }
    }
  }, [map, focusedDriverId, markers, markersMap, infoWindow, createInfoWindowContent]);

  // Update map center
  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center]);

  if (error) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300`}>
        <div className="text-center p-6">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">Map Unavailable</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative rounded-xl overflow-hidden shadow-lg`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center z-10">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-indigo-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-gray-700 text-lg font-medium">Loading Interactive Map...</p>
            <p className="text-gray-500 text-sm mt-1">Preparing enhanced features</p>
          </div>
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map Controls Overlay */}
      {!isLoading && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Active</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Assigned</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-gray-600">Available</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Driver Count Badge */}
      {!isLoading && markers.filter(m => m.type === 'driver').length > 0 && (
        <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-4 py-2 shadow-lg z-10">
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4" />
            <span className="text-sm font-medium">
              {markers.filter(m => m.type === 'driver').length} Driver{markers.filter(m => m.type === 'driver').length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
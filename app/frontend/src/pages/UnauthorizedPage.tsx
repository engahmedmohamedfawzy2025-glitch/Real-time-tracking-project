import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Home } from 'lucide-react';

const UnauthorizedPage: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
        <div className="space-y-4">
          <button
            onClick={logout}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
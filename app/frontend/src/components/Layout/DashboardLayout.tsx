import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Shield, Truck } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
}) => {
  const { user, logout } = useAuth();

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'customer':
        return <User className="h-5 w-5" />;
      case 'admin':
        return <Shield className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'customer':
        return 'bg-blue-100 text-blue-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${getRoleColor()}`}>
                {getRoleIcon()}
                <span className="capitalize">{user?.role}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700 font-medium hidden sm:block">{user?.name}</span>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
import React, { useState } from 'react';
import { 
  XMarkIcon, 
  UserIcon, 
  BellIcon, 
  CogIcon, 
  LinkIcon, 
  CreditCardIcon, 
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const SettingsDrawer = ({ isOpen, onClose, userProfile }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showUndo, setShowUndo] = useState(false);

  const handleLogout = () => {
    // Clear user data (mock implementation)
    localStorage.removeItem('user');
    setShowUndo(true);
    
    // Auto-hide undo after 5 seconds
    setTimeout(() => {
      setShowUndo(false);
    }, 5000);
  };

  const handleUndoLogout = () => {
    // Restore user data (mock implementation)
    localStorage.setItem('user', JSON.stringify(userProfile));
    setShowUndo(false);
  };

  const handleNotificationsToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* User Profile Section */}
              <div className="flex items-center space-x-4 pb-4 border-b">
                <img
                  src={userProfile?.avatar_url || '/images/default-avatar.png'}
                  alt="Profile"
                  className="w-12 h-12 rounded-full border-2 border-butter-yellow"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150/007bff/ffffff?text=JD';
                  }}
                />
                <div>
                  <p className="font-medium text-gray-900">{userProfile?.name}</p>
                  <p className="text-sm text-gray-600">{userProfile?.email}</p>
                </div>
              </div>

              {/* Settings Options */}
              <div className="space-y-1">
                {/* Edit Profile */}
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Edit Profile</span>
                  <span className="ml-auto text-xs text-gray-400">Stub</span>
                </button>

                {/* Notifications */}
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <BellIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">Notifications</span>
                  </div>
                  <button
                    onClick={handleNotificationsToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationsEnabled ? 'bg-nz-green' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Units */}
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <CogIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Units</span>
                  <span className="ml-auto text-xs text-gray-400">Stub</span>
                </button>

                {/* Connected Accounts */}
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <LinkIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Connected Accounts</span>
                  <span className="ml-auto text-xs text-gray-400">Stub</span>
                </button>

                {/* Payments */}
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <CreditCardIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Payments</span>
                  <span className="ml-auto text-xs text-gray-400">Stub</span>
                </button>

                {/* Help */}
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Help</span>
                  <span className="ml-auto text-xs text-gray-400">Stub</span>
                </button>
              </div>

              {/* Logout Section */}
              <div className="pt-4 border-t">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 p-3 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Undo Toast */}
      {showUndo && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-60">
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-700">Logged out successfully</div>
            <button
              onClick={handleUndoLogout}
              className="text-nz-green hover:text-green-700 text-sm font-medium"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsDrawer;

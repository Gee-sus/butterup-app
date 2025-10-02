import React, { useState, useEffect } from 'react';
import { UserCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import SettingsDrawer from '../components/SettingsDrawer';

const ProfileScreen = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/me/');
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const data = await response.json();
      setUserProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    setIsSettingsOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="relative bg-gradient-to-r from-butter-yellow via-nz-green to-emerald-600 rounded-b-3xl text-white">
          <div className="max-w-4xl mx-auto px-4 py-10">
            <div className="flex items-end space-x-4">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full ring-4 ring-white/40 bg-white/20 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-white/30 rounded animate-pulse" />
                <div className="h-4 w-64 bg-white/20 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 -mt-8 space-y-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">Error loading profile: {error}</p>
          <button 
            onClick={fetchUserProfile}
            className="mt-4 px-4 py-2 bg-nz-green text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-butter-yellow via-nz-green to-emerald-600 rounded-b-3xl text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-end space-x-4">
            <div className="relative">
              <img
                src={userProfile?.avatar_url || '/images/default-avatar.png'}
                alt={`${userProfile?.name || 'User'} avatar`}
                className="w-24 h-24 md:w-28 md:h-28 rounded-full ring-4 ring-white shadow-xl object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/150/007bff/ffffff?text=JD';
                }}
              />
              <button
                onClick={handleAvatarClick}
                aria-label="Open settings"
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-white/90 text-gray-800 shadow-md hover:shadow-lg hover:bg-white transition"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="pb-1">
              <h1 className="text-3xl md:text-4xl font-bold drop-shadow-sm">{userProfile?.name}</h1>
              <p className="text-white/90">{userProfile?.email}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white mt-2 capitalize">
                {userProfile?.provider}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 space-y-8">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg bg-nz-green text-white shadow hover:shadow-md hover:bg-green-700 transition"
            onClick={handleAvatarClick}
          >
            <Cog6ToothIcon className="w-5 h-5 mr-2" />
            Open Settings
          </button>
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition"
          >
            Edit Profile
          </button>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
              <p className="text-gray-900">{userProfile?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-gray-900">{userProfile?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Provider</label>
              <p className="text-gray-900 capitalize">{userProfile?.provider}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Avatar</label>
              <p className="text-gray-900 text-sm">Click avatar or Settings to manage</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-gray-600">No recent activity to display.</div>
        </div>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userProfile={userProfile}
      />
    </div>
  );
};

export default ProfileScreen;

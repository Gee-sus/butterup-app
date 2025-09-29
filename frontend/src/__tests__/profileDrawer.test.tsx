import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsDrawer from '../components/SettingsDrawer';

// Mock user profile data
const mockUserProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar_url: 'https://via.placeholder.com/150/007bff/ffffff?text=JD',
  provider: 'google'
};

describe('SettingsDrawer', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  it('renders when open', () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <SettingsDrawer 
        isOpen={false} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes when backdrop is clicked', () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows logout functionality', () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    const logoutButton = screen.getByText('Log out');
    expect(logoutButton).toBeInTheDocument();
  });

  it('handles logout and shows undo', async () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    const logoutButton = screen.getByText('Log out');
    fireEvent.click(logoutButton);

    // Check that localStorage.removeItem was called
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('user');

    // Check that undo toast appears
    await waitFor(() => {
      expect(screen.getByText('Logged out successfully')).toBeInTheDocument();
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });
  });

  it('handles undo logout', async () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    // First logout
    const logoutButton = screen.getByText('Log out');
    fireEvent.click(logoutButton);

    // Wait for undo button to appear
    await waitFor(() => {
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    // Click undo
    const undoButton = screen.getByText('Undo');
    fireEvent.click(undoButton);

    // Check that localStorage.setItem was called to restore user
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'user', 
      JSON.stringify(mockUserProfile)
    );

    // Check that undo toast disappears
    await waitFor(() => {
      expect(screen.queryByText('Logged out successfully')).not.toBeInTheDocument();
    });
  });

  it('toggles notifications', () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    const notificationsToggle = screen.getByRole('button', { name: /notifications/i });
    
    // Initial state should be enabled (default)
    expect(notificationsToggle).toHaveClass('bg-nz-green');

    // Click to disable
    fireEvent.click(notificationsToggle);
    expect(notificationsToggle).toHaveClass('bg-gray-200');

    // Click to enable again
    fireEvent.click(notificationsToggle);
    expect(notificationsToggle).toHaveClass('bg-nz-green');
  });

  it('shows all settings options', () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Units')).toBeInTheDocument();
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('shows stub labels for non-implemented features', () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    const stubElements = screen.getAllByText('Stub');
    expect(stubElements).toHaveLength(5); // Edit Profile, Units, Connected Accounts, Payments, Help
  });

  it('displays user profile information correctly', () => {
    render(
      <SettingsDrawer 
        isOpen={true} 
        onClose={mockOnClose} 
        userProfile={mockUserProfile} 
      />
    );

    // Check profile section
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    
    // Check avatar image
    const avatar = screen.getByAltText('Profile');
    expect(avatar).toHaveAttribute('src', mockUserProfile.avatar_url);
  });
});

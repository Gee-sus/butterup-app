import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {Text, View, TouchableOpacity} from 'react-native';
import {AppProvider, useApp} from '../contexts/AppContext';
import {CheapestItem} from '../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Test component that uses the App context
const TestComponent: React.FC = () => {
  const {list, addToList, removeFromList, showSnackbar, snackbar} = useApp();
  
  const mockCheapestItem: CheapestItem = {
    brand: 'Anchor',
    size: '500g',
    store: "Pak'nSave Auckland",
    price: 6.49,
    unit: 12.98,
    product_id: 1,
    store_id: 1,
    product_name: 'Anchor Butter',
    store_chain: 'paknsave',
  };

  const handleAddCheapest = () => {
    const itemToAdd = {
      id: mockCheapestItem.product_id,
      name: mockCheapestItem.product_name,
      price: mockCheapestItem.price,
    };
    addToList(itemToAdd);
    showSnackbar(
      `Added ${mockCheapestItem.brand} ${mockCheapestItem.size} from ${mockCheapestItem.store} to your list`,
      {
        label: 'Undo',
        onPress: () => {
          removeFromList(itemToAdd.id);
          showSnackbar('Item removed from list');
        }
      }
    );
  };

  return (
    <View>
      <TouchableOpacity testID="add-button" onPress={handleAddCheapest}>
        <Text>Add Cheapest to List</Text>
      </TouchableOpacity>
      <Text testID="list-count">List Count: {list.length}</Text>
      {snackbar.visible && (
        <View testID="snackbar">
          <Text testID="snackbar-message">{snackbar.message}</Text>
          {snackbar.action && (
            <TouchableOpacity testID="undo-button" onPress={snackbar.action.onPress}>
              <Text>{snackbar.action.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

describe('Undo Flow Test', () => {
  it('should add item to list and show undo option', async () => {
    const {getByText} = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Initial state - list should be empty
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/0/)).toBeTruthy();

    // Tap "Add Cheapest to List"
    fireEvent.press(getByText(/Add Cheapest/));

    // Wait for the snackbar to appear
    await waitFor(() => {
      expect(getByText("Added Anchor 500g from Pak'nSave Auckland to your list")).toBeTruthy();
    });

    // List count should increase
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/1/)).toBeTruthy();

    // Undo button should be present
    expect(getByText(/Undo/)).toBeTruthy();
  });

  it('should restore list count when undo is pressed', async () => {
    const {getByText} = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Initial state
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/0/)).toBeTruthy();

    // Add item to list
    fireEvent.press(getByText(/Add Cheapest/));

    // Wait for snackbar
    await waitFor(() => {
      expect(getByText("Added Anchor 500g from Pak'nSave Auckland to your list")).toBeTruthy();
    });

    // Verify item was added
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/1/)).toBeTruthy();

    // Tap Undo
    fireEvent.press(getByText(/Undo/));

    // Wait for the undo to complete
    await waitFor(() => {
      expect(getByText('Item removed from list')).toBeTruthy();
    });

    // List count should be restored to 0
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/0/)).toBeTruthy();
  });

  it('should handle multiple add/undo operations correctly', async () => {
    const {getByText} = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Add first item
    fireEvent.press(getByText(/Add Cheapest/));
    await waitFor(() => {
      expect(getByText("Added Anchor 500g from Pak'nSave Auckland to your list")).toBeTruthy();
    });
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/1/)).toBeTruthy();

    // Undo first item
    fireEvent.press(getByText(/Undo/));
    await waitFor(() => {
      expect(getByText('Item removed from list')).toBeTruthy();
    });
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/0/)).toBeTruthy();

    // Add second item
    fireEvent.press(getByText(/Add Cheapest/));
    await waitFor(() => {
      expect(getByText("Added Anchor 500g from Pak'nSave Auckland to your list")).toBeTruthy();
    });
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/1/)).toBeTruthy();

    // Add third item
    fireEvent.press(getByText(/Add Cheapest/));
    await waitFor(() => {
      expect(getByText("Added Anchor 500g from Pak'nSave Auckland to your list")).toBeTruthy();
    });
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/2/)).toBeTruthy();

    // Undo last item
    fireEvent.press(getByText(/Undo/));
    await waitFor(() => {
      expect(getByText('Item removed from list')).toBeTruthy();
    });
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/1/)).toBeTruthy();
  });

  it('should create unique IDs for each added item', async () => {
    const {getByText} = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Add first item
    fireEvent.press(getByText(/Add Cheapest/));
    await waitFor(() => {
      expect(getByText("Added Anchor 500g from Pak'nSave Auckland to your list")).toBeTruthy();
    });

    // Add second item
    fireEvent.press(getByText(/Add Cheapest/));
    await waitFor(() => {
      expect(getByText("Added Anchor 500g from Pak'nSave Auckland to your list")).toBeTruthy();
    });

    // Should have 2 items
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/2/)).toBeTruthy();

    // Undo should only remove the last item
    fireEvent.press(getByText(/Undo/));
    await waitFor(() => {
      expect(getByText('Item removed from list')).toBeTruthy();
    });

    // Should have 1 item remaining
    expect(getByText(/List Count/)).toBeTruthy();
    expect(getByText(/1/)).toBeTruthy();
  });
});




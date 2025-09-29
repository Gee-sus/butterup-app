import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreSelection } from '../contexts/StoreContext';
import { Snackbar, Alert, IconButton, Card, CardContent, Typography, Box, Chip, Button } from '@mui/material';
import { Delete as DeleteIcon, Undo as UndoIcon, ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function ListScreen() {
  const navigate = useNavigate();
  const { selectedStore } = useStoreSelection();
  const [listItems, setListItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [deletedItem, setDeletedItem] = useState(null);

  // Fetch list items from backend
  const fetchListItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/list/items/`);
      if (!response.ok) {
        throw new Error('Failed to fetch list items');
      }
      const data = await response.json();
      setListItems(data.results || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching list items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListItems();
  }, []);

  // Group items by store
  const groupedItems = listItems.reduce((groups, item) => {
    const storeKey = `${item.store.id}-${item.store.name}`;
    if (!groups[storeKey]) {
      groups[storeKey] = {
        store: item.store,
        items: [],
        subtotal: 0
      };
    }
    groups[storeKey].items.push(item);
    groups[storeKey].subtotal += parseFloat(item.price_at_add);
    return groups;
  }, {});

  // Remove item from list (act first)
  const removeItem = async (itemId) => {
    const item = listItems.find(i => i.id === itemId);
    if (!item) return;

    // Store the deleted item for potential undo
    setDeletedItem(item);

    // Remove locally first (act first)
    setListItems(prev => prev.filter(i => i.id !== itemId));

    // Show undo snackbar
    setSnackbar({
      open: true,
      message: 'Item removed from list',
      severity: 'info',
      action: 'undo'
    });

    // Fire backend call in background
    try {
      const response = await fetch(`${API_BASE_URL}/api/list/items/${itemId}/`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove item from server');
      }
    } catch (err) {
      console.error('Error removing item:', err);
      // On failure, restore locally and show error
      setListItems(prev => [...prev, item]);
      setSnackbar({
        open: true,
        message: 'Failed to save, restored',
        severity: 'error'
      });
    }
  };

  // Undo remove (re-add locally)
  const undoRemove = () => {
    if (deletedItem) {
      setListItems(prev => [...prev, deletedItem]);
      setDeletedItem(null);
      setSnackbar({
        open: true,
        message: 'Item restored',
        severity: 'success'
      });
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
    if (snackbar.action === 'undo') {
      setDeletedItem(null); // Clear deleted item if snackbar closes without undo
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading your list...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button 
            onClick={fetchListItems}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (listItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <ShoppingCartIcon className="mx-auto h-24 w-24 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your list is empty</h2>
          <p className="text-gray-600 mb-6">Add some butter products to get started!</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Shopping List</h1>
        <p className="text-gray-600">Organized by store for easy shopping</p>
      </div>

      <div className="space-y-6">
        {Object.values(groupedItems).map((group) => (
          <Card key={`${group.store.id}-${group.store.name}`} className="shadow-lg">
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <Typography variant="h5" component="h2" className="font-bold">
                    {group.store.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {group.store.chain} • {group.store.city}
                  </Typography>
                </div>
                <Chip 
                  label={`$${group.subtotal.toFixed(2)}`} 
                  color="primary" 
                  variant="outlined"
                  className="text-lg font-semibold"
                />
              </div>

              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <Typography variant="h6" className="font-medium">
                        {item.product.brand} {item.product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.product.weight_grams}g • ${item.price_at_add} each
                      </Typography>
                    </div>
                    <IconButton 
                      onClick={() => removeItem(item.id)}
                      color="error"
                      size="small"
                      className="ml-4"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Summary */}
      <Card className="mt-8 bg-blue-50">
        <CardContent>
          <div className="flex justify-between items-center">
            <Typography variant="h5" className="font-bold">
              Total Estimated Cost
            </Typography>
            <Typography variant="h4" className="font-bold text-blue-600">
              ${Object.values(groupedItems).reduce((total, group) => total + group.subtotal, 0).toFixed(2)}
            </Typography>
          </div>
        </CardContent>
      </Card>

      {/* Snackbar for undo functionality */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          action={
            snackbar.action === 'undo' ? (
              <Button color="inherit" size="small" onClick={undoRemove}>
                <UndoIcon className="mr-1" />
                Undo
              </Button>
            ) : null
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

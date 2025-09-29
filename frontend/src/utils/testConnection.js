// Simple connection test utility
export const testConnection = async () => {
  try {
    console.log('Testing connection to Django backend...');
    const response = await fetch('http://127.0.0.1:8000/api/products/');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connection successful! Found', data.results?.length || data.length, 'products');
      return { success: true, data };
    } else {
      console.log('❌ Connection failed with status:', response.status);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return { success: false, error: error.message };
  }
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  window.testConnection = testConnection;
}

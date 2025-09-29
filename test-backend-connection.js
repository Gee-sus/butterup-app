// Simple script to test if your Django backend is running
// Run this with: node test-backend-connection.js

const http = require('http');

const testConnection = (host, port, path) => {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Backend is running! Status: ${res.statusCode}`);
      console.log(`📍 URL: http://${host}:${port}${path}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`❌ Backend connection failed: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ Connection timeout after 5 seconds`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
};

async function main() {
  console.log('🔍 Testing backend connection...\n');
  
  // Test different possible backend URLs
  const tests = [
    { host: '127.0.0.1', port: 8000, path: '/api/products/' },
    { host: 'localhost', port: 8000, path: '/api/products/' },
    { host: '10.0.2.2', port: 8000, path: '/api/products/' }, // Android emulator
  ];

  let anyConnected = false;

  for (const test of tests) {
    console.log(`Testing ${test.host}:${test.port}${test.path}...`);
    const connected = await testConnection(test.host, test.port, test.path);
    if (connected) {
      anyConnected = true;
    }
    console.log(''); // Empty line for readability
  }

  if (anyConnected) {
    console.log('🎉 At least one backend connection is working!');
    console.log('\n📱 Your mobile app should now show "🟢 Backend" in the header.');
  } else {
    console.log('💡 To start your backend:');
    console.log('   1. Open PowerShell in the backend folder');
    console.log('   2. Run: python manage.py runserver');
    console.log('   3. Make sure it shows "Starting development server at http://127.0.0.1:8000/"');
  }
}

main().catch(console.error);

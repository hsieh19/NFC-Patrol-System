const axios = require('axios');

async function testInit() {
  try {
    console.log('Testing init API...');
    const response = await axios.post('http://localhost:3000/api/auth/init', {
      username: 'admin',
      password: '123456'
    });
    console.log('Init API response:', response.data);
    console.log('Test passed!');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testInit();

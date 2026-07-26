const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const results = {
            keys_present: {
                public: !!process.env.API_PUBLIC_KEY,
                secret: !!process.env.API_SECRET_KEY
            },
            tests: []
        };

        // Test 1: Both keys in headers
        try {
            console.log('🧪 Test 1: Both keys in headers...');
            const response = await axios.post(
                'https://api.ninslip.com/verification/nin',
                { nin: '12345678901' },
                {
                    headers: {
                        'x-api-key': process.env.API_PUBLIC_KEY,
                        'x-secret-key': process.env.API_SECRET_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            results.tests.push({
                name: 'Both keys in headers',
                success: true,
                status: response.status,
                data: response.data
            });
        } catch (error) {
            results.tests.push({
                name: 'Both keys in headers',
                success: false,
                error: error.message,
                response: error.response?.data
            });
        }

        // Test 2: Bearer token with public key
        try {
            console.log('🧪 Test 2: Bearer with public key...');
            const response = await axios.post(
                'https://api.ninslip.com/verification/nin',
                { nin: '12345678901' },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.API_PUBLIC_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            results.tests.push({
                name: 'Bearer with public key',
                success: true,
                status: response.status,
                data: response.data
            });
        } catch (error) {
            results.tests.push({
                name: 'Bearer with public key',
                success: false,
                error: error.message,
                response: error.response?.data
            });
        }

        // Test 3: Try to get Bearer token
        try {
            console.log('🧪 Test 3: Get Bearer token...');
            const authResponse = await axios.post(
                'https://api.ninslip.com/auth/token',
                {},
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${process.env.API_PUBLIC_KEY}:${process.env.API_SECRET_KEY}`).toString('base64')}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            const token = authResponse.data.token || authResponse.data.access_token;
            results.tests.push({
                name: 'Get Bearer token',
                success: true,
                token_received: !!token,
                data: authResponse.data
            });
        } catch (error) {
            results.tests.push({
                name: 'Get Bearer token',
                success: false,
                error: error.message,
                response: error.response?.data
            });
        }

        return res.json({
            success: true,
            results: results
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
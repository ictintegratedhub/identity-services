const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🧪 Testing ArewaGate Auth...');
        console.log(`Public Key: ${process.env.API_PUBLIC_KEY ? '✅ Present' : '❌ Missing'}`);
        console.log(`Secret Key: ${process.env.API_SECRET_KEY ? '✅ Present' : '❌ Missing'}`);

        // Check if keys are present
        if (!process.env.API_PUBLIC_KEY || !process.env.API_SECRET_KEY) {
            return res.status(400).json({
                success: false,
                error: 'Missing API keys. Please set API_PUBLIC_KEY and API_SECRET_KEY in environment variables.',
                keys: {
                    public: !!process.env.API_PUBLIC_KEY,
                    secret: !!process.env.API_SECRET_KEY
                }
            });
        }

        // Test getting access token
        const authString = Buffer.from(
            `${process.env.API_PUBLIC_KEY}:${process.env.API_SECRET_KEY}`
        ).toString('base64');

        console.log(`Auth String: Basic ${authString.substring(0, 20)}...`);

        const response = await axios.post(
            'https://api.ninslip.com/auth/token',
            {},
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('✅ Auth successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        return res.json({
            success: true,
            message: 'Auth successful!',
            token_received: !!response.data.data?.access_token,
            expires_in: response.data.data?.expires_in,
            token_preview: response.data.data?.access_token ? response.data.data.access_token.substring(0, 20) + '...' : null,
            full_response: response.data
        });

    } catch (error) {
        console.error('❌ Auth test failed:', error.message);
        
        let errorResponse = {
            success: false,
            message: error.message,
            code: error.code
        };

        if (error.response) {
            errorResponse.status = error.response.status;
            errorResponse.statusText = error.response.statusText;
            errorResponse.data = error.response.data;
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }

        return res.status(500).json(errorResponse);
    }
};
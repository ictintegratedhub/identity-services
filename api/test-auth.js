const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🧪 Testing ArewaGate Auth...');
        console.log(`Public Key: ${process.env.API_PUBLIC_KEY ? '✅ Present' : '❌ Missing'}`);
        console.log(`Secret Key: ${process.env.API_SECRET_KEY ? '✅ Present' : '❌ Missing'}`);

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

        return res.json({
            success: true,
            message: 'Auth successful!',
            token_received: !!response.data.data?.access_token,
            expires_in: response.data.data?.expires_in,
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
            errorResponse.data = error.response.data;
        }

        return res.status(500).json(errorResponse);
    }
};
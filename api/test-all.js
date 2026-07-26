const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🧪 Testing ALL possible ArewaGate endpoints...');
        
        // Check keys
        if (!process.env.API_PUBLIC_KEY || !process.env.API_SECRET_KEY) {
            return res.status(400).json({
                success: false,
                error: 'Missing API keys',
                keys: {
                    public: !!process.env.API_PUBLIC_KEY,
                    secret: !!process.env.API_SECRET_KEY
                }
            });
        }

        const authString = Buffer.from(
            `${process.env.API_PUBLIC_KEY}:${process.env.API_SECRET_KEY}`
        ).toString('base64');

        const results = [];
        
        // List of possible endpoints to test
        const endpoints = [
            'https://api.ninslip.com/auth/token',
            'https://api.ninslip.com/v1/auth/token',
            'https://api.ninslip.com/api/auth/token',
            'https://api.ninslip.com/oauth/token',
            'https://api.ninslip.com/login',
            'https://api.ninslip.com/authenticate',
            'https://api.arewagate.com/auth/token',
            'https://api.arewagate.com/v1/auth/token',
            'https://arewagate.com/api/auth/token',
        ];

        for (const url of endpoints) {
            try {
                console.log(`Testing: ${url}`);
                
                const response = await axios.post(
                    url,
                    {},
                    {
                        headers: {
                            'Authorization': `Basic ${authString}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );
                
                results.push({
                    url: url,
                    success: true,
                    status: response.status,
                    hasToken: !!response.data?.data?.access_token || !!response.data?.access_token,
                    preview: response.data?.data?.access_token ? response.data.data.access_token.substring(0, 20) + '...' : null,
                    data: response.data
                });
                
                // If we found a working endpoint, return early
                if (response.data?.data?.access_token || response.data?.access_token) {
                    return res.json({
                        success: true,
                        message: '✅ Found working endpoint!',
                        working_url: url,
                        token_received: true,
                        full_response: response.data,
                        all_tests: results
                    });
                }
                
            } catch (error) {
                results.push({
                    url: url,
                    success: false,
                    status: error.response?.status || 'Network Error',
                    error: error.message
                });
            }
        }

        // If no endpoint worked
        return res.json({
            success: false,
            message: '❌ No working endpoint found. Please check your API base URL.',
            all_tests: results
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
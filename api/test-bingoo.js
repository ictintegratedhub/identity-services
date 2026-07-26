const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🧪 Testing Bingoo API Connection...');
        console.log(`API Key: ${process.env.BINGOO_API_KEY ? '✅ Present' : '❌ Missing'}`);

        if (!process.env.BINGOO_API_KEY) {
            return res.status(400).json({
                success: false,
                error: 'Missing API key. Set BINGOO_API_KEY in environment variables.'
            });
        }

        // Test NIN endpoint with a test number
        const response = await axios.post(
            'https://bingoo.ng/api/v1/nin',
            { number: '12345678901' },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.BINGOO_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        return res.json({
            success: true,
            message: 'API connection successful!',
            status: response.status,
            data: response.data
        });

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
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
const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.cookies?.staffToken;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bvn } = req.body;

    if (!bvn || bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
        return res.status(400).json({ error: 'Invalid BVN. Please enter an 11-digit BVN.' });
    }

    try {
        console.log(`Verifying BVN: ${bvn}`);

        // --- MOCK RESPONSE (Replace with actual API) ---
        const mockData = {
            success: true,
            data: {
                fullName: 'Jane Adebayo',
                dob: '1992-05-15',
                phone: '08098765432',
                address: '456 Victoria Island, Lagos',
                photo: `https://ui-avatars.com/api/?name=Jane+Adebayo&background=d4af37&color=fff&size=120`,
                bvn: bvn,
                verificationDate: new Date().toISOString()
            }
        };
        return res.json(mockData);

    } catch (error) {
        console.error('BVN API Error:', error.message);
        return res.status(500).json({
            error: 'Unable to verify BVN. Please try again later.'
        });
    }
};
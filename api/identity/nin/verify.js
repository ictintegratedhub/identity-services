module.exports = async (req, res) => {
    // Enable CORS
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

    // Get token from cookie
    const cookies = req.headers.cookie || '';
    const token = cookies.split('; ').find(row => row.startsWith('staffToken='))?.split('=')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Please login first.' });
    }

    const { nin } = req.body;

    if (!nin || nin.length !== 11 || !/^\d{11}$/.test(nin)) {
        return res.status(400).json({ error: 'Invalid NIN. Please enter an 11-digit NIN.' });
    }

    try {
        console.log(`Verifying NIN: ${nin}`);

        // --- MOCK RESPONSE (Replace with actual API) ---
        const mockData = {
            success: true,
            data: {
                fullName: 'John Okafor',
                dob: '1990-01-01',
                phone: '08012345678',
                address: '123 Main Street, Lagos',
                photo: `https://ui-avatars.com/api/?name=John+Okafor&background=d4af37&color=fff&size=120`,
                nin: nin,
                verificationDate: new Date().toISOString()
            }
        };
        return res.json(mockData);

    } catch (error) {
        console.error('NIN API Error:', error.message);
        return res.status(500).json({
            error: 'Unable to verify NIN. Please try again later.'
        });
    }
};
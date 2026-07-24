const axios = require('axios');

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

    // Check authentication
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

        // Call NINSLIP.com API
        const response = await axios.post(
            'https://api.ninslip.com/nin/',
            { nin: nin },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Check if verification was successful
        if (response.data && response.data.status === true) {
            const userData = response.data.data;
            
            // Format the response for our frontend
            const formattedData = {
                success: true,
                data: {
                    fullName: userData.fullname || userData.fullName || 'Not Available',
                    firstName: userData.firstname || '',
                    lastName: userData.lastname || '',
                    middleName: userData.middlename || '',
                    dob: userData.dob || userData.dateOfBirth || 'Not Available',
                    gender: userData.gender || userData.sex || 'Not Available',
                    phone: userData.phone || userData.phoneNumber || 'Not Available',
                    address: userData.address || userData.residentialAddress || 'Not Available',
                    nin: userData.nin || nin,
                    state: userData.state || userData.stateOfOrigin || 'Not Available',
                    lga: userData.lga || userData.localGovernment || 'Not Available',
                    photo: userData.photo || userData.passport || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullname || 'User')}&background=d4af37&color=fff&size=200`,
                    verified: true,
                    verificationDate: new Date().toISOString()
                }
            };
            
            return res.json(formattedData);
        } else {
            // API returned error
            return res.status(400).json({
                error: response.data.message || 'Unable to verify NIN. Please try again.'
            });
        }

    } catch (error) {
        console.error('NIN API Error:', error.message);
        
        if (error.response) {
            console.error('API Response:', error.response.data);
            return res.status(500).json({
                error: error.response.data.message || 'Unable to verify NIN. Please try again later.'
            });
        }
        
        return res.status(500).json({
            error: 'Network error. Please try again later.'
        });
    }
};
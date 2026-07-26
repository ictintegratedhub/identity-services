const axios = require('axios');

// Cache for the access token
let cachedToken = null;
let tokenExpiry = null;

// Function to get or refresh the access token
async function getAccessToken() {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        console.log('✅ Using cached token');
        return cachedToken;
    }

    console.log('🔄 Getting new access token...');
    
    try {
        // Format: Basic base64(public_key:secret_key)
        const authString = Buffer.from(
            `${process.env.API_PUBLIC_KEY}:${process.env.API_SECRET_KEY}`
        ).toString('base64');

        const response = await axios.post(
            'https://api.ninslip.com/auth/token',
            {}, // No body required
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.data.success && response.data.data?.access_token) {
            cachedToken = response.data.data.access_token;
            // Cache token for 55 minutes (expires in 1 hour)
            tokenExpiry = Date.now() + (55 * 60 * 1000);
            console.log('✅ Access token obtained successfully');
            return cachedToken;
        } else {
            throw new Error(response.data.message || 'Failed to get access token');
        }
    } catch (error) {
        console.error('❌ Failed to get access token:', error.message);
        throw error;
    }
}

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

    // Check authentication (staff login)
    const cookies = req.headers.cookie || '';
    const token = cookies.split('; ').find(row => row.startsWith('staffToken='))?.split('=')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Please login first.' });
    }

    const { nin } = req.body;

    if (!nin || nin.length !== 11 || !/^\d{11}$/.test(nin)) {
        return res.status(400).json({ error: 'Invalid NIN. Please enter an 11-digit NIN.' });
    }

    // Check if we should use mock provider
    const useMock = process.env.USE_MOCK_PROVIDER === 'true' || process.env.USE_MOCK_PROVIDER === '1';

    try {
        console.log(`========================================`);
        console.log(`🔍 NIN Verification Request`);
        console.log(`NIN: ${nin}`);
        console.log(`Use Mock: ${useMock}`);
        console.log(`Public Key: ${process.env.API_PUBLIC_KEY ? '✅ Present' : '❌ Missing'}`);
        console.log(`Secret Key: ${process.env.API_SECRET_KEY ? '✅ Present' : '❌ Missing'}`);
        console.log(`========================================`);

        // ============================================================
        // MOCK PROVIDER (For testing)
        // ============================================================
        if (useMock) {
            console.log('📦 Using MOCK provider for NIN verification');
            const mockData = generateMockNINData(nin);
            return res.json({
                success: true,
                data: mockData
            });
        }

        // ============================================================
        // AREWAGATE API - Get Access Token
        // ============================================================
        console.log('🌐 Getting ArewaGate access token...');
        const accessToken = await getAccessToken();
        console.log('✅ Access token obtained');

        // ============================================================
        // AREWAGATE API - Verify NIN
        // ============================================================
        console.log('🌐 Verifying NIN with ArewaGate...');
        const response = await axios.post(
            'https://api.ninslip.com/verification/nin',
            { nin: nin },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`✅ API Response Status: ${response.status}`);

        // Check if verification was successful
        if (response.data.success && response.data.data?.status === 'completed') {
            const userData = response.data.data.data;
            
            const formattedData = {
                success: true,
                data: {
                    fullName: `${userData.firstname || ''} ${userData.middlename || ''} ${userData.lastname || ''}`.trim() || 'Not Available',
                    firstName: userData.firstname || '',
                    lastName: userData.lastname || '',
                    middleName: userData.middlename || '',
                    dob: userData.dob || 'Not Available',
                    gender: userData.gender === 'm' ? 'Male' : userData.gender === 'f' ? 'Female' : userData.gender || 'Not Available',
                    phone: userData.phone || 'Not Available',
                    address: userData.address || 'Not Available',
                    nin: userData.nin || nin,
                    state: userData.state || 'Not Available',
                    lga: userData.lga || 'Not Available',
                    photo: userData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstname || '')}+${encodeURIComponent(userData.lastname || '')}&background=d4af37&color=fff&size=200`,
                    verified: true,
                    verificationDate: new Date().toISOString()
                }
            };
            
            return res.json(formattedData);
        } else {
            console.log(`❌ API returned error: ${response.data.message}`);
            return res.status(400).json({
                error: response.data.message || 'Unable to verify NIN. Please try again.'
            });
        }

    } catch (error) {
        console.error(`❌ ERROR DETAILS:`);
        console.error(`Message:`, error.message);
        
        if (error.response) {
            console.error(`Response Status:`, error.response.status);
            console.error(`Response Data:`, JSON.stringify(error.response.data, null, 2));
            
            // Handle specific status codes
            if (error.response.status === 401) {
                // Reset cached token on auth failure
                cachedToken = null;
                tokenExpiry = null;
                return res.status(401).json({
                    error: '⚠️ Invalid API credentials. Please check your Public and Secret keys.'
                });
            }
            
            if (error.response.status === 402) {
                return res.status(402).json({
                    error: '⚠️ Insufficient wallet balance. Please fund your ArewaGate wallet.'
                });
            }
            
            if (error.response.status === 422) {
                return res.status(422).json({
                    error: error.response.data.message || 'Invalid NIN format or verification failed.'
                });
            }

            return res.status(500).json({
                error: error.response.data.message || 'Unable to verify NIN. Please try again later.'
            });
        }
        
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({
                error: '⏱️ Request timeout. The API is taking too long to respond.'
            });
        }
        
        return res.status(500).json({
            error: `Network error: ${error.message}. Please try again.`
        });
    }
};

// ============================================================
// MOCK DATA GENERATOR
// ============================================================
function generateMockNINData(nin) {
    const hash = simpleHash(nin);
    const firstNames = ['John', 'Jane', 'Michael', 'Mary', 'David', 'Grace', 'Peter', 'Esther', 'Samuel', 'Ruth'];
    const lastNames = ['Okafor', 'Adebayo', 'Musa', 'Okonkwo', 'Eze', 'Bello', 'Adeyemi', 'Chukwu', 'Ibrahim', 'Adeleke'];
    const genders = ['Male', 'Female'];
    const states = ['Lagos', 'Anambra', 'Oyo', 'Kano', 'Rivers', 'Enugu', 'Kaduna', 'Ogun', 'Abuja', 'Delta'];
    const lgas = ['Ikeja', 'Awka', 'Ibadan North', 'Kano Municipal', 'Port Harcourt', 'Enugu North', 'Zaria', 'Abeokuta', 'Garki', 'Asaba'];
    const phonePrefixes = ['080', '081', '070', '090', '080', '081', '070', '090', '080', '081'];
    
    const firstName = firstNames[hash % firstNames.length];
    const lastName = lastNames[(hash * 7) % lastNames.length];
    const gender = genders[(hash * 3) % genders.length];
    const state = states[(hash * 5) % states.length];
    const lga = lgas[(hash * 11) % lgas.length];
    const phonePrefix = phonePrefixes[(hash * 13) % phonePrefixes.length];
    const phoneNumber = phonePrefix + String(10000000 + (hash * 17) % 90000000).padStart(8, '0');
    
    const year = 1970 + (hash * 3) % 35;
    const month = 1 + (hash * 5) % 12;
    const day = 1 + (hash * 7) % 28;
    const dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return {
        fullName: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
        middleName: '',
        dob: dob,
        gender: gender,
        phone: phoneNumber,
        address: `${123 + (hash * 7) % 999} ${['Main St', 'Victoria Island', 'Ikoyi', 'Surulere', 'Apapa'][(hash * 19) % 5]}, ${state}`,
        nin: nin,
        state: state,
        lga: lga,
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=d4af37&color=fff&size=200`,
        verified: true,
        verificationDate: new Date().toISOString()
    };
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}
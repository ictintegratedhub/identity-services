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

    const { bvn } = req.body;

    if (!bvn || bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
        return res.status(400).json({ error: 'Invalid BVN. Please enter an 11-digit BVN.' });
    }

    const useMock = process.env.USE_MOCK_PROVIDER === 'true' || process.env.USE_MOCK_PROVIDER === '1';

    try {
        console.log(`========================================`);
        console.log(`🔍 BVN Verification Request`);
        console.log(`BVN: ${bvn}`);
        console.log(`Use Mock: ${useMock}`);
        console.log(`Public Key: ${process.env.API_PUBLIC_KEY ? '✅ Present' : '❌ Missing'}`);
        console.log(`Secret Key: ${process.env.API_SECRET_KEY ? '✅ Present' : '❌ Missing'}`);
        console.log(`========================================`);

        if (useMock) {
            console.log('📦 Using MOCK provider for BVN verification');
            const mockData = generateMockBVNData(bvn);
            return res.json({
                success: true,
                data: mockData
            });
        }

        // Try multiple authentication options
        try {
            console.log('🌐 Calling ArewaGate API (Option 1: Both keys in headers)...');
            
            const response = await axios.post(
                'https://api.ninslip.com/verification/bvn',
                { bvn: bvn },
                {
                    headers: {
                        'x-api-key': process.env.API_PUBLIC_KEY,
                        'x-secret-key': process.env.API_SECRET_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data.success && response.data.data?.status === 'completed') {
                const userData = response.data.data.data;
                const formattedData = formatBVNResponse(userData, bvn);
                return res.json(formattedData);
            }
        } catch (error1) {
            console.log('❌ Option 1 failed, trying Option 2...');
            
            try {
                console.log('🌐 Calling ArewaGate API (Option 2: Bearer token)...');
                
                const authResponse = await axios.post(
                    'https://api.ninslip.com/auth/token',
                    {},
                    {
                        headers: {
                            'Authorization': `Basic ${Buffer.from(`${process.env.API_PUBLIC_KEY}:${process.env.API_SECRET_KEY}`).toString('base64')}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const bearerToken = authResponse.data.token || authResponse.data.access_token;
                console.log('✅ Bearer token obtained');

                const response = await axios.post(
                    'https://api.ninslip.com/verification/bvn',
                    { bvn: bvn },
                    {
                        headers: {
                            'Authorization': `Bearer ${bearerToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );

                if (response.data.success && response.data.data?.status === 'completed') {
                    const userData = response.data.data.data;
                    const formattedData = formatBVNResponse(userData, bvn);
                    return res.json(formattedData);
                }
            } catch (error2) {
                console.log('❌ Option 2 failed, trying Option 3...');
                
                try {
                    console.log('🌐 Calling ArewaGate API (Option 3: Bearer with public key)...');
                    
                    const response = await axios.post(
                        'https://api.ninslip.com/verification/bvn',
                        { bvn: bvn },
                        {
                            headers: {
                                'Authorization': `Bearer ${process.env.API_PUBLIC_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 30000
                        }
                    );

                    if (response.data.success && response.data.data?.status === 'completed') {
                        const userData = response.data.data.data;
                        const formattedData = formatBVNResponse(userData, bvn);
                        return res.json(formattedData);
                    }
                } catch (error3) {
                    console.log('❌ All authentication options failed');
                    throw error3;
                }
            }
        }

        return res.status(500).json({
            error: 'Unable to verify BVN. Please check your API credentials and try again.'
        });

    } catch (error) {
        console.error(`❌ ERROR DETAILS:`, error.message);
        
        if (error.response) {
            console.error(`Response Status:`, error.response.status);
            console.error(`Response Data:`, JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 402) {
                return res.status(402).json({
                    error: '⚠️ Insufficient wallet balance. Please fund your ArewaGate wallet.'
                });
            }
            
            if (error.response.status === 401) {
                return res.status(401).json({
                    error: '⚠️ Invalid API credentials. Please check your Public and Secret keys.'
                });
            }

            return res.status(500).json({
                error: error.response.data.message || 'Unable to verify BVN. Please try again later.'
            });
        }
        
        return res.status(500).json({
            error: `Network error: ${error.message}. Please try again.`
        });
    }
};

function formatBVNResponse(userData, bvn) {
    return {
        success: true,
        data: {
            fullName: `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || 'Not Available',
            firstName: userData.firstname || '',
            lastName: userData.lastname || '',
            dob: userData.dob || 'Not Available',
            gender: userData.gender === 'm' ? 'Male' : userData.gender === 'f' ? 'Female' : userData.gender || 'Not Available',
            phone: userData.phone || 'Not Available',
            address: userData.address || 'Not Available',
            bvn: userData.bvn || bvn,
            bankName: userData.bankName || userData.bank || 'Not Available',
            photo: userData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstname || '')}+${encodeURIComponent(userData.lastname || '')}&background=d4af37&color=fff&size=200`,
            verified: true,
            verificationDate: new Date().toISOString()
        }
    };
}

function generateMockBVNData(bvn) {
    const hash = simpleHash(bvn);
    const firstNames = ['Mary', 'John', 'Grace', 'Peter', 'Esther', 'David', 'Ruth', 'Samuel', 'Faith', 'Michael'];
    const lastNames = ['Adebayo', 'Okafor', 'Musa', 'Okonkwo', 'Eze', 'Bello', 'Adeyemi', 'Chukwu', 'Ibrahim', 'Adeleke'];
    const genders = ['Female', 'Male'];
    const states = ['Lagos', 'Anambra', 'Oyo', 'Kano', 'Rivers', 'Enugu', 'Kaduna', 'Ogun', 'Abuja', 'Delta'];
    const banks = ['Access Bank', 'GTBank', 'First Bank', 'Zenith Bank', 'UBA', 'Fidelity Bank', 'Stanbic IBTC', 'Union Bank', 'Wema Bank', 'Heritage Bank'];
    const phonePrefixes = ['080', '081', '070', '090', '080', '081', '070', '090', '080', '081'];
    
    const firstName = firstNames[hash % firstNames.length];
    const lastName = lastNames[(hash * 7) % lastNames.length];
    const gender = genders[(hash * 3) % genders.length];
    const state = states[(hash * 5) % states.length];
    const bankName = banks[(hash * 11) % banks.length];
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
        dob: dob,
        gender: gender,
        phone: phoneNumber,
        address: `${123 + (hash * 7) % 999} ${['Main St', 'Victoria Island', 'Ikoyi', 'Surulere', 'Apapa'][(hash * 19) % 5]}, ${state}`,
        bvn: bvn,
        bankName: bankName,
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
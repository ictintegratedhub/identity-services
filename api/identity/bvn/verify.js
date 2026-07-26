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

    // Check authentication (staff login)
    const cookies = req.headers.cookie || '';
    const token = cookies.split('; ').find(row => row.startsWith('staffToken='))?.split('=')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Please login first.' });
    }

    const { searchMode, bvn, phone } = req.body;

    // Determine which search mode to use
    const mode = searchMode || 'bvn';

    // Validate based on search mode
    if (mode === 'bvn' || mode === 'card') {
        if (!bvn || bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
            return res.status(400).json({ error: 'Invalid BVN. Please enter an 11-digit BVN.' });
        }
    } else if (mode === 'phone') {
        if (!phone || phone.length !== 11 || !/^\d{11}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number. Please enter an 11-digit phone number.' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid search mode. Use: bvn, phone, or card' });
    }

    // Check if we should use mock provider
    const useMock = process.env.USE_MOCK_PROVIDER === 'true' || process.env.USE_MOCK_PROVIDER === '1';

    try {
        console.log(`========================================`);
        console.log(`🔍 BVN Verification Request`);
        console.log(`Mode: ${mode}`);
        if (mode === 'bvn' || mode === 'card') console.log(`BVN: ${bvn}`);
        if (mode === 'phone') console.log(`Phone: ${phone}`);
        console.log(`Use Mock: ${useMock}`);
        console.log(`API Key: ${process.env.BINGOO_API_KEY ? '✅ Present' : '❌ Missing'}`);
        console.log(`========================================`);

        // ============================================================
        // MOCK PROVIDER (For testing)
        // ============================================================
        if (useMock) {
            console.log('📦 Using MOCK provider for BVN verification');
            const mockData = generateMockBVNData(bvn || phone);
            return res.json({
                success: true,
                data: mockData
            });
        }

        // ============================================================
        // BINGOO.NG API - Check API Key
        // ============================================================
        if (!process.env.BINGOO_API_KEY) {
            return res.status(500).json({
                error: 'API key not configured. Please set BINGOO_API_KEY in environment variables.'
            });
        }

        // ============================================================
        // BINGOO.NG API - Build request based on mode
        // ============================================================
        let endpoint = '';
        let requestBody = {};

        if (mode === 'bvn') {
            endpoint = 'https://bingoo.ng/api/v1/bvn';
            requestBody = { number: bvn };
        } else if (mode === 'phone') {
            endpoint = 'https://bingoo.ng/api/v1/bvn-phone';
            requestBody = { number: phone };
        } else if (mode === 'card') {
            endpoint = 'https://bingoo.ng/api/v1/bvncard';
            requestBody = { number: bvn };
        }

        console.log(`🌐 Calling Bingoo API: ${endpoint}`);
        console.log(`📦 Request Body:`, JSON.stringify(requestBody, null, 2));

        const response = await axios.post(
            endpoint,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.BINGOO_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`✅ API Response Status: ${response.status}`);

        // Check if verification was successful
        if (response.data.status === 'success') {
            const userData = response.data.data;
            
            const formattedData = {
                success: true,
                data: {
                    fullName: `${userData.firstName || ''} ${userData.middleName || ''} ${userData.lastName || ''}`.trim() || 'Not Available',
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    middleName: userData.middleName || '',
                    dob: userData.dateOfBirth || 'Not Available',
                    gender: userData.gender || 'Not Available',
                    phone: userData.phoneNumber1 || 'Not Available',
                    address: userData.residentialAddress || 'Not Available',
                    bvn: userData.number || bvn || 'Not Available',
                    nin: userData.nin || 'Not Available',
                    bankName: userData.enrollmentBank || 'Not Available',
                    enrollmentBranch: userData.enrollmentBranch || 'Not Available',
                    stateOfOrigin: userData.stateOfOrigin || 'Not Available',
                    lgaOfOrigin: userData.lgaOfOrigin || 'Not Available',
                    stateOfResidence: userData.stateOfResidence || 'Not Available',
                    lgaOfResidence: userData.lgaOfResidence || 'Not Available',
                    maritalStatus: userData.maritalStatus || 'Not Available',
                    photo: userData.base64Image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstName || '')}+${encodeURIComponent(userData.lastName || '')}&background=d4af37&color=fff&size=200`,
                    reportID: response.data.reportID || null,
                    verified: true,
                    verificationDate: new Date().toISOString()
                }
            };
            
            return res.json(formattedData);
        } else {
            console.log(`❌ API returned error: ${response.data.message}`);
            return res.status(400).json({
                error: response.data.message || 'Unable to verify BVN. Please try again.'
            });
        }

    } catch (error) {
        console.error(`❌ ERROR DETAILS:`);
        console.error(`Message:`, error.message);
        
        if (error.response) {
            console.error(`Response Status:`, error.response.status);
            console.error(`Response Data:`, JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401) {
                return res.status(401).json({
                    error: '⚠️ Invalid API key. Please check your Bingoo credentials.'
                });
            }
            
            if (error.response.status === 402) {
                return res.status(402).json({
                    error: '⚠️ Insufficient wallet balance. Please fund your Bingoo wallet.'
                });
            }
            
            if (error.response.status === 404) {
                return res.status(404).json({
                    error: '⚠️ Record not found. Please check the information provided.'
                });
            }

            return res.status(500).json({
                error: error.response.data.message || 'Unable to verify BVN. Please try again later.'
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
function generateMockBVNData(input) {
    const hash = simpleHash(input || '12345678901');
    const firstNames = ['Mary', 'John', 'Grace', 'Peter', 'Esther', 'David', 'Ruth', 'Samuel', 'Faith', 'Michael'];
    const lastNames = ['Adebayo', 'Okafor', 'Musa', 'Okonkwo', 'Eze', 'Bello', 'Adeyemi', 'Chukwu', 'Ibrahim', 'Adeleke'];
    const genders = ['Male', 'Female'];
    const states = ['Lagos', 'Anambra', 'Oyo', 'Kano', 'Rivers', 'Enugu', 'Kaduna', 'Ogun', 'Abuja', 'Delta'];
    const banks = ['Access Bank', 'GTBank', 'First Bank', 'Zenith Bank', 'UBA', 'Fidelity Bank', 'Stanbic IBTC', 'Union Bank', 'Wema Bank', 'Heritage Bank'];
    const phonePrefixes = ['080', '081', '070', '090', '080', '081', '070', '090', '080', '081'];
    const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
    
    const firstName = firstNames[hash % firstNames.length];
    const lastName = lastNames[(hash * 7) % lastNames.length];
    const gender = genders[(hash * 3) % genders.length];
    const state = states[(hash * 5) % states.length];
    const bankName = banks[(hash * 11) % banks.length];
    const phonePrefix = phonePrefixes[(hash * 13) % phonePrefixes.length];
    const phoneNumber = phonePrefix + String(10000000 + (hash * 17) % 90000000).padStart(8, '0');
    const maritalStatus = maritalStatuses[(hash * 19) % maritalStatuses.length];
    
    const year = 1970 + (hash * 3) % 35;
    const month = 1 + (hash * 5) % 12;
    const day = 1 + (hash * 7) % 28;
    const dob = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    
    return {
        fullName: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
        middleName: '',
        dob: dob,
        gender: gender,
        phone: phoneNumber,
        address: `${123 + (hash * 7) % 999} ${['Main St', 'Victoria Island', 'Ikoyi', 'Surulere', 'Apapa'][(hash * 19) % 5]}, ${state}`,
        bvn: String(20000000000 + hash % 90000000000).padStart(11, '0'),
        nin: String(10000000000 + hash % 90000000000).padStart(11, '0'),
        bankName: bankName,
        enrollmentBranch: ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan'][hash % 5],
        stateOfOrigin: state,
        lgaOfOrigin: ['Ikeja', 'Awka', 'Ibadan North', 'Kano Municipal', 'Port Harcourt'][hash % 5],
        stateOfResidence: state,
        lgaOfResidence: ['Ikeja', 'Awka', 'Ibadan North', 'Kano Municipal', 'Port Harcourt'][(hash * 7) % 5],
        maritalStatus: maritalStatus,
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=d4af37&color=fff&size=200`,
        reportID: `${String(100000 + hash % 900000)}-${String(hash).substring(0, 10)}`,
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
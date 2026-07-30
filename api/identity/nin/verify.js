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

    const { searchMode, nin, phone, firstname, lastname, gender, dob } = req.body;

    // Determine which search mode to use
    const mode = searchMode || 'nin';

    // Validate based on search mode
    if (mode === 'nin') {
        if (!nin || nin.length !== 11 || !/^\d{11}$/.test(nin)) {
            return res.status(400).json({ error: 'Invalid NIN. Please enter an 11-digit NIN.' });
        }
    } else if (mode === 'phone') {
        if (!phone || phone.length !== 11 || !/^\d{11}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number. Please enter an 11-digit phone number.' });
        }
    } else if (mode === 'demographic') {
        if (!firstname || !lastname || !gender || !dob) {
            return res.status(400).json({ 
                error: 'Please provide all demographic fields: firstname, lastname, gender, dob' 
            });
        }
        // Validate gender
        if (!['m', 'f'].includes(gender.toLowerCase())) {
            return res.status(400).json({ error: 'Gender must be "m" or "f"' });
        }
        // Validate DOB format (DD-MM-YYYY)
        if (!/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
            return res.status(400).json({ error: 'DOB must be in DD-MM-YYYY format' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid search mode. Use: nin, phone, or demographic' });
    }

    // Check if we should use mock provider
    const useMock = process.env.USE_MOCK_PROVIDER === 'true' || process.env.USE_MOCK_PROVIDER === '1';

    try {
        console.log(`========================================`);
        console.log(`🔍 NIN Verification Request`);
        console.log(`Mode: ${mode}`);
        if (mode === 'nin') console.log(`NIN: ${nin}`);
        if (mode === 'phone') console.log(`Phone: ${phone}`);
        if (mode === 'demographic') console.log(`Demographic: ${firstname} ${lastname}, ${gender}, ${dob}`);
        console.log(`Use Mock: ${useMock}`);
        console.log(`API Key: ${process.env.BINGOO_API_KEY ? '✅ Present' : '❌ Missing'}`);
        console.log(`========================================`);

        // ============================================================
        // MOCK PROVIDER (For testing)
        // ============================================================
        if (useMock) {
            console.log('📦 Using MOCK provider for NIN verification');
            const mockData = generateMockNINData(nin || phone || firstname);
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

        if (mode === 'nin') {
            endpoint = 'https://bingoo.ng/api/v1/nin';
            requestBody = { number: nin };
        } else if (mode === 'phone') {
            endpoint = 'https://bingoo.ng/api/v1/phone';
            requestBody = { number: phone };
        } else if (mode === 'demographic') {
            endpoint = 'https://bingoo.ng/api/v1/demo';
            requestBody = {
                firstname: firstname,
                lastname: lastname,
                gender: gender.toLowerCase(),
                dob: dob
            };
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
        console.log(`📦 API Response:`, JSON.stringify(response.data, null, 2));

        // Check if verification was successful
        if (response.data.status === 'success') {
            const userData = response.data.data;
            
            const formattedData = {
                success: true,
                data: {
                    fullName: `${userData.firstname || ''} ${userData.middlename || ''} ${userData.surname || ''}`.trim() || 'Not Available',
                    firstName: userData.firstname || '',
                    lastName: userData.surname || '',
                    middleName: userData.middlename || '',
                    dob: userData.birthdate || 'Not Available',
                    gender: userData.gender === 'm' ? 'Male' : userData.gender === 'f' ? 'Female' : userData.gender || 'Not Available',
                    phone: userData.telephoneno || 'Not Available',
                    address: `${userData.residence_address || ''}, ${userData.residence_town || ''}, ${userData.residence_lga || ''}, ${userData.residence_state || ''}`.trim() || 'Not Available',
                    nin: userData.nin || 'Not Available',
                    state: userData.residence_state || 'Not Available',
                    lga: userData.residence_lga || 'Not Available',
                    stateOfOrigin: userData.birthstate || 'Not Available',
                    lgaOfOrigin: userData.birthlga || 'Not Available',
                    photo: userData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstname || '')}+${encodeURIComponent(userData.surname || '')}&background=d4af37&color=fff&size=200`,
                    signature: userData.signature || null,
                    trackingId: userData.trackingId || null,
                    reportID: response.data.reportID || null,
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
// MOCK DATA GENERATOR (Same as before)
// ============================================================
function generateMockNINData(input) {
    const hash = simpleHash(input || '12345678901');
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
        nin: String(10000000000 + hash % 90000000000).padStart(11, '0'),
        state: state,
        lga: lga,
        stateOfOrigin: state,
        lgaOfOrigin: lga,
        photo: "data:image/jpeg;base64,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",
        signature: null,
        trackingId: `TRK${String(hash).padStart(6, '0')}`,
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
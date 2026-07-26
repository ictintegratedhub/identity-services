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
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=d4af37&color=fff&size=200`,
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
const axios = require("axios");

/* ==========================================================
   HTTP CONFIGURATION
========================================================== */

const HTTP_CONFIG = {
    timeout: 30000,
    headers: {
        "Content-Type": "application/json"
    }
};

/* ==========================================================
   LOGGING ABSTRACTION
========================================================== */

const Logger = {
    info: (...args) => console.log("[INFO]", ...args),
    warn: (...args) => console.warn("[WARN]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
    debug: (...args) => console.log("[DEBUG]", ...args)
};

/* ==========================================================
   PROVIDER REGISTRY
========================================================== */

const PROVIDER_REGISTRY = {
    bingoo: {
        id: "bingoo",
        name: "Bingoo",
        endpoint: process.env.BINGOO_ENDPOINT,
        apiKey: process.env.BINGOO_API_KEY,
        mapper: "bingoo",
        displayName: "Bingoo",
        icon: "🔵",
        description: "Fast and reliable NIN/BVN verification",
        status: process.env.BINGOO_API_KEY && process.env.BINGOO_ENDPOINT ? "active" : "inactive"
    },
    dj: {
        id: "dj",
        name: "DJ",
        endpoint: process.env.CHANNEL2_ENDPOINT,
        apiKey: process.env.CHANNEL2_API_KEY,
        mapper: "standard",
        displayName: "DJ Verification",
        icon: "🟣",
        description: "Alternative verification provider",
        status: process.env.CHANNEL2_API_KEY && process.env.CHANNEL2_ENDPOINT ? "active" : "inactive"
    },
    pr: {
        id: "pr",
        name: "PR",
        endpoint: process.env.CHANNEL3_ENDPOINT,
        apiKey: process.env.CHANNEL3_API_KEY,
        mapper: "standard",
        displayName: "PR Verification",
        icon: "🟢",
        description: "Premium verification provider",
        status: process.env.CHANNEL3_API_KEY && process.env.CHANNEL3_ENDPOINT ? "active" : "inactive"
    }
};

/* ==========================================================
   ENDPOINT REGISTRY
========================================================== */

const ENDPOINT_REGISTRY = {
    nin: "/nin",
    phone: "/phone",
    demographic: "/demo"
};

/* ==========================================================
   ERROR REGISTRY
========================================================== */

const ERROR_REGISTRY = {
    400: "Invalid request.",
    401: "Invalid provider credentials.",
    402: "Wallet balance exhausted.",
    403: "Request denied.",
    404: "Identity record not found.",
    429: "Too many requests. Please try again shortly."
};

/* ==========================================================
   RESPONSE MAPPER REGISTRY
========================================================== */

const RESPONSE_MAPPERS = {
    // Standard mapper (used by dj and pr)
    standard: function(apiData, channel) {
        return {
            provider: channel.name,
            channel: channel.id,
            retrievedAt: new Date().toISOString(),
            trackingId: apiData.trackingId || apiData.reference || "",
            nin: apiData.nin || apiData.number || "",
            surname: apiData.lastName || apiData.surname || "",
            firstName: apiData.firstName || apiData.firstname || "",
            middleName: apiData.middleName || apiData.middlename || "",
            fullName: apiData.fullName || apiData.fullname || "",
            gender: apiData.gender || "",
            dateOfBirth: apiData.dob || apiData.dateOfBirth || "",
            phone: apiData.phone || apiData.phoneNumber || "",
            email: apiData.email || "",
            address: apiData.address || "",
            state: apiData.state || "",
            lga: apiData.lga || "",
            stateOfOrigin: apiData.stateOfOrigin || "",
            lgaOfOrigin: apiData.lgaOfOrigin || "",
            photo: apiData.photo || apiData.image || "",
            signature: apiData.signature || "",
            verified: !!apiData.verified,
            verificationDate: apiData.verificationDate || new Date().toISOString(),
            reportID: apiData.reportID || "",
            rawResponse: apiData
        };
    },

    // Bingoo specific mapper (extends standard)
    bingoo: function(apiData, channel) {
        const base = RESPONSE_MAPPERS.standard(apiData, channel);
        
        return {
            ...base,
            trackingId: apiData.trackingId || "",
            nin: apiData.nin || "",
            surname: apiData.lastName || "",
            firstName: apiData.firstName || "",
            middleName: apiData.middleName || "",
            fullName: apiData.fullName || "",
            gender: apiData.gender || "",
            dateOfBirth: apiData.dob || "",
            phone: apiData.phone || "",
            email: apiData.email || "",
            address: apiData.address || "",
            state: apiData.state || "",
            lga: apiData.lga || "",
            stateOfOrigin: apiData.stateOfOrigin || "",
            lgaOfOrigin: apiData.lgaOfOrigin || "",
            photo: apiData.photo || "",
            signature: apiData.signature || "",
            reportID: apiData.reportID || "",
            rawResponse: apiData
        };
    }
};

/* ==========================================================
   PROVIDER EXTRACTOR
========================================================== */

function extractProviderData(response) {
    return (
        response.data ||
        response.result ||
        response.payload ||
        response.identity ||
        response
    );
}

/* ==========================================================
   MOCK DATA GENERATOR
========================================================== */

function generateMockNINData(identifier) {
    const hash = identifier ? 
        identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 
        Date.now();
    
    const mockNin = identifier && /^\d{11}$/.test(identifier) ? 
        identifier : 
        String(10000000000 + (hash % 90000000000)).padStart(11, '0');
    
    const mockPhone = identifier && /^\d{11}$/.test(identifier) ? 
        identifier : 
        `080${String(hash % 100000000).padStart(8, '0')}`;
    
    const names = [
        { first: "John", last: "Doe", middle: "Smith" },
        { first: "Jane", last: "Doe", middle: "Mary" },
        { first: "Michael", last: "Johnson", middle: "James" },
        { first: "Sarah", last: "Williams", middle: "Ann" },
        { first: "David", last: "Brown", middle: "Robert" }
    ];
    
    const nameIndex = hash % names.length;
    const name = names[nameIndex];
    
    const genders = ["M", "F"];
    const gender = genders[hash % 2];
    
    const states = ["Lagos", "Abuja", "Rivers", "Kano", "Oyo", "Kaduna", "Enugu", "Delta"];
    const lgas = ["Ikeja", "Mainland", "Island", "Central", "North", "South", "East", "West"];
    
    const month = String((hash % 12) + 1).padStart(2, '0');
    const day = String((hash % 28) + 1).padStart(2, '0');
    const year = 1980 + (hash % 30);
    const dob = `${month}-${day}-${year}`;
    
    return {
        provider: "Mock",
        channel: "mock",
        retrievedAt: new Date().toISOString(),
        trackingId: `MOCK-${hash}`,
        nin: mockNin,
        surname: name.last,
        firstName: name.first,
        middleName: name.middle,
        fullName: `${name.first} ${name.middle} ${name.last}`,
        gender: gender,
        dateOfBirth: dob,
        phone: mockPhone,
        email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@example.com`,
        address: `${123 + (hash % 100)} ${name.last} Street`,
        state: states[hash % states.length],
        lga: lgas[hash % lgas.length],
        stateOfOrigin: states[(hash + 3) % states.length],
        lgaOfOrigin: lgas[(hash + 5) % lgas.length],
        photo: "",
        signature: "",
        verified: true,
        verificationDate: new Date().toISOString(),
        reportID: `REP-${hash}`,
        rawResponse: { mock: true }
    };
}

/* ==========================================================
   PROVIDER HELPER FUNCTIONS
========================================================== */

function getActiveProvider(selectedChannel) {
    // If frontend specified a channel, try to use it
    let channelId = selectedChannel || process.env.ACTIVE_PROVIDER || "bingoo";
    
    // Validate the channel exists
    if (!PROVIDER_REGISTRY[channelId]) {
        Logger.warn(`Channel "${channelId}" not found, falling back to default`);
        channelId = process.env.ACTIVE_PROVIDER || "bingoo";
    }
    
    // Check if the channel is properly configured
    const provider = PROVIDER_REGISTRY[channelId];
    if (!provider.endpoint || !provider.apiKey) {
        Logger.warn(`Channel "${channelId}" not fully configured, falling back to default`);
        // Try to find a configured channel
        const configuredChannel = Object.keys(PROVIDER_REGISTRY).find(key => {
            return PROVIDER_REGISTRY[key].endpoint && PROVIDER_REGISTRY[key].apiKey;
        });
        if (configuredChannel) {
            channelId = configuredChannel;
        }
    }
    
    const finalProvider = PROVIDER_REGISTRY[channelId];
    
    if (!finalProvider) {
        throw new Error(`No configured provider available`);
    }
    
    return finalProvider;
}

function validateProvider(provider) {
    if (!provider) {
        throw new Error("No provider configured.");
    }
    
    if (!provider.endpoint) {
        throw new Error(`Endpoint not configured for ${provider.name}.`);
    }
    
    if (!provider.apiKey) {
        throw new Error(`API key not configured for ${provider.name}.`);
    }
}

function buildFullEndpoint(baseEndpoint, mode) {
    const cleanBase = baseEndpoint.replace(/\/$/, "");
    const path = ENDPOINT_REGISTRY[mode];
    
    if (!path) {
        throw new Error(`Unknown endpoint mode: ${mode}`);
    }
    
    return `${cleanBase}${path}`;
}

function buildRequestBody(mode, data) {
    switch (mode) {
        case "nin":
            return { number: data.nin };
        case "phone":
            return { number: data.phone };
        case "demographic":
            return {
                firstname: data.firstname,
                lastname: data.lastname,
                gender: data.gender.toLowerCase(),
                dob: data.dob
            };
        default:
            throw new Error(`Unable to build request body for mode: ${mode}`);
    }
}

/* ==========================================================
   VALIDATION HELPERS
========================================================== */

const Validators = {
    nin: (value) => value && /^\d{11}$/.test(value),
    phone: (value) => value && /^\d{11}$/.test(value),
    dob: (value) => value && /^\d{2}-\d{2}-\d{4}$/.test(value),
    gender: (value) => value && ["m", "f"].includes(value.toLowerCase())
};

/* ==========================================================
   COOKIE PARSER
========================================================== */

function parseCookie(cookieString, key) {
    if (!cookieString) return null;
    
    try {
        const cookies = cookieString.split("; ");
        const cookie = cookies.find(row => row.startsWith(`${key}=`));
        return cookie ? cookie.split("=")[1] : null;
    } catch (error) {
        Logger.error("Error parsing cookies:", error.message);
        return null;
    }
}

/* ==========================================================
   HTTP CLIENT (ABSTRACTED)
========================================================== */

async function callProvider(provider, endpoint, requestBody) {
    const response = await axios.post(
        endpoint,
        requestBody,
        {
            headers: {
                Authorization: `Bearer ${provider.apiKey}`,
                "Content-Type": "application/json"
            },
            timeout: HTTP_CONFIG.timeout
        }
    );
    
    return response.data;
}

/* ==========================================================
   RESPONSE HANDLER
========================================================== */

function handleProviderError(error) {
    if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data.message || 
                            error.response.data.error || 
                            ERROR_REGISTRY[status] || 
                            "Provider returned an error.";
        
        Logger.error("Provider Error:", status, errorMessage);
        
        return {
            status: status,
            message: errorMessage
        };
    }
    
    if (error.code === "ECONNABORTED") {
        return {
            status: 504,
            message: "Request timed out. Please try again."
        };
    }
    
    if (["ENOTFOUND", "ECONNREFUSED", "EHOSTUNREACH"].includes(error.code)) {
        return {
            status: 503,
            message: "Unable to reach the provider. Please try again later."
        };
    }
    
    return {
        status: 500,
        message: error.message || "Internal server error."
    };
}

/* ==========================================================
   MAIN SERVER ENTRY POINT
========================================================== */

module.exports = async (req, res) => {
    /* ======================================================
       CORS
    ====================================================== */

    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    /* ======================================================
       ALLOW ONLY POST
    ====================================================== */

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    /* ======================================================
       STAFF AUTHENTICATION
    ====================================================== */

    const token = parseCookie(req.headers.cookie || "", "staffToken");

    if (!token) {
        return res.status(401).json({
            error: "Unauthorized. Please login first."
        });
    }

    /* ======================================================
       REQUEST DATA
    ====================================================== */

    const {
        searchMode,
        nin,
        phone,
        firstname,
        lastname,
        gender,
        dob,
        channel  // <-- Frontend can specify which channel to use
    } = req.body;

    const mode = searchMode || "nin";

    /* ======================================================
       VALIDATE SEARCH MODE
    ====================================================== */

    if (!ENDPOINT_REGISTRY[mode]) {
        return res.status(400).json({
            error: "Invalid search mode. Must be 'nin', 'phone', or 'demographic'."
        });
    }

    /* ======================================================
       VALIDATE INPUTS
    ====================================================== */

    if (mode === "nin" && !Validators.nin(nin)) {
        return res.status(400).json({
            error: "Invalid NIN. Please enter an 11-digit NIN."
        });
    }

    if (mode === "phone" && !Validators.phone(phone)) {
        return res.status(400).json({
            error: "Invalid phone number. Please enter an 11-digit phone number."
        });
    }

    if (mode === "demographic") {
        if (!firstname || !lastname || !gender || !dob) {
            return res.status(400).json({
                error: "All demographic fields (firstname, lastname, gender, dob) are required."
            });
        }

        if (!Validators.gender(gender)) {
            return res.status(400).json({
                error: "Gender must be 'm' or 'f'."
            });
        }

        if (!Validators.dob(dob)) {
            return res.status(400).json({
                error: "DOB must be in DD-MM-YYYY format."
            });
        }
    }

    /* ======================================================
       MOCK MODE
    ====================================================== */

    const useMock = process.env.USE_MOCK_PROVIDER === "true" || 
                    process.env.USE_MOCK_PROVIDER === "1";

    /* ======================================================
       START PROVIDER ENGINE
    ====================================================== */

    try {
        Logger.info("======================================");
        Logger.info("🔍 Identity Verification");
        Logger.info(`Mode: ${mode}`);
        Logger.info(`Mock: ${useMock}`);
        if (channel) Logger.info(`Requested Channel: ${channel}`);
        Logger.info("======================================");

        /* ======================================================
           MOCK PROVIDER
        ====================================================== */

        if (useMock) {
            Logger.info("📦 Using Mock Provider");
            
            let identifier;
            if (mode === "nin") identifier = nin;
            else if (mode === "phone") identifier = phone;
            else identifier = firstname;
            
            const mockData = generateMockNINData(identifier);
            
            return res.json({
                success: true,
                identity: mockData
            });
        }

        /* ======================================================
           LOAD ACTIVE PROVIDER (with channel selection)
        ====================================================== */

        const provider = getActiveProvider(channel);
        validateProvider(provider);

        /* ======================================================
           BUILD REQUEST
        ====================================================== */

        const requestData = { nin, phone, firstname, lastname, gender, dob };
        const requestBody = buildRequestBody(mode, requestData);
        const endpoint = buildFullEndpoint(provider.endpoint, mode);

        Logger.info(`🌐 Provider : ${provider.name} (${provider.id})`);
        Logger.info(`🔗 Endpoint : ${endpoint}`);
        Logger.debug("📦 Request:", JSON.stringify(requestBody, null, 2));

        /* ======================================================
           CALL PROVIDER
        ====================================================== */

        const responseData = await callProvider(provider, endpoint, requestBody);

        /* ======================================================
           EXTRACT PROVIDER DATA
        ====================================================== */

        const apiData = extractProviderData(responseData);
        
        if (!apiData || typeof apiData !== 'object') {
            throw new Error("Invalid response from provider");
        }

        /* ======================================================
           MAP RESPONSE
        ====================================================== */

        const mapperKey = provider.mapper || "standard";
        const mapper = RESPONSE_MAPPERS[mapperKey];
        
        if (!mapper) {
            throw new Error(`Unknown mapper: ${mapperKey}`);
        }

        // Log only useful fields
        Logger.info(`📦 Response from ${provider.name}:`, {
            provider: provider.name,
            trackingId: apiData.trackingId || apiData.reference || "N/A",
            nin: apiData.nin || apiData.number || "N/A",
            hasPhoto: !!(apiData.photo || apiData.image),
            hasSignature: !!(apiData.signature)
        });

        const identityData = mapper(apiData, provider);

        Logger.info("✅ Verification successful");

        return res.json({
            success: true,
            identity: identityData,
            channel: {
                id: provider.id,
                name: provider.name,
                displayName: provider.displayName || provider.name
            }
        });
    } catch (error) {
        Logger.error("======================================");
        Logger.error("❌ VERIFICATION FAILED");
        Logger.error(error.message);
        Logger.error("======================================");

        const errorResult = handleProviderError(error);
        
        return res.status(errorResult.status).json({
            error: errorResult.message
        });
    }
};
/* ==========================================================
   CHANNELS API - Returns available verification channels
========================================================== */

const PROVIDER_REGISTRY = {
    bingoo: {
        id: "bingoo",
        name: "Bingoo",
        endpoint: process.env.BINGOO_ENDPOINT,
        apiKey: process.env.BINGOO_API_KEY,
        mapper: "bingoo",
        // Frontend display info
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

    try {
        // Build channel list for frontend
        const channels = Object.keys(PROVIDER_REGISTRY).map(key => {
            const channel = PROVIDER_REGISTRY[key];
            return {
                id: channel.id,
                name: channel.displayName || channel.name,
                icon: channel.icon || "📡",
                description: channel.description || `${channel.name} verification`,
                status: channel.status || "unknown",
                isConfigured: !!(channel.endpoint && channel.apiKey)
            };
        });

        return res.json({
            success: true,
            defaultChannel: process.env.ACTIVE_PROVIDER || "bingoo",
            channels: channels
        });

    } catch (error) {
        console.error("Channels API Error:", error.message);
        return res.status(500).json({
            error: "Unable to fetch channel information"
        });
    }
};
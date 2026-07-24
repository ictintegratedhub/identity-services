const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, error: 'Password required' });
    }

    try {
        // For testing, use a simple password check
        // Remove this in production and use the hashed password
        if (password === 'AIIH@Staff') {
            const token = jwt.sign(
                { role: 'staff', timestamp: Date.now() },
                process.env.JWT_SECRET || 'fallback-secret-for-testing',
                { expiresIn: '24h' }
            );

            res.setHeader('Set-Cookie', [
                `staffToken=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`
            ]);

            return res.json({ success: true, redirect: '/identity' });
        }

        // Use the hashed password check for production
        // const isValid = await bcrypt.compare(password, process.env.STAFF_PASSWORD_HASH);
        // if (!isValid) {
        //     return res.status(401).json({ success: false, error: 'Invalid password' });
        // }

        return res.status(401).json({ success: false, error: 'Invalid password' });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};
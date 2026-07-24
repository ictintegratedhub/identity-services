const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
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
        const isValid = await bcrypt.compare(password, process.env.STAFF_PASSWORD_HASH);

        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid password' });
        }

        const token = jwt.sign(
            { role: 'staff', timestamp: Date.now() },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.setHeader('Set-Cookie', [
            `staffToken=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
        ]);

        return res.json({ success: true, redirect: '/identity' });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};
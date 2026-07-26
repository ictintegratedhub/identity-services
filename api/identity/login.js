// api/identity/login.js
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // CRITICAL: Explicitly handle POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Please use POST.' 
        });
    }

    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password required' 
            });
        }

        // Simple password check (change this to your password)
        const validPassword = 'staff123';

        if (password !== validPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid password' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { role: 'staff', timestamp: Date.now() },
            process.env.JWT_SECRET || 'fallback-secret-key-12345',
            { expiresIn: '24h' }
        );

        // Set the cookie
        res.setHeader('Set-Cookie', [
            `staffToken=${token}; HttpOnly; SameSite=Lax; Max-Age=86400; Path=/`
        ]);

        // Send success response
        return res.json({ 
            success: true, 
            redirect: '/identity' 
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error. Please try again.' 
        });
    }
};
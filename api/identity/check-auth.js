const jwt = require('jsonwebtoken');

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

    try {
        const token = req.cookies?.staffToken;

        if (!token) {
            return res.json({ authenticated: false });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({ authenticated: true, user: decoded });

    } catch (error) {
        return res.json({ authenticated: false });
    }
};
module.exports = (req, res) => {
    res.status(200).json({ 
        message: 'API is working!',
        env: {
            hasBingooKey: !!process.env.BINGOO_API_KEY,
            hasJwtSecret: !!process.env.JWT_SECRET
        }
    });
};
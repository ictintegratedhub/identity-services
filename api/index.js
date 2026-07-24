module.exports = (req, res) => {
    res.status(200).json({
        message: 'Identity Services API is running',
        endpoints: {
            login: '/api/identity/login',
            checkAuth: '/api/identity/check-auth',
            ninVerify: '/api/identity/nin/verify',
            bvnVerify: '/api/identity/bvn/verify'
        }
    });
};
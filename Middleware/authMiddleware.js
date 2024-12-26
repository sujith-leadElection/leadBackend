const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer token format

    if (!token) return res.status(401).json({message: "Token Not found"}); // No token, unauthorized

    jwt.verify(token, "LeadContactByElection", (err, user) => {
        if (err) return res.status(403).json({message: "Invalid Session"}); // Invalid token, forbidden
        req.user = user; // Store the user details from the token
        next();
    });
};

module.exports = authenticateToken;
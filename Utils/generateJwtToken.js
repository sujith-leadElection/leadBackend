import jwt from 'jsonwebtoken';
//Env Variables
require("dotenv").config();
// Function to generate JWT token
const generateJwtToken = (userId, role) => {
    return jwt.sign(
        { user: userId, role },
        process.env.SECRET_KEY,
        { expiresIn: "1h" } // Set expiry time to 1 hour
    );
};
export default generateJwtToken;

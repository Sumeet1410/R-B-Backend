const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'rnb_gujarat_default_secret_key_development_mode',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || 'rnb_gujarat_default_secret_key_development_mode'
  );
};

module.exports = {
  generateToken,
  verifyToken
};

const jwt = require('jsonwebtoken');

// Verifies JWT token and attaches authenticated user data to req.user
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: Authentication token is missing'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'default_secret_key'; // Use a default secret for development
    const decoded = jwt.verify(token, secret);

    // Always derive tenant context from token payload, never trust client input
    req.user = {
      user_id: decoded.user_id,
      tenant_id: decoded.tenant_id,
      role_name: decoded.role_name,
      email_address: decoded.email_address,
      full_name: decoded.full_name
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: Invalid or expired token'
    });
  }
};

module.exports = authenticateToken;

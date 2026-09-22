// Restricts route access to specified roles (ADMIN, MANAGER, USER)
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_name) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Role '${req.user.role_name}' lacks required permissions`
      });
    }

    next();
  };
};

module.exports = authorizeRoles;

const { isAdmin } = require('~/config/admin');

/**
 * Middleware to check if user has admin file access privileges
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const checkAdminFileAccess = (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!isAdmin(req.user.email)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = checkAdminFileAccess; 
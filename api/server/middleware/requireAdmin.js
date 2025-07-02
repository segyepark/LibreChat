const admins = require('~/config/admins');
const { SystemRoles } = require('librechat-data-provider');

/**
 * Express middleware that ensures the authenticated user is an admin.
 * If the user is not an admin, responds with 403 Forbidden.
 *
 * Assumes `requireJwtAuth` has already populated `req.user`.
 */
module.exports = function requireAdmin(req, res, next) {
  if (req?.user?.role === SystemRoles.ADMIN || admins.includes(req?.user?.email)) {
    return next();
  }

  return res.status(403).json({ message: 'Admin privileges required' });
};
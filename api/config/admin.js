/**
 * Admin accounts configuration
 * Add admin email addresses to this array to grant admin privileges
 */
const ADMIN_EMAILS = [
  'admin@example.com',
  'admin@librechat.com',
  'test@gmail.com',
  // Add more admin emails here
];

/**
 * Check if a user is an admin based on their email
 * @param {string} email - User's email address
 * @returns {boolean} - True if user is admin, false otherwise
 */
const isAdmin = (email) => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

module.exports = {
  ADMIN_EMAILS,
  isAdmin,
}; 
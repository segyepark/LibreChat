/**
 * Admin accounts configuration
 * Add admin email addresses to this array to grant admin privileges
 * 
 * You can also set admin emails via environment variable ADMIN_EMAILS
 * Format: comma-separated list of emails
 * Example: ADMIN_EMAILS=admin1@example.com,admin2@example.com
 */
const ADMIN_EMAILS = [
  'admin@gmail.com',
  // Add your email address here to grant admin access
  // Example: 'your-email@example.com',
  // Add more admin emails here
];

/**
 * Get admin emails from environment variable or fallback to hardcoded list
 * @returns {string[]} Array of admin email addresses
 */
const getAdminEmails = () => {
  // Check for environment variable first
  if (process.env.ADMIN_EMAILS) {
    return process.env.ADMIN_EMAILS
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
  }

  // Fallback to hardcoded list
  return ADMIN_EMAILS;
};

/**
 * Check if a user is an admin based on their email
 * @param {string} email - User's email address
 * @returns {boolean} - True if user is admin, false otherwise
 */
const isAdmin = (email) => {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
};

module.exports = {
  isAdmin,
}; 
module.exports = (process.env.ADMIN_EMAILS || 'admin@example.com')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);
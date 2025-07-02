const express = require('express');
const { requireJwtAuth, createFileLimiters, uaParser, checkBan } = require('~/server/middleware');
const requireAdmin = require('~/server/middleware/requireAdmin');
const { createMulterInstance } = require('~/server/routes/files/multer');
const filesRoutes = require('~/server/routes/files');

/**
 * Initializes an admin-only router for managing RAG source files.
 * Re-uses the existing upload/CRUD logic from the generic `/api/files` endpoints
 * while adding `requireAdmin` protection so that only admins can create / delete.
 */
const initialize = async () => {
  const router = express.Router();

  // Generic middleware chain – same order as normal files route
  router.use(requireJwtAuth, requireAdmin, checkBan, uaParser);

  const upload = await createMulterInstance();

  const { fileUploadIpLimiter, fileUploadUserLimiter } = createFileLimiters();
  router.post('*', fileUploadIpLimiter, fileUploadUserLimiter);

  // Single file upload – identical to /api/files
  router.post('/', upload.single('file'));
  router.post('/images', upload.single('file'));

  // Delegate to existing files router for rest of the logic
  router.use('/', await filesRoutes.initialize());
  return router;
};

module.exports = { initialize };
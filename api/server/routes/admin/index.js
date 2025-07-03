const express = require('express');
const filesRouter = require('./files');

const router = express.Router();

// Mount admin routes
router.use('/files', filesRouter);

module.exports = router; 
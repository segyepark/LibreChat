const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('~/config');
const { requireJwtAuth, checkAdminFileAccess } = require('~/server/middleware');
const { getFiles, deleteFile, createFile } = require('~/models/File');
const { processFileUpload } = require('~/server/services/Files/process');
const { filterFile } = require('~/server/services/Files/process');
const { extractTextFromFile } = require('~/server/services/Files/textExtraction');

const router = express.Router();

// Apply authentication and admin access middleware to all routes
router.use(requireJwtAuth);
router.use(checkAdminFileAccess);

/**
 * GET /api/admin/files
 * Get all shared files (admin only)
 */
router.get('/', async (req, res) => {
  try {
    // Get all files marked as shared
    const files = await getFiles({ shared: true });
    res.status(200).json(files);
  } catch (error) {
    logger.error('[/admin/files] Error getting shared files:', error);
    res.status(500).json({ message: 'Error retrieving files', error: error.message });
  }
});

/**
 * POST /api/admin/files
 * Upload a new shared file (admin only)
 */
router.post('/', async (req, res) => {
  const metadata = req.body;
  let cleanup = true;

  try {
    // Validate file
    filterFile({ req });

    // Set file metadata for shared files
    metadata.temp_file_id = metadata.file_id;
    metadata.file_id = req.file_id;
    metadata.shared = true; // Mark as shared
    metadata.uploaded_by = req.user.id;
    metadata.uploaded_at = new Date();

    // Extract text content from file for RAG
    let extractedText = '';
    try {
      extractedText = await extractTextFromFile(req.file.path, req.file.mimetype);
    } catch (error) {
      logger.error('Error extracting text from file:', error);
    }

    // Process file upload
    await processFileUpload({ req, res, metadata });

    // Update file with extracted text
    if (extractedText) {
      try {
        await createFile({
          file_id: metadata.file_id,
          text: extractedText,
        }, true);
      } catch (error) {
        logger.error('Error updating file with extracted text:', error);
      }
    }

    logger.debug(`[/admin/files] Shared file uploaded successfully: ${metadata.file_id}`);
  } catch (error) {
    let message = 'Error processing file';
    logger.error('[/admin/files] Error processing file:', error);

    if (error.message?.includes('file_ids')) {
      message += ': ' + error.message;
    }

    if (
      error.message?.includes('Invalid file format') ||
      error.message?.includes('No OCR result')
    ) {
      message = error.message;
    }

    // Cleanup temp file
    try {
      await fs.unlink(req.file.path);
      cleanup = false;
    } catch (error) {
      logger.error('[/admin/files] Error deleting temp file:', error);
    }
    res.status(500).json({ message });
  }

  // Cleanup temp file after processing
  if (cleanup) {
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      logger.error('[/admin/files] Error deleting temp file after processing:', error);
    }
  }
});

/**
 * DELETE /api/admin/files/:fileId
 * Delete a shared file (admin only)
 */
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: 'File ID is required' });
    }

    // Get the file
    const [file] = await getFiles({ file_id: fileId });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!file.shared) {
      return res.status(400).json({ message: 'Only shared files can be deleted via admin API' });
    }

    // Delete the file
    await deleteFile({ file_id: fileId });

    logger.debug(`[/admin/files] Shared file deleted successfully: ${fileId}`);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('[/admin/files] Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
});

/**
 * GET /api/admin/files/:fileId
 * Get file details (admin only)
 */
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: 'File ID is required' });
    }

    // Get the file
    const [file] = await getFiles({ file_id: fileId });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!file.shared) {
      return res.status(400).json({ message: 'Only shared files can be accessed via admin API' });
    }

    res.status(200).json(file);
  } catch (error) {
    logger.error('[/admin/files] Error getting file details:', error);
    res.status(500).json({ message: 'Error retrieving file details', error: error.message });
  }
});

module.exports = router; 
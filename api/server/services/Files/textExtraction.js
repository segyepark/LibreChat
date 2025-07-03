const fs = require('fs');
const path = require('path');
const { logger } = require('~/config');

/**
 * Extract text from various file types
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Extracted text content
 */
const extractTextFromFile = async (filePath, mimeType) => {
  try {
    // Handle different file types
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return await fs.promises.readFile(filePath, 'utf-8');
    }
    
    if (mimeType === 'application/pdf') {
      // For PDF files, we'll need to implement PDF text extraction
      // For now, return a placeholder
      logger.warn('PDF text extraction not implemented yet');
      return '';
    }
    
    if (mimeType.includes('word') || mimeType.includes('document')) {
      // For Word documents, we'll need to implement DOC/DOCX text extraction
      // For now, return a placeholder
      logger.warn('Word document text extraction not implemented yet');
      return '';
    }
    
    // For other file types, try to read as text
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
      logger.warn(`Could not extract text from file: ${filePath}, mimeType: ${mimeType}`);
      return '';
    }
  } catch (error) {
    logger.error('Error extracting text from file:', error);
    return '';
  }
};

module.exports = {
  extractTextFromFile,
}; 
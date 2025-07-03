const { getFiles } = require('~/models/File');
const { logger } = require('~/config');

/**
 * Service for handling shared RAG (Retrieval-Augmented Generation) functionality
 * This service provides access to shared files that are available to all users
 */

/**
 * Get all shared files that are available for RAG queries
 * @returns {Promise<Array>} Array of shared files with their text content
 */
const getSharedFiles = async () => {
  try {
    // Get all files marked as shared and have text content
    const sharedFiles = await getFiles(
      { 
        shared: true,
        text: { $exists: true, $ne: null, $ne: '' }
      },
      null,
      { text: 1, filename: 1, file_id: 1, type: 1, uploaded_at: 1 }
    );

    logger.debug(`Retrieved ${sharedFiles.length} shared files for RAG`);
    return sharedFiles;
  } catch (error) {
    logger.error('Error retrieving shared files for RAG:', error);
    return [];
  }
};

/**
 * Get combined text content from all shared files
 * @returns {Promise<string>} Combined text content from all shared files
 */
const getSharedFilesContent = async () => {
  try {
    const sharedFiles = await getSharedFiles();
    
    if (sharedFiles.length === 0) {
      return '';
    }

    // Combine text content from all shared files
    const combinedContent = sharedFiles
      .map(file => {
        const header = `\n--- File: ${file.filename} (${file.type}) ---\n`;
        return header + (file.text || '');
      })
      .join('\n\n');

    logger.debug(`Combined content from ${sharedFiles.length} shared files`);
    return combinedContent;
  } catch (error) {
    logger.error('Error getting shared files content:', error);
    return '';
  }
};

/**
 * Enhance user message with shared file content for RAG
 * @param {string} userMessage - The original user message
 * @returns {Promise<string>} Enhanced message with shared file context
 */
const enhanceMessageWithSharedRAG = async (userMessage) => {
  try {
    const sharedContent = await getSharedFilesContent();
    
    if (!sharedContent) {
      return userMessage;
    }

    // Create enhanced message with shared file context
    const enhancedMessage = `Shared Knowledge Base Context:
${sharedContent}

User Question: ${userMessage}

Please use the shared knowledge base context above to help answer the user's question. If the context contains relevant information, incorporate it into your response. If the context doesn't contain relevant information, answer based on your general knowledge.`;

    logger.debug('Enhanced user message with shared RAG content');
    return enhancedMessage;
  } catch (error) {
    logger.error('Error enhancing message with shared RAG:', error);
    return userMessage;
  }
};

module.exports = {
  getSharedFiles,
  getSharedFilesContent,
  enhanceMessageWithSharedRAG,
}; 
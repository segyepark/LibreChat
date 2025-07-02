const { getFiles } = require('~/models/File');
const { logger } = require('~/config');

/**
 * Shared RAG 파일들의 텍스트 내용을 가져옵니다
 * @returns {Promise<string>} 모든 shared RAG 파일의 결합된 텍스트
 */
const getSharedRAGContent = async () => {
  try {
    // isShared가 true이고 text가 있는 파일들만 조회
    const sharedFiles = await getFiles({ 
      isShared: true, 
      text: { $exists: true, $ne: null, $ne: '' } 
    });

    if (sharedFiles.length === 0) {
      return '';
    }

    // 파일별 텍스트를 결합하여 반환
    const combinedText = sharedFiles.map(file => {
      const header = `\n\n--- ${file.filename} ---\n`;
      return header + file.text;
    }).join('\n');

    logger.debug(`[SharedRAGService] Retrieved ${sharedFiles.length} shared RAG files`);
    return combinedText;

  } catch (error) {
    logger.error('[SharedRAGService] Error retrieving shared RAG content:', error);
    return '';
  }
};

/**
 * 사용자 메시지에 shared RAG 컨텍스트를 추가합니다
 * @param {string} userMessage - 사용자의 원본 메시지
 * @returns {Promise<string>} shared RAG 컨텍스트가 포함된 메시지
 */
const enhanceMessageWithSharedRAG = async (userMessage) => {
  try {
    const sharedContent = await getSharedRAGContent();
    
    if (!sharedContent.trim()) {
      // shared RAG 파일이 없으면 원본 메시지 그대로 반환
      return userMessage;
    }

    // shared RAG 컨텍스트를 포함한 향상된 프롬프트 생성
    const enhancedMessage = `다음은 참고할 수 있는 문서들입니다:

${sharedContent}

---

위 문서들을 참고하여 다음 질문에 답해주세요. 문서에 관련 정보가 있다면 해당 내용을 기반으로 답변하고, 없다면 일반적인 지식으로 답변해주세요.

질문: ${userMessage}`;

    logger.debug('[SharedRAGService] Enhanced message with shared RAG context');
    return enhancedMessage;

  } catch (error) {
    logger.error('[SharedRAGService] Error enhancing message with shared RAG:', error);
    return userMessage; // 에러 시 원본 메시지 반환
  }
};

/**
 * shared RAG 파일 목록을 가져옵니다 (사용량 업데이트 포함)
 * @returns {Promise<Array>} shared RAG 파일 목록
 */
const getSharedRAGFiles = async () => {
  try {
    const sharedFiles = await getFiles({ isShared: true });
    return sharedFiles.map(file => ({
      id: file.file_id,
      filename: file.filename,
      type: file.type,
      size: file.bytes,
      uploadedAt: file.createdAt,
      hasText: !!file.text,
      usage: file.usage || 0
    }));
  } catch (error) {
    logger.error('[SharedRAGService] Error getting shared RAG files:', error);
    return [];
  }
};

/**
 * shared RAG 파일의 사용량을 증가시킵니다
 * @param {string} fileId - 파일 ID
 */
const incrementSharedRAGUsage = async (fileId) => {
  try {
    const { updateFileUsage } = require('~/models/File');
    await updateFileUsage({ file_id: fileId, inc: 1 });
    logger.debug(`[SharedRAGService] Incremented usage for file: ${fileId}`);
  } catch (error) {
    logger.error(`[SharedRAGService] Error incrementing usage for file ${fileId}:`, error);
  }
};

/**
 * 메시지 처리 시 모든 shared RAG 파일의 사용량을 증가시킵니다
 */
const incrementAllSharedRAGUsage = async () => {
  try {
    const sharedFiles = await getFiles({ isShared: true }, null, { file_id: 1 });
    const promises = sharedFiles.map(file => incrementSharedRAGUsage(file.file_id));
    await Promise.all(promises);
    logger.debug(`[SharedRAGService] Incremented usage for ${sharedFiles.length} shared RAG files`);
  } catch (error) {
    logger.error('[SharedRAGService] Error incrementing shared RAG usage:', error);
  }
};

module.exports = {
  getSharedRAGContent,
  enhanceMessageWithSharedRAG,
  getSharedRAGFiles,
  incrementSharedRAGUsage,
  incrementAllSharedRAGUsage
};
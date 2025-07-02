const { enhanceMessageWithSharedRAG, incrementAllSharedRAGUsage } = require('~/server/services/SharedRAGService');
const { SystemRoles } = require('librechat-data-provider');
const { logger } = require('~/config');

/**
 * 사용자 메시지에 shared RAG 컨텍스트를 자동으로 추가하는 미들웨어
 * 관리자는 제외하고 일반 사용자에게만 적용
 */
const applySharedRAG = async (req, res, next) => {
  try {
    // 관리자는 shared RAG 적용 제외
    if (req.user && req.user.role === SystemRoles.ADMIN) {
      return next();
    }

    // POST 요청이고 메시지 내용이 있는 경우에만 적용
    if (req.method === 'POST' && req.body && req.body.text) {
      const originalMessage = req.body.text;
      
      // shared RAG 컨텍스트로 메시지 향상
      const enhancedMessage = await enhanceMessageWithSharedRAG(originalMessage);
      
      // 향상된 메시지로 교체
      req.body.text = enhancedMessage;
      
      // shared RAG 파일 사용량 증가 (백그라운드에서 실행)
      incrementAllSharedRAGUsage().catch(error => {
        logger.error('[sharedRAG middleware] Error incrementing usage:', error);
      });
      
      logger.debug('[sharedRAG middleware] Applied shared RAG to user message');
    }

    next();
  } catch (error) {
    logger.error('[sharedRAG middleware] Error applying shared RAG:', error);
    // 에러가 발생해도 요청은 계속 진행
    next();
  }
};

module.exports = {
  applySharedRAG
};
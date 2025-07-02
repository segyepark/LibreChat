const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const {
  answerQuestion,
  getAvailableDocuments,
  previewDocument,
} = require('~/server/controllers/RagController');

const router = express.Router();

// 모든 RAG 라우트에 인증 미들웨어 적용
router.use(requireJwtAuth);

// RAG 질의응답 라우트
router.post('/ask', answerQuestion);

// 사용 가능한 문서 목록 조회
router.get('/documents', getAvailableDocuments);

// 특정 문서 미리보기
router.get('/documents/:fileName/preview', previewDocument);

module.exports = router;
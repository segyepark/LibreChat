const { DocumentChunk } = require('~/models');
const documentProcessor = require('../services/documentProcessor');
const { logger } = require('@librechat/data-schemas');

/**
 * 관리자가 업로드한 문서를 기반으로 질문에 답변합니다
 */
const answerQuestion = async (req, res) => {
  try {
    const { question, maxChunks = 5 } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Question required',
        message: '질문이 필요합니다.' 
      });
    }

    // 관련 문서 청크 검색
    const relevantChunks = await documentProcessor.searchChunks(
      question.trim(), 
      parseInt(maxChunks)
    );

    if (relevantChunks.length === 0) {
      return res.json({
        answer: '죄송합니다. 업로드된 문서에서 관련 정보를 찾을 수 없습니다.',
        sources: [],
        question: question.trim(),
      });
    }

    // 컨텍스트 구성
    const context = relevantChunks
      .map((chunk, index) => `[문서 ${index + 1}] ${chunk.content}`)
      .join('\n\n');

    // 간단한 답변 생성 (실제로는 LLM API를 사용해야 함)
    const answer = generateAnswer(question.trim(), context, relevantChunks);

    // 소스 정보 구성
    const sources = relevantChunks.map(chunk => ({
      fileName: chunk.metadata.fileName,
      content: chunk.content.substring(0, 200) + '...',
      chunkIndex: chunk.metadata.chunkIndex,
      score: chunk.score,
    }));

    res.json({
      answer,
      sources,
      question: question.trim(),
      foundChunks: relevantChunks.length,
    });

  } catch (error) {
    logger.error('Error in answerQuestion:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '질문 처리에 실패했습니다.' 
    });
  }
};

/**
 * 간단한 답변 생성 함수 (실제로는 OpenAI API 등을 사용)
 */
function generateAnswer(question, context, chunks) {
  // 이 부분은 실제 프로덕션에서는 OpenAI API, Claude, 또는 다른 LLM을 사용해야 합니다
  const contextSummary = context.length > 500 ? 
    context.substring(0, 500) + '...' : 
    context;

  return `질문: "${question}"에 대한 답변입니다.\n\n` +
         `업로드된 문서에서 ${chunks.length}개의 관련 정보를 찾았습니다.\n\n` +
         `관련 내용:\n${contextSummary}\n\n` +
         `더 자세한 정보는 아래 소스 문서들을 참고하세요.`;
}

/**
 * 사용 가능한 문서 목록 조회
 */
const getAvailableDocuments = async (req, res) => {
  try {
    // 관리자가 업로드한 파일들의 고유 목록 조회
    const documents = await DocumentChunk.aggregate([
      {
        $group: {
          _id: '$metadata.fileName',
          fileId: { $first: '$fileId' },
          uploadedBy: { $first: '$metadata.uploadedBy' },
          chunkCount: { $sum: 1 },
          lastUpdated: { $max: '$createdAt' },
        }
      },
      {
        $sort: { lastUpdated: -1 }
      }
    ]);

    res.json({
      documents: documents.map(doc => ({
        fileName: doc._id,
        fileId: doc.fileId,
        uploadedBy: doc.uploadedBy,
        chunkCount: doc.chunkCount,
        lastUpdated: doc.lastUpdated,
      })),
      totalDocuments: documents.length,
    });

  } catch (error) {
    logger.error('Error in getAvailableDocuments:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '문서 목록 조회에 실패했습니다.' 
    });
  }
};

/**
 * 문서 내용 미리보기
 */
const previewDocument = async (req, res) => {
  try {
    const { fileName } = req.params;
    const { limit = 3 } = req.query;

    const chunks = await DocumentChunk.find({ 
      'metadata.fileName': fileName 
    })
    .sort({ 'metadata.chunkIndex': 1 })
    .limit(parseInt(limit))
    .select('content metadata');

    if (chunks.length === 0) {
      return res.status(404).json({ 
        error: 'Document not found',
        message: '문서를 찾을 수 없습니다.' 
      });
    }

    res.json({
      fileName,
      preview: chunks.map(chunk => ({
        content: chunk.content.substring(0, 300) + '...',
        chunkIndex: chunk.metadata.chunkIndex,
      })),
      totalChunks: await DocumentChunk.countDocuments({ 
        'metadata.fileName': fileName 
      }),
    });

  } catch (error) {
    logger.error('Error in previewDocument:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '문서 미리보기에 실패했습니다.' 
    });
  }
};

module.exports = {
  answerQuestion,
  getAvailableDocuments,
  previewDocument,
};
const { File, DocumentChunk } = require('~/models');
const documentProcessor = require('../services/documentProcessor');
const { logger } = require('@librechat/data-schemas');

/**
 * 관리자 파일 목록 조회
 */
const getAdminFiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.filename = { $regex: search, $options: 'i' };
    }

    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('filename mimetype bytes createdAt user');

    const total = await File.countDocuments(query);

    // 각 파일의 청크 수 조회
    const filesWithChunks = await Promise.all(
      files.map(async (file) => {
        const chunkCount = await DocumentChunk.countDocuments({ fileId: file._id });
        return {
          ...file.toObject(),
          chunkCount,
        };
      })
    );

    res.json({
      files: filesWithChunks,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total,
      },
    });
  } catch (error) {
    logger.error('Error in getAdminFiles:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '파일 목록 조회에 실패했습니다.' 
    });
  }
};

/**
 * 관리자 파일 업로드 및 처리
 */
const uploadAdminFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file provided',
        message: '파일이 제공되지 않았습니다.' 
      });
    }

    const { originalname, mimetype, size, path: filepath } = req.file;
    const uploadedBy = req.adminEmail;

    // 지원하는 파일 형식 확인
    const supportedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!supportedTypes.includes(mimetype)) {
      return res.status(400).json({ 
        error: 'Unsupported file type',
        message: '지원하지 않는 파일 형식입니다.' 
      });
    }

    // 파일 정보를 데이터베이스에 저장
    const file = new File({
      filename: originalname,
      mimetype,
      bytes: size,
      filepath: filepath,
      user: req.user._id,
      metadata: {
        uploadedBy,
        isAdminFile: true,
      },
    });

    await file.save();

    // 파일 처리 및 청킹
    try {
      const chunks = await documentProcessor.processFile(file, uploadedBy);
      
      res.json({
        message: '파일이 성공적으로 업로드되고 처리되었습니다.',
        file: {
          id: file._id,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.bytes,
          chunkCount: chunks.length,
        },
      });
    } catch (processingError) {
      // 파일 처리 실패 시 파일 레코드 삭제
      await File.findByIdAndDelete(file._id);
      throw processingError;
    }

  } catch (error) {
    logger.error('Error in uploadAdminFile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '파일 업로드에 실패했습니다.' 
    });
  }
};

/**
 * 관리자 파일 삭제
 */
const deleteAdminFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ 
        error: 'File not found',
        message: '파일을 찾을 수 없습니다.' 
      });
    }

    // 관련 청크들 삭제
    await documentProcessor.deleteFileChunks(fileId);

    // 파일 삭제
    await File.findByIdAndDelete(fileId);

    logger.info(`Admin ${req.adminEmail} deleted file: ${file.filename}`);

    res.json({
      message: '파일이 성공적으로 삭제되었습니다.',
      fileId,
    });
  } catch (error) {
    logger.error('Error in deleteAdminFile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '파일 삭제에 실패했습니다.' 
    });
  }
};

/**
 * 파일 청크 목록 조회
 */
const getFileChunks = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const chunks = await DocumentChunk.find({ fileId })
      .sort({ 'metadata.chunkIndex': 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('content metadata createdAt');

    const total = await DocumentChunk.countDocuments({ fileId });

    res.json({
      chunks,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total,
      },
    });
  } catch (error) {
    logger.error('Error in getFileChunks:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '청크 목록 조회에 실패했습니다.' 
    });
  }
};

/**
 * 문서 검색
 */
const searchDocuments = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query required',
        message: '검색어가 필요합니다.' 
      });
    }

    const chunks = await documentProcessor.searchChunks(query.trim(), parseInt(limit));

    res.json({
      query: query.trim(),
      results: chunks.map(chunk => ({
        id: chunk._id,
        content: chunk.content,
        metadata: chunk.metadata,
        file: chunk.fileId,
        score: chunk.score,
      })),
    });
  } catch (error) {
    logger.error('Error in searchDocuments:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '문서 검색에 실패했습니다.' 
    });
  }
};

module.exports = {
  getAdminFiles,
  uploadAdminFile,
  deleteAdminFile,
  getFileChunks,
  searchDocuments,
};
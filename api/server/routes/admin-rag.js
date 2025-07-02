const express = require('express');
const { SystemRoles } = require('librechat-data-provider');
const { requireJwtAuth } = require('~/server/middleware');
const { getFiles, createFile, deleteFile, updateFile } = require('~/models/File');
const { processFileUpload } = require('~/server/services/Files/process');
const multer = require('multer');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { logger } = require('~/config');

const router = express.Router();

// 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
  if (req.user.role !== SystemRoles.ADMIN) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// 파일 업로드를 위한 multer 설정
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // PDF, TXT, DOCX, MD 파일만 허용
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, DOCX, and MD files are allowed'), false);
    }
  }
});

// 모든 라우트에 인증과 관리자 권한 필요
router.use(requireJwtAuth);
router.use(requireAdmin);

// Shared RAG 파일 목록 조회
router.get('/files', async (req, res) => {
  try {
    const sharedFiles = await getFiles({ isShared: true });
    res.status(200).json({
      success: true,
      files: sharedFiles
    });
  } catch (error) {
    logger.error('[/admin-rag/files] Error getting shared files:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving shared files',
      error: error.message
    });
  }
});

// Shared RAG 파일 업로드
router.post('/upload', upload.single('file'), async (req, res) => {
  let cleanup = true;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileId = uuidv4();
    const { originalname, mimetype, size, path } = req.file;

    const metadata = {
      file_id: fileId,
      filename: originalname,
      type: mimetype,
      bytes: size,
      user: req.user.id,
      isShared: true, // shared RAG용 파일로 표시
      filepath: path,
      source: 'local',
      usage: 0
    };

    // 파일 내용 추출 (PDF, TXT 등)
    let extractedText = '';
    if (mimetype === 'text/plain') {
      extractedText = await fs.readFile(path, 'utf8');
    } else if (mimetype === 'text/markdown') {
      extractedText = await fs.readFile(path, 'utf8');
    } else if (mimetype === 'application/pdf') {
      try {
        // PDF 텍스트 추출 (pdf-parse 패키지가 설치되어 있다고 가정)
        const pdfParse = require('pdf-parse');
        const dataBuffer = await fs.readFile(path);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text;
      } catch (pdfError) {
        logger.warn(`[/admin-rag/upload] PDF text extraction failed for ${originalname}:`, pdfError);
        // PDF 텍스트 추출 실패 시에도 파일은 업로드하되 텍스트는 없는 상태로 저장
      }
    }

    if (extractedText) {
      metadata.text = extractedText;
      metadata.embedded = true; // 임베딩 가능 표시
    }

    // 데이터베이스에 파일 정보 저장
    const savedFile = await createFile(metadata, true); // TTL 비활성화

    logger.info(`[/admin-rag/upload] Shared RAG file uploaded: ${originalname} by admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully for shared RAG',
      file: {
        id: savedFile.file_id,
        filename: savedFile.filename,
        type: savedFile.type,
        size: savedFile.bytes,
        uploadedAt: savedFile.createdAt,
        hasText: !!savedFile.text
      }
    });

    cleanup = false; // 업로드 성공 시 파일 유지
    
  } catch (error) {
    logger.error('[/admin-rag/upload] Error uploading shared file:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }

  // 실패 시 임시 파일 정리
  if (cleanup && req.file) {
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      logger.error('[/admin-rag/upload] Error deleting temporary file:', unlinkError);
    }
  }
});

// Shared RAG 파일 삭제
router.delete('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // 파일 존재 확인 및 shared 파일인지 확인
    const files = await getFiles({ file_id: fileId, isShared: true });
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shared file not found'
      });
    }

    const file = files[0];
    
    // 실제 파일 삭제
    try {
      await fs.unlink(file.filepath);
    } catch (unlinkError) {
      logger.warn(`[/admin-rag/files/${fileId}] File not found on disk: ${file.filepath}`);
    }

    // 데이터베이스에서 파일 정보 삭제
    await deleteFile(fileId);

    logger.info(`[/admin-rag/files/${fileId}] Shared RAG file deleted: ${file.filename} by admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Shared file deleted successfully'
    });

  } catch (error) {
    logger.error(`[/admin-rag/files/${req.params.fileId}] Error deleting shared file:`, error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
});

// Shared RAG 파일 상세 정보 조회
router.get('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const files = await getFiles({ file_id: fileId, isShared: true });
    
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shared file not found'
      });
    }

    const file = files[0];
    
    res.status(200).json({
      success: true,
      file: {
        id: file.file_id,
        filename: file.filename,
        type: file.type,
        size: file.bytes,
        uploadedAt: file.createdAt,
        updatedAt: file.updatedAt,
        hasText: !!file.text,
        textPreview: file.text ? file.text.substring(0, 500) + '...' : null,
        usage: file.usage || 0
      }
    });

  } catch (error) {
    logger.error(`[/admin-rag/files/${req.params.fileId}] Error getting shared file:`, error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving file',
      error: error.message
    });
  }
});

module.exports = router;

// 일반 사용자용 public API (인증은 필요하지만 관리자 권한은 불필요)
const publicRouter = express.Router();
publicRouter.use(requireJwtAuth);

// Shared RAG 활성화 상태 확인 (일반 사용자용)
publicRouter.get('/status', async (req, res) => {
  try {
    const sharedFiles = await getFiles({ isShared: true }, null, { file_id: 1 });
    res.status(200).json({
      success: true,
      enabled: sharedFiles.length > 0,
      fileCount: sharedFiles.length
    });
  } catch (error) {
    logger.error('[/api/shared-rag/status] Error getting shared RAG status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving shared RAG status',
      error: error.message
    });
  }
});

module.exports.publicRouter = publicRouter;
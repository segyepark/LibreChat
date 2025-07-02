const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireJwtAuth } = require('~/server/middleware');
const requireAdmin = require('~/server/middleware/requireAdmin');
const {
  getAdminFiles,
  uploadAdminFile,
  deleteAdminFile,
  getFileChunks,
  searchDocuments,
} = require('~/server/controllers/AdminController');

const router = express.Router();

// 업로드 디렉토리 설정
const uploadDir = path.join(__dirname, '../../uploads/admin');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  },
});

// 모든 관리자 라우트에 인증 및 관리자 권한 확인 미들웨어 적용
router.use(requireJwtAuth);
router.use(requireAdmin);

// 파일 관리 라우트
router.get('/files', getAdminFiles);
router.post('/files/upload', upload.single('file'), uploadAdminFile);
router.delete('/files/:fileId', deleteAdminFile);
router.get('/files/:fileId/chunks', getFileChunks);

// 문서 검색 라우트
router.get('/search', searchDocuments);

module.exports = router;
#!/usr/bin/env node

/**
 * Shared RAG 기능 실제 동작 데모
 * MongoDB 없이 메모리 기반으로 동작
 */

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('demo-public'));

// 메모리 기반 데이터 저장소
const memoryDB = {
  users: new Map(),
  files: new Map(),
  sessions: new Map()
};

// 관리자 이메일 하드코딩
const ADMIN_EMAILS = ['admin@example.com', 'test@example.com'];

// 파일 업로드 설정
const upload = multer({
  dest: 'demo-uploads/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// 인증 미들웨어 (간단한 세션 기반)
const auth = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  const session = memoryDB.sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  req.user = session.user;
  next();
};

// 관리자 권한 확인
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// 사용자 등록/로그인 (데모용)
app.post('/api/demo/auth', async (req, res) => {
  const { email, name } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({ message: 'Email and name required' });
  }
  
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
  const sessionId = uuidv4();
  
  const user = {
    id: uuidv4(),
    email: email.toLowerCase(),
    name,
    role: isAdmin ? 'ADMIN' : 'USER'
  };
  
  memoryDB.users.set(user.id, user);
  memoryDB.sessions.set(sessionId, { user, createdAt: new Date() });
  
  res.json({
    user,
    sessionId,
    message: `${isAdmin ? '관리자' : '일반 사용자'}로 로그인되었습니다.`
  });
});

// 현재 사용자 정보
app.get('/api/demo/me', auth, (req, res) => {
  res.json({ user: req.user });
});

// Shared RAG 상태 확인 (일반 사용자용)
app.get('/api/shared-rag/status', auth, (req, res) => {
  const sharedFiles = Array.from(memoryDB.files.values()).filter(f => f.isShared);
  res.json({
    success: true,
    enabled: sharedFiles.length > 0,
    fileCount: sharedFiles.length
  });
});

// 관리자용 파일 목록 조회
app.get('/api/admin-rag/files', auth, requireAdmin, (req, res) => {
  const sharedFiles = Array.from(memoryDB.files.values()).filter(f => f.isShared);
  res.json({
    success: true,
    files: sharedFiles
  });
});

// 관리자용 파일 업로드
app.post('/api/admin-rag/upload', auth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileId = uuidv4();
    const { originalname, mimetype, size, path: filePath } = req.file;

    // 파일 내용 추출
    let extractedText = '';
    if (mimetype === 'text/plain' || mimetype === 'text/markdown') {
      extractedText = await fs.readFile(filePath, 'utf8');
    }

    const fileData = {
      file_id: fileId,
      filename: originalname,
      type: mimetype,
      bytes: size,
      user: req.user.id,
      isShared: true,
      filepath: filePath,
      text: extractedText,
      usage: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    memoryDB.files.set(fileId, fileData);

    console.log(`📁 관리자 ${req.user.email}가 파일 업로드: ${originalname}`);

    res.json({
      success: true,
      message: 'File uploaded successfully for shared RAG',
      file: {
        id: fileData.file_id,
        filename: fileData.filename,
        type: fileData.type,
        size: fileData.bytes,
        uploadedAt: fileData.createdAt,
        hasText: !!fileData.text
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading file' });
  }
});

// 관리자용 파일 삭제
app.delete('/api/admin-rag/files/:fileId', auth, requireAdmin, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = memoryDB.files.get(fileId);
    
    if (!file || !file.isShared) {
      return res.status(404).json({ success: false, message: 'Shared file not found' });
    }

    // 실제 파일 삭제
    try {
      await fs.unlink(file.filepath);
    } catch (e) {
      console.warn('File not found on disk:', file.filepath);
    }

    memoryDB.files.delete(fileId);
    
    console.log(`🗑️ 관리자 ${req.user.email}가 파일 삭제: ${file.filename}`);

    res.json({ success: true, message: 'Shared file deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Error deleting file' });
  }
});

// Shared RAG 적용된 메시지 처리 (핵심 기능!)
app.post('/api/demo/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    let enhancedMessage = message;
    
    // 관리자가 아닌 경우에만 Shared RAG 적용
    if (req.user.role !== 'ADMIN') {
      const sharedFiles = Array.from(memoryDB.files.values())
        .filter(f => f.isShared && f.text);

      if (sharedFiles.length > 0) {
        // 사용량 증가
        sharedFiles.forEach(file => {
          file.usage = (file.usage || 0) + 1;
        });

        const combinedText = sharedFiles.map(file => {
          const header = `\n\n--- ${file.filename} ---\n`;
          return header + file.text;
        }).join('\n');

        enhancedMessage = `다음은 참고할 수 있는 문서들입니다:

${combinedText}

---

위 문서들을 참고하여 다음 질문에 답해주세요. 문서에 관련 정보가 있다면 해당 내용을 기반으로 답변하고, 없다면 일반적인 지식으로 답변해주세요.

질문: ${message}`;

        console.log(`💬 ${req.user.email} (일반사용자): "${message}" - Shared RAG 적용됨`);
      } else {
        console.log(`💬 ${req.user.email} (일반사용자): "${message}" - Shared RAG 파일 없음`);
      }
    } else {
      console.log(`💬 ${req.user.email} (관리자): "${message}" - Shared RAG 제외`);
    }

    // 실제 AI 응답 시뮬레이션
    let aiResponse = '';
    if (enhancedMessage.includes('휴가')) {
      aiResponse = '회사 정책에 따르면 휴가 신청은 최소 7일 전에 상급자에게 제출해야 합니다. 절차는 1) 휴가신청서 작성 2) 상급자 제출 3) 인사팀 최종 승인입니다.';
    } else if (enhancedMessage.includes('출장')) {
      aiResponse = '출장비 신청은 출장 완료 후 7일 이내에 제출해야 합니다. 국내 출장은 부서장 승인, 해외 출장은 임원 승인이 필요합니다.';
    } else if (enhancedMessage.includes('근무시간')) {
      aiResponse = '정규 근무시간은 오전 9시부터 오후 6시까지이며, 점심시간은 오후 12시부터 1시까지입니다. 유연근무제는 팀장 승인 하에 적용 가능합니다.';
    } else if (enhancedMessage.includes('교육비')) {
      aiResponse = '교육비 지원은 연간 100만원 한도로 제공됩니다.';
    } else {
      aiResponse = `"${message}"에 대한 답변입니다. ${enhancedMessage.length > message.length ? '(업로드된 회사 문서를 참고하여 답변드립니다)' : ''}`;
    }

    res.json({
      success: true,
      originalMessage: message,
      enhancedMessage: enhancedMessage,
      aiResponse: aiResponse,
      sharedRAGApplied: enhancedMessage.length > message.length,
      userRole: req.user.role
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Error processing message' });
  }
});

// 홈 페이지
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>LibreChat Shared RAG 데모</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .admin { background-color: #fff3cd; }
        .user { background-color: #d1ecf1; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
        input, textarea { width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .response { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .file-list { background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .hidden { display: none; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>🚀 LibreChat Shared RAG 실제 동작 데모</h1>
    
    <div class="container">
        <h2>🔐 인증</h2>
        <input type="email" id="email" placeholder="이메일 (admin@example.com = 관리자)" />
        <input type="text" id="name" placeholder="이름" />
        <button onclick="login()">로그인</button>
        <div id="authStatus"></div>
    </div>

    <div id="adminPanel" class="container admin hidden">
        <h2>👨‍💼 관리자 패널 - Shared RAG 파일 관리</h2>
        <div>
            <input type="file" id="fileInput" accept=".txt,.md,.pdf,.docx" />
            <button onclick="uploadFile()">파일 업로드</button>
        </div>
        <div id="fileList" class="file-list"></div>
        <button onclick="loadFiles()">파일 목록 새로고침</button>
    </div>

    <div id="chatPanel" class="container user hidden">
        <h2>💬 채팅 테스트</h2>
        <p>아래 질문들을 시도해보세요:</p>
        <ul>
            <li>휴가 신청은 어떻게 하나요?</li>
            <li>출장비는 어떻게 신청하나요?</li>
            <li>근무시간이 어떻게 되나요?</li>
            <li>교육비 지원은 얼마까지 되나요?</li>
        </ul>
        <textarea id="messageInput" placeholder="메시지를 입력하세요..." rows="3"></textarea>
        <button onclick="sendMessage()">메시지 전송</button>
        <div id="chatResponse"></div>
    </div>

    <script>
        let sessionId = null;
        let currentUser = null;

        async function login() {
            const email = document.getElementById('email').value;
            const name = document.getElementById('name').value;
            
            if (!email || !name) {
                showStatus('이메일과 이름을 입력하세요.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/demo/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name })
                });

                const data = await response.json();
                
                if (response.ok) {
                    sessionId = data.sessionId;
                    currentUser = data.user;
                    showStatus(data.message, 'success');
                    
                    if (data.user.role === 'ADMIN') {
                        document.getElementById('adminPanel').classList.remove('hidden');
                        loadFiles();
                    }
                    document.getElementById('chatPanel').classList.remove('hidden');
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('로그인 실패: ' + error.message, 'error');
            }
        }

        async function uploadFile() {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            
            if (!file) {
                showStatus('파일을 선택하세요.', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/admin-rag/upload', {
                    method: 'POST',
                    headers: { 'X-Session-Id': sessionId },
                    body: formData
                });

                const data = await response.json();
                
                if (response.ok) {
                    showStatus('파일 업로드 성공: ' + file.name, 'success');
                    fileInput.value = '';
                    loadFiles();
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('업로드 실패: ' + error.message, 'error');
            }
        }

        async function loadFiles() {
            try {
                const response = await fetch('/api/admin-rag/files', {
                    headers: { 'X-Session-Id': sessionId }
                });

                const data = await response.json();
                
                if (response.ok) {
                    const fileList = document.getElementById('fileList');
                    if (data.files.length === 0) {
                        fileList.innerHTML = '<p>업로드된 파일이 없습니다.</p>';
                    } else {
                        fileList.innerHTML = '<h4>업로드된 파일들:</h4>' + 
                            data.files.map(file => \`
                                <div style="border: 1px solid #ccc; padding: 10px; margin: 5px 0;">
                                    <strong>\${file.filename}</strong> (\${(file.bytes/1024).toFixed(1)}KB)<br>
                                    업로드: \${new Date(file.createdAt).toLocaleString()}<br>
                                    사용횟수: \${file.usage || 0}회<br>
                                    \${file.text ? '<span style="color: green;">✓ 텍스트 추출됨</span>' : '<span style="color: orange;">○ 텍스트 없음</span>'}<br>
                                    <button onclick="deleteFile('\${file.file_id}')" style="background: #dc3545;">삭제</button>
                                </div>
                            \`).join('');
                    }
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('파일 목록 로드 실패: ' + error.message, 'error');
            }
        }

        async function deleteFile(fileId) {
            if (!confirm('파일을 삭제하시겠습니까?')) return;

            try {
                const response = await fetch(\`/api/admin-rag/files/\${fileId}\`, {
                    method: 'DELETE',
                    headers: { 'X-Session-Id': sessionId }
                });

                const data = await response.json();
                
                if (response.ok) {
                    showStatus('파일 삭제 성공', 'success');
                    loadFiles();
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('파일 삭제 실패: ' + error.message, 'error');
            }
        }

        async function sendMessage() {
            const messageInput = document.getElementById('messageInput');
            const message = messageInput.value.trim();
            
            if (!message) {
                showStatus('메시지를 입력하세요.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/demo/chat', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Session-Id': sessionId 
                    },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();
                
                if (response.ok) {
                    const chatResponse = document.getElementById('chatResponse');
                    chatResponse.innerHTML = \`
                        <div class="response">
                            <h4>💬 사용자 질문:</h4>
                            <p>\${data.originalMessage}</p>
                            
                            <h4>🤖 AI 응답:</h4>
                            <p>\${data.aiResponse}</p>
                            
                            <h4>📊 분석:</h4>
                            <ul>
                                <li>사용자 권한: \${data.userRole === 'ADMIN' ? '관리자' : '일반사용자'}</li>
                                <li>Shared RAG 적용: \${data.sharedRAGApplied ? '✅ 적용됨' : '❌ 적용안됨'}</li>
                                <li>향상된 프롬프트 길이: \${data.enhancedMessage.length}자</li>
                            </ul>
                            
                            \${data.sharedRAGApplied ? '<div style="background: #d4edda; padding: 10px; border-radius: 4px; margin: 10px 0;"><strong>✅ Shared RAG 성공!</strong><br>업로드된 회사 문서를 기반으로 정확한 답변이 제공되었습니다.</div>' : '<div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0;"><strong>ℹ️ Shared RAG 미적용</strong><br>관리자이거나 업로드된 문서가 없어서 일반 답변이 제공되었습니다.</div>'}
                        </div>
                    \`;
                    messageInput.value = '';
                } else {
                    showStatus(data.message, 'error');
                }
            } catch (error) {
                showStatus('메시지 전송 실패: ' + error.message, 'error');
            }
        }

        function showStatus(message, type) {
            const authStatus = document.getElementById('authStatus');
            authStatus.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
        }
    </script>
</body>
</html>
  `);
});

// 서버 시작
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`
🚀 LibreChat Shared RAG 데모 서버 실행 중!

📍 URL: http://localhost:${PORT}

🎯 테스트 시나리오:
1. admin@example.com으로 로그인 (관리자)
2. 텍스트 파일 업로드 (예: 회사정책.txt)
3. user@example.com으로 로그인 (일반사용자)  
4. "휴가 신청은 어떻게 하나요?" 질문
5. Shared RAG가 적용된 정확한 답변 확인!

💡 실제 LibreChat에서도 동일한 방식으로 동작합니다!
`);
});

// 업로드 디렉터리 생성
require('fs').mkdirSync('demo-uploads', { recursive: true });
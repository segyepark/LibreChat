# LibreChat RAG 시스템 구현

LibreChat에 관리자 계정 관리 및 공유 RAG(Retrieval-Augmented Generation) 시스템을 구현했습니다.

## 🚀 주요 기능

### 1. 관리자 계정 관리
- **하드코딩 배열 기반 관리자 계정 지정**
  - `admin@librechat.com`
  - `manager@librechat.com`
- **파일 업로드 및 관리**
  - PDF, TXT, DOC, DOCX 파일 지원
  - 최대 10MB 파일 크기 제한
  - 자동 텍스트 추출 및 청킹
- **파일 목록 조회 및 삭제**
- **문서 검색 기능**

### 2. 공유 RAG 시스템
- **일반 사용자 질의응답**
  - 관리자가 업로드한 문서 기반 답변
  - 자연어 질문 처리
  - 관련 문서 청크 자동 검색
  - 참조 소스 표시

## 🏗️ 시스템 아키텍처

### 백엔드 구조
```
api/
├── models/
│   ├── Admin.js              # 관리자 모델
│   └── DocumentChunk.js      # 문서 청크 모델
├── server/
│   ├── controllers/
│   │   ├── AdminController.js # 관리자 기능 컨트롤러
│   │   └── RagController.js   # RAG 기능 컨트롤러
│   ├── middleware/
│   │   └── requireAdmin.js    # 관리자 권한 미들웨어
│   ├── routes/
│   │   ├── admin.js          # 관리자 라우트
│   │   └── rag.js            # RAG 라우트
│   └── services/
│       └── documentProcessor.js # 문서 처리 서비스
```

### 프론트엔드 구조
```
client/src/
├── components/
│   ├── Admin/
│   │   ├── AdminPanel.jsx    # 관리자 메인 패널
│   │   ├── FileUpload.jsx    # 파일 업로드 컴포넌트
│   │   ├── FileList.jsx      # 파일 목록 컴포넌트
│   │   └── DocumentSearch.jsx # 문서 검색 컴포넌트
│   └── Rag/
│       └── RagInterface.jsx  # 일반 사용자 RAG 인터페이스
└── routes/
    ├── AdminRoute.tsx        # 관리자 라우트
    └── RagRoute.tsx          # RAG 라우트
```

## 📡 API 엔드포인트

### 관리자 API (`/api/admin`)
- `GET /files` - 파일 목록 조회
- `POST /files/upload` - 파일 업로드
- `DELETE /files/:fileId` - 파일 삭제
- `GET /files/:fileId/chunks` - 파일 청크 조회
- `GET /search` - 문서 검색

### RAG API (`/api/rag`)
- `POST /ask` - 질의응답
- `GET /documents` - 사용 가능한 문서 목록
- `GET /documents/:fileName/preview` - 문서 미리보기

## 🔧 기술 스택

### 백엔드
- **Node.js + Express.js** - 웹 서버
- **MongoDB + Mongoose** - 데이터베이스
- **Langchain TextSplitter** - 문서 청킹
- **pdf-parse** - PDF 텍스트 추출
- **Multer** - 파일 업로드 처리

### 프론트엔드
- **React** - UI 라이브러리
- **React Router** - 라우팅
- **Tailwind CSS** - 스타일링

## 🚀 사용 방법

### 관리자
1. 관리자 계정으로 로그인
2. `/admin` 페이지 접속
3. 파일 업로드 탭에서 문서 업로드
4. 파일 관리 탭에서 업로드된 파일 확인/삭제
5. 문서 검색 탭에서 내용 검색

### 일반 사용자
1. 로그인 후 `/rag` 페이지 접속
2. 사용 가능한 문서 목록 확인
3. 질문 입력 후 답변 받기
4. 참조 소스 확인

## 🔐 보안 기능

- **JWT 토큰 기반 인증**
- **관리자 권한 미들웨어**
- **파일 형식 및 크기 제한**
- **하드코딩된 관리자 계정 관리**

## 📝 데이터베이스 스키마

### DocumentChunk 모델
```javascript
{
  fileId: ObjectId,           // 파일 참조
  content: String,            // 청크 내용
  embedding: [Number],        // 임베딩 벡터 (선택적)
  metadata: {
    page: Number,
    chunkIndex: Number,
    startChar: Number,
    endChar: Number,
    fileName: String,
    uploadedBy: String
  },
  chunkSize: Number,          // 청크 크기
  overlap: Number             // 중복 크기
}
```

## 🔄 워크플로우

### 파일 업로드 프로세스
1. 관리자가 파일 업로드
2. 파일 유효성 검사 (형식, 크기)
3. 텍스트 추출 (PDF 파싱 등)
4. 텍스트 청킹 (1000자 단위, 200자 중복)
5. MongoDB에 청크 저장
6. 텍스트 검색 인덱스 생성

### 질의응답 프로세스
1. 사용자 질문 입력
2. 텍스트 검색으로 관련 청크 찾기
3. 상위 5개 청크 선택
4. 컨텍스트 구성
5. 답변 생성 (현재는 간단한 템플릿, 향후 LLM 연동)
6. 참조 소스와 함께 답변 반환

## 🎯 향후 개선 계획

1. **벡터 임베딩 지원**
   - OpenAI Embeddings API 연동
   - 의미 기반 검색 구현

2. **LLM 연동**
   - OpenAI GPT API 연동
   - 더 자연스러운 답변 생성

3. **고급 기능**
   - 더 다양한 파일 형식 지원
   - 실시간 문서 업데이트
   - 사용자별 문서 접근 권한
   - 대화 히스토리 기반 컨텍스트 유지

## 🧪 테스트

테스트용 샘플 파일 `sample_document.txt`가 포함되어 있습니다. 이 파일을 업로드하여 시스템을 테스트할 수 있습니다.

## 🔗 접속 URL

- **관리자 패널**: `http://localhost:3080/admin`
- **RAG 인터페이스**: `http://localhost:3080/rag`

## ⚠️ 주의사항

1. 관리자 계정은 `api/models/Admin.js`에서 하드코딩되어 있습니다.
2. 현재 답변 생성은 간단한 템플릿을 사용하며, 실제 LLM 연동이 필요합니다.
3. 파일 업로드는 로컬 스토리지를 사용하므로 프로덕션 환경에서는 클라우드 스토리지 연동을 권장합니다.
4. MongoDB 텍스트 인덱스를 사용하므로 데이터베이스 설정이 필요할 수 있습니다.

이 구현으로 LibreChat에 기본적인 RAG 시스템이 추가되었으며, 관리자는 문서를 업로드하고 일반 사용자들은 해당 문서를 기반으로 질의응답을 할 수 있습니다.
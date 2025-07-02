# LibreChat Shared RAG 기능

LibreChat에 관리자 기반 shared RAG (Retrieval-Augmented Generation) 기능이 추가되었습니다.

## 기능 개요

1. **관리자 계정 하드코딩**: 환경변수 또는 기본값으로 관리자 이메일 지정
2. **관리자용 파일 관리**: PDF, TXT, DOCX, MD 파일 업로드 및 관리
3. **자동 Shared RAG**: 일반 사용자의 모든 질문에 관리자가 업로드한 파일 내용이 자동으로 포함

## 설정 방법

### 1. 관리자 계정 설정

환경변수 `ADMIN_EMAILS`에 관리자 이메일을 쉼표로 구분하여 설정하거나, 기본값을 사용합니다.

```bash
# .env 파일에 추가
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

기본값: `admin@example.com`, `admin2@example.com`

### 2. PDF 텍스트 추출을 위한 패키지 설치 (선택사항)

PDF 파일에서 텍스트를 추출하려면 `pdf-parse` 패키지를 설치하세요:

```bash
cd api
npm install pdf-parse
```

## 사용 방법

### 관리자

1. 관리자 이메일로 회원가입/로그인
2. 브라우저에서 `/d/shared-rag` 경로로 이동
3. Shared RAG 파일 관리 페이지에서:
   - 파일 업로드 (PDF, TXT, DOCX, MD 지원)
   - 업로드된 파일 목록 확인
   - 파일 삭제
   - 파일 사용량 통계 확인

### 일반 사용자

- 특별한 설정 없이 평소대로 질문
- 모든 질문에 관리자가 업로드한 파일 내용이 자동으로 컨텍스트로 포함됨
- 관련 정보가 파일에 있으면 해당 내용을 기반으로 답변 받음

## 구현된 파일들

### 백엔드 (API)

1. **api/server/services/AuthService.js**
   - 관리자 이메일 하드코딩 배열 추가
   - 사용자 등록 시 관리자 권한 자동 부여

2. **packages/data-schemas/src/schema/file.ts**
   - `isShared` 필드 추가 (shared RAG 파일 표시)

3. **packages/data-schemas/src/types/file.ts**
   - `isShared` 타입 정의 추가

4. **api/server/routes/admin-rag.js**
   - 관리자용 shared RAG 파일 관리 API
   - 파일 업로드, 목록 조회, 삭제, 상세 정보 API

5. **api/server/services/SharedRAGService.js**
   - Shared RAG 파일 내용 조회
   - 사용자 메시지에 컨텍스트 추가
   - 파일 사용량 통계

6. **api/server/middleware/sharedRAG.js**
   - 메시지 처리 시 자동 shared RAG 적용 미들웨어

7. **api/server/routes/messages.js**
   - 메시지 POST 라우트에 shared RAG 미들웨어 적용

8. **api/server/index.js**
   - admin-rag 라우터 등록

### 프론트엔드 (클라이언트)

1. **client/src/components/Admin/SharedRAGManager.jsx**
   - 관리자용 파일 관리 UI 컴포넌트
   - 파일 업로드, 목록, 삭제 기능

2. **client/src/components/Admin/AdminNavigation.jsx**
   - 관리자용 네비게이션 메뉴 컴포넌트

3. **client/src/routes/Dashboard.tsx**
   - `/d/shared-rag` 라우트 추가

4. **client/src/routes/Layouts/DashBreadcrumb.tsx**
   - Shared RAG 페이지용 breadcrumb 추가

## 파일 지원 형식

- **PDF**: 텍스트 추출 지원 (pdf-parse 패키지 필요)
- **TXT**: 직접 텍스트 읽기
- **MD**: 마크다운 파일
- **DOCX**: 업로드는 지원하나 텍스트 추출은 추가 구현 필요

## 주요 특징

1. **자동 적용**: 일반 사용자는 별도 설정 없이 shared RAG 혜택을 받음
2. **관리자 제외**: 관리자는 shared RAG가 적용되지 않아 순수한 대화 가능
3. **사용량 추적**: 각 파일의 사용 횟수 추적
4. **즉시 반영**: 파일 추가/삭제 시 즉시 shared RAG에 반영
5. **오류 처리**: 파일 처리 오류 시에도 시스템 안정성 유지

## 사용 예시

### 관리자가 회사 정책 문서를 업로드한 경우

**사용자 질문**: "휴가 신청은 어떻게 하나요?"

**시스템이 처리하는 내용**:
```
다음은 참고할 수 있는 문서들입니다:

--- 회사정책.pdf ---
휴가 신청 절차:
1. 휴가신청서 작성
2. 상급자 승인
3. 인사팀 최종 승인
...

---

위 문서들을 참고하여 다음 질문에 답해주세요. 문서에 관련 정보가 있다면 해당 내용을 기반으로 답변하고, 없다면 일반적인 지식으로 답변해주세요.

질문: 휴가 신청은 어떻게 하나요?
```

**AI 응답**: 업로드된 회사 정책 문서를 기반으로 정확한 휴가 신청 절차 안내

## 보안 고려사항

1. 관리자만 파일 업로드/삭제 가능
2. 업로드된 파일은 관리자가 관리하는 신뢰할 수 있는 내용
3. 파일 타입 제한으로 악성 파일 업로드 방지
4. 파일 크기 제한 (50MB)

## 향후 개선 사항

1. DOCX 파일 텍스트 추출 구현
2. 파일별 태그/카테고리 기능
3. 벡터 임베딩을 통한 더 정확한 RAG
4. 파일 내용 검색 기능
5. 임시 비활성화 기능
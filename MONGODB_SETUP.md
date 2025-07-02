# MongoDB Atlas로 LibreChat Shared RAG 실행하기

## 1. MongoDB Atlas 무료 계정 생성 (5분)

1. https://www.mongodb.com/cloud/atlas 접속
2. "Try Free" 클릭하여 계정 생성
3. 무료 클러스터 생성 (M0 Sandbox - 512MB)
4. Database Access에서 사용자 생성
5. Network Access에서 0.0.0.0/0 허용 (개발용)

## 2. 연결 문자열 획득

1. Atlas 대시보드에서 "Connect" 클릭
2. "Connect your application" 선택
3. MongoDB URI 복사 (예: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/LibreChat)

## 3. .env 파일 수정

```bash
cd /workspace
cp .env.example .env
```

.env 파일에서 MongoDB URI 수정:
```
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/LibreChat?retryWrites=true&w=majority
```

## 4. 필수 환경변수 설정

```bash
# 관리자 이메일 설정 (Shared RAG 기능)
ADMIN_EMAILS=admin@example.com,test@example.com

# OpenAI API 키 (테스트용)
OPENAI_API_KEY=your-openai-api-key

# JWT 시크릿
JWT_SECRET=your-jwt-secret-here
```

## 5. LibreChat 실행

```bash
cd /workspace
npm install
npm run build:data-provider
npm run build:api
npm start
```

## 6. Shared RAG 테스트

1. http://localhost:3080 접속
2. admin@example.com으로 회원가입 (자동 관리자 권한)
3. /d/shared-rag에서 파일 업로드
4. 일반 사용자로 회원가입하여 질문 테스트

---

✅ **이 방법이 가장 실용적이고 실제 프로덕션에서도 사용됩니다!**
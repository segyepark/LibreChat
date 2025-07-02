import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '~/hooks/AuthContext';
import { SystemRoles } from 'librechat-data-provider';
import DashBreadcrumb from '~/routes/Layouts/DashBreadcrumb';

const SharedRAGManager = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  // 관리자가 아니면 메인 페이지로 리다이렉트
  useEffect(() => {
    if (user && user.role !== SystemRoles.ADMIN) {
      navigate('/c/new');
    }
  }, [user, navigate]);

  // 관리자가 아니면 접근 불가
  if (!user || user.role !== SystemRoles.ADMIN) {
    return null;
  }

  // 파일 목록 조회
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin-rag/files', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        setMessage('파일 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setMessage('파일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 파일 업로드
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 타입 검증
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage('PDF, TXT, DOCX, MD 파일만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin-rag/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`파일 업로드 성공: ${file.name}`);
        fetchFiles(); // 목록 새로고침
      } else {
        setMessage(data.message || '파일 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      event.target.value = ''; // 파일 입력 초기화
    }
  };

  // 파일 삭제
  const handleFileDelete = async (fileId, filename) => {
    if (!confirm(`"${filename}" 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin-rag/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`파일 삭제 성공: ${filename}`);
        fetchFiles(); // 목록 새로고침
      } else {
        setMessage(data.message || '파일 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setMessage('파일 삭제에 실패했습니다.');
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 컴포넌트 마운트 시 파일 목록 조회
  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-surface-primary p-0 lg:p-2">
      <DashBreadcrumb />
      <div className="flex w-full flex-grow flex-col overflow-hidden p-4">
        <h1 className="text-2xl font-bold mb-6">Shared RAG 파일 관리</h1>
      
      {/* 메시지 표시 */}
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('성공') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* 파일 업로드 섹션 */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">파일 업로드</h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".pdf,.txt,.docx,.md"
            onChange={handleFileUpload}
            disabled={uploading}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {uploading && <span className="text-blue-600">업로드 중...</span>}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          지원 형식: PDF, TXT, DOCX, MD (최대 50MB)
        </p>
      </div>

      {/* 파일 목록 섹션 */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">업로드된 파일 목록</h2>
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              {loading ? '로딩...' : '새로고침'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p>파일 목록을 불러오는 중...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>업로드된 파일이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y">
            {files.map((file) => (
              <div key={file.file_id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{file.filename}</h3>
                  <div className="text-sm text-gray-500 space-x-4">
                    <span>크기: {formatFileSize(file.bytes)}</span>
                    <span>업로드: {new Date(file.createdAt).toLocaleDateString()}</span>
                    <span>사용횟수: {file.usage || 0}</span>
                    {file.text && <span className="text-green-600">✓ 텍스트 추출됨</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleFileDelete(file.file_id, file.filename)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 사용 안내 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Shared RAG 기능 안내</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 여기에 업로드된 파일은 모든 일반 사용자의 질문답변에 자동으로 포함됩니다.</li>
          <li>• 관리자는 shared RAG 기능이 적용되지 않습니다.</li>
          <li>• PDF 파일의 경우 텍스트 추출이 필요하며, 이미지만 있는 PDF는 지원되지 않을 수 있습니다.</li>
          <li>• 파일이 삭제되면 즉시 shared RAG에서 제외됩니다.</li>
        </ul>
      </div>
      </div>
    </div>
  );
};

export default SharedRAGManager;
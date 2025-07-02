import { useState, useEffect } from 'react';
import { useAuthContext } from '~/hooks';
import FileUpload from './FileUpload';
import FileList from './FileList';
import DocumentSearch from './DocumentSearch';

const AdminPanel = () => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState('files');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 관리자 권한 확인
  const adminEmails = ['admin@librechat.com', 'manager@librechat.com'];
  const isAdmin = user?.email && adminEmails.includes(user.email.toLowerCase());

  useEffect(() => {
    if (isAdmin && activeTab === 'files') {
      fetchFiles();
    }
  }, [isAdmin, activeTab]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/files', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('파일 목록을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploaded = () => {
    fetchFiles();
  };

  const handleFileDeleted = () => {
    fetchFiles();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">접근 권한이 없습니다</h2>
          <p className="text-gray-600">관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 패널</h1>
        <p className="text-gray-600">문서 업로드 및 관리</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('files')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'files'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            파일 관리
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            문서 검색
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="space-y-6">
        {activeTab === 'files' && (
          <>
            <FileUpload onFileUploaded={handleFileUploaded} />
            <FileList 
              files={files} 
              loading={loading} 
              onFileDeleted={handleFileDeleted}
            />
          </>
        )}

        {activeTab === 'search' && (
          <DocumentSearch />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
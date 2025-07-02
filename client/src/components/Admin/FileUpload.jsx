import { useState } from 'react';

const FileUpload = ({ onFileUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('파일을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setMessage('');

      const response = await fetch('/api/admin/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '업로드에 실패했습니다.');
      }

      setMessage(`파일이 성공적으로 업로드되었습니다. (${data.file.chunkCount}개 청크 생성)`);
      setFile(null);
      
      // 파일 input 초기화
      const fileInput = document.getElementById('file-upload');
      if (fileInput) {
        fileInput.value = '';
      }

      if (onFileUploaded) {
        onFileUploaded();
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">파일 업로드</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
            문서 파일 선택 (PDF, TXT, DOC, DOCX)
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-600">
              <div><strong>파일명:</strong> {file.name}</div>
              <div><strong>크기:</strong> {formatFileSize(file.size)}</div>
              <div><strong>타입:</strong> {file.type}</div>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {uploading ? '업로드 중...' : '업로드'}
        </button>

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes('성공') 
              ? 'bg-green-100 text-green-700 border border-green-400' 
              : 'bg-red-100 text-red-700 border border-red-400'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>지원 형식:</strong> PDF, TXT, DOC, DOCX</p>
        <p><strong>최대 크기:</strong> 10MB</p>
        <p><strong>참고:</strong> 업로드된 파일은 자동으로 텍스트를 추출하여 검색 가능한 청크로 분할됩니다.</p>
      </div>
    </div>
  );
};

export default FileUpload;
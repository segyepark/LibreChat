import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2 } from 'lucide-react';
import { Button, Input, Label, Checkbox } from '@librechat/client';
import { useAuthContext } from '~/hooks/AuthContext';
import { SystemRoles } from 'librechat-data-provider';

interface GlobalFile {
  file_id: string;
  filename: string;
  bytes: number;
  type: string;
  createdAt: string;
  isGlobal: boolean;
}

const GlobalFileManager: React.FC = () => {
  const { user, token } = useAuthContext();
  const [globalFiles, setGlobalFiles] = useState<GlobalFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGlobal, setIsGlobal] = useState(true);
  
  const isAdmin = user?.role === SystemRoles.ADMIN;

  useEffect(() => {
    if (isAdmin) {
      fetchGlobalFiles();
    }
  }, [isAdmin]);

  const fetchGlobalFiles = async () => {
    if (!isAdmin || !token) return;

    try {
      const response = await fetch('/api/files/global', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const files = await response.json();
        setGlobalFiles(files);
      } else {
        console.error('Failed to fetch global files:', response.status);
      }
    } catch (error) {
      console.error('Error fetching global files:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !isAdmin || !token) return;

    console.log('[/frontend] Starting file upload:', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      isAdmin,
      hasToken: !!token,
    });

    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('isGlobal', 'true');
    formData.append('endpoint', 'default'); // Add endpoint for consistency

    console.log('[/frontend] FormData created:', {
      hasFile: formData.has('file'),
      hasIsGlobal: formData.has('isGlobal'),
      hasEndpoint: formData.has('endpoint'),
    });

    let progressInterval: NodeJS.Timeout | undefined;

    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000); // 30 minutes timeout

      // Simulate upload progress for large files
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 85) {
            return prev + Math.random() * 3;  // 초기에는 빠르게
          } else if (prev < 98) {
            return prev + Math.random() * 0.5;  // 85-98%: 매우 천천히
          } else if (prev < 99.5) {
            return prev + Math.random() * 0.1;  // 98-99.5%: 거의 정지
          }
          return prev;  // 99.5%에서 대기
        });
      }, 600);  // 더 빠른 업데이트

      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let browser set it automatically for FormData
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      console.log('[/frontend] Response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (response.ok) {
        setSelectedFile(null);
        setIsGlobal(true);
        
        // 점진적으로 100%로 완료
        setUploadProgress(95);
        setTimeout(() => setUploadProgress(100), 200);
        
        fetchGlobalFiles();
        // Show success message
        alert('File uploaded successfully!');
      } else {
        const error = await response.json();
        console.error('[/frontend] Upload failed:', error);
        
        // Handle specific error types
        let errorMessage = error.message;
        if (error.code === 'FILE_TOO_LARGE') {
          errorMessage = 'File is too large. Please check the file size limit.';
        } else if (error.code === 'UNEXPECTED_FILE_FIELD') {
          errorMessage = 'Invalid file format. Please try again.';
        } else if (error.code === 'ENOSPC') {
          errorMessage = 'Server storage is full. Please try again later.';
        } else if (error.code === 'ETIMEDOUT') {
          errorMessage = 'Upload timed out. Please try again with a smaller file or check your connection.';
        }
        
        alert(`Upload failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('[/frontend] Error uploading file:', error);
      
      let errorMessage = 'An error occurred during upload.';
      if (error.name === 'AbortError') {
        errorMessage = 'Upload timed out. Please try again with a smaller file or check your connection.';
        alert(errorMessage);
      } else if (error.message) {
        errorMessage = error.message;
        alert(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear any remaining intervals
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!isAdmin || !token) return;

    if (!confirm('Are you sure you want to delete this global file?')) {
      return;
    }

    try {
      const response = await fetch(`/api/files/global/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchGlobalFiles();
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('An error occurred during deletion.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-center text-gray-500">
          Only administrators can manage global files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Global File Management</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload Global File</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".pdf,.txt,.doc,.docx"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-global"
              checked={isGlobal}
              onCheckedChange={(checked) => setIsGlobal(checked as boolean)}
            />
            <Label htmlFor="is-global">Make this file global (shared with all users)</Label>
          </div>

          <Button
            onClick={handleFileUpload}
            disabled={!selectedFile || isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload File'}
          </Button>
          
          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="w-full">
              <div className="mb-2 flex justify-between text-sm text-gray-600">
                <span>Upload Progress</span>
                <span>{Math.floor(uploadProgress)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Global Files</h3>
        {globalFiles.length === 0 ? (
          <p className="text-center text-gray-500">No global files uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {globalFiles.map((file) => (
              <div
                key={file.file_id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-sm text-gray-500">
                      {(file.bytes / 1024 / 1024).toFixed(2)} MB • {file.type}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleDeleteFile(file.file_id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalFileManager; 
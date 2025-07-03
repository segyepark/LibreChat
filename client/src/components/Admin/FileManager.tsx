import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Upload, FileText, Calendar, User } from 'lucide-react';

interface SharedFile {
  _id: string;
  file_id: string;
  filename: string;
  bytes: number;
  type: string;
  shared: boolean;
  uploaded_by: string;
  uploaded_at: string;
  createdAt: string;
  updatedAt: string;
}

const FileManager: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const queryClient = useQueryClient();

  // Show notification and auto-hide after 3 seconds
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch shared files
  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ['admin-files'],
    queryFn: async (): Promise<SharedFile[]> => {
      const response = await fetch('/api/admin/files', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      return response.json();
    },
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/files', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-files'] });
      showNotification('File uploaded successfully', 'success');
      setSelectedFile(null);
    },
    onError: (error) => {
      showNotification(`Upload failed: ${error.message}`, 'error');
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-files'] });
      showNotification('File deleted successfully', 'success');
    },
    onError: (error) => {
      showNotification(`Delete failed: ${error.message}`, 'error');
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showNotification('Please select a file', 'error');
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFile);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(fileId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading files: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Shared File Management</h1>
        <p className="text-gray-600 mb-6">
          Upload and manage shared files that will be available for all users in RAG queries.
        </p>

        {/* Upload Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Upload New File</h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.txt,.doc,.docx,.md"
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            />
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          {selectedFile && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </div>

        {/* Files List */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Shared Files ({files.length})</h2>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No shared files found</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((file) => (
                <div key={file._id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-blue-100 p-2 rounded">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{file.filename}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>{formatFileSize(file.bytes)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(file.uploaded_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {file.uploaded_by}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(file.file_id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 disabled:opacity-50"
                    title="Delete file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileManager; 
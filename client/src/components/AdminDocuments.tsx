import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SystemRoles } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks';
import { Button } from '~/components/ui';
import type { TFile } from 'librechat-data-provider';

/**
 * Simple admin page for uploading and managing shared RAG documents.
 * Uses the `/api/admin/rag-files` endpoints introduced on the backend.
 */
export default function AdminDocuments() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  // Redirect non-admin users away
  useEffect(() => {
    if (user && user.role !== SystemRoles.ADMIN) {
      navigate('/c/new');
    }
  }, [user, navigate]);

  /* =============== Queries =============== */
  const filesQuery = useQuery<TFile[]>(['adminRagFiles'], async () => {
    const res = await fetch('/api/admin/rag-files');
    if (!res.ok) {
      throw new Error('Failed to fetch files');
    }
    return res.json();
  });

  /* =============== Mutations =============== */
  const uploadMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('entity_id', 'shared');
      const res = await fetch('/api/admin/rag-files', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRagFiles']);
      setFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileToDelete: TFile) => {
      const body = {
        files: [
          {
            file_id: fileToDelete.file_id,
            filepath: fileToDelete.filepath,
          },
        ],
      };
      const res = await fetch('/api/admin/rag-files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Delete failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRagFiles']);
    },
  });

  /* =============== Handlers =============== */
  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(file);
  };

  if (user?.role !== SystemRoles.ADMIN) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-surface-primary p-4 md:p-6">
      <h1 className="mb-4 text-2xl font-bold">Shared RAG Documents</h1>

      {/* Upload Section */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-white"
        />
        <Button onClick={handleUpload} disabled={!file || uploadMutation.isLoading}>
          {uploadMutation.isLoading ? 'Uploading...' : 'Upload'}
        </Button>
        {uploadMutation.isError && (
          <span className="text-red-500">{(uploadMutation.error as Error)?.message}</span>
        )}
      </div>

      {/* Files Table */}
      {filesQuery.isLoading ? (
        <p>Loading...</p>
      ) : filesQuery.isError ? (
        <p className="text-red-500">{(filesQuery.error as Error).message}</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Filename</th>
                <th className="px-4 py-2 text-left font-medium">Size</th>
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filesQuery.data?.map((f) => (
                <tr key={f.file_id}>
                  <td className="px-4 py-2">{f.filename}</td>
                  <td className="px-4 py-2">{(f.bytes / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteMutation.isLoading}
                      onClick={() => deleteMutation.mutate(f)}
                    >
                      {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
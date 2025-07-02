import React, { useState, useEffect } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import { SystemRoles } from 'librechat-data-provider';

const SharedRAGIndicator = () => {
  const { user } = useAuthContext();
  const [sharedFilesCount, setSharedFilesCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // 관리자는 인디케이터 표시하지 않음
  if (!user || user.role === SystemRoles.ADMIN) {
    return null;
  }

  useEffect(() => {
    // Shared RAG 파일 개수 확인
    const checkSharedRAG = async () => {
      try {
        const response = await fetch('/api/shared-rag/status', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setSharedFilesCount(data.enabled ? data.fileCount : 0);
        }
      } catch (error) {
        console.error('Error checking shared RAG:', error);
        setSharedFilesCount(0);
      }
    };

    checkSharedRAG();
  }, []);

  if (!isVisible || sharedFilesCount === 0) {
    return null;
  }

  return (
    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-blue-700">
            📚 공유 지식베이스가 활성화되어 있습니다
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-blue-400 hover:text-blue-600 text-xs"
        >
          ✕
        </button>
      </div>
      <p className="text-xs text-blue-600 mt-1 ml-4">
        관리자가 업로드한 문서를 기반으로 더 정확한 답변을 제공합니다.
      </p>
    </div>
  );
};

export default SharedRAGIndicator;
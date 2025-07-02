import { useState } from 'react';

const DocumentSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    try {
      setSearching(true);
      setHasSearched(true);

      const response = await fetch(`/api/admin/search?query=${encodeURIComponent(query.trim())}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('검색에 실패했습니다.');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      alert(error.message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">문서 검색</h2>
      
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {searching ? '검색 중...' : '검색'}
          </button>
        </div>
      </form>

      {hasSearched && (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            "{query}" 검색 결과: {results.length}개
          </div>

          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">
                      {result.metadata.fileName}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>청크 #{result.metadata.chunkIndex + 1}</span>
                      {result.score && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          점수: {result.score.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {highlightText(result.content, query)}
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    업로드자: {result.metadata.uploadedBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentSearch;
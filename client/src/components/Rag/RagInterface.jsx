import { useState, useEffect } from 'react';

const RagInterface = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchAvailableDocuments();
  }, []);

  const fetchAvailableDocuments = async () => {
    try {
      const response = await fetch('/api/rag/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      return;
    }

    try {
      setLoading(true);
      setAnswer(null);

      const response = await fetch('/api/rag/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          question: question.trim(),
          maxChunks: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('질문 처리에 실패했습니다.');
      }

      const data = await response.json();
      setAnswer(data);
    } catch (error) {
      setAnswer({
        answer: `오류가 발생했습니다: ${error.message}`,
        sources: [],
        question: question.trim(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">문서 기반 질의응답</h1>
        <p className="text-gray-600">
          관리자가 업로드한 문서를 기반으로 질문에 답변을 받을 수 있습니다.
        </p>
      </div>

      {/* 사용 가능한 문서 목록 */}
      {documents.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            사용 가능한 문서 ({documents.length}개)
          </h3>
          <div className="flex flex-wrap gap-2">
            {documents.map((doc, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {doc.fileName} ({doc.chunkCount} 청크)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 질문 입력 폼 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              질문을 입력하세요
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 이 문서에서 주요 내용은 무엇인가요?"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? '답변 생성 중...' : '질문하기'}
          </button>
        </form>
      </div>

      {/* 답변 표시 */}
      {answer && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">답변</h2>
          
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">질문:</h3>
            <p className="text-gray-700">{answer.question}</p>
          </div>

          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">답변:</h3>
            <div className="text-green-800 whitespace-pre-wrap">
              {answer.answer}
            </div>
          </div>

          {/* 참조 소스 */}
          {answer.sources && answer.sources.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                참조 문서 ({answer.sources.length}개)
              </h3>
              <div className="space-y-3">
                {answer.sources.map((source, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">
                        {source.fileName}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>청크 #{source.chunkIndex + 1}</span>
                        {source.score && (
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            관련도: {source.score.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 사용 가이드 */}
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium text-yellow-900 mb-2">사용 가이드</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• 구체적이고 명확한 질문을 작성하세요.</li>
          <li>• 업로드된 문서 내용과 관련된 질문을 하세요.</li>
          <li>• 답변은 업로드된 문서의 내용을 기반으로 생성됩니다.</li>
          <li>• 참조 문서를 확인하여 더 자세한 정보를 얻을 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default RagInterface;
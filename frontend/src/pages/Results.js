import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DocumentTextIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const Results = () => {
  const [queryResult, setQueryResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedResult = localStorage.getItem('lastQueryResult');
    if (storedResult) {
      setQueryResult(JSON.parse(storedResult));
    }
  }, []);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Result copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatConfidence = (confidence) => {
    if (confidence >= 0.8) return { text: 'High', color: 'text-green-600', bg: 'bg-green-100' };
    if (confidence >= 0.6) return { text: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'Low', color: 'text-red-600', bg: 'bg-red-100' };
  };

  if (!queryResult) {
    return (
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Results Found</h1>
          <p className="text-gray-600 mb-6">
            It looks like you haven't run a query yet, or the results have been cleared.
          </p>
          <Link to="/query" className="btn-primary">
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Query Interface
          </Link>
        </div>
      </div>
    );
  }

  const { query, result, timestamp } = queryResult;
  const confidence = result.confidence_score || 0.85;
  const confidenceInfo = formatConfidence(confidence);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Query Results</h1>
          <p className="text-gray-600 mt-2">
            Generated on {new Date(timestamp).toLocaleString()}
          </p>
        </div>
        <Link to="/query" className="btn-secondary">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          New Query
        </Link>
      </div>

      {/* Original Query */}
      <div className="card bg-primary-50 border-primary-200">
        <h2 className="text-lg font-semibold text-primary-900 mb-3 flex items-center">
          <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
          Your Question
        </h2>
        <p className="text-primary-800 italic">"{query}"</p>
      </div>

      {/* Main Result */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <SparklesIcon className="h-6 w-6 mr-2 text-primary-600" />
            AI Analysis
          </h2>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${confidenceInfo.bg} ${confidenceInfo.color}`}>
              Confidence: {confidenceInfo.text}
            </span>
            <button
              onClick={() => copyToClipboard(result.result_text)}
              className="text-gray-500 hover:text-primary-600 transition-colors duration-200"
              title="Copy result"
            >
              <ClipboardDocumentIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="prose max-w-none">
          <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-primary-500">
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {result.result_text}
            </p>
          </div>
        </div>
      </div>

      {/* Source Documents */}
      {result.source_chunks && result.source_chunks.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Source Information
          </h2>
          <div className="space-y-4">
            {result.source_chunks.map((chunk, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    Source {index + 1}
                  </h3>
                  {chunk.document_name && (
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      {chunk.document_name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {chunk.content}
                </p>
                {chunk.page_number && (
                  <p className="text-xs text-gray-500 mt-2">
                    Page {chunk.page_number}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {result.metadata && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.metadata.documents_analyzed && (
              <div>
                <p className="text-sm font-medium text-gray-700">Documents Analyzed</p>
                <p className="text-sm text-gray-900">{result.metadata.documents_analyzed}</p>
              </div>
            )}
            {result.metadata.processing_time && (
              <div>
                <p className="text-sm font-medium text-gray-700">Processing Time</p>
                <p className="text-sm text-gray-900">{result.metadata.processing_time}ms</p>
              </div>
            )}
            {result.metadata.chunks_retrieved && (
              <div>
                <p className="text-sm font-medium text-gray-700">Chunks Retrieved</p>
                <p className="text-sm text-gray-900">{result.metadata.chunks_retrieved}</p>
              </div>
            )}
            {result.metadata.model_used && (
              <div>
                <p className="text-sm font-medium text-gray-700">AI Model</p>
                <p className="text-sm text-gray-900">{result.metadata.model_used}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/query" className="btn-primary flex-1 text-center">
          <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
          Ask Another Question
        </Link>
        <Link to="/upload" className="btn-secondary flex-1 text-center">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Upload More Documents
        </Link>
      </div>

      {/* Feedback */}
      <div className="card bg-gray-50 border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Was this helpful?</h3>
        <p className="text-gray-600 mb-4">
          Your feedback helps us improve the accuracy of our AI analysis.
        </p>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
            👍 Yes
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200">
            👎 No
          </button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200">
            🤔 Partially
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results; 
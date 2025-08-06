import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  MagnifyingGlassIcon,
  SparklesIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const QueryInterface = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState([]);
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const navigate = useNavigate();

  const exampleQueries = [
    "46-year-old male, knee surgery in Pune, 3-month-old insurance policy",
    "What are the coverage limits for dental procedures?",
    "Find all clauses related to pre-existing conditions",
    "What is the waiting period for maternity benefits?",
    "Are there any exclusions for chronic diseases?",
    "What documents are required for claim submission?"
  ];

  useEffect(() => {
    fetchRecentQueries();
    fetchAvailableDocuments();
  }, []);

  const fetchRecentQueries = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/queries/recent`
      );
      setRecentQueries(response.data.queries || []);
    } catch (error) {
      console.error('Error fetching recent queries:', error);
    }
  };

  const fetchAvailableDocuments = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_DOCUMENT_SERVICE_URL || 'http://localhost:8001'}/api/documents`
      );
      setAvailableDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    if (availableDocuments.length === 0) {
      toast.error('No documents available. Please upload some documents first.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/queries`,
        {
          query: query.trim(),
          context: 'User is asking about insurance coverage and policy details'
        }
      );

      // Store the query result in localStorage for the results page
      localStorage.setItem('lastQueryResult', JSON.stringify({
        query: query.trim(),
        result: response.data,
        timestamp: new Date().toISOString()
      }));

      toast.success('Query processed successfully!');
      navigate('/results');
      
    } catch (error) {
      console.error('Query error:', error);
      toast.error(`Query failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Query Your Documents</h1>
        <p className="text-gray-600">
          Ask natural language questions about your uploaded documents and get AI-powered answers.
        </p>
      </div>

      {/* Query Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <div className="relative">
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., 46-year-old male, knee surgery in Pune, 3-month-old insurance policy"
                className="input-field min-h-[120px] resize-none"
                disabled={isLoading}
              />
              <div className="absolute bottom-3 right-3">
                <SparklesIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-5 w-5" />
                  <span>Ask Question</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setQuery('')}
              disabled={isLoading}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Available Documents */}
      {availableDocuments.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Available Documents ({availableDocuments.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableDocuments.slice(0, 6).map((doc) => (
              <div key={doc.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.original_filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {doc.file_type} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {availableDocuments.length > 6 && (
            <p className="text-sm text-gray-500 mt-3">
              +{availableDocuments.length - 6} more documents
            </p>
          )}
        </div>
      )}

      {/* Example Queries */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Example Queries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exampleQueries.map((exampleQuery, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(exampleQuery)}
              disabled={isLoading}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <p className="text-sm text-gray-700 italic">"{exampleQuery}"</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Queries */}
      {recentQueries.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Recent Queries
          </h2>
          <div className="space-y-3">
            {recentQueries.slice(0, 5).map((recentQuery) => (
              <div key={recentQuery.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{recentQuery.query_text}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(recentQuery.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  recentQuery.status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : recentQuery.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {recentQuery.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Documents Warning */}
      {availableDocuments.length === 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            No Documents Available
          </h3>
          <p className="text-yellow-700 mb-4">
            You need to upload some documents before you can query them. Upload insurance policies, 
            contracts, or other documents to get started.
          </p>
          <a
            href="/upload"
            className="btn-primary bg-yellow-600 hover:bg-yellow-700"
          >
            Upload Documents
          </a>
        </div>
      )}
    </div>
  );
};

export default QueryInterface; 
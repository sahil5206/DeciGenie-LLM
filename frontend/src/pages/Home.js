import React from 'react';
import { Link } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  SparklesIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

const Home = () => {
  const features = [
    {
      name: 'Document Upload',
      description: 'Upload insurance policies, contracts, and other documents in PDF, DOCX, or TXT formats.',
      icon: DocumentTextIcon,
      href: '/upload'
    },
    {
      name: 'Smart Queries',
      description: 'Ask natural language questions and get relevant answers extracted from your documents.',
      icon: MagnifyingGlassIcon,
      href: '/query'
    },
    {
      name: 'AI-Powered Analysis',
      description: 'Leverage Google Gemini AI to understand context and extract precise information.',
      icon: SparklesIcon,
      href: '/query'
    },
    {
      name: 'Secure & Private',
      description: 'Your documents and queries are processed securely with enterprise-grade privacy.',
      icon: ShieldCheckIcon,
      href: '/upload'
    }
  ];

  const exampleQueries = [
    "46-year-old male, knee surgery in Pune, 3-month-old insurance policy",
    "What are the coverage limits for dental procedures?",
    "Find all clauses related to pre-existing conditions",
    "What is the waiting period for maternity benefits?"
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
            Extract Answers from
            <span className="text-gradient block"> Complex Documents</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            DeciGenie LLM uses advanced AI to understand your questions and find relevant information 
            from insurance policies, contracts, and other unstructured documents.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/upload" className="btn-primary text-lg px-8 py-3">
            Upload Documents
          </Link>
          <Link to="/query" className="btn-secondary text-lg px-8 py-3">
            Try a Query
          </Link>
        </div>
      </div>

      {/* Example Query */}
      <div className="card max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Example Query</h2>
        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary-500">
          <p className="text-gray-700 font-medium">
            "46-year-old male, knee surgery in Pune, 3-month-old insurance policy"
          </p>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          The system will analyze your insurance documents and extract relevant coverage information, 
          exclusions, and claim procedures for this specific scenario.
        </p>
      </div>

      {/* Features Grid */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.name}
              to={feature.href}
              className="card hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors duration-200">
                <feature.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
                {feature.name}
              </h3>
              <p className="text-gray-600 text-sm">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* More Examples */}
      <div className="card max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">More Query Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exampleQueries.map((query, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 text-sm italic">"{query}"</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/query" className="btn-primary">
            Start Querying Your Documents
          </Link>
        </div>
      </div>

      {/* Use Cases */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          Perfect For
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Insurance</h3>
            <p className="text-gray-600">
              Quickly find coverage details, exclusions, and claim procedures from policy documents.
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <DocumentTextIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Legal</h3>
            <p className="text-gray-600">
              Extract key clauses, terms, and conditions from contracts and legal documents.
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <SparklesIcon className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">HR & Compliance</h3>
            <p className="text-gray-600">
              Navigate employee handbooks, compliance documents, and policy manuals efficiently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 
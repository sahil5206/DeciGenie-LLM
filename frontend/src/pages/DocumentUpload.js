import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const DocumentUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    uploadFiles(newFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const uploadFiles = async (files) => {
    setUploading(true);
    
    for (const fileData of files) {
      try {
        const formData = new FormData();
        formData.append('document', fileData.file);
        
        // Update status to uploading
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'uploading', progress: 10 }
              : f
          )
        );

        const response = await axios.post(
          `${process.env.REACT_APP_DOCUMENT_SERVICE_URL || 'http://localhost:8001'}/api/documents/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadedFiles(prev => 
                prev.map(f => 
                  f.id === fileData.id 
                    ? { ...f, progress: Math.min(90, progress) }
                    : f
                )
              );
            }
          }
        );

        // Update status to success
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileData.id 
              ? { 
                  ...f, 
                  status: 'success', 
                  progress: 100,
                  documentId: response.data.documentId 
                }
              : f
          )
        );

        toast.success(`${fileData.file.name} uploaded successfully!`);
        
      } catch (error) {
        console.error('Upload error:', error);
        
        // Update status to error
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'error', progress: 0 }
              : f
          )
        );

        toast.error(`Failed to upload ${fileData.file.name}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    setUploading(false);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryUpload = (fileData) => {
    setUploadedFiles(prev => 
      prev.map(f => 
        f.id === fileData.id 
          ? { ...f, status: 'pending', progress: 0 }
          : f
      )
    );
    uploadFiles([fileData]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'txt':
        return '📄';
      default:
        return '📄';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
        <p className="text-gray-600">
          Upload your insurance policies, contracts, and other documents for AI-powered analysis.
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-gray-500 mt-2">
            or click to select files
          </p>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>Supported formats: PDF, DOCX, TXT</p>
          <p>Maximum file size: 50MB</p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Uploaded Files</h2>
          <div className="space-y-3">
            {uploadedFiles.map((fileData) => (
              <div key={fileData.id} className="card flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {getFileIcon(fileData.file.name)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{fileData.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(fileData.file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Progress Bar */}
                  {fileData.status === 'uploading' && (
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileData.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Status Icons */}
                  {fileData.status === 'success' && (
                    <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  )}
                  {fileData.status === 'error' && (
                    <XCircleIcon className="h-6 w-6 text-red-500" />
                  )}
                  {fileData.status === 'uploading' && (
                    <ArrowPathIcon className="h-6 w-6 text-primary-500 animate-spin" />
                  )}
                  
                  {/* Action Buttons */}
                  {fileData.status === 'error' && (
                    <button
                      onClick={() => retryUpload(fileData)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Retry
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeFile(fileData.id)}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Status */}
      {uploading && (
        <div className="card text-center">
          <ArrowPathIcon className="mx-auto h-8 w-8 text-primary-500 animate-spin" />
          <p className="mt-2 text-gray-600">Processing documents...</p>
        </div>
      )}

      {/* Next Steps */}
      {uploadedFiles.some(f => f.status === 'success') && (
        <div className="card bg-primary-50 border-primary-200">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            Documents uploaded successfully!
          </h3>
          <p className="text-primary-700 mb-4">
            Your documents are now being processed and indexed. You can start querying them to extract relevant information.
          </p>
          <a
            href="/query"
            className="btn-primary"
          >
            Start Querying Documents
          </a>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload; 
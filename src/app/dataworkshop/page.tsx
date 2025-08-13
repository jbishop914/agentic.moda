'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'

interface UploadResult {
  document_id: string
  status: 'Processing' | 'Completed' | 'Failed'
  message: string
}

export default function DataworkshopPage() {
  const [uploads, setUploads] = useState<UploadResult[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSpeed, setUploadSpeed] = useState<number>(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const startTime = performance.now()
    setIsUploading(true)
    
    for (const file of acceptedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const uploadStart = performance.now()
        const response = await fetch('http://127.0.0.1:8080/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        const result: UploadResult = await response.json()
        const uploadTime = performance.now() - uploadStart
        
        setUploads(prev => [...prev, result])
        setUploadSpeed(uploadTime)
        
        // Show instant success feedback
        console.log(`⚡ BLAZING FAST upload: ${file.name} in ${uploadTime.toFixed(1)}ms`)
        
      } catch (error) {
        console.error('Upload failed:', error)
        setUploads(prev => [...prev, {
          document_id: 'error',
          status: 'Failed',
          message: `Failed to upload ${file.name}`
        }])
      }
    }
    
    setIsUploading(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'message/rfc822': ['.eml'],
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold text-white mb-4">
            Data<span className="text-purple-400">workshop</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            ⚡ Enterprise Document Intelligence - <span className="text-green-400 font-bold">BLAZING FAST</span>
          </p>
        </motion.div>

        {/* Speed Stats */}
        {uploadSpeed > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <div className="inline-block bg-green-500/20 border border-green-400 rounded-lg px-6 py-3">
              <span className="text-green-400 font-bold text-lg">
                ⚡ Last upload: {uploadSpeed.toFixed(1)}ms - LIGHTNING FAST!
              </span>
            </div>
          </motion.div>
        )}

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-200 ease-in-out
              ${isDragActive 
                ? 'border-purple-400 bg-purple-400/10 scale-105' 
                : 'border-gray-600 bg-gray-800/50 hover:border-purple-500 hover:bg-purple-500/5'
              }
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            <div className="space-y-4">
              <div className="text-6xl">
                {isUploading ? '⚡' : isDragActive ? '🚀' : '📄'}
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {isUploading ? 'Processing at Light Speed...' : 
                   isDragActive ? 'Drop files for INSTANT processing!' :
                   'Drop your documents here'}
                </h3>
                
                <p className="text-gray-400">
                  {isUploading ? 'Your files are being processed in the background ⚡' :
                   'Supports PDF, Word, Excel, Text, and Email files'}
                </p>
              </div>

              {isUploading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="text-4xl"
                >
                  ⚡
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-2xl font-semibold text-white mb-4">
                ⚡ Upload Results - {uploads.length} files processed
              </h3>
              
              <div className="grid gap-4">
                {uploads.map((upload, index) => (
                  <motion.div
                    key={upload.document_id + index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      p-4 rounded-lg border
                      ${upload.status === 'Processing' ? 'bg-blue-900/20 border-blue-400' :
                        upload.status === 'Completed' ? 'bg-green-900/20 border-green-400' :
                        'bg-red-900/20 border-red-400'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {upload.status === 'Processing' ? '⚡' :
                             upload.status === 'Completed' ? '✅' : '❌'}
                          </span>
                          <span className="font-medium text-white">
                            Document ID: {upload.document_id}
                          </span>
                        </div>
                        <p className={`
                          text-sm mt-1
                          ${upload.status === 'Processing' ? 'text-blue-300' :
                            upload.status === 'Completed' ? 'text-green-300' :
                            'text-red-300'}
                        `}>
                          {upload.message}
                        </p>
                      </div>
                      
                      {upload.status === 'Processing' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="text-blue-400"
                        >
                          ⚡
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid md:grid-cols-3 gap-6"
        >
          <div className="bg-gray-800/50 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h4 className="text-lg font-semibold text-white mb-2">Lightning Fast</h4>
            <p className="text-gray-400">Sub-second upload responses with background processing</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h4 className="text-lg font-semibold text-white mb-2">Smart Analysis</h4>
            <p className="text-gray-400">AI-powered entity extraction and relationship mapping</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h4 className="text-lg font-semibold text-white mb-2">Enterprise Grade</h4>
            <p className="text-gray-400">HIPAA & SOC2 compliant document processing</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
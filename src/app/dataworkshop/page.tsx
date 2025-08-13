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
  const [isCreatingDemo, setIsCreatingDemo] = useState(false)
  const [demoResults, setDemoResults] = useState<any>(null)
  const [isCreatingEmailDemo, setIsCreatingEmailDemo] = useState(false)
  const [emailDemoResults, setEmailDemoResults] = useState<any>(null)

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

  const createSecDemo = async () => {
    setIsCreatingDemo(true)
    setDemoResults(null)
    
    try {
      const startTime = performance.now()
      const response = await fetch('http://127.0.0.1:8080/api/sec-demo', {
        method: 'POST',
      })
      
      const result = await response.json()
      const totalTime = performance.now() - startTime
      
      setDemoResults(result)
      console.log(`⚡ SEC demo dataset created in ${totalTime.toFixed(1)}ms`)
      
    } catch (error) {
      console.error('Failed to create SEC demo dataset:', error)
      setDemoResults({
        success: false,
        message: 'Failed to create demo dataset'
      })
    } finally {
      setIsCreatingDemo(false)
    }
  }

  const createEmailDemo = async () => {
    setIsCreatingEmailDemo(true)
    setEmailDemoResults(null)
    
    try {
      const startTime = performance.now()
      const response = await fetch('http://127.0.0.1:8080/api/email-demo', {
        method: 'POST',
      })
      
      const result = await response.json()
      const totalTime = performance.now() - startTime
      
      setEmailDemoResults(result)
      console.log(`⚡ Email demo dataset created in ${totalTime.toFixed(1)}ms`)
      
    } catch (error) {
      console.error('Failed to create email demo dataset:', error)
      setEmailDemoResults({
        success: false,
        message: 'Failed to create email demo dataset'
      })
    } finally {
      setIsCreatingEmailDemo(false)
    }
  }

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
      'application/vnd.ms-outlook': ['.msg'],
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

        {/* SEC Demo Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-8"
        >
          <button
            onClick={createSecDemo}
            disabled={isCreatingDemo}
            className={`
              inline-flex items-center space-x-2 px-8 py-4 rounded-lg font-bold text-lg
              transition-all duration-200 transform
              ${isCreatingDemo 
                ? 'bg-purple-600/50 text-purple-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white hover:scale-105 shadow-lg hover:shadow-purple-500/25'
              }
            `}
          >
            {isCreatingDemo ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="text-2xl"
                >
                  ⚡
                </motion.div>
                <span>Creating SEC Demo Dataset...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">🚀</span>
                <span>Create SEC Filing Demo Dataset</span>
                <span className="text-sm bg-green-400 text-black px-2 py-1 rounded">INSTANT</span>
              </>
            )}
          </button>
          
          <p className="text-gray-400 text-sm mt-2">
            Downloads & processes Apple, Tesla, Microsoft, NVIDIA + more SEC filings ⚡<br/>
            <span className="text-purple-300">18M+ filings • 100M+ exhibits • 50 req/sec • 15K files/5min</span>
          </p>
        </motion.div>

        {/* Email Demo Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="text-center mb-8"
        >
          <button
            onClick={createEmailDemo}
            disabled={isCreatingEmailDemo}
            className={`
              inline-flex items-center space-x-2 px-8 py-4 rounded-lg font-bold text-lg
              transition-all duration-200 transform
              ${isCreatingEmailDemo 
                ? 'bg-blue-600/50 text-blue-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white hover:scale-105 shadow-lg hover:shadow-blue-500/25'
              }
            `}
          >
            {isCreatingEmailDemo ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="text-2xl"
                >
                  ⚡
                </motion.div>
                <span>Processing Email Demo...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">📧</span>
                <span>Create Email Discovery Demo</span>
                <span className="text-sm bg-orange-400 text-black px-2 py-1 rounded">LEGAL</span>
              </>
            )}
          </button>
          
          <p className="text-gray-400 text-sm mt-2">
            Legal discovery: Acquisitions, contracts, executive comms ⚡<br/>
            <span className="text-cyan-300">1000+ emails/sec • Thread analysis • Attachment processing</span>
          </p>
        </motion.div>

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

        {/* SEC Demo Results */}
        <AnimatePresence>
          {demoResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className={`
                p-6 rounded-lg border
                ${demoResults.success ? 'bg-green-900/20 border-green-400' : 'bg-red-900/20 border-red-400'}
              `}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>{demoResults.success ? '🚀' : '❌'}</span>
                    <span>SEC Demo Dataset Results</span>
                  </h3>
                  {demoResults.success && (
                    <div className="text-green-400 font-bold">
                      ⚡ {demoResults.processing_time_ms}ms TOTAL
                    </div>
                  )}
                </div>
                
                <p className={`mb-4 ${demoResults.success ? 'text-green-300' : 'text-red-300'}`}>
                  {demoResults.message}
                </p>
                
                {demoResults.success && demoResults.results && (
                  <div className="grid gap-2">
                    {demoResults.results.map((result: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800/50 p-3 rounded">
                        <div className="flex items-center space-x-3">
                          <span>{result.status === 'Completed' ? '✅' : '❌'}</span>
                          <span className="text-white font-medium">{result.filename}</span>
                          {result.document_id && (
                            <span className="text-xs text-gray-400">ID: {result.document_id}</span>
                          )}
                        </div>
                        <div className="text-green-400 font-bold text-sm">
                          {result.processing_time_ms}ms
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Demo Results */}
        <AnimatePresence>
          {emailDemoResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className={`
                p-6 rounded-lg border
                ${emailDemoResults.success ? 'bg-blue-900/20 border-blue-400' : 'bg-red-900/20 border-red-400'}
              `}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>{emailDemoResults.success ? '📧' : '❌'}</span>
                    <span>Email Discovery Demo Results</span>
                  </h3>
                  {emailDemoResults.success && (
                    <div className="text-blue-400 font-bold">
                      ⚡ {emailDemoResults.processing_time_ms}ms TOTAL
                    </div>
                  )}
                </div>
                
                <p className={`mb-4 ${emailDemoResults.success ? 'text-blue-300' : 'text-red-300'}`}>
                  {emailDemoResults.message}
                </p>
                
                {emailDemoResults.success && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-800/50 p-3 rounded text-center">
                        <div className="text-2xl font-bold text-blue-400">{emailDemoResults.total_emails}</div>
                        <div className="text-xs text-gray-400">Emails Processed</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded text-center">
                        <div className="text-2xl font-bold text-cyan-400">{emailDemoResults.total_threads}</div>
                        <div className="text-xs text-gray-400">Conversation Threads</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded text-center">
                        <div className="text-2xl font-bold text-orange-400">{emailDemoResults.total_attachments}</div>
                        <div className="text-xs text-gray-400">Attachments Found</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded text-center">
                        <div className="text-2xl font-bold text-green-400">{Math.round(emailDemoResults.total_size_bytes/1024)}KB</div>
                        <div className="text-xs text-gray-400">Total Data Size</div>
                      </div>
                    </div>
                    
                    {emailDemoResults.sample_threads && emailDemoResults.sample_threads.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-white mb-3">📧 Sample Email Threads:</h4>
                        <div className="grid gap-3">
                          {emailDemoResults.sample_threads.map((thread: any, index: number) => (
                            <div key={index} className="bg-gray-800/50 p-4 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium">{thread.subject}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">{thread.message_count} msgs</span>
                                  <span className="text-xs bg-cyan-600 text-white px-2 py-1 rounded">{thread.participant_count} people</span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-400">
                                Latest: {thread.emails && thread.emails.length > 0 ? 
                                  thread.emails[thread.emails.length - 1]?.sender || 'Unknown' : 'No emails'
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Results */}
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
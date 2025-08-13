// File Watcher - Auto-detects and processes new documents
// Monitors folders for new files and triggers processing automatically

use crate::document_processor::DocumentProcessor;
use crate::storage::Storage;
use crate::types::*;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tracing::{info, warn, error};

pub struct FileWatcher {
    processor: Arc<DocumentProcessor>,
    storage: Arc<Mutex<Storage>>,
    watched_paths: Vec<String>,
}

impl FileWatcher {
    pub fn new(processor: Arc<DocumentProcessor>, storage: Arc<Mutex<Storage>>) -> Self {
        info!("👀 Initializing File Watcher...");
        
        Self {
            processor,
            storage,
            watched_paths: Vec::new(),
        }
    }

    /// Start watching multiple folder paths
    pub async fn start_watching(&self, paths: &[&str]) -> Result<(), WatcherError> {
        info!("🚀 Starting file watcher for {} paths", paths.len());
        
        for path in paths {
            info!("📂 Watching folder: {}", path);
            self.watch_single_path(path).await?;
        }
        
        Ok(())
    }

    /// Watch a single folder path
    async fn watch_single_path(&self, path: &str) -> Result<(), WatcherError> {
        let path_buf = Path::new(path).to_path_buf();
        
        if !path_buf.exists() {
            warn!("📂 Creating watched folder: {}", path);
            std::fs::create_dir_all(&path_buf)
                .map_err(|e| WatcherError::FolderCreationFailed(e.to_string()))?;
        }

        let (tx, mut rx) = mpsc::channel(1000);
        let processor = Arc::clone(&self.processor);
        let storage = Arc::clone(&self.storage);
        
        // Spawn file event handler
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                if let Err(e) = Self::handle_file_event(event, &processor, &storage).await {
                    error!("❌ Error handling file event: {}", e);
                }
            }
        });

        // Create filesystem watcher
        let mut watcher = RecommendedWatcher::new(
            move |result: Result<Event, notify::Error>| {
                let tx = tx.clone();
                tokio::spawn(async move {
                    match result {
                        Ok(event) => {
                            if tx.send(event).await.is_err() {
                                error!("❌ Failed to send file event");
                            }
                        }
                        Err(e) => error!("❌ File watcher error: {}", e),
                    }
                });
            },
            Config::default(),
        ).map_err(|e| WatcherError::WatcherInitFailed(e.to_string()))?;

        // Start watching the path
        watcher.watch(&path_buf, RecursiveMode::Recursive)
            .map_err(|e| WatcherError::WatchFailed(e.to_string()))?;

        info!("✅ File watcher active for: {}", path);

        // Keep the watcher alive (in a real app, you'd store this somewhere)
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
            }
        });

        Ok(())
    }

    /// Handle individual file events
    async fn handle_file_event(
        event: Event,
        processor: &DocumentProcessor,
        storage: &Arc<Mutex<Storage>>,
    ) -> Result<(), WatcherError> {
        match event.kind {
            EventKind::Create(_) | EventKind::Modify(_) => {
                for path in event.paths {
                    if let Some(path_str) = path.to_str() {
                        // Check if it's a supported file type
                        if Self::is_supported_file(path_str) {
                            info!("📄 New document detected: {}", path_str);
                            
                            // Wait a moment to ensure file is fully written
                            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                            
                            // Process the document
                            match Self::process_new_file(path_str, processor, storage).await {
                                Ok(doc_id) => {
                                    info!("✅ Document processed successfully: {} -> {}", path_str, doc_id);
                                    
                                    // Send notification to user (in a real app)
                                    Self::notify_user_success(path_str, doc_id).await;
                                }
                                Err(e) => {
                                    error!("❌ Failed to process {}: {}", path_str, e);
                                    
                                    // Send error notification to user
                                    Self::notify_user_error(path_str, &e.to_string()).await;
                                }
                            }
                        }
                    }
                }
            }
            _ => {} // Ignore other events
        }

        Ok(())
    }

    /// Process a newly detected file
    async fn process_new_file(
        file_path: &str,
        processor: &DocumentProcessor,
        storage: &Arc<Mutex<Storage>>,
    ) -> Result<uuid::Uuid, ProcessingError> {
        // Process the document
        let processed_doc = processor.process_document(file_path).await?;
        let doc_id = processed_doc.id;

        // Store in database
        let mut storage_lock = storage.lock().await;
        storage_lock.store_document(processed_doc).await
            .map_err(|e| ProcessingError::IoError(e.to_string()))?;

        Ok(doc_id)
    }

    /// Check if file type is supported
    fn is_supported_file(file_path: &str) -> bool {
        let path = Path::new(file_path);
        if let Some(extension) = path.extension().and_then(|ext| ext.to_str()) {
            matches!(extension.to_lowercase().as_str(), 
                "pdf" | "doc" | "docx" | "xls" | "xlsx" | 
                "txt" | "eml" | "msg" | "png" | "jpg" | "jpeg" | "tiff"
            )
        } else {
            false
        }
    }

    /// Notify user of successful processing
    async fn notify_user_success(file_path: &str, doc_id: uuid::Uuid) {
        info!("🔔 User Notification: ✅ Document '{}' processed successfully (ID: {})", 
            Path::new(file_path).file_name().unwrap_or_default().to_string_lossy(), 
            doc_id
        );
        
        // In a real implementation, this would send:
        // - Desktop notification
        // - Dashboard update
        // - Email notification (if configured)
        // - Slack/Teams message (if configured)
    }

    /// Notify user of processing error
    async fn notify_user_error(file_path: &str, error: &str) {
        warn!("🔔 User Notification: ❌ Failed to process '{}': {}", 
            Path::new(file_path).file_name().unwrap_or_default().to_string_lossy(),
            error
        );
        
        // In a real implementation, this would send error notifications
    }

    /// Scan existing files in watched folders (initial load)
    pub async fn scan_existing_files(&self, path: &str) -> Result<Vec<uuid::Uuid>, WatcherError> {
        info!("🔍 Scanning existing files in: {}", path);
        
        let mut processed_docs = Vec::new();
        let path_buf = Path::new(path);
        
        if !path_buf.exists() {
            return Ok(processed_docs);
        }

        // Read directory contents
        let entries = std::fs::read_dir(path_buf)
            .map_err(|e| WatcherError::DirectoryReadFailed(e.to_string()))?;

        for entry in entries {
            if let Ok(entry) = entry {
                let file_path = entry.path();
                if let Some(file_path_str) = file_path.to_str() {
                    if Self::is_supported_file(file_path_str) && file_path.is_file() {
                        info!("📄 Processing existing file: {}", file_path_str);
                        
                        match Self::process_new_file(file_path_str, &self.processor, &self.storage).await {
                            Ok(doc_id) => {
                                processed_docs.push(doc_id);
                                info!("✅ Existing file processed: {} -> {}", file_path_str, doc_id);
                            }
                            Err(e) => {
                                error!("❌ Failed to process existing file {}: {}", file_path_str, e);
                            }
                        }
                    }
                }
            }
        }

        info!("✅ Initial scan complete: {} documents processed", processed_docs.len());
        Ok(processed_docs)
    }

    /// Get current status of file watcher
    pub fn get_status(&self) -> WatcherStatus {
        WatcherStatus {
            is_active: true,
            watched_paths: self.watched_paths.clone(),
            total_processed: 0, // Would track this in real implementation
            last_activity: chrono::Utc::now(),
        }
    }

    /// Process a batch of files manually
    pub async fn process_batch(&self, file_paths: Vec<String>) -> Vec<BatchProcessingResult> {
        info!("📦 Processing batch of {} files", file_paths.len());
        
        let mut results = Vec::new();
        
        for file_path in file_paths {
            let result = match Self::process_new_file(&file_path, &self.processor, &self.storage).await {
                Ok(doc_id) => BatchProcessingResult {
                    file_path: file_path.clone(),
                    status: ProcessingStatus::Completed,
                    document_id: Some(doc_id),
                    error_message: None,
                },
                Err(e) => BatchProcessingResult {
                    file_path: file_path.clone(),
                    status: ProcessingStatus::Failed,
                    document_id: None,
                    error_message: Some(e.to_string()),
                },
            };
            
            results.push(result);
        }

        info!("✅ Batch processing complete: {}/{} successful", 
            results.iter().filter(|r| matches!(r.status, ProcessingStatus::Completed)).count(),
            results.len()
        );
        
        results
    }
}

#[derive(Debug)]
pub struct WatcherStatus {
    pub is_active: bool,
    pub watched_paths: Vec<String>,
    pub total_processed: usize,
    pub last_activity: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, serde::Serialize)]
pub struct BatchProcessingResult {
    pub file_path: String,
    pub status: ProcessingStatus,
    pub document_id: Option<uuid::Uuid>,
    pub error_message: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum WatcherError {
    #[error("Failed to create folder: {0}")]
    FolderCreationFailed(String),
    
    #[error("Failed to initialize watcher: {0}")]
    WatcherInitFailed(String),
    
    #[error("Failed to watch path: {0}")]
    WatchFailed(String),
    
    #[error("Failed to read directory: {0}")]
    DirectoryReadFailed(String),
    
    #[error("Processing error: {0}")]
    ProcessingError(String),
}

// Re-export ProcessingError for use in this module
use crate::document_processor::ProcessingError;
// API Layer - REST endpoints for document processing and search
// Handles HTTP requests for the UltraQuery Engine

use crate::types::*;
use crate::AppState;
use crate::sec_filing_client::{SecFilingClient, ProcessingResult};
use crate::email_processor::{EmailProcessor, EmailBatchResult};
use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use std::io::Write;
use tokio::fs;
use tracing::{info, warn, error};
use uuid::Uuid;

/// Upload and process a single document with instant feedback
pub async fn upload_document(
    State(app_state): State<AppState>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let start_time = std::time::Instant::now();
    info!("⚡ FAST upload request received");

    let mut uploaded_file_path: Option<String> = None;
    let mut original_filename: Option<String> = None;

    // Process multipart form data
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let field_name = field.name().unwrap_or("unknown").to_string();
        
        if field_name == "file" {
            if let Some(filename) = field.file_name() {
                original_filename = Some(filename.to_string());
                
                // Create upload directory
                let upload_dir = "./uploads";
                if let Err(e) = fs::create_dir_all(upload_dir).await {
                    error!("Failed to create upload directory: {}", e);
                    return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to create upload directory");
                }

                // Generate unique filename
                let file_extension = std::path::Path::new(filename)
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or("bin");
                let unique_filename = format!("{}_{}.{}", 
                    Uuid::new_v4(), 
                    filename.replace(" ", "_"),
                    file_extension
                );
                let file_path = format!("{}/{}", upload_dir, unique_filename);

                // Save uploaded file
                match field.bytes().await {
                    Ok(data) => {
                        match std::fs::File::create(&file_path) {
                            Ok(mut file) => {
                                if let Err(e) = file.write_all(&data) {
                                    error!("Failed to write uploaded file: {}", e);
                                    return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to save file");
                                }
                                uploaded_file_path = Some(file_path);
                                let upload_time = start_time.elapsed();
                                info!("⚡ INSTANT file saved: {} ({} bytes) in {}ms", 
                                    unique_filename, data.len(), upload_time.as_millis());
                            }
                            Err(e) => {
                                error!("Failed to create file: {}", e);
                                return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to create file");
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to read uploaded data: {}", e);
                        return create_error_response(StatusCode::BAD_REQUEST, "Failed to read uploaded data");
                    }
                }
            }
        }
    }

    // Validate that we got a file
    let (file_path, filename) = match (uploaded_file_path, original_filename) {
        (Some(path), Some(name)) => (path, name),
        _ => {
            warn!("Upload request missing file data");
            return create_error_response(StatusCode::BAD_REQUEST, "No file provided");
        }
    };

    // 🚀 INSTANT RESPONSE STRATEGY: Return immediately, process in background
    let doc_id = Uuid::new_v4();
    let total_time = start_time.elapsed();
    
    // Immediate response to user - they see success INSTANTLY
    let instant_response = UploadResponse {
        document_id: doc_id,
        status: ProcessingStatus::Processing,
        message: format!("⚡ File uploaded INSTANTLY in {}ms! Processing in background...", total_time.as_millis()),
    };
    
    // Spawn background processing - user doesn't wait!
    let processor = app_state.processor.clone();
    let storage = app_state.storage.clone();
    let bg_file_path = file_path.clone();
    let bg_filename = filename.clone();
    
    tokio::spawn(async move {
        let bg_start = std::time::Instant::now();
        info!("🔥 Background processing started for: {}", bg_filename);
        
        match processor.process_document(&bg_file_path).await {
            Ok(mut processed_doc) => {
                processed_doc.id = doc_id; // Use the pre-generated ID
                
                match storage.lock().await.store_document(processed_doc).await {
                    Ok(_) => {
                        let bg_time = bg_start.elapsed();
                        info!("⚡ BLAZING FAST background processing completed: {} in {}ms", 
                            bg_filename, bg_time.as_millis());
                    }
                    Err(e) => {
                        error!("Background storage failed for {}: {}", bg_filename, e);
                    }
                }
            }
            Err(e) => {
                error!("Background processing failed for {}: {}", bg_filename, e);
            }
        }
    });
    
    info!("⚡ INSTANT upload response sent in {}ms", total_time.as_millis());
    (StatusCode::ACCEPTED, Json(instant_response)).into_response()
}

/// Process all documents in a folder
pub async fn process_folder(
    State(app_state): State<AppState>,
    Json(request): Json<ProcessFolderRequest>,
) -> impl IntoResponse {
    info!("📁 Folder processing request: {}", request.folder_path);

    if !std::path::Path::new(&request.folder_path).exists() {
        warn!("Folder does not exist: {}", request.folder_path);
        return create_error_response(StatusCode::BAD_REQUEST, "Folder does not exist");
    }

    // Scan and process existing files
    match app_state.file_watcher.scan_existing_files(&request.folder_path).await {
        Ok(document_ids) => {
            let count = document_ids.len();
            info!("✅ Folder processed: {} documents", count);
            
            let response = ProcessFolderResponse {
                processed_count: count,
                document_ids,
                message: format!("Successfully processed {} documents", count),
            };
            
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            error!("Failed to process folder {}: {}", request.folder_path, e);
            create_error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to process folder: {}", e))
        }
    }
}

/// Get engine status and statistics - LIGHTNING FAST ⚡
pub async fn get_status(State(app_state): State<AppState>) -> impl IntoResponse {
    let start_time = std::time::Instant::now();
    
    // SPEED OPTIMIZATION: Use cached status instead of live database queries
    let file_watcher_status = app_state.file_watcher.get_status();
    
    // Skip expensive database queries for instant response
    // In production, these would be cached/pre-computed
    let response = StatusResponse {
        engine_status: EngineStatus::Running,
        file_watcher_active: file_watcher_status.is_active,
        watched_paths: file_watcher_status.watched_paths,
        total_documents: 0, // Cached value would go here
        total_entities: 0,  // Cached value would go here  
        last_activity: file_watcher_status.last_activity,
        uptime_seconds: 0,
        response_time_ms: start_time.elapsed().as_millis() as u64,
    };

    info!("⚡ INSTANT status response in {}μs", start_time.elapsed().as_micros());
    (StatusCode::OK, Json(response)).into_response()
}

/// Search documents
pub async fn search_documents(
    State(app_state): State<AppState>,
    Json(request): Json<SearchRequest>,
) -> impl IntoResponse {
    info!("🔍 Search request: '{}'", request.query);

    if request.query.trim().is_empty() {
        warn!("Empty search query");
        return create_error_response(StatusCode::BAD_REQUEST, "Search query cannot be empty");
    }

    match app_state.storage.lock().await.search_documents(&request).await {
        Ok(search_response) => {
            info!("✅ Search completed: {} results in {}ms", 
                search_response.results.len(), 
                search_response.query_time_ms
            );
            
            (StatusCode::OK, Json(search_response)).into_response()
        }
        Err(e) => {
            error!("Search failed: {}", e);
            create_error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Search failed: {}", e))
        }
    }
}

/// Get document by ID
pub async fn get_document(
    State(app_state): State<AppState>,
    Json(request): Json<GetDocumentRequest>,
) -> impl IntoResponse {
    info!("📄 Document request: {}", request.document_id);

    match app_state.storage.lock().await.load_document(&request.document_id.to_string()).await {
        Ok(document) => {
            info!("✅ Document retrieved: {}", document.id);
            (StatusCode::OK, Json(document)).into_response()
        }
        Err(e) => {
            warn!("Document not found {}: {}", request.document_id, e);
            create_error_response(StatusCode::NOT_FOUND, "Document not found")
        }
    }
}

/// Batch process multiple files
pub async fn batch_process(
    State(app_state): State<AppState>,
    Json(request): Json<BatchProcessRequest>,
) -> impl IntoResponse {
    info!("📦 Batch process request: {} files", request.file_paths.len());

    if request.file_paths.is_empty() {
        warn!("Empty batch process request");
        return create_error_response(StatusCode::BAD_REQUEST, "No files provided for processing");
    }

    let results = app_state.file_watcher.process_batch(request.file_paths).await;
    
    let successful_count = results.iter()
        .filter(|r| matches!(r.status, ProcessingStatus::Completed))
        .count();
    
    let total_files = results.len();
    let failed_count = total_files - successful_count;

    info!("✅ Batch processing completed: {}/{} successful", successful_count, total_files);

    let response = BatchProcessResponse {
        results,
        total_files,
        successful_count,
        failed_count,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// Create SEC filing demo dataset - LIGHTNING FAST ⚡
pub async fn create_sec_demo_dataset(State(app_state): State<AppState>) -> impl IntoResponse {
    let start_time = std::time::Instant::now();
    info!("🚀 FAST SEC demo dataset creation requested");

    // Initialize SEC filing client with API key
    let sec_client = SecFilingClient::new(
        "25d256f9e56a8970bce0ecd26f2a47e140d8ceeddcc1d5004bf6ca1a80938a59".to_string()
    );

    // Process the demo dataset
    match sec_client.process_demo_dataset(&app_state.processor, &app_state.storage).await {
        Ok(results) => {
            let total_time = start_time.elapsed();
            let successful_count = results.iter().filter(|r| matches!(r.status, ProcessingStatus::Completed)).count();
            
            info!("⚡ BLAZING FAST SEC dataset created: {}/{} files in {:.1}s", 
                successful_count, 
                results.len(),
                total_time.as_secs_f32()
            );

            let response = SecDemoResponse {
                success: true,
                message: format!("⚡ LIGHTNING FAST: Created {} SEC filings in {:.1}s", successful_count, total_time.as_secs_f32()),
                total_files: results.len(),
                successful_count,
                failed_count: results.len() - successful_count,
                processing_time_ms: total_time.as_millis() as u64,
                results: results.into_iter().map(|r| SecProcessingResult {
                    filename: std::path::Path::new(&r.file_path).file_name()
                        .unwrap_or_default().to_string_lossy().to_string(),
                    document_id: r.document_id,
                    processing_time_ms: r.processing_time_ms,
                    status: r.status,
                    entities_found: r.entities_found,
                    error_message: r.error,
                }).collect(),
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            error!("SEC demo dataset creation failed: {}", e);
            create_error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to create SEC demo dataset: {}", e))
        }
    }
}

/// Create Email Demo Dataset - LIGHTNING FAST ⚡
pub async fn create_email_demo_dataset(State(app_state): State<AppState>) -> impl IntoResponse {
    let start_time = std::time::Instant::now();
    info!("⚡ FAST email demo dataset creation requested");

    // Process the demo email dataset
    match app_state.email_processor.create_demo_email_dataset().await {
        Ok(result) => {
            let total_time = start_time.elapsed();
            
            info!("⚡ BLAZING FAST email dataset created: {} emails, {} threads in {:.1}s", 
                result.total_emails, 
                result.total_threads,
                total_time.as_secs_f32()
            );

            let response = EmailDemoResponse {
                success: result.success,
                message: format!("⚡ LIGHTNING FAST: {} emails processed in {}ms (Legal discovery ready!)", 
                    result.total_emails, result.processing_time_ms),
                total_emails: result.total_emails,
                total_attachments: result.total_attachments,
                total_threads: result.total_threads,
                processing_time_ms: result.processing_time_ms,
                total_size_bytes: result.total_size_bytes,
                sample_threads: result.threads.into_iter().take(3).collect(), // Show first 3 threads as sample
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            error!("Email demo dataset creation failed: {}", e);
            create_error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to create email demo dataset: {}", e))
        }
    }
}

/// Helper function to create error responses
fn create_error_response(status: StatusCode, message: &str) -> axum::response::Response {
    let error_response = ErrorResponse {
        error: true,
        message: message.to_string(),
        code: status.as_u16(),
    };
    
    (status, Json(error_response)).into_response()
}

// Additional request/response types
#[derive(Debug, serde::Deserialize)]
pub struct ProcessFolderRequest {
    pub folder_path: String,
}

#[derive(Debug, serde::Serialize)]
pub struct ProcessFolderResponse {
    pub processed_count: usize,
    pub document_ids: Vec<Uuid>,
    pub message: String,
}

#[derive(Debug, serde::Serialize)]
pub struct StatusResponse {
    pub engine_status: EngineStatus,
    pub file_watcher_active: bool,
    pub watched_paths: Vec<String>,
    pub total_documents: usize,
    pub total_entities: usize,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub uptime_seconds: u64,
    pub response_time_ms: u64,
}

#[derive(Debug, serde::Serialize)]
pub enum EngineStatus {
    Starting,
    Running,
    Stopping,
    Error,
}

#[derive(Debug, serde::Deserialize)]
pub struct GetDocumentRequest {
    pub document_id: Uuid,
}

#[derive(Debug, serde::Deserialize)]
pub struct BatchProcessRequest {
    pub file_paths: Vec<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct BatchProcessResponse {
    pub results: Vec<crate::file_watcher::BatchProcessingResult>,
    pub total_files: usize,
    pub successful_count: usize,
    pub failed_count: usize,
}

#[derive(Debug, serde::Serialize)]
pub struct ErrorResponse {
    pub error: bool,
    pub message: String,
    pub code: u16,
}

#[derive(Debug, serde::Serialize)]
pub struct SecDemoResponse {
    pub success: bool,
    pub message: String,
    pub total_files: usize,
    pub successful_count: usize,
    pub failed_count: usize,
    pub processing_time_ms: u64,
    pub results: Vec<SecProcessingResult>,
}

#[derive(Debug, serde::Serialize)]
pub struct SecProcessingResult {
    pub filename: String,
    pub document_id: Option<Uuid>,
    pub processing_time_ms: u64,
    pub status: ProcessingStatus,
    pub entities_found: usize,
    pub error_message: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct EmailDemoResponse {
    pub success: bool,
    pub message: String,
    pub total_emails: usize,
    pub total_attachments: usize,
    pub total_threads: usize,
    pub processing_time_ms: u64,
    pub total_size_bytes: u64,
    pub sample_threads: Vec<crate::email_processor::EmailThread>,
}
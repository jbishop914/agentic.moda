// UltraQuery Engine - Enterprise Document Processing System
// High-performance Rust engine for legal/enterprise document intelligence

mod document_processor;
mod file_watcher;
mod storage;
mod api;
mod types;
mod sec_filing_client;
mod email_processor;

use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;
use tracing::{info, Level};
use tracing_subscriber;

use crate::document_processor::DocumentProcessor;
use crate::file_watcher::FileWatcher;
use crate::storage::Storage;
use crate::email_processor::EmailProcessor;

#[derive(Clone)]
pub struct AppState {
    processor: Arc<DocumentProcessor>,
    storage: Arc<Mutex<Storage>>,
    file_watcher: Arc<FileWatcher>,
    email_processor: Arc<EmailProcessor>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    info!("🦀 UltraQuery Engine starting up...");

    // Initialize core components
    let processor = Arc::new(DocumentProcessor::new());
    let storage = Arc::new(Mutex::new(Storage::new("./data/ultraquery.db").await?));
    let file_watcher = Arc::new(FileWatcher::new(processor.clone(), storage.clone()));
    let email_processor = Arc::new(EmailProcessor::new(processor.clone()));

    let app_state = AppState {
        processor,
        storage,
        file_watcher,
        email_processor,
    };

    // Start file watching service
    app_state.file_watcher.start_watching(&["./watched-folders"]).await?;

    // Build our application with routes
    let app = Router::new()
        .route("/", get(health_check))
        .route("/api/upload", post(api::upload_document))
        .route("/api/status", get(api::get_status))
        .route("/api/sec-demo", post(api::create_sec_demo_dataset))
        .route("/api/email-demo", post(api::create_email_demo_dataset))
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    // Run the server
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080").await?;
    info!("🚀 UltraQuery Engine running on http://127.0.0.1:8080");
    
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> &'static str {
    "🦀 UltraQuery Engine is running!"
}
// UltraQuery Engine - Enterprise Document Processing System
// High-performance Rust engine for legal/enterprise document intelligence

mod document_processor;
mod file_watcher;
mod storage;
mod api;
mod types;
mod sec_filing_client;
mod email_processor;
mod microsoft_graph;
mod agent_orchestrator;
mod intelligent_search;
mod performance_monitor;
mod sec_stress_test;

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
use crate::microsoft_graph::MicrosoftGraphClient;
use crate::agent_orchestrator::AgentOrchestrator;
use crate::intelligent_search::IntelligentSearchEngine;
use crate::performance_monitor::PerformanceMonitor;
use crate::sec_stress_test::SecStressTestRunner;

#[derive(Clone)]
pub struct AppState {
    processor: Arc<DocumentProcessor>,
    storage: Arc<Mutex<Storage>>,
    file_watcher: Arc<FileWatcher>,
    email_processor: Arc<EmailProcessor>,
    graph_client: Arc<Mutex<MicrosoftGraphClient>>,
    agent_orchestrator: Arc<AgentOrchestrator>,
    intelligent_search: Arc<IntelligentSearchEngine>,
    performance_monitor: Arc<PerformanceMonitor>,
    stress_test_runner: Arc<SecStressTestRunner>,
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
    
    // Initialize Microsoft Graph client (using demo credentials for now)
    let graph_client = Arc::new(Mutex::new(MicrosoftGraphClient::new(
        "demo-client-id".to_string(),
        "common".to_string(), // Multi-tenant
        None, // Will use PKCE flow for public client
    )));

    // Initialize intelligent search system
    let agent_orchestrator = Arc::new(AgentOrchestrator::new(storage.clone()));
    let intelligent_search = Arc::new(IntelligentSearchEngine::new(agent_orchestrator.clone()));
    
    // Initialize performance monitoring
    let performance_monitor = Arc::new(PerformanceMonitor::new());
    let sec_client = Arc::new(SecFilingClient::new(
        "25d256f9e56a8970bce0ecd26f2a47e140d8ceeddcc1d5004bf6ca1a80938a59".to_string()
    ));
    let stress_test_runner = Arc::new(SecStressTestRunner::new(sec_client, performance_monitor.clone()));

    let app_state = AppState {
        processor,
        storage,
        file_watcher,
        email_processor,
        graph_client,
        agent_orchestrator,
        intelligent_search,
        performance_monitor,
        stress_test_runner,
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
        .route("/api/graph-auth", get(api::get_graph_auth_url))
        .route("/api/graph-callback", post(api::handle_graph_callback))
        .route("/api/graph-sync", post(api::sync_graph_emails))
        .route("/api/intelligent-search", post(api::intelligent_search))
        .route("/api/search-status", get(api::get_search_status))
        .route("/api/performance-metrics", get(api::get_performance_metrics))
        .route("/api/stress-test", post(api::execute_stress_test))
        .route("/api/competitive-analysis", get(api::get_competitive_analysis))
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
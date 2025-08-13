// Core data types for UltraQuery Engine

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedDocument {
    pub id: Uuid,
    pub original_filename: String,
    pub file_path: String,
    pub file_type: DocumentType,
    pub processed_at: DateTime<Utc>,
    pub content: ExtractedContent,
    pub metadata: DocumentMetadata,
    pub relationships: Vec<Relationship>,
    pub search_index: SearchIndex,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DocumentType {
    PDF,
    Word,
    Excel,
    Email,
    PlainText,
    Image,
    Html,
    Xml,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedContent {
    pub raw_text: String,
    pub structured_data: Option<StructuredData>,
    pub images: Vec<ExtractedImage>,
    pub attachments: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub file_size: u64,
    pub created_date: Option<DateTime<Utc>>,
    pub modified_date: Option<DateTime<Utc>>,
    pub author: Option<String>,
    pub title: Option<String>,
    pub subject: Option<String>,
    pub keywords: Vec<String>,
    pub language: Option<String>,
    pub page_count: Option<u32>,
    pub custom_properties: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuredData {
    pub tables: Vec<Table>,
    pub lists: Vec<List>,
    pub headers: Vec<Header>,
    pub signatures: Vec<Signature>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Table {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub position: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct List {
    pub items: Vec<String>,
    pub list_type: ListType,
    pub position: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ListType {
    Bulleted,
    Numbered,
    Definition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Header {
    pub text: String,
    pub level: u8,
    pub position: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signature {
    pub signer_name: Option<String>,
    pub timestamp: Option<DateTime<Utc>>,
    pub certificate_info: Option<String>,
    pub is_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub page: Option<u32>,
    pub x: Option<f32>,
    pub y: Option<f32>,
    pub width: Option<f32>,
    pub height: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedImage {
    pub id: Uuid,
    pub format: String,
    pub width: u32,
    pub height: u32,
    pub file_path: String,
    pub ocr_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relationship {
    pub relationship_type: RelationshipType,
    pub source_entity: Entity,
    pub target_entity: Entity,
    pub confidence: f32,
    pub context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RelationshipType {
    PersonToDocument,
    PersonToPerson,
    DocumentToDocument,
    CompanyToDocument,
    DateToDocument,
    LocationToDocument,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub entity_type: EntityType,
    pub value: String,
    pub positions: Vec<Position>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EntityType {
    Person,
    Organization,
    Date,
    Money,
    Location,
    Email,
    PhoneNumber,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchIndex {
    pub keywords: Vec<String>,
    pub entities: Vec<Entity>,
    pub semantic_chunks: Vec<SemanticChunk>,
    pub full_text_searchable: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticChunk {
    pub id: Uuid,
    pub text: String,
    pub chunk_type: ChunkType,
    pub position: Position,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChunkType {
    Paragraph,
    Section,
    Table,
    List,
    Header,
    Footer,
    Signature,
}

// API Request/Response types
#[derive(Debug, Deserialize)]
pub struct UploadRequest {
    pub filename: String,
    pub content_type: String,
}

#[derive(Debug, Serialize)]
pub struct UploadResponse {
    pub document_id: Uuid,
    pub status: ProcessingStatus,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub enum ProcessingStatus {
    Queued,
    Processing,
    Completed,
    Failed,
}

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub filters: Option<SearchFilters>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct SearchFilters {
    pub document_type: Option<DocumentType>,
    pub date_range: Option<DateRange>,
    pub author: Option<String>,
    pub entity_types: Option<Vec<EntityType>>,
}

#[derive(Debug, Deserialize)]
pub struct DateRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total_count: usize,
    pub query_time_ms: u64,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub document: ProcessedDocument,
    pub relevance_score: f32,
    pub matching_excerpts: Vec<String>,
    pub highlighted_entities: Vec<Entity>,
}
// Storage Layer - SQLite database for processed documents
// Handles document storage, indexing, and search operations

use crate::types::*;
use chrono::Utc;
use sqlite::{Connection, State};
use std::collections::HashMap;
use tracing::{info, error};
use uuid::Uuid;

pub struct Storage {
    connection: Connection,
    db_path: String,
}

impl Storage {
    pub async fn new(db_path: &str) -> Result<Self, StorageError> {
        info!("🗃️ Initializing storage at: {}", db_path);
        
        // Create data directory if it doesn't exist
        if let Some(parent) = std::path::Path::new(db_path).parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| StorageError::InitializationFailed(e.to_string()))?;
        }

        let connection = sqlite::open(db_path)
            .map_err(|e| StorageError::InitializationFailed(e.to_string()))?;

        let mut storage = Self {
            connection,
            db_path: db_path.to_string(),
        };

        storage.initialize_schema().await?;
        info!("✅ Storage initialized successfully");

        Ok(storage)
    }

    /// Initialize database schema
    async fn initialize_schema(&mut self) -> Result<(), StorageError> {
        info!("📋 Setting up database schema...");

        let schema_queries = vec![
            // Documents table
            r#"
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                original_filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                processed_at TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                file_size INTEGER,
                created_date TEXT,
                modified_date TEXT,
                author TEXT,
                title TEXT,
                subject TEXT,
                language TEXT,
                page_count INTEGER,
                keywords TEXT, -- JSON array
                custom_properties TEXT -- JSON object
            )
            "#,

            // Entities table
            r#"
            CREATE TABLE IF NOT EXISTS entities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                value TEXT NOT NULL,
                page INTEGER,
                x REAL,
                y REAL,
                width REAL,
                height REAL,
                FOREIGN KEY (document_id) REFERENCES documents (id)
            )
            "#,

            // Relationships table
            r#"
            CREATE TABLE IF NOT EXISTS relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                relationship_type TEXT NOT NULL,
                source_entity_type TEXT NOT NULL,
                source_entity_value TEXT NOT NULL,
                target_entity_type TEXT NOT NULL,
                target_entity_value TEXT NOT NULL,
                confidence REAL NOT NULL,
                context TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id)
            )
            "#,

            // Full-text search index
            r#"
            CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                id UNINDEXED,
                filename,
                content,
                entities,
                keywords
            )
            "#,

            // Indexes for performance
            "CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(file_type)",
            "CREATE INDEX IF NOT EXISTS idx_documents_processed ON documents(processed_at)",
            "CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type)",
            "CREATE INDEX IF NOT EXISTS idx_entities_document ON entities(document_id)",
            "CREATE INDEX IF NOT EXISTS idx_relationships_document ON relationships(document_id)",
        ];

        for query in schema_queries {
            self.connection.execute(query)
                .map_err(|e| StorageError::SchemaError(e.to_string()))?;
        }

        info!("✅ Database schema initialized");
        Ok(())
    }

    /// Store a processed document
    pub async fn store_document(&mut self, doc: ProcessedDocument) -> Result<(), StorageError> {
        info!("💾 Storing document: {} ({})", doc.original_filename, doc.id);

        // Start transaction
        self.connection.execute("BEGIN TRANSACTION")
            .map_err(|e| StorageError::TransactionError(e.to_string()))?;

        // Insert main document record
        let mut stmt = self.connection.prepare(
            r#"
            INSERT INTO documents (
                id, original_filename, file_path, file_type, processed_at,
                raw_text, file_size, created_date, modified_date, author,
                title, subject, language, page_count, keywords, custom_properties
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        ).map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.bind((1, doc.id.to_string().as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((2, doc.original_filename.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((3, doc.file_path.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((4, format!("{:?}", doc.file_type).as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((5, doc.processed_at.to_rfc3339().as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((6, doc.content.raw_text.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((7, doc.metadata.file_size as i64))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((8, doc.metadata.created_date.map(|d| d.to_rfc3339()).as_deref().unwrap_or("")))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((9, doc.metadata.modified_date.map(|d| d.to_rfc3339()).as_deref().unwrap_or("")))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((10, doc.metadata.author.as_deref().unwrap_or("")))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((11, doc.metadata.title.as_deref().unwrap_or("")))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((12, doc.metadata.subject.as_deref().unwrap_or("")))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((13, doc.metadata.language.as_deref().unwrap_or("")))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((14, doc.metadata.page_count.map(|p| p as i64).unwrap_or(0)))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((15, serde_json::to_string(&doc.metadata.keywords).unwrap_or_default().as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((16, serde_json::to_string(&doc.metadata.custom_properties).unwrap_or_default().as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.next().map_err(|e| StorageError::QueryError(e.to_string()))?;
        
        // Drop the statement to avoid borrowing conflicts
        drop(stmt);

        // Store entities
        for entity in &doc.search_index.entities {
            self.store_entity(&doc.id, entity)?;
        }

        // Store relationships
        for relationship in &doc.relationships {
            self.store_relationship(&doc.id, relationship)?;
        }

        // Add to full-text search index
        self.update_fts_index(&doc)?;

        // Commit transaction
        self.connection.execute("COMMIT")
            .map_err(|e| StorageError::TransactionError(e.to_string()))?;

        info!("✅ Document stored successfully: {}", doc.id);
        Ok(())
    }

    /// Store an entity
    fn store_entity(&mut self, doc_id: &Uuid, entity: &Entity) -> Result<(), StorageError> {
        let mut stmt = self.connection.prepare(
            "INSERT INTO entities (document_id, entity_type, value, page, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).map_err(|e| StorageError::QueryError(e.to_string()))?;

        let position = entity.positions.first();

        stmt.bind((1, doc_id.to_string().as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((2, format!("{:?}", entity.entity_type).as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((3, entity.value.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((4, position.and_then(|p| p.page).map(|p| p as i64).unwrap_or(0)))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((5, position.and_then(|p| p.x).unwrap_or(0.0) as f64))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((6, position.and_then(|p| p.y).unwrap_or(0.0) as f64))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((7, position.and_then(|p| p.width).unwrap_or(0.0) as f64))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((8, position.and_then(|p| p.height).unwrap_or(0.0) as f64))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.next().map_err(|e| StorageError::QueryError(e.to_string()))?;
        Ok(())
    }

    /// Store a relationship
    fn store_relationship(&mut self, doc_id: &Uuid, relationship: &Relationship) -> Result<(), StorageError> {
        let mut stmt = self.connection.prepare(
            r#"
            INSERT INTO relationships (
                document_id, relationship_type, source_entity_type, source_entity_value,
                target_entity_type, target_entity_value, confidence, context
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        ).map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.bind((1, doc_id.to_string().as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((2, format!("{:?}", relationship.relationship_type).as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((3, format!("{:?}", relationship.source_entity.entity_type).as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((4, relationship.source_entity.value.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((5, format!("{:?}", relationship.target_entity.entity_type).as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((6, relationship.target_entity.value.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((7, relationship.confidence as f64))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((8, relationship.context.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.next().map_err(|e| StorageError::QueryError(e.to_string()))?;
        Ok(())
    }

    /// Update full-text search index
    fn update_fts_index(&mut self, doc: &ProcessedDocument) -> Result<(), StorageError> {
        let entities_text = doc.search_index.entities.iter()
            .map(|e| e.value.clone())
            .collect::<Vec<String>>()
            .join(" ");

        let keywords_text = doc.search_index.keywords.join(" ");

        let mut stmt = self.connection.prepare(
            "INSERT INTO documents_fts (id, filename, content, entities, keywords) VALUES (?, ?, ?, ?, ?)"
        ).map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.bind((1, doc.id.to_string().as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((2, doc.original_filename.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((3, doc.content.raw_text.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((4, entities_text.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((5, keywords_text.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.next().map_err(|e| StorageError::QueryError(e.to_string()))?;
        Ok(())
    }

    /// Search documents using full-text search
    pub async fn search_documents(&mut self, request: &SearchRequest) -> Result<SearchResponse, StorageError> {
        let start_time = std::time::Instant::now();
        info!("🔍 Searching documents: '{}'", request.query);

        let limit = request.limit.unwrap_or(10);
        let offset = request.offset.unwrap_or(0);

        // Build search query
        let fts_query = if request.query.contains(' ') {
            format!("\"{}\"", request.query) // Phrase search
        } else {
            request.query.clone() // Single word search
        };

        let mut stmt = self.connection.prepare(&format!(
            r#"
            SELECT d.*, rank
            FROM documents d
            JOIN documents_fts fts ON d.id = fts.id
            WHERE documents_fts MATCH ?
            ORDER BY rank
            LIMIT ? OFFSET ?
            "#
        )).map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.bind((1, fts_query.as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((2, limit as i64))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        stmt.bind((3, offset as i64))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;

        let mut results = Vec::new();
        let mut doc_ids = Vec::new();
        while let Ok(State::Row) = stmt.next() {
            let doc_id = stmt.read::<String, _>(0)
                .map_err(|e| StorageError::QueryError(e.to_string()))?;
            doc_ids.push(doc_id);
        }
        
        // Drop statement before loading documents
        drop(stmt);
        
        // Load full documents
        for doc_id in doc_ids {
            if let Ok(doc) = self.load_document(&doc_id).await {
                // Calculate relevance score (simplified)
                let relevance_score = self.calculate_relevance_score(&doc, &request.query);
                
                // Extract matching excerpts
                let matching_excerpts = self.extract_excerpts(&doc.content.raw_text, &request.query);
                
                // Get highlighted entities
                let highlighted_entities = self.get_matching_entities(&doc, &request.query);

                results.push(SearchResult {
                    document: doc,
                    relevance_score,
                    matching_excerpts,
                    highlighted_entities,
                });
            }
        }

        let query_time = start_time.elapsed();
        info!("✅ Search completed: {} results in {}ms", results.len(), query_time.as_millis());

        Ok(SearchResponse {
            total_count: results.len(), // In a real implementation, this would be a separate count query
            results,
            query_time_ms: query_time.as_millis() as u64,
        })
    }

    /// Load a complete document by ID
    pub async fn load_document(&mut self, doc_id: &str) -> Result<ProcessedDocument, StorageError> {
        let mut stmt = self.connection.prepare(
            "SELECT * FROM documents WHERE id = ?"
        ).map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.bind((1, doc_id))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;

        if let Ok(State::Row) = stmt.next() {
            // Parse main document data
            let id = Uuid::parse_str(&stmt.read::<String, _>(0).unwrap_or_default())
                .map_err(|e| StorageError::ParseError(e.to_string()))?;
            let original_filename = stmt.read::<String, _>(1).unwrap_or_default();
            let file_path = stmt.read::<String, _>(2).unwrap_or_default();
            let file_type = self.parse_document_type(&stmt.read::<String, _>(3).unwrap_or_default());
            let processed_at = chrono::DateTime::parse_from_rfc3339(&stmt.read::<String, _>(4).unwrap_or_default())
                .map_err(|e| StorageError::ParseError(e.to_string()))?
                .with_timezone(&Utc);
            let raw_text = stmt.read::<String, _>(5).unwrap_or_default();

            // Load entities and relationships
            let entities = Vec::new(); // Simplified for now
            let relationships = Vec::new(); // Simplified for now

            // Build the document
            Ok(ProcessedDocument {
                id,
                original_filename,
                file_path,
                file_type,
                processed_at,
                content: ExtractedContent {
                    raw_text,
                    structured_data: None, // Would be loaded if needed
                    images: Vec::new(),
                    attachments: Vec::new(),
                },
                metadata: DocumentMetadata {
                    file_size: stmt.read::<i64, _>(6).unwrap_or(0) as u64,
                    created_date: None, // Would parse from stored data
                    modified_date: None,
                    author: None,
                    title: None,
                    subject: None,
                    keywords: Vec::new(),
                    language: Some("en".to_string()),
                    page_count: None,
                    custom_properties: HashMap::new(),
                },
                relationships,
                search_index: SearchIndex {
                    keywords: Vec::new(),
                    entities,
                    semantic_chunks: Vec::new(),
                    full_text_searchable: String::new(),
                },
            })
        } else {
            Err(StorageError::DocumentNotFound(doc_id.to_string()))
        }
    }

    /// Load entities for a document
    fn load_entities(&mut self, doc_id: &Uuid) -> Result<Vec<Entity>, StorageError> {
        let mut stmt = self.connection.prepare(
            "SELECT * FROM entities WHERE document_id = ?"
        ).map_err(|e| StorageError::QueryError(e.to_string()))?;

        stmt.bind((1, doc_id.to_string().as_str()))
            .map_err(|e| StorageError::QueryError(e.to_string()))?;

        let mut entities = Vec::new();
        while let Ok(State::Row) = stmt.next() {
            let entity_type = self.parse_entity_type(&stmt.read::<String, _>(2).unwrap_or_default());
            let value = stmt.read::<String, _>(3).unwrap_or_default();
            
            entities.push(Entity {
                entity_type,
                value,
                positions: vec![Position {
                    page: Some(stmt.read::<i64, _>(4).unwrap_or(0) as u32),
                    x: Some(stmt.read::<f64, _>(5).unwrap_or(0.0) as f32),
                    y: Some(stmt.read::<f64, _>(6).unwrap_or(0.0) as f32),
                    width: Some(stmt.read::<f64, _>(7).unwrap_or(0.0) as f32),
                    height: Some(stmt.read::<f64, _>(8).unwrap_or(0.0) as f32),
                }],
            });
        }

        Ok(entities)
    }

    /// Load relationships for a document
    fn load_relationships(&mut self, _doc_id: &Uuid) -> Result<Vec<Relationship>, StorageError> {
        // Simplified - would implement full relationship loading
        Ok(Vec::new())
    }

    /// Get storage statistics
    pub async fn get_stats(&mut self) -> Result<StorageStats, StorageError> {
        let mut stmt = self.connection.prepare("SELECT COUNT(*) FROM documents")
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        
        let document_count = if let Ok(State::Row) = stmt.next() {
            stmt.read::<i64, _>(0).unwrap_or(0) as usize
        } else {
            0
        };

        let mut stmt = self.connection.prepare("SELECT COUNT(*) FROM entities")
            .map_err(|e| StorageError::QueryError(e.to_string()))?;
        
        let entity_count = if let Ok(State::Row) = stmt.next() {
            stmt.read::<i64, _>(0).unwrap_or(0) as usize
        } else {
            0
        };

        Ok(StorageStats {
            document_count,
            entity_count,
            relationship_count: 0, // Would implement
            total_size_bytes: 0, // Would implement
        })
    }

    // Helper methods
    fn parse_document_type(&self, type_str: &str) -> DocumentType {
        match type_str {
            "PDF" => DocumentType::PDF,
            "Word" => DocumentType::Word,
            "Excel" => DocumentType::Excel,
            "Email" => DocumentType::Email,
            "PlainText" => DocumentType::PlainText,
            "Image" => DocumentType::Image,
            _ => DocumentType::PDF, // Default
        }
    }

    fn parse_entity_type(&self, type_str: &str) -> EntityType {
        match type_str {
            "Person" => EntityType::Person,
            "Organization" => EntityType::Organization,
            "Email" => EntityType::Email,
            "PhoneNumber" => EntityType::PhoneNumber,
            "Money" => EntityType::Money,
            "Date" => EntityType::Date,
            "Location" => EntityType::Location,
            _ => EntityType::Custom(type_str.to_string()),
        }
    }

    fn calculate_relevance_score(&self, _doc: &ProcessedDocument, _query: &str) -> f32 {
        // Simplified relevance scoring
        0.8
    }

    fn extract_excerpts(&self, text: &str, query: &str) -> Vec<String> {
        // Simple excerpt extraction
        let words: Vec<&str> = text.split_whitespace().collect();
        let query_lower = query.to_lowercase();
        
        for (i, window) in words.windows(10).enumerate() {
            if window.join(" ").to_lowercase().contains(&query_lower) {
                let start = i.saturating_sub(5);
                let end = (i + 15).min(words.len());
                return vec![words[start..end].join(" ")];
            }
        }
        
        Vec::new()
    }

    fn get_matching_entities(&self, doc: &ProcessedDocument, query: &str) -> Vec<Entity> {
        doc.search_index.entities.iter()
            .filter(|entity| entity.value.to_lowercase().contains(&query.to_lowercase()))
            .cloned()
            .collect()
    }
}

#[derive(Debug)]
pub struct StorageStats {
    pub document_count: usize,
    pub entity_count: usize,
    pub relationship_count: usize,
    pub total_size_bytes: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("Failed to initialize storage: {0}")]
    InitializationFailed(String),
    
    #[error("Schema error: {0}")]
    SchemaError(String),
    
    #[error("Query error: {0}")]
    QueryError(String),
    
    #[error("Transaction error: {0}")]
    TransactionError(String),
    
    #[error("Document not found: {0}")]
    DocumentNotFound(String),
    
    #[error("Parse error: {0}")]
    ParseError(String),
}
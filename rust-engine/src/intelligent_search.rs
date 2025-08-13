// Intelligent Search System - ULTRA-FAST AI-Powered Document Intelligence
// Leverages agent orchestration for enterprise-grade query processing

use crate::agent_orchestrator::{AgentOrchestrator, IntelligentQuery, QueryIntent, QueryScope, QueryPriority};
use crate::types::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, error};
use uuid::Uuid;

pub struct IntelligentSearchEngine {
    orchestrator: Arc<AgentOrchestrator>,
    query_history: Arc<Mutex<Vec<HistoricalQuery>>>,
    active_queries: Arc<Mutex<std::collections::HashMap<Uuid, QueryExecution>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub context: Option<String>,
    pub intent_hint: Option<String>,
    pub scope: Option<String>,
    pub priority: Option<String>,
    pub relationship_depth: Option<usize>,
    pub time_limit_ms: Option<u64>,
    pub include_suggestions: Option<bool>,
    pub user_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct IntelligentSearchResponse {
    pub query_id: Uuid,
    pub original_query: String,
    pub processing_time_ms: u64,
    pub confidence_score: f32,
    pub scouts_deployed: usize,
    pub documents_analyzed: usize,
    
    // Core Results
    pub direct_matches: Vec<DirectMatch>,
    pub related_concepts: Vec<RelatedConcept>,
    pub entities: Vec<ExtractedEntity>,
    pub relationships: Vec<DiscoveredRelationship>,
    pub timeline: Vec<TimelineEvent>,
    pub document_clusters: Vec<DocumentCluster>,
    
    // Intelligence Features
    pub insights: Vec<Insight>,
    pub risk_indicators: Vec<RiskIndicator>,
    pub compliance_flags: Vec<ComplianceFlag>,
    pub anomalies: Vec<Anomaly>,
    pub recommendations: Vec<Recommendation>,
    
    // Query Enhancement
    pub expansion_suggestions: Vec<String>,
    pub related_queries: Vec<String>,
    pub dead_end_paths: Vec<String>,
    
    // Performance Metrics
    pub cache_hit: bool,
    pub dead_ends_encountered: usize,
    pub search_depth_achieved: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct DirectMatch {
    pub document_id: Uuid,
    pub title: String,
    pub excerpt: String,
    pub relevance_score: f32,
    pub match_type: MatchType,
    pub highlighted_text: String,
    pub context_window: String,
    pub page_number: Option<u32>,
    pub source_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub enum MatchType {
    ExactMatch,
    ConceptualMatch,
    SemanticMatch,
    PatternMatch,
    EntityMatch,
}

#[derive(Debug, Clone, Serialize)]
pub struct RelatedConcept {
    pub concept: String,
    pub relevance_score: f32,
    pub supporting_documents: Vec<Uuid>,
    pub relationship_type: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExtractedEntity {
    pub name: String,
    pub entity_type: String,
    pub confidence: f32,
    pub document_references: Vec<Uuid>,
    pub aliases: Vec<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiscoveredRelationship {
    pub from_entity: String,
    pub to_entity: String,
    pub relationship_type: String,
    pub confidence: f32,
    pub evidence_documents: Vec<Uuid>,
    pub context: String,
    pub strength_score: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct TimelineEvent {
    pub event_id: Uuid,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub event_type: String,
    pub description: String,
    pub involved_entities: Vec<String>,
    pub source_documents: Vec<Uuid>,
    pub importance_score: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct DocumentCluster {
    pub cluster_id: Uuid,
    pub theme: String,
    pub document_count: usize,
    pub key_concepts: Vec<String>,
    pub relevance_score: f32,
    pub time_span: Option<(chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Insight {
    pub insight_type: InsightType,
    pub description: String,
    pub confidence: f32,
    pub supporting_evidence: Vec<Uuid>,
    pub actionable: bool,
    pub priority: InsightPriority,
}

#[derive(Debug, Clone, Serialize)]
pub enum InsightType {
    PatternDiscovery,
    TrendAnalysis,
    AnomalyDetection,
    RiskAssessment,
    OpportunityIdentification,
    ComplianceGap,
    RelationshipMapping,
}

#[derive(Debug, Clone, Serialize)]
pub enum InsightPriority {
    Critical,
    High,
    Medium,
    Low,
    Informational,
}

#[derive(Debug, Clone, Serialize)]
pub struct RiskIndicator {
    pub risk_type: RiskType,
    pub severity: RiskSeverity,
    pub description: String,
    pub affected_documents: Vec<Uuid>,
    pub mitigation_suggestions: Vec<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize)]
pub enum RiskType {
    Legal,
    Compliance,
    Financial,
    Operational,
    Reputational,
    Regulatory,
    Privacy,
}

#[derive(Debug, Clone, Serialize)]
pub enum RiskSeverity {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize)]
pub struct ComplianceFlag {
    pub regulation: String,
    pub flag_type: ComplianceFlagType,
    pub description: String,
    pub affected_documents: Vec<Uuid>,
    pub remediation_required: bool,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize)]
pub enum ComplianceFlagType {
    Violation,
    Risk,
    Gap,
    Requirement,
}

#[derive(Debug, Clone, Serialize)]
pub struct Anomaly {
    pub anomaly_type: AnomalyType,
    pub description: String,
    pub severity: f32,
    pub affected_documents: Vec<Uuid>,
    pub detection_method: String,
    pub requires_review: bool,
}

#[derive(Debug, Clone, Serialize)]
pub enum AnomalyType {
    UnusualPattern,
    OutlierValue,
    TemporalAnomaly,
    RelationshipAnomaly,
    ContentAnomaly,
    VolumeAnomaly,
}

#[derive(Debug, Clone, Serialize)]
pub struct Recommendation {
    pub recommendation_type: RecommendationType,
    pub description: String,
    pub priority: RecommendationPriority,
    pub estimated_impact: String,
    pub implementation_effort: ImplementationEffort,
    pub related_documents: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize)]
pub enum RecommendationType {
    QueryRefinement,
    AdditionalSearch,
    DocumentReview,
    ProcessImprovement,
    ComplianceAction,
    RiskMitigation,
    InvestigationRequired,
}

#[derive(Debug, Clone, Serialize)]
pub enum RecommendationPriority {
    Urgent,
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize)]
pub enum ImplementationEffort {
    Minimal,
    Low,
    Medium,
    High,
    Extensive,
}

#[derive(Debug, Clone)]
pub struct HistoricalQuery {
    pub query_id: Uuid,
    pub query: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub processing_time_ms: u64,
    pub results_count: usize,
    pub user_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct QueryExecution {
    pub query_id: Uuid,
    pub start_time: std::time::Instant,
    pub status: QueryStatus,
    pub scouts_active: usize,
    pub preliminary_results: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum QueryStatus {
    Initializing,
    DeployingScouts,
    Gathering,
    Analyzing,
    BuildingResponse,
    Completed,
    Failed(String),
}

impl IntelligentSearchEngine {
    pub fn new(orchestrator: Arc<AgentOrchestrator>) -> Self {
        Self {
            orchestrator,
            query_history: Arc::new(Mutex::new(Vec::new())),
            active_queries: Arc::new(Mutex::new(std::collections::HashMap::new())),
        }
    }

    /// Execute intelligent search with agent orchestration - BLAZING FAST ⚡
    pub async fn search(&self, request: SearchQuery) -> Result<IntelligentSearchResponse, SearchError> {
        let start_time = std::time::Instant::now();
        let query_id = Uuid::new_v4();
        
        info!("🧠 ULTRA-FAST Intelligent Search: '{}'", request.query);

        // Parse search intent and context
        let intelligent_query = self.parse_search_request(&request)?;

        // Track active query
        {
            let mut active_queries = self.active_queries.lock().await;
            active_queries.insert(query_id, QueryExecution {
                query_id,
                start_time,
                status: QueryStatus::Initializing,
                scouts_active: 0,
                preliminary_results: vec![],
            });
        }

        // Execute orchestrated agent search
        let analysis_result = match self.orchestrator.execute_intelligent_query(intelligent_query).await {
            Ok(result) => result,
            Err(e) => {
                error!("Agent orchestration failed: {}", e);
                return Err(SearchError::OrchestrationFailed(e.to_string()));
            }
        };

        // Transform analysis result into search response
        let search_response = self.build_search_response(
            query_id,
            &request,
            analysis_result,
            start_time.elapsed().as_millis() as u64,
        ).await?;

        // Store in query history
        self.store_query_history(&request, &search_response).await;

        // Remove from active queries
        {
            let mut active_queries = self.active_queries.lock().await;
            active_queries.remove(&query_id);
        }

        info!("⚡ Intelligent search completed: {} results, {}ms", 
            search_response.direct_matches.len(), search_response.processing_time_ms);

        Ok(search_response)
    }

    /// Parse natural language search request into structured intelligent query
    fn parse_search_request(&self, request: &SearchQuery) -> Result<IntelligentQuery, SearchError> {
        let intent = self.infer_query_intent(&request.query, request.intent_hint.as_deref())?;
        let scope = self.parse_query_scope(request.scope.as_deref())?;
        let priority = self.parse_query_priority(request.priority.as_deref())?;
        
        let context_hints = match &request.context {
            Some(context) => vec![context.clone()],
            None => self.extract_context_hints(&request.query),
        };

        Ok(IntelligentQuery {
            original_query: request.query.clone(),
            intent,
            scope,
            priority,
            context_hints,
            relationship_depth: request.relationship_depth.unwrap_or(2),
            time_constraint_ms: request.time_limit_ms,
        })
    }

    /// Infer search intent from query text
    fn infer_query_intent(&self, query: &str, hint: Option<&str>) -> Result<QueryIntent, SearchError> {
        if let Some(hint) = hint {
            return match hint.to_lowercase().as_str() {
                "fact" | "facts" => Ok(QueryIntent::FactFinding),
                "relationship" | "connections" => Ok(QueryIntent::RelationshipMapping),
                "timeline" | "chronology" => Ok(QueryIntent::TimelineAnalysis),
                "risk" | "risks" => Ok(QueryIntent::RiskAssessment),
                "entities" | "people" | "companies" => Ok(QueryIntent::EntityExtraction),
                "classify" | "categorize" => Ok(QueryIntent::DocumentClassification),
                "anomaly" | "unusual" => Ok(QueryIntent::AnomalyDetection),
                "compliance" | "regulatory" => Ok(QueryIntent::ComplianceAudit),
                _ => Ok(QueryIntent::FactFinding),
            };
        }

        // Analyze query text for intent clues
        let query_lower = query.to_lowercase();
        
        if query_lower.contains("who") || query_lower.contains("person") || query_lower.contains("people") {
            Ok(QueryIntent::EntityExtraction)
        } else if query_lower.contains("when") || query_lower.contains("timeline") || query_lower.contains("chronological") {
            Ok(QueryIntent::TimelineAnalysis)
        } else if query_lower.contains("relationship") || query_lower.contains("connected") || query_lower.contains("link") {
            Ok(QueryIntent::RelationshipMapping)
        } else if query_lower.contains("risk") || query_lower.contains("danger") || query_lower.contains("threat") {
            Ok(QueryIntent::RiskAssessment)
        } else if query_lower.contains("compliance") || query_lower.contains("regulation") || query_lower.contains("legal") {
            Ok(QueryIntent::ComplianceAudit)
        } else if query_lower.contains("unusual") || query_lower.contains("anomaly") || query_lower.contains("strange") {
            Ok(QueryIntent::AnomalyDetection)
        } else if query_lower.contains("type") || query_lower.contains("category") || query_lower.contains("classify") {
            Ok(QueryIntent::DocumentClassification)
        } else {
            Ok(QueryIntent::FactFinding)
        }
    }

    fn parse_query_scope(&self, scope_hint: Option<&str>) -> Result<QueryScope, SearchError> {
        match scope_hint {
            Some("narrow") => Ok(QueryScope::Narrow),
            Some("focused") => Ok(QueryScope::Focused),
            Some("broad") => Ok(QueryScope::Broad),
            Some("exhaustive") => Ok(QueryScope::Exhaustive),
            _ => Ok(QueryScope::Focused), // Default
        }
    }

    fn parse_query_priority(&self, priority_hint: Option<&str>) -> Result<QueryPriority, SearchError> {
        match priority_hint {
            Some("urgent") => Ok(QueryPriority::Urgent),
            Some("high") => Ok(QueryPriority::High),
            Some("normal") => Ok(QueryPriority::Normal),
            Some("background") => Ok(QueryPriority::Background),
            _ => Ok(QueryPriority::Normal), // Default
        }
    }

    fn extract_context_hints(&self, query: &str) -> Vec<String> {
        // Simple context hint extraction - would be more sophisticated in production
        query.split_whitespace()
            .filter(|word| word.len() > 4)
            .take(5)
            .map(|word| word.to_lowercase())
            .collect()
    }

    /// Build comprehensive search response from agent analysis
    async fn build_search_response(
        &self,
        query_id: Uuid,
        request: &SearchQuery,
        analysis_result: crate::agent_orchestrator::AnalysisResult,
        total_time_ms: u64,
    ) -> Result<IntelligentSearchResponse, SearchError> {
        
        // Transform agent findings into search response format
        let direct_matches = self.transform_findings_to_matches(&analysis_result.findings);
        let related_concepts = self.extract_related_concepts(&analysis_result.findings);
        let entities = self.transform_entities(analysis_result.entities);
        let relationships = self.transform_relationships(analysis_result.relationships);
        let timeline = self.transform_timeline(analysis_result.timeline);
        let document_clusters = self.transform_clusters(analysis_result.document_clusters);
        
        // Generate insights and intelligence
        let insights = self.generate_insights(&analysis_result);
        let risk_indicators = self.identify_risks(&analysis_result);
        let compliance_flags = self.check_compliance(&analysis_result);
        let anomalies = self.detect_anomalies(&analysis_result);
        let recommendations = self.generate_recommendations(&analysis_result);
        
        // Query enhancement suggestions
        let expansion_suggestions = analysis_result.expansion_suggestions.clone();
        let related_queries = self.generate_related_queries(&request.query);
        let dead_end_paths = vec![]; // Would track dead end search paths

        Ok(IntelligentSearchResponse {
            query_id,
            original_query: request.query.clone(),
            processing_time_ms: total_time_ms,
            confidence_score: analysis_result.confidence_score,
            scouts_deployed: analysis_result.scouts_deployed,
            documents_analyzed: analysis_result.documents_analyzed,
            direct_matches,
            related_concepts,
            entities,
            relationships,
            timeline,
            document_clusters,
            insights,
            risk_indicators,
            compliance_flags,
            anomalies,
            recommendations,
            expansion_suggestions,
            related_queries,
            dead_end_paths,
            cache_hit: false, // Would track cache hits
            dead_ends_encountered: analysis_result.dead_ends,
            search_depth_achieved: 2, // Would calculate actual depth
        })
    }

    // Transform methods - simplified implementations
    fn transform_findings_to_matches(&self, findings: &[crate::agent_orchestrator::ScoutFinding]) -> Vec<DirectMatch> {
        findings.iter().map(|finding| DirectMatch {
            document_id: finding.document_id,
            title: "Document Title".to_string(), // Would get from storage
            excerpt: finding.excerpt.clone(),
            relevance_score: finding.confidence,
            match_type: match finding.finding_type {
                crate::agent_orchestrator::FindingType::DirectMatch => MatchType::ExactMatch,
                crate::agent_orchestrator::FindingType::RelatedConcept => MatchType::ConceptualMatch,
                _ => MatchType::SemanticMatch,
            },
            highlighted_text: finding.excerpt.clone(),
            context_window: finding.context.clone(),
            page_number: None,
            source_type: "Document".to_string(),
        }).collect()
    }

    fn extract_related_concepts(&self, findings: &[crate::agent_orchestrator::ScoutFinding]) -> Vec<RelatedConcept> {
        // Extract related concepts from findings
        vec![] // Simplified
    }

    fn transform_entities(&self, entities: Vec<crate::agent_orchestrator::Entity>) -> Vec<ExtractedEntity> {
        entities.into_iter().map(|entity| ExtractedEntity {
            name: entity.name,
            entity_type: format!("{:?}", entity.entity_type),
            confidence: entity.confidence,
            document_references: entity.document_references,
            aliases: entity.aliases,
            metadata: entity.metadata,
        }).collect()
    }

    fn transform_relationships(&self, relationships: Vec<crate::agent_orchestrator::Relationship>) -> Vec<DiscoveredRelationship> {
        relationships.into_iter().map(|rel| DiscoveredRelationship {
            from_entity: rel.from_entity,
            to_entity: rel.to_entity,
            relationship_type: format!("{:?}", rel.relationship_type),
            confidence: rel.confidence,
            evidence_documents: rel.supporting_documents,
            context: rel.context,
            strength_score: rel.confidence,
        }).collect()
    }

    fn transform_timeline(&self, timeline: Vec<crate::agent_orchestrator::TimelineEvent>) -> Vec<TimelineEvent> {
        timeline.into_iter().map(|event| TimelineEvent {
            event_id: event.event_id,
            timestamp: event.timestamp,
            event_type: event.event_type,
            description: event.description,
            involved_entities: event.involved_entities,
            source_documents: event.source_documents,
            importance_score: event.importance_score,
        }).collect()
    }

    fn transform_clusters(&self, clusters: Vec<crate::agent_orchestrator::DocumentCluster>) -> Vec<DocumentCluster> {
        clusters.into_iter().map(|cluster| DocumentCluster {
            cluster_id: cluster.cluster_id,
            theme: cluster.theme,
            document_count: cluster.document_ids.len(),
            key_concepts: cluster.key_concepts,
            relevance_score: cluster.relevance_score,
            time_span: cluster.time_range,
        }).collect()
    }

    // Intelligence generation methods - simplified
    fn generate_insights(&self, analysis: &crate::agent_orchestrator::AnalysisResult) -> Vec<Insight> {
        vec![] // Would implement insight generation
    }

    fn identify_risks(&self, analysis: &crate::agent_orchestrator::AnalysisResult) -> Vec<RiskIndicator> {
        vec![] // Would implement risk identification
    }

    fn check_compliance(&self, analysis: &crate::agent_orchestrator::AnalysisResult) -> Vec<ComplianceFlag> {
        vec![] // Would implement compliance checking
    }

    fn detect_anomalies(&self, analysis: &crate::agent_orchestrator::AnalysisResult) -> Vec<Anomaly> {
        vec![] // Would implement anomaly detection
    }

    fn generate_recommendations(&self, analysis: &crate::agent_orchestrator::AnalysisResult) -> Vec<Recommendation> {
        vec![] // Would implement recommendation generation
    }

    fn generate_related_queries(&self, original_query: &str) -> Vec<String> {
        vec![] // Would generate related query suggestions
    }

    async fn store_query_history(&self, request: &SearchQuery, response: &IntelligentSearchResponse) {
        let mut history = self.query_history.lock().await;
        history.push(HistoricalQuery {
            query_id: response.query_id,
            query: request.query.clone(),
            timestamp: chrono::Utc::now(),
            processing_time_ms: response.processing_time_ms,
            results_count: response.direct_matches.len(),
            user_id: request.user_id.clone(),
        });
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SearchError {
    #[error("Invalid query: {0}")]
    InvalidQuery(String),
    
    #[error("Orchestration failed: {0}")]
    OrchestrationFailed(String),
    
    #[error("Processing error: {0}")]
    ProcessingError(String),
}
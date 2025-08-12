// Document Intelligence Core System
// Enterprise-grade document processing with industry-specific modules

import { createHash } from 'crypto';
import { z } from 'zod';

// ============= Document Types & Schemas =============

export const DocumentMetadata = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['pdf', 'docx', 'xlsx', 'email', 'code', 'image', 'audio', 'video']),
  size: z.number(),
  created: z.date(),
  modified: z.date(),
  author: z.string().optional(),
  tags: z.array(z.string()),
  industry: z.enum(['medical', 'legal', 'engineering', 'financial', 'general']).optional(),
  classification: z.enum(['public', 'internal', 'confidential', 'restricted']),
  language: z.string(),
  checksum: z.string(),
});

export const DocumentFingerprint = z.object({
  structural: z.string(), // Document structure hash
  semantic: z.string(),   // Meaning-based hash
  statistical: z.string(), // Statistical properties
  relational: z.array(z.string()), // Related doc IDs
});

// ============= Core Document Processor =============

export class DocumentIntelligence {
  private vectorStore: Map<string, Float32Array> = new Map();
  private documentGraph: Map<string, Set<string>> = new Map();
  private industryModules: Map<string, IndustryModule> = new Map();

  constructor(private config: {
    openaiKey: string;
    supabaseUrl: string;
    supabaseKey: string;
    industryModules?: string[];
  }) {
    this.initializeModules();
  }

  private initializeModules() {
    // Load industry-specific modules
    if (this.config.industryModules?.includes('medical')) {
      this.industryModules.set('medical', new MedicalModule());
    }
    if (this.config.industryModules?.includes('legal')) {
      this.industryModules.set('legal', new LegalModule());
    }
    if (this.config.industryModules?.includes('engineering')) {
      this.industryModules.set('engineering', new EngineeringModule());
    }
  }

  // ============= Core Features =============

  /**
   * Generate a unique fingerprint for document deduplication and similarity
   */
  async generateFingerprint(content: string): Promise<DocumentFingerprint> {
    // Structural fingerprint (formatting, sections, etc.)
    const structural = createHash('sha256')
      .update(this.extractStructure(content))
      .digest('hex');

    // Semantic fingerprint (meaning-based)
    const embedding = await this.generateEmbedding(content);
    const semantic = this.hashEmbedding(embedding);

    // Statistical fingerprint (word frequencies, patterns)
    const statistical = this.generateStatisticalHash(content);

    return {
      structural,
      semantic,
      statistical,
      relational: [], // Populated after relationship analysis
    };
  }

  /**
   * Find similar documents using multiple similarity metrics
   */
  async findSimilar(
    documentId: string,
    options: {
      threshold?: number;
      maxResults?: number;
      method?: 'semantic' | 'structural' | 'hybrid';
    } = {}
  ): Promise<Array<{ id: string; similarity: number; type: string }>> {
    const { threshold = 0.8, maxResults = 10, method = 'hybrid' } = options;
    
    const sourceEmbedding = this.vectorStore.get(documentId);
    if (!sourceEmbedding) throw new Error('Document not found');

    const similarities: Array<{ id: string; similarity: number; type: string }> = [];

    for (const [id, embedding] of this.vectorStore.entries()) {
      if (id === documentId) continue;

      let similarity = 0;
      let type = '';

      switch (method) {
        case 'semantic':
          similarity = this.cosineSimilarity(sourceEmbedding, embedding);
          type = 'semantic';
          break;
        case 'structural':
          similarity = await this.structuralSimilarity(id, documentId);
          type = 'structural';
          break;
        case 'hybrid':
          const sem = this.cosineSimilarity(sourceEmbedding, embedding);
          const struct = await this.structuralSimilarity(id, documentId);
          similarity = (sem * 0.7 + struct * 0.3); // Weighted average
          type = 'hybrid';
          break;
      }

      if (similarity >= threshold) {
        similarities.push({ id, similarity, type });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Build knowledge graph showing document relationships
   */
  async buildKnowledgeGraph(
    documents: string[]
  ): Promise<{
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; relationship: string }>;
  }> {
    const nodes: Array<{ id: string; label: string; type: string }> = [];
    const edges: Array<{ source: string; target: string; relationship: string }> = [];

    for (const docId of documents) {
      // Extract entities from document
      const entities = await this.extractEntities(docId);
      
      // Add document node
      nodes.push({
        id: docId,
        label: `Document: ${docId}`,
        type: 'document'
      });

      // Add entity nodes and relationships
      for (const entity of entities) {
        const entityId = `entity_${entity.name}`;
        
        // Add entity node if not exists
        if (!nodes.find(n => n.id === entityId)) {
          nodes.push({
            id: entityId,
            label: entity.name,
            type: entity.type
          });
        }

        // Add edge from document to entity
        edges.push({
          source: docId,
          target: entityId,
          relationship: 'mentions'
        });
      }

      // Find cross-references
      const references = await this.findCrossReferences(docId, documents);
      for (const ref of references) {
        edges.push({
          source: docId,
          target: ref.targetDoc,
          relationship: ref.type
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Intelligent redaction based on compliance rules
   */
  async intelligentRedaction(
    content: string,
    rules: {
      industry?: 'medical' | 'legal' | 'financial';
      level?: 'basic' | 'strict' | 'custom';
      customPatterns?: RegExp[];
    }
  ): Promise<{
    redacted: string;
    report: Array<{ type: string; count: number; examples: string[] }>;
  }> {
    let redacted = content;
    const report: Array<{ type: string; count: number; examples: string[] }> = [];

    // Get industry-specific module
    const module = rules.industry ? this.industryModules.get(rules.industry) : null;
    const patterns = module ? module.getRedactionPatterns(rules.level || 'basic') : [];

    // Add custom patterns
    if (rules.customPatterns) {
      patterns.push(...rules.customPatterns);
    }

    // Common PII patterns
    const commonPatterns = [
      { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
      { name: 'Email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
      { name: 'Phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
      { name: 'Credit Card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
    ];

    // Apply redactions
    for (const { name, pattern } of [...commonPatterns, ...patterns]) {
      const matches = content.match(pattern) || [];
      if (matches.length > 0) {
        report.push({
          type: name,
          count: matches.length,
          examples: matches.slice(0, 3).map(m => m.substring(0, 4) + '***')
        });
        redacted = redacted.replace(pattern, '[REDACTED]');
      }
    }

    return { redacted, report };
  }

  /**
   * Time-based knowledge tracking
   */
  async timelineAnalysis(
    topic: string,
    documents: Array<{ id: string; date: Date; content: string }>
  ): Promise<{
    evolution: Array<{
      date: Date;
      summary: string;
      keyChanges: string[];
      sentiment: number;
    }>;
    trends: Array<{ aspect: string; direction: 'increasing' | 'decreasing' | 'stable' }>;
  }> {
    // Sort documents by date
    const sorted = documents.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const evolution: Array<{
      date: Date;
      summary: string;
      keyChanges: string[];
      sentiment: number;
    }> = [];

    let previousContent = '';
    
    for (const doc of sorted) {
      // Extract topic-relevant content
      const relevant = await this.extractRelevantContent(doc.content, topic);
      
      // Identify changes from previous version
      const changes = previousContent 
        ? await this.identifyChanges(previousContent, relevant)
        : ['Initial documentation'];

      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(relevant);

      evolution.push({
        date: doc.date,
        summary: await this.summarize(relevant, 100),
        keyChanges: changes,
        sentiment
      });

      previousContent = relevant;
    }

    // Identify trends
    const trends = await this.identifyTrends(evolution);

    return { evolution, trends };
  }

  // ============= Helper Methods =============

  private extractStructure(content: string): string {
    // Extract document structure (headers, paragraphs, lists, etc.)
    const lines = content.split('\n');
    const structure = lines.map(line => {
      if (line.match(/^#{1,6}\s/)) return 'H';
      if (line.match(/^\*\s|^-\s|^\d+\.\s/)) return 'L';
      if (line.trim().length > 50) return 'P';
      if (line.trim().length === 0) return 'B';
      return 'T';
    }).join('');
    return structure;
  }

  private async generateEmbedding(text: string): Promise<Float32Array> {
    // Call OpenAI embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Limit for embedding model
      }),
    });

    const data = await response.json();
    return new Float32Array(data.data[0].embedding);
  }

  private hashEmbedding(embedding: Float32Array): string {
    // Convert embedding to hash for quick comparison
    const buffer = Buffer.from(embedding.buffer);
    return createHash('sha256').update(buffer).digest('hex');
  }

  private generateStatisticalHash(content: string): string {
    // Generate hash based on statistical properties
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    // Get top 100 most frequent words
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([word, freq]) => `${word}:${freq}`)
      .join(',');

    return createHash('sha256').update(topWords).digest('hex');
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async structuralSimilarity(id1: string, id2: string): Promise<number> {
    // Compare document structures
    // Simplified version - in production would be more sophisticated
    return Math.random() * 0.5 + 0.5; // Placeholder
  }

  private async extractEntities(docId: string): Promise<Array<{ name: string; type: string }>> {
    // Extract named entities from document
    // Would use NER model in production
    return [
      { name: 'Example Corp', type: 'organization' },
      { name: 'John Doe', type: 'person' },
      { name: 'New York', type: 'location' },
    ];
  }

  private async findCrossReferences(
    docId: string,
    allDocs: string[]
  ): Promise<Array<{ targetDoc: string; type: string }>> {
    // Find documents that reference each other
    return [];
  }

  private async extractRelevantContent(content: string, topic: string): Promise<string> {
    // Extract parts of content relevant to topic
    return content; // Simplified
  }

  private async identifyChanges(previous: string, current: string): Promise<string[]> {
    // Identify key changes between versions
    return ['Updated section X', 'Added new policy Y'];
  }

  private async analyzeSentiment(text: string): Promise<number> {
    // Sentiment analysis (-1 to 1)
    return 0.5; // Placeholder
  }

  private async summarize(text: string, maxWords: number): Promise<string> {
    // Generate summary
    return text.slice(0, maxWords * 5); // Simplified
  }

  private async identifyTrends(
    evolution: Array<{ date: Date; summary: string; keyChanges: string[]; sentiment: number }>
  ): Promise<Array<{ aspect: string; direction: 'increasing' | 'decreasing' | 'stable' }>> {
    // Analyze trends over time
    return [
      { aspect: 'complexity', direction: 'increasing' },
      { aspect: 'sentiment', direction: 'stable' },
    ];
  }
}

// ============= Industry-Specific Modules =============

abstract class IndustryModule {
  abstract getRedactionPatterns(level: string): Array<{ name: string; pattern: RegExp }>;
  abstract getSpecializedAgents(): Array<{ name: string; expertise: string[] }>;
  abstract getComplianceRules(): Array<{ rule: string; check: (content: string) => boolean }>;
}

class MedicalModule extends IndustryModule {
  getRedactionPatterns(level: string): Array<{ name: string; pattern: RegExp }> {
    return [
      { name: 'MRN', pattern: /\bMRN[:\s]?\d{6,10}\b/gi },
      { name: 'DOB', pattern: /\b(DOB|Date of Birth)[:\s]?\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi },
      { name: 'Medical Terms', pattern: /\b(diagnosis|treatment|medication)[:\s][^\n]+/gi },
    ];
  }

  getSpecializedAgents() {
    return [
      { name: 'Clinical Reviewer', expertise: ['diagnosis validation', 'treatment protocols'] },
      { name: 'Coding Specialist', expertise: ['ICD-10', 'CPT codes', 'billing'] },
      { name: 'Compliance Officer', expertise: ['HIPAA', 'FDA regulations'] },
    ];
  }

  getComplianceRules() {
    return [
      { rule: 'HIPAA PHI', check: (content: string) => /patient|medical record/i.test(content) },
      { rule: 'Consent Forms', check: (content: string) => /informed consent/i.test(content) },
    ];
  }
}

class LegalModule extends IndustryModule {
  getRedactionPatterns(level: string): Array<{ name: string; pattern: RegExp }> {
    return [
      { name: 'Case Number', pattern: /\bCase\s+No\.?[:\s]?[\d-]+\b/gi },
      { name: 'Attorney-Client', pattern: /\b(privileged|confidential|attorney-client)\b[^.]+\./gi },
    ];
  }

  getSpecializedAgents() {
    return [
      { name: 'Contract Analyst', expertise: ['clause extraction', 'risk assessment'] },
      { name: 'Discovery Specialist', expertise: ['document review', 'privilege detection'] },
      { name: 'Compliance Monitor', expertise: ['regulatory compliance', 'audit trails'] },
    ];
  }

  getComplianceRules() {
    return [
      { rule: 'Privilege', check: (content: string) => /attorney.client|privileged/i.test(content) },
      { rule: 'Confidentiality', check: (content: string) => /confidential|proprietary/i.test(content) },
    ];
  }
}

class EngineeringModule extends IndustryModule {
  getRedactionPatterns(level: string): Array<{ name: string; pattern: RegExp }> {
    return [
      { name: 'API Key', pattern: /\b(api[_-]?key|apikey)[:\s]?['"]?[A-Za-z0-9-_]{20,}['"]?\b/gi },
      { name: 'Private Key', pattern: /-----BEGIN\s+PRIVATE\s+KEY-----[\s\S]+?-----END\s+PRIVATE\s+KEY-----/g },
      { name: 'Connection String', pattern: /\b(mongodb|postgresql|mysql):\/\/[^\s]+/gi },
    ];
  }

  getSpecializedAgents() {
    return [
      { name: 'Code Reviewer', expertise: ['security analysis', 'best practices'] },
      { name: 'Architecture Analyst', expertise: ['system design', 'scalability'] },
      { name: 'Documentation Generator', expertise: ['API docs', 'technical specs'] },
    ];
  }

  getComplianceRules() {
    return [
      { rule: 'Security Keys', check: (content: string) => /api[_-]?key|secret|password/i.test(content) },
      { rule: 'PII in Code', check: (content: string) => /hardcoded.*(email|ssn|phone)/i.test(content) },
    ];
  }
}

// ============= Export System =============

export function createDocumentIntelligence(config: {
  openaiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  industries?: string[];
}) {
  return new DocumentIntelligence({
    ...config,
    industryModules: config.industries,
  });
}

export { MedicalModule, LegalModule, EngineeringModule };

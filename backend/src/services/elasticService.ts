import { prisma } from "../prisma.js";

type ElasticClient = any;

export interface ElasticSearchHit {
  id: string;
  type: "MESSAGE" | "DECISION" | "AUDIT_EVENT";
  projectId: string;
  title?: string;
  content: string;
  snippet: string;
  score: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ElasticSearchResult {
  success: boolean;
  query: string;
  projectId: string;
  provider: "ELASTICSEARCH" | "POSTGRES_FALLBACK";
  count: number;
  hits: ElasticSearchHit[];
}

export class ElasticService {
  private client: ElasticClient | null = null;
  private isConnected = false;

  constructor() {
    const node = process.env.ELASTIC_URL;
    const apiKey = process.env.ELASTIC_API_KEY;

    if (node && node !== "mock" && !node.includes("placeholder")) {
      try {
        const { Client: ElasticClientConstructor } = require("@elastic/elasticsearch");
        this.client = new ElasticClientConstructor({
          node,
          auth: apiKey ? { apiKey } : undefined,
        });
        this.isConnected = true;
      } catch (err) {
        console.warn("Elasticsearch initialization notice: falling back to database full-text search:", err);
        this.client = null;
        this.isConnected = false;
      }
    }
  }

  /**
   * Status of Elastic Search & APM instrumentation
   */
  getStatus() {
    return {
      elasticsearchConfigured: Boolean(process.env.ELASTIC_URL),
      elasticsearchConnected: this.isConnected,
      apmConfigured: Boolean(process.env.ELASTIC_APM_SERVER_URL),
      apmServerUrl: process.env.ELASTIC_APM_SERVER_URL || null,
      serviceName: "nexum-backend",
      indices: ["nexum-workspace-messages", "nexum-workspace-decisions", "nexum-audit-events"],
    };
  }

  /**
   * Index a workspace chat message into Elasticsearch
   */
  async indexMessage(data: {
    id: string;
    projectId: string;
    senderId: string;
    content: string;
    createdAt?: Date;
    type?: string;
  }) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.index({
        index: "nexum-workspace-messages",
        id: data.id,
        document: {
          ...data,
          "@timestamp": data.createdAt || new Date(),
        },
      });
    } catch (err) {
      console.warn("Elasticsearch index message warning (non-fatal):", err);
    }
  }

  /**
   * Index an append-only audit event into Elasticsearch
   */
  async indexAuditEvent(event: {
    id: string;
    action: string;
    objectType: string;
    objectId: string;
    actorId?: string;
    versionHash?: string;
    timestamp: Date;
    metadata?: any;
  }) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.index({
        index: "nexum-audit-events",
        id: event.id,
        document: {
          ...event,
          "@timestamp": event.timestamp,
        },
      });
    } catch (err) {
      console.warn("Elasticsearch index audit event warning (non-fatal):", err);
    }
  }

  /**
   * Unified full-text & semantic workspace search across messages, ADR decisions, and audit history.
   * If Elasticsearch is online, runs multi-match queries with highlights.
   * Otherwise, transparently queries PostgreSQL with ILIKE relevance ranking.
   */
  async searchWorkspace(projectId: string, queryStr: string, limit = 20): Promise<ElasticSearchResult> {
    const q = queryStr.trim();
    if (!q) {
      return {
        success: true,
        query: q,
        projectId,
        provider: this.isConnected ? "ELASTICSEARCH" : "POSTGRES_FALLBACK",
        count: 0,
        hits: [],
      };
    }

    // Try Elasticsearch primary engine if connected
    if (this.client && this.isConnected) {
      try {
        const esRes = await this.client.search({
          index: ["nexum-workspace-messages", "nexum-workspace-decisions"],
          ignore_unavailable: true,
          size: limit,
          query: {
            bool: {
              must: {
                multi_match: {
                  query: q,
                  fields: ["content^2", "title^3", "rationale", "snippet"],
                  fuzziness: "AUTO",
                },
              },
              filter: [
                {
                  bool: {
                    should: [
                      { term: { "projectId.keyword": projectId } },
                      { match_phrase: { projectId } },
                    ],
                  },
                },
              ],
            },
          },
          highlight: {
            fields: {
              content: {},
              title: {},
              rationale: {},
            },
          },
        });

        const hits: ElasticSearchHit[] = (esRes.hits?.hits || []).map((h: any) => ({
          id: h._id,
          type: h._index.includes("decisions") ? "DECISION" : "MESSAGE",
          projectId,
          title: h._source?.title,
          content: h._source?.content || h._source?.rationale || "",
          snippet: h.highlight?.content?.[0] || h.highlight?.title?.[0] || h._source?.content?.slice(0, 150) || "",
          score: h._score || 1.0,
          timestamp: h._source?.["@timestamp"] || new Date().toISOString(),
          metadata: h._source,
        }));

        if (hits.length > 0) {
          return {
            success: true,
            query: q,
            projectId,
            provider: "ELASTICSEARCH",
            count: hits.length,
            hits,
          };
        }
      } catch (err) {
        console.warn("Elasticsearch query failed, executing resilient PostgreSQL fallback:", err);
      }
    }

    // PostgreSQL Resilient Fallback (or when Elasticsearch cluster has 0 indexed hits for this project)
    const hits: ElasticSearchHit[] = [];

    try {
      // 0. Search Active Project Header & Description
      const dbProject = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, title: true, description: true, state: true },
      });
      if (
        dbProject &&
        (dbProject.title.toLowerCase().includes(q.toLowerCase()) ||
          (dbProject.description && dbProject.description.toLowerCase().includes(q.toLowerCase())))
      ) {
        hits.push({
          id: dbProject.id,
          type: "DECISION",
          projectId,
          title: `Project: ${dbProject.title}`,
          content: dbProject.description || `Active workspace agreement for ${dbProject.title}`,
          snippet: this.createSnippet(`${dbProject.title} — ${dbProject.description || "Active Workspace"}`, q),
          score: 2.0,
          timestamp: new Date().toISOString(),
          metadata: { state: dbProject.state },
        });
      }

      // 1. Search Workspace Messages
      const dbMessages = await prisma.workspaceMessage.findMany({
        where: {
          conversation: { projectId },
          OR: [
            { originalContent: { contains: q, mode: "insensitive" } },
            { mediatedContent: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      for (const msg of dbMessages) {
        const text = msg.mediatedContent || msg.originalContent || "";
        hits.push({
          id: msg.id,
          type: "MESSAGE",
          projectId,
          content: text,
          snippet: this.createSnippet(text, q),
          score: 1.0,
          timestamp: msg.createdAt.toISOString(),
          metadata: { senderId: msg.senderId },
        });

        // Background-sync into Elasticsearch
        if (this.client && this.isConnected) {
          this.indexMessage({
            id: msg.id,
            projectId,
            senderId: msg.senderId,
            content: text,
            createdAt: msg.createdAt,
            type: msg.type,
          }).catch(() => {});
        }
      }

      // 2. Search Workspace Decisions (ADRs)
      const dbDecisions = await prisma.workspaceDecision.findMany({
        where: {
          conversation: { projectId },
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      for (const dec of dbDecisions) {
        hits.push({
          id: dec.id,
          type: "DECISION",
          projectId,
          title: dec.title,
          content: dec.description,
          snippet: this.createSnippet(dec.title + " " + dec.description, q),
          score: 1.5,
          timestamp: dec.createdAt.toISOString(),
          metadata: { status: dec.status, sha256Hash: dec.sha256Hash },
        });
      }

      // 3. Search Milestones (for escrow, milestones, agreement, deliverables queries)
      const dbMilestones = await prisma.milestone.findMany({
        where: {
          projectId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { fundingRule: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { orderIndex: "asc" },
        take: limit,
      });

      for (const m of dbMilestones) {
        hits.push({
          id: m.id,
          type: "DECISION",
          projectId,
          title: `Milestone: ${m.title}`,
          content: m.description || `Milestone funded under escrow (${m.state})`,
          snippet: this.createSnippet(m.title + " " + (m.description || "") + " Escrow Funded", q),
          score: 1.8,
          timestamp: (m.startedAt || new Date()).toISOString(),
          metadata: { state: m.state, amountMinor: m.amountMinor },
        });
      }

      // 4. Search Audit Events
      const dbAudit = await prisma.auditEvent.findMany({
        where: {
          OR: [
            { action: { contains: q, mode: "insensitive" } },
            { objectType: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { timestamp: "desc" },
        take: 5,
      });

      for (const a of dbAudit) {
        hits.push({
          id: a.id,
          type: "AUDIT_EVENT",
          projectId,
          title: `Audit: ${a.action}`,
          content: `${a.objectType} event [${a.objectId}]`,
          snippet: this.createSnippet(`${a.action} on ${a.objectType}`, q),
          score: 0.9,
          timestamp: a.timestamp.toISOString(),
          metadata: { actorId: a.actorId, versionHash: a.versionHash },
        });
      }
    } catch (dbErr) {
      console.error("Database fallback search error:", dbErr);
    }

    return {
      success: true,
      query: q,
      projectId,
      provider: "POSTGRES_FALLBACK",
      count: hits.length,
      hits: hits.slice(0, limit),
    };
  }

  private createSnippet(text: string, term: string, radius = 60): string {
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text.slice(0, radius * 2);
    const start = Math.max(0, idx - radius);
    const end = Math.min(text.length, idx + term.length + radius);
    return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
  }
}

export const elasticService = new ElasticService();

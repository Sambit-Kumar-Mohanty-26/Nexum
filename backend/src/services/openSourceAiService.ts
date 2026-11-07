import { z } from "zod";

export interface ExtractedProjectData {
  title: string;
  category: string;
  subcategory: string;
  overview: string;
  keyGoals: string[];
  customGoal?: string;
  requiredSkills: string[];
  detailedRequirements: string;
  scopeOfWork: string[];
  estimatedBudgetCents?: number;
  estimatedTimelineWeeks?: number;
}

export const CANONICAL_PROJECT_GOALS = [
  "Build a new product",
  "Integrate AI/ML",
  "Improve existing system",
  "Fix issues / maintenance",
];

export function resolveCanonicalGoals(
  rawGoals: string[] | undefined,
  contextText: string
): { keyGoals: string[]; customGoal?: string } {
  const matched = new Set<string>();
  let customGoal: string | undefined = undefined;

  const mapSingle = (g: string) => {
    const lower = g.toLowerCase().trim();
    if (CANONICAL_PROJECT_GOALS.some((cg) => cg.toLowerCase() === lower)) {
      return CANONICAL_PROJECT_GOALS.find((cg) => cg.toLowerCase() === lower)!;
    }
    if (/\b(ai|ml|machine learning|nlp|llm|model|intelligence|smart|algorithm|classifier|neural)\b/i.test(lower)) {
      return "Integrate AI/ML";
    }
    if (/\b(improve|upgrade|refactor|optimize|enhance|scale|modernize|revamp)\b/i.test(lower)) {
      return "Improve existing system";
    }
    if (/\b(fix|bug|issue|maintenance|patch|troubleshoot|debug)\b/i.test(lower)) {
      return "Fix issues / maintenance";
    }
    if (/\b(build|new|platform|create|develop|greenfield|mvp|product|app|system)\b/i.test(lower)) {
      return "Build a new product";
    }
    return null;
  };

  if (Array.isArray(rawGoals)) {
    for (const rg of rawGoals) {
      const mapped = mapSingle(String(rg));
      if (mapped) {
        matched.add(mapped);
      } else if (!customGoal && String(rg).trim().length > 3 && String(rg).trim().length < 80) {
        customGoal = String(rg).trim();
      }
    }
  }

  const textLower = contextText.toLowerCase();
  if (/\b(ai|ml|machine learning|nlp|llm|neural|model|deep learning|groq|openai|intelligence)\b/i.test(textLower)) {
    matched.add("Integrate AI/ML");
  }
  if (/\b(improve|refactor|upgrade|optimize|enhance|scale|modernize|revamp)\b/i.test(textLower)) {
    matched.add("Improve existing system");
  }
  if (/\b(fix|bug|issue|maintenance|patch|troubleshoot|debug)\b/i.test(textLower)) {
    matched.add("Fix issues / maintenance");
  }
  if (/\b(build|new|platform|create|develop|greenfield|mvp|product|system|app)\b/i.test(textLower) || matched.size === 0) {
    matched.add("Build a new product");
  }

  return {
    keyGoals: Array.from(matched).slice(0, 3),
    customGoal,
  };
}

export function stripMarkdownStars(text: string): string {
  if (!text) return "";
  return text
    // Remove bold asterisks: **text** -> text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    // Remove italic asterisks: *text* -> text
    .replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, "$1$2$3")
    // Convert asterisk and dash bullet lists to dot bullets: * item / - item -> • item
    .replace(/^(\s*)\*\s+/gm, "$1• ")
    .replace(/^(\s*)-\s+/gm, "$1• ")
    // Remove markdown heading hashes: ### Heading -> Heading
    .replace(/^#{1,6}\s+/gm, "")
    // Remove code backticks: `code` -> code
    .replace(/`([^`]+)`/g, "$1")
    // Remove any leftover double asterisks or loose stars
    .replace(/\*\*/g, "")
    .trim();
}

const COMMON_SKILL_KEYWORDS = [
  "Next.js", "React", "TypeScript", "JavaScript", "Node.js", "Express",
  "PostgreSQL", "Prisma", "Python", "FastAPI", "Django", "Docker",
  "AWS", "Kubernetes", "TailwindCSS", "GraphQL", "Redis", "MongoDB",
  "PayPal v2", "Stripe", "REST API", "CI/CD", "Solidity", "Web3",
  "Figma", "UI/UX", "Machine Learning", "PyTorch", "DevOps"
];

const SCOPE_MAPPINGS = [
  { match: /(frontend|ui|user interface|react|next\.js|client)/i, label: "Frontend development" },
  { match: /(backend|api|server|microservice|express|node)/i, label: "Backend development" },
  { match: /(database|sql|postgres|schema|prisma|migration)/i, label: "Database design" },
  { match: /(ai|ml|machine learning|llm|nlp|model|deepseek)/i, label: "AI/ML integration" },
  { match: /(dashboard|analytics|reporting|metrics|chart)/i, label: "Dashboard and reports" },
  { match: /(test|qa|cypress|jest|deployment|ci\/cd|docker)/i, label: "Testing and deployment" },
];

export class OpenSourceAiService {
  private deepseekApiKey: string | undefined;
  private openrouterApiKey: string | undefined;
  private githubToken: string | undefined;
  private huggingfaceApiKey: string | undefined;

  constructor() {
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY;
    this.githubToken = process.env.GITHUB_TOKEN;
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
  }

  private hasApiKey(): boolean {
    return Boolean(
      (this.deepseekApiKey && this.deepseekApiKey.trim().length > 0) ||
      (this.openrouterApiKey && this.openrouterApiKey.trim().length > 0) ||
      (this.githubToken && this.githubToken.trim().length > 0) ||
      (this.huggingfaceApiKey && this.huggingfaceApiKey.trim().length > 0)
    );
  }

  /**
   * Calls either 100% Free OpenRouter (:free tier), GitHub Models ($0 free tier),
   * Hugging Face free tier, or Direct DeepSeek
   */
  private async callChatCompletion(messages: Array<{ role: string; content: string }>, jsonMode = false): Promise<string> {
    let url = "";
    let apiKey = "";
    let model = "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (this.openrouterApiKey && this.openrouterApiKey.trim().length > 0) {
      // 100% Free OpenRouter Tier ($0, no card required)
      url = "https://openrouter.ai/api/v1/chat/completions";
      apiKey = this.openrouterApiKey.trim();
      model = process.env.OPEN_SOURCE_MODEL || "nvidia/nemotron-3.5-lightning:free";
      headers["Authorization"] = `Bearer ${apiKey}`;
      headers["HTTP-Referer"] = "https://nexum.network";
      headers["X-Title"] = "Nexum AI Workspace";
    } else if (this.githubToken && this.githubToken.trim().length > 0) {
      // 100% Free GitHub Models ($0 for any GitHub account)
      url = "https://models.inference.ai.azure.com/chat/completions";
      apiKey = this.githubToken.trim();
      model = process.env.OPEN_SOURCE_MODEL || "DeepSeek-R1";
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (this.huggingfaceApiKey && this.huggingfaceApiKey.trim().length > 0) {
      // 100% Free Hugging Face Inference API ($0)
      url = "https://router.huggingface.co/hf-inference/v1/chat/completions";
      apiKey = this.huggingfaceApiKey.trim();
      model = process.env.OPEN_SOURCE_MODEL || "Qwen/Qwen2.5-72B-Instruct";
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (this.deepseekApiKey && this.deepseekApiKey.trim().length > 0) {
      url = "https://api.deepseek.com/chat/completions";
      apiKey = this.deepseekApiKey.trim();
      model = process.env.OPEN_SOURCE_MODEL || "deepseek-chat";
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      throw new Error("NO_API_KEY_CONFIGURED");
    }

    const body: Record<string, any> = {
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2048,
    };

    if (this.openrouterApiKey && this.openrouterApiKey.trim().length > 0) {
      body.reasoning = { max_tokens: 0 };
    }

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenSource AI API error (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as any;
    const msg = data?.choices?.[0]?.message;
    let content = msg?.content || "";
    if (!content && msg?.reasoning) {
      content = msg.reasoning;
    }
    return content || "";
  }

  /**
   * Extracts structured project details from an uploaded PRD or brief document
   */
  public async extractProjectFromDocument(
    text: string,
    fileName?: string
  ): Promise<ExtractedProjectData> {
    if (!text || text.trim().length === 0) {
      throw new Error("EMPTY_DOCUMENT: Document contains no readable text.");
    }

    const sanitized = text.slice(0, 30000); // Guard token length

    if (this.hasApiKey()) {
      try {
        const systemPrompt = `You are an expert technical product manager for the Nexum AI freelance protocol. 
Analyze the uploaded technical document/PRD and extract clean, actionable project parameters.
Return ONLY valid JSON matching this schema:
{
  "title": "string (clear, concise project title)",
  "category": "Development & IT",
  "subcategory": "string (e.g. Web Development, Full-Stack, AI / Machine Learning)",
  "overview": "string (concise 2-3 paragraph executive overview)",
  "keyGoals": ["string (MUST select 1 to 3 items from canonical options: 'Build a new product', 'Integrate AI/ML', 'Improve existing system', 'Fix issues / maintenance')"],
  "customGoal": "string (optional specific custom outcome if any, or empty string)", 
  "requiredSkills": ["string (5-8 required tech skills)"],
  "detailedRequirements": "string (bullet points using '•' with clear technical acceptance criteria, NO markdown asterisks, NO stars)",
  "scopeOfWork": ["string (e.g. Frontend development, Backend development, Database design, Testing and deployment)"],
  "estimatedBudgetCents": number (optional budget in integer cents, e.g. 500000 for $5000),
  "estimatedTimelineWeeks": number (optional estimated duration in weeks)
}`;

        const raw = await this.callChatCompletion(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Document Title: ${fileName || "Uploaded Document"}\n\nContent:\n${sanitized}` },
          ],
          true
        );

        const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return {
          title: parsed.title || "Technical Engineering Project",
          category: parsed.category || "Development & IT",
          subcategory: parsed.subcategory || "Web Development",
          overview: parsed.overview || sanitized.slice(0, 350),
          keyGoals: resolveCanonicalGoals(
            Array.isArray(parsed.keyGoals) ? parsed.keyGoals : [],
            `${parsed.title || ""} ${parsed.overview || ""} ${sanitized}`
          ).keyGoals,
          customGoal: parsed.customGoal || resolveCanonicalGoals(
            Array.isArray(parsed.keyGoals) ? parsed.keyGoals : [],
            `${parsed.title || ""} ${parsed.overview || ""} ${sanitized}`
          ).customGoal,
          requiredSkills: Array.isArray(parsed.requiredSkills) && parsed.requiredSkills.length > 0
            ? parsed.requiredSkills
            : ["TypeScript", "Next.js", "PostgreSQL"],
          detailedRequirements: stripMarkdownStars(parsed.detailedRequirements) || "• Implement robust, type-safe API endpoints\n• Adhere to milestone acceptance criteria",
          scopeOfWork: Array.isArray(parsed.scopeOfWork) && parsed.scopeOfWork.length > 0
            ? parsed.scopeOfWork
            : ["Frontend development", "Backend development"],
          estimatedBudgetCents: typeof parsed.estimatedBudgetCents === "number" ? parsed.estimatedBudgetCents : undefined,
          estimatedTimelineWeeks: typeof parsed.estimatedTimelineWeeks === "number" ? parsed.estimatedTimelineWeeks : undefined,
        };
      } catch (err) {
        console.warn("[OpenSourceAiService] Live API call failed, falling back to rule-based parser:", err);
      }
    }

    // Heuristic Rule-Based Fallback (Works offline without requiring API key)
    return this.fallbackExtract(sanitized, fileName);
  }

  /**
   * Improves technical project overview with architecture benchmarks and standards
   */
  public async improveOverview(params: {
    title?: string;
    overview?: string;
    category?: string;
  }): Promise<string> {
    const current = params.overview || "";
    const title = params.title || "Full-Stack Project";

    if (this.hasApiKey()) {
      try {
        const prompt = `You are a Principal Software Architect. Enhance the following client project overview to be clear, attract senior technical talent, and define measurable engineering benchmarks:
Project: ${title}
Category: ${params.category || "Development & IT"}
Current Overview: ${current}

Provide an enriched, highly professional overview including:
1. Architectural objective and business value
2. Key performance & security benchmarks (e.g. sub-200ms latency, zero-drop webhooks, role-based access)
3. Quality assurance and milestone verification expectations. Keep it concise (under 180 words).

FORMATTING REQUIREMENTS:
- Output clean plain text ONLY suitable for a plain form textarea.
- Do NOT use markdown bold asterisks (like **text**), NO stars (*), NO markdown hashes (#), NO backticks.
- Use standard text labels and bullet points with '•' instead of asterisks.`;

        const enhanced = await this.callChatCompletion([
          { role: "system", content: "You write crisp, senior engineering briefs in clean plain text with ZERO markdown asterisks or stars." },
          { role: "user", content: prompt },
        ]);

        return stripMarkdownStars(enhanced.trim());
      } catch (err) {
        console.warn("[OpenSourceAiService] AI improveOverview failed, using fallback:", err);
      }
    }

    // Offline / deterministic fallback
    const base = current.trim() || `Architect and deliver production-grade milestone deliverables for ${title}.`;
    return stripMarkdownStars(
      `${base}\n\nTechnical Architecture & Standards:\n• Sub-200ms API latency targets with idempotent payload handling\n• Strict TypeScript typings with zero unchecked runtime exceptions\n• Dual SHA-256 state tracking for transparent deliverable verification\n• Comprehensive unit & integration test coverage with automated assertion logs`
    );
  }

  /**
   * Suggests top relevant skills based on project context
   */
  public async suggestSkills(params: {
    title?: string;
    overview?: string;
    category?: string;
    existingSkills?: string[];
  }): Promise<string[]> {
    const existing = new Set(params.existingSkills || []);

    if (this.hasApiKey()) {
      try {
        const prompt = `Given the project title "${params.title || "Web Application"}" and overview: "${(params.overview || "").slice(0, 300)}", recommend 6 high-demand technical skills or frameworks. 
Return ONLY a JSON array of strings, e.g. ["Next.js", "Docker", "PostgreSQL"].`;

        const res = await this.callChatCompletion([
          { role: "system", content: "You are a tech stack recommender. Output ONLY valid JSON array." },
          { role: "user", content: prompt },
        ]);

        const match = res.match(/\[[\s\S]*\]/);
        const jsonStr = match ? match[0] : res.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter((s: string) => !existing.has(s)).slice(0, 6);
        }
      } catch (err) {
        console.warn("[OpenSourceAiService] AI suggestSkills failed, using fallback:", err);
      }
    }

    // Fallback: match keywords in title + overview
    const fullText = `${params.title || ""} ${params.overview || ""}`.toLowerCase();
    const suggestions: string[] = [];

    for (const skill of COMMON_SKILL_KEYWORDS) {
      if (!existing.has(skill)) {
        if (fullText.includes(skill.toLowerCase())) {
          suggestions.push(skill);
        }
      }
    }

    const defaults = ["TypeScript", "Next.js", "PostgreSQL", "Docker", "Redis", "TailwindCSS"];
    for (const d of defaults) {
      if (!existing.has(d) && !suggestions.includes(d)) {
        suggestions.push(d);
      }
      if (suggestions.length >= 5) break;
    }

    return suggestions.slice(0, 6);
  }

  /**
   * Refines technical requirements and acceptance criteria
   */
  public async refineRequirements(params: {
    title?: string;
    overview?: string;
    category?: string;
    existingRequirements?: string;
  }): Promise<{ refinedRequirements: string; suggestedScope: string[] }> {
    const current = params.existingRequirements || "";
    const title = params.title || "Full-Stack Application";

    if (this.hasApiKey()) {
      try {
        const prompt = `You are a Principal Software Architect. Given:
Title: ${title}
Overview: ${(params.overview || "").slice(0, 400)}
Current Requirements:
${current}

Refine these requirements into high-clarity bullet points with technical acceptance criteria (e.g. API contracts, latency benchmarks, security standards, test coverage).
IMPORTANT: Do NOT use markdown bold asterisks (no **words**). Use bullet points starting with '•'.
Return ONLY valid JSON:
{
  "refinedRequirements": "string (bullet points starting with •, NO markdown asterisks or stars)",
  "suggestedScope": ["Frontend development", "Backend development", "Database design", "Testing and deployment"]
}`;

        const res = await this.callChatCompletion([
          { role: "system", content: "You output ONLY valid JSON matching the schema. Never include markdown bold asterisks or stars." },
          { role: "user", content: prompt },
        ], true);

        const match = res.match(/\{[\s\S]*\}/);
        const jsonStr = match ? match[0] : res.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed.refinedRequirements === "string") {
          return {
            refinedRequirements: stripMarkdownStars(parsed.refinedRequirements),
            suggestedScope: Array.isArray(parsed.suggestedScope) ? parsed.suggestedScope : [],
          };
        }
      } catch (err) {
        console.warn("[OpenSourceAiService] AI refineRequirements failed, using fallback:", err);
      }
    }

    const base = current.trim() || `• Develop core application modules for ${title}`;
    return {
      refinedRequirements: `${base}\n• Build REST/GraphQL backend APIs with automated test assert logs\n• Adhere to Dual SHA-256 state consensus and cryptographic ledger audit\n• Implement role-based access control and strict Zod schema validation\n• Comprehensive test suite with >90% coverage on critical payment and milestone paths`,
      suggestedScope: ["Frontend development", "Backend development", "Database design", "Testing and deployment"],
    };
  }

  /**
   * Local rule-based parser for offline / keyless operation
   */
  private fallbackExtract(text: string, fileName?: string): ExtractedProjectData {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    const isGarbled = (s: string) => /[\x00-\x08\x0E-\x1F\uFFFD]|^PK|\[Content_Types\]|\.xml/i.test(s);

    const cleanFileName = fileName
      ? fileName
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]+/g, " ")
          .replace(/\s*v\d+(\.\d+)*$/i, "")
          .replace(/\s*(?:Business Requirements Document|PRD|BRD|Product Requirements|Specification)$/i, "")
          .trim()
      : "";

    // 1. Title
    let title = "";
    const nonGarbledLines = lines.filter((l) => !isGarbled(l));
    if (nonGarbledLines.length > 0) {
      // Pick first non-empty heading or clean line
      const cleanFirst = nonGarbledLines[0].replace(/^[#*\-=\s]+/, "").slice(0, 80).trim();
      title = cleanFirst.length >= 3 && !isGarbled(cleanFirst)
        ? cleanFirst
        : (cleanFileName || "Full-Stack Web Application");
    } else {
      title = cleanFileName || "Production Full-Stack Application";
    }

    // 2. Skills
    const matchedSkills: string[] = [];
    const textLower = text.toLowerCase();
    for (const skill of COMMON_SKILL_KEYWORDS) {
      if (textLower.includes(skill.toLowerCase()) && !matchedSkills.includes(skill)) {
        matchedSkills.push(skill);
      }
    }
    if (matchedSkills.length === 0) {
      matchedSkills.push("TypeScript", "Next.js", "Node.js", "PostgreSQL");
    }

    // 3. Scopes
    const matchedScopes: string[] = [];
    for (const s of SCOPE_MAPPINGS) {
      if (s.match.test(textLower) && !matchedScopes.includes(s.label)) {
        matchedScopes.push(s.label);
      }
    }
    if (matchedScopes.length === 0) {
      matchedScopes.push("Frontend development", "Backend development", "Testing and deployment");
    }

    // 4. Requirements
    const reqLines = lines
      .filter((l) => /^[-*•\d.]\s+/.test(l) && l.length > 15)
      .slice(0, 6)
      .map((l) => `• ${stripMarkdownStars(l.replace(/^[-*•\d.]\s+/, ""))}`);

    const detailedRequirements = reqLines.length > 0
      ? reqLines.join("\n")
      : [
          `• Develop responsive and accessible interface adhering to specification`,
          `• Build resilient backend endpoints with automated test assertions`,
          `• Deploy on zero-downtime infrastructure with continuous monitoring`,
        ].join("\n");

    // 5. Overview
    const paragraphLines = lines.filter(
      (l) => !l.startsWith("#") && !l.startsWith("-") && l.length > 30 && !isGarbled(l)
    );
    const overview = paragraphLines.length > 0
      ? paragraphLines.slice(0, 2).join("\n\n")
      : `Complete end-to-end implementation of ${title}. The project requires verifiable deliverables, robust error-handling, and clear milestone progress tracked on Nexum bilateral rails.`;

    // 6. Canonical Goals resolved from document context
    const { keyGoals, customGoal } = resolveCanonicalGoals([], `${title} ${overview} ${text}`);

    // 7. Budget estimate (look for $xxx or xxx USD)
    let estimatedBudgetCents: number | undefined = undefined;
    const budgetMatch = text.match(/\$\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?/);
    if (budgetMatch) {
      const rawNum = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
      if (rawNum > 50 && rawNum < 1000000) {
        estimatedBudgetCents = rawNum * 100;
      }
    }

    return {
      title,
      category: "Development & IT",
      subcategory: "Web Development",
      overview,
      keyGoals,
      customGoal,
      requiredSkills: matchedSkills.slice(0, 8),
      detailedRequirements,
      scopeOfWork: matchedScopes,
      estimatedBudgetCents,
      estimatedTimelineWeeks: 4,
    };
  }
}

export const openSourceAiService = new OpenSourceAiService();

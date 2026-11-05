import { Router, Request, Response } from "express";
import { SESSION_COOKIE_NAME, validateSession } from "../lib/auth.js";
import { clientOverviewService } from "../services/clientOverviewService.js";

const router = Router();

// Helper to resolve client user from request (middleware, session cookie, query, or body)
async function resolveClientId(req: Request): Promise<string> {
  const reqUser = (req as any).user;
  if (reqUser?.id) return reqUser.id;

  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (cookieToken) {
    try {
      const sessionRecord = await validateSession(cookieToken);
      if (sessionRecord?.user?.id) {
        return sessionRecord.user.id;
      }
    } catch {
      // Ignore invalid session token
    }
  }

  const headerAuth = req.headers.authorization;
  if (headerAuth?.startsWith("Bearer ")) {
    try {
      const sessionRecord = await validateSession(headerAuth.slice(7).trim());
      if (sessionRecord?.user?.id) {
        return sessionRecord.user.id;
      }
    } catch {
      // Ignore invalid bearer
    }
  }

  // Fallback to body or query if client is calling from Next.js proxy
  const fallback =
    (req.body?.clientId as string) ||
    (req.query?.clientId as string) ||
    "usr_client_alex";

  return fallback;
}

// GET /api/projects - list projects with active proposals and milestones
router.get("/", async (req: Request, res: Response) => {
  try {
    const clientId = await resolveClientId(req);
    const status = req.query.status as string;
    const search = req.query.search as string;

    const result = await clientOverviewService.getProjects({
      clientId,
      status,
      search,
    });

    res.json({
      success: true,
      count: result.projects.length,
      data: result.projects,
      stats: result.stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch projects";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/projects - create new project or draft with milestones and PRD
router.post("/", async (req: Request, res: Response) => {
  try {
    const clientId = await resolveClientId(req);
    const {
      id,
      title,
      description,
      state,
      budgetCents = 0,
      currency = "USD",
      deadline,
      goals,
      category,
      subcategory,
      requiredSkills,
      skills,
      detailedRequirements,
      scopeOfWork,
      budgetType,
      timelineDuration,
      experienceLevel,
      englishLevel,
      visibility,
      milestones = [],
    } = req.body || {};

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Title is required",
      });
    }

    const created = await clientOverviewService.createProject({
      id,
      clientId,
      title,
      description: description || "",
      state: state || (budgetCents > 0 ? "ACTIVE" : "DRAFT"),
      budgetCents,
      currency,
      deadline: deadline ? new Date(deadline) : undefined,
      goals,
      category,
      subcategory,
      requiredSkills: requiredSkills || skills || [],
      detailedRequirements,
      scopeOfWork,
      budgetType,
      timelineDuration,
      experienceLevel,
      englishLevel,
      visibility,
      milestones,
    });

    res.status(201).json({
      success: true,
      message: state === "DRAFT" ? "Draft saved successfully" : "Project published and registered in consensus engine",
      data: created,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save project";
    console.error("Project creation failure:", err);
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/projects/:id - get single project or draft
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const clientId = await resolveClientId(req);
    const project = await clientOverviewService.getProjectById(req.params.id, clientId);

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    res.json({ success: true, data: project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch project";
    res.status(500).json({ success: false, error: msg });
  }
});

// PUT /api/projects/:id - update existing project or draft
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const clientId = await resolveClientId(req);
    const updated = await clientOverviewService.createProject({
      ...req.body,
      id: req.params.id,
      clientId,
    });

    res.json({
      success: true,
      message: "Project updated successfully",
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update project";
    res.status(500).json({ success: false, error: msg });
  }
});

// DELETE /api/projects/:id - delete a project or draft
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const clientId = await resolveClientId(req);
    const result = await clientOverviewService.deleteProject(req.params.id, clientId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete project";
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;

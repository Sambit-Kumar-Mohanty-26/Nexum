import { Router, Request, Response } from "express";
import { clientOverviewService } from "../services/clientOverviewService.js";

const router = Router();

// GET /api/projects - list projects with active proposals and milestones
router.get("/", async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string) || "usr_client_alex";
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
    const {
      id,
      clientId = "usr_client_alex",
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
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/projects/:id - get single project or draft
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string) || "usr_client_alex";
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
    const clientId = (req.body.clientId as string) || "usr_client_alex";
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
    const clientId = (req.query.clientId as string) || (req.body?.clientId as string) || "usr_client_alex";
    const result = await clientOverviewService.deleteProject(req.params.id, clientId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete project";
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;

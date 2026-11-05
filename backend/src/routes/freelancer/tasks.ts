import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../lib/errors.js";
import { appendAuditEvent } from "../../lib/audit.js";
import { Role, WorkspaceTaskStatus, TaskVisibility } from "@prisma/client";
import { verifyProjectAccess } from "../../domain/mediation/access.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole(Role.FREELANCER));

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.union([z.nativeEnum(WorkspaceTaskStatus), z.enum(["COMPLETED", "TO_DO", "IN_PROGRESS"])]).default(WorkspaceTaskStatus.TODO),
  dueDate: z.string().optional().nullable(),
  priority: z.string().optional().default("MEDIUM"),
  visibility: z.nativeEnum(TaskVisibility).default(TaskVisibility.PRIVATE),
  milestoneId: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.union([z.nativeEnum(WorkspaceTaskStatus), z.enum(["COMPLETED", "TO_DO", "IN_PROGRESS"])]).optional(),
  dueDate: z.string().optional().nullable(),
  visibility: z.nativeEnum(TaskVisibility).optional(),
});

export async function getProjectTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId || (req.query.projectId as string);
    const freelancerId = req.user!.id;

    if (!projectId) {
      // Find all projects where freelancer has an active agreement
      const agreements = await prisma.agreement.findMany({
        where: { freelancerId, status: "ACTIVE" },
        select: { projectId: true },
      });
      const projectIds = agreements.map((a) => a.projectId);

      const tasks = await prisma.workspaceTask.findMany({
        where: {
          OR: [
            { projectId: { in: projectIds }, visibility: TaskVisibility.SHARED },
            { createdBy: freelancerId },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      const pendingCount = tasks.filter(
        (t) => t.status === WorkspaceTaskStatus.TODO || t.status === WorkspaceTaskStatus.IN_PROGRESS
      ).length;

      res.status(200).json({ success: true, tasks, pendingCount });
      return;
    }

    const access = await verifyProjectAccess(projectId, freelancerId, prisma);
    if (!access.allowed) {
      throw new NotFoundError("Project not found");
    }

    let tasks = await prisma.workspaceTask.findMany({
      where: {
        projectId,
        OR: [{ visibility: TaskVisibility.SHARED }, { createdBy: freelancerId }],
      },
      orderBy: { createdAt: "asc" },
    });

    if (tasks.length === 0) {
      // Auto-seed implementation checklist tasks mapped to milestone deliverables
      const milestones = await prisma.milestone.findMany({
        where: {
          OR: [
            { projectId, removedAt: null },
            { agreement: { projectId }, removedAt: null },
          ],
        },
        orderBy: { orderIndex: "asc" },
      });

      if (milestones.length > 0) {
        const initialTasksData = [];
        for (const ms of milestones) {
          let deliverables = ms.deliverables;
          if (typeof deliverables === "string") {
            try {
              deliverables = JSON.parse(deliverables);
            } catch {}
          }
          const deliverableList = Array.isArray(deliverables) ? deliverables : [];
          const isCompleted = ms.workStatus === "ACCEPTED";
          if (deliverableList.length > 0) {
            for (const d of deliverableList) {
              const deliverableTitle = typeof d === "string" ? d : (d as any).title || "Deliverable Item";
              initialTasksData.push({
                projectId,
                milestoneId: ms.id,
                title: deliverableTitle,
                description: `Deliverable requirement for milestone "${ms.title}"`,
                status: isCompleted ? WorkspaceTaskStatus.DONE : WorkspaceTaskStatus.TODO,
                priority: "HIGH",
                dueDate: ms.dueDate || ms.deadline,
                visibility: TaskVisibility.SHARED,
                createdBy: freelancerId,
                completedAt: isCompleted ? new Date() : null,
              });
            }
          } else {
            initialTasksData.push({
              projectId,
              milestoneId: ms.id,
              title: ms.title,
              description: `Deliverable package for milestone "${ms.title}"`,
              status: isCompleted ? WorkspaceTaskStatus.DONE : WorkspaceTaskStatus.TODO,
              priority: "MEDIUM",
              dueDate: ms.dueDate || ms.deadline,
              visibility: TaskVisibility.SHARED,
              createdBy: freelancerId,
              completedAt: isCompleted ? new Date() : null,
            });
          }
        }

        if (initialTasksData.length > 0) {
          await prisma.workspaceTask.createMany({
            data: initialTasksData,
          });

          tasks = await prisma.workspaceTask.findMany({
            where: {
              projectId,
              OR: [{ visibility: TaskVisibility.SHARED }, { createdBy: freelancerId }],
            },
            orderBy: { createdAt: "asc" },
          });
        }
      }
    }

    const pendingCount = tasks.filter(
      (t) => t.status === WorkspaceTaskStatus.TODO || t.status === WorkspaceTaskStatus.IN_PROGRESS
    ).length;

    res.status(200).json({ success: true, tasks, pendingCount });
  } catch (err) {
    next(err);
  }
}

export async function createProjectTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    if (!projectId) {
      throw new ValidationError("projectId is required");
    }
    const freelancerId = req.user!.id;

    const access = await verifyProjectAccess(projectId, freelancerId, prisma);
    if (!access.allowed) {
      throw new NotFoundError("Project not found");
    }

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid task parameters", parsed.error.flatten().fieldErrors, 422);
    }

    let parsedStatus: WorkspaceTaskStatus = WorkspaceTaskStatus.TODO;
    const rawStatus = parsed.data.status as string;
    if (rawStatus === "COMPLETED" || rawStatus === "DONE") {
      parsedStatus = WorkspaceTaskStatus.DONE;
    } else if (rawStatus === "IN_PROGRESS") {
      parsedStatus = WorkspaceTaskStatus.IN_PROGRESS;
    } else {
      parsedStatus = WorkspaceTaskStatus.TODO;
    }

    let parsedDueDate: Date | null = null;
    if (parsed.data.dueDate && parsed.data.dueDate !== "No deadline" && !isNaN(Date.parse(parsed.data.dueDate))) {
      parsedDueDate = new Date(parsed.data.dueDate);
    }

    const task = await prisma.workspaceTask.create({
      data: {
        projectId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: parsedStatus,
        priority: parsed.data.priority || "MEDIUM",
        dueDate: parsedDueDate,
        visibility: parsed.data.visibility || TaskVisibility.SHARED,
        milestoneId: parsed.data.milestoneId || null,
        createdBy: freelancerId,
        completedAt: parsedStatus === WorkspaceTaskStatus.DONE ? new Date() : null,
      },
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "TASK_CREATED",
      objectType: "WORKSPACE_TASK",
      objectId: task.id,
      newStatus: task.status,
      metadata: { projectId, title: task.title, visibility: task.visibility },
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

router.get("/", getProjectTasks);
router.post("/", createProjectTask);

router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const task = await prisma.workspaceTask.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) throw new NotFoundError("Task not found");
    if (task.createdBy !== freelancerId) {
      const access = await verifyProjectAccess(task.projectId, freelancerId, prisma);
      if (!access.allowed) throw new ForbiddenError("Not authorized to modify this task");
    }

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid update parameters", parsed.error.flatten().fieldErrors, 422);
    }

    let nextStatus: WorkspaceTaskStatus = task.status;
    if (parsed.data.status) {
      const rawUpdateStatus = parsed.data.status as string;
      if (rawUpdateStatus === "COMPLETED" || rawUpdateStatus === "DONE") {
        nextStatus = WorkspaceTaskStatus.DONE;
      } else if (rawUpdateStatus === "TO_DO" || rawUpdateStatus === "TODO") {
        nextStatus = WorkspaceTaskStatus.TODO;
      } else if (rawUpdateStatus === "IN_PROGRESS") {
        nextStatus = WorkspaceTaskStatus.IN_PROGRESS;
      }
    }

    let parsedDueDate: Date | null | undefined = undefined;
    if (parsed.data.dueDate !== undefined) {
      parsedDueDate = parsed.data.dueDate && !isNaN(Date.parse(parsed.data.dueDate)) ? new Date(parsed.data.dueDate) : null;
    }

    const completedAt =
      nextStatus === WorkspaceTaskStatus.DONE
        ? task.completedAt || new Date()
        : null;

    const updated = await prisma.workspaceTask.update({
      where: { id },
      data: {
        title: parsed.data.title || undefined,
        description: parsed.data.description !== undefined ? parsed.data.description : undefined,
        status: nextStatus,
        dueDate: parsedDueDate,
        visibility: parsed.data.visibility || undefined,
        completedAt,
      },
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "TASK_UPDATED",
      objectType: "WORKSPACE_TASK",
      objectId: id,
      previousStatus: task.status,
      newStatus: updated.status,
    });

    res.status(200).json({ success: true, task: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const task = await prisma.workspaceTask.findUnique({
      where: { id },
    });

    if (!task) throw new NotFoundError("Task not found");
    if (task.createdBy !== freelancerId) {
      throw new ForbiddenError("Not authorized to delete this task");
    }

    await prisma.workspaceTask.delete({ where: { id } });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "TASK_DELETED",
      objectType: "WORKSPACE_TASK",
      objectId: id,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

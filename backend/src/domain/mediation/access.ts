import { PrismaClient } from "@prisma/client";

/**
 * Checks whether a user (client or freelancer) is an authorized participant in a project.
 */
export async function verifyProjectAccess(
  projectId: string,
  userId: string,
  prisma: PrismaClient
): Promise<{ allowed: boolean; project?: any }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      agreement: true,
      projectProposals: { where: { freelancerId: userId, status: "ACCEPTED" }, take: 1 },
      invitations: { where: { freelancerId: userId }, take: 1 },
    },
  });

  if (!project) return { allowed: false };
  if (project.clientId === userId) return { allowed: true, project };
  if (project.agreement?.freelancerId === userId) return { allowed: true, project };
  if (project.projectProposals.length > 0) return { allowed: true, project };
  if (project.invitations.length > 0) return { allowed: true, project };

  const agreement = await prisma.agreement.findFirst({
    where: { projectId, freelancerId: userId },
  });
  if (agreement) return { allowed: true, project };

  return { allowed: false, project };
}

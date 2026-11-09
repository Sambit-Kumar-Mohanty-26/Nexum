import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient, ProjectState, ProposalStatus, MilestoneWorkStatus, PaymentState } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const u = new URL(connectionString);

  const poolConfig = {
    host: u.hostname,
    user: u.username,
    password: u.password,
    database: u.pathname.slice(1),
    ssl: true,
  };

  const adapter = new PrismaNeon(poolConfig);
  const prisma = new PrismaClient({ adapter });

  console.log("Connecting to Neon database over Port 443 WebSocket...");
  const project = await prisma.project.findFirst({
    where: {
      title: { contains: "TerraShield", mode: "insensitive" },
    },
    include: {
      proposals: true,
      agreement: {
        include: { versions: true },
      },
    },
  });

  if (!project) {
    console.error("❌ TerraShield project not found in database.");
    process.exit(1);
  }

  console.log(`Found project: "${project.title}" (ID: ${project.id}, current state: ${project.state})`);
  const projectId = project.id;

  await prisma.$transaction(async (tx) => {
    // 1. Revert proposals
    const updatedProps = await tx.proposal.updateMany({
      where: { projectId },
      data: {
        status: ProposalStatus.SUBMITTED,
        rejectionFeedback: null,
        lastActivityAt: new Date(),
      },
    });
    console.log(` - Reverted ${updatedProps.count} proposal(s) to SUBMITTED`);

    // 2. Delete agreements, approvals, and versions
    if (project.agreement) {
      const agreementId = project.agreement.id;
      const versionIds = project.agreement.versions.map((v) => v.id);

      if (versionIds.length > 0) {
        await tx.agreementApproval.deleteMany({
          where: { agreementVersionId: { in: versionIds } },
        });
        await tx.milestoneRevision.deleteMany({
          where: { agreementVersionId: { in: versionIds } },
        });
        await tx.agreementVersion.deleteMany({
          where: { agreementId },
        });
      }

      await tx.agreement.delete({
        where: { id: agreementId },
      });
      console.log(` - Deleted agreement and historical version approvals`);
    }

    // 3. Delete Contract_Agreement_ files
    const contractProjectFiles = await tx.projectFile.findMany({
      where: {
        projectId,
        name: { startsWith: "Contract_Agreement_" },
      },
    });

    if (contractProjectFiles.length > 0) {
      const fileIds = contractProjectFiles.map((pf) => pf.fileId);
      await tx.projectFile.deleteMany({
        where: { id: { in: contractProjectFiles.map((pf) => pf.id) } },
      });
      await tx.file.deleteMany({
        where: { id: { in: fileIds } },
      });
      console.log(` - Cleaned up ${contractProjectFiles.length} generated contract file(s)`);
    }

    // 4. Clean up payments
    await tx.payment.deleteMany({ where: { projectId } });

    // 5. Reset milestones
    await tx.milestone.updateMany({
      where: { projectId },
      data: {
        agreementId: null,
        workStatus: MilestoneWorkStatus.UPCOMING,
        state: PaymentState.NOT_STARTED,
        startedAt: null,
        acceptedAt: null,
      },
    });
    console.log(` - Reset milestone workStatus to UPCOMING and state to NOT_STARTED`);

    // 6. Reset workspace messages & tasks
    const conv = await tx.workspaceConversation.findUnique({ where: { projectId } });
    if (conv) {
      await tx.workspaceMessage.deleteMany({ where: { conversationId: conv.id } });
      await tx.workspaceTask.deleteMany({ where: { conversationId: conv.id } });
      await tx.workspaceMeeting.deleteMany({ where: { conversationId: conv.id } });
      await tx.workspaceDecision.deleteMany({ where: { conversationId: conv.id } });
      await tx.workspaceConversation.update({
        where: { id: conv.id },
        data: { agreementHash: "canonical_v1.0_pending" },
      });
      console.log(` - Cleared workspace conversation messages, tasks, and meetings`);
    }

    // 7. Reset project state to MATCHING
    await tx.project.update({
      where: { id: projectId },
      data: { state: ProjectState.MATCHING },
    });
    console.log(` - Updated project state to MATCHING (Finding Freelancers)`);
  });

  console.log("🎉 TerraShield project successfully reset to unapproved stage in live Neon database!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Reset error:", err);
  process.exit(1);
});

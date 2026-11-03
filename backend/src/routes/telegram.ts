import { Router, Request, Response } from "express";
import { telegramService } from "../services/telegramService.js";
import prisma from "../prisma.js";

const router = Router();

/**
 * POST /api/telegram/webhook
 * Inbound webhook receiving Telegram updates
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const update = req.body;
    const result = await telegramService.handleWebhookUpdate(update);
    res.json({ ok: true, result });
  } catch (err: any) {
    console.error("[TelegramRouter] Webhook error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/telegram/link
 * Generates the deep link for user to pair their Telegram account
 */
router.get("/link", async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || "usr_client_alex";
    const deepLink = telegramService.getDeepLink(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramChatId: true,
        telegramUsername: true,
        telegramNotifications: true,
      },
    });

    res.json({
      success: true,
      data: {
        deepLink,
        isLinked: !!user?.telegramChatId,
        telegramUsername: user?.telegramUsername,
        telegramNotifications: user?.telegramNotifications,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/telegram/disconnect
 * Disconnects paired Telegram account
 */
router.post("/disconnect", async (req: Request, res: Response) => {
  try {
    const userId = (req.body.userId as string) || "usr_client_alex";
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramNotifications: false,
      },
    });

    res.json({ success: true, message: "Telegram account disconnected." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;


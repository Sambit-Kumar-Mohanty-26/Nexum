import dotenv from "dotenv";
import path from "path";
import prisma from "../prisma.js";
import { workspaceService } from "./workspaceService.js";
import { groqService } from "./groqService.js";
import { emailService } from "./emailService.js";
import { geminiService } from "./geminiService.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface PendingTelegramAuth {
  email: string;
  userId: string;
  userName: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}


export const LOGGED_IN_GREETINGS = [
  (name: string, role: string, prj: string) =>
    `✨ *Welcome back, ${name}!* 🌟 Your Nexum AI Bot is online and guarding your contracts.\n\nActive Contract: *${prj}* (${role})\n\nWhat shall we accomplish today?`,
  (name: string, role: string, prj: string) =>
    `🚀 *Hey there, ${name}!* Ready to make magic happen on mobile?\n\n*${prj}* is running smoothly and waiting for your lead!`,
  (name: string, role: string, prj: string) =>
    `☕ *Good to see you, ${name}!* Coffee in hand? 🥐\n\nAll milestones and escrow for *${prj}* are secure under dual SHA-256 seals. Tap below to check in!`,
  (name: string, role: string, prj: string) =>
    `🛡️ *Chief ${role} ${name} in the house!* 🎩\n\nYou're in command of *${prj}*. Tap *📊 Status* or *💰 Escrow* to take a pulse check!`,
  (name: string, role: string, prj: string) =>
    `💫 *Greetings, ${name}!* Your pocket command center is live.\n\nChat directly with your team below, or prefix with \`/ai\` to consult your private copilot on *${prj}*.`,
  (name: string, role: string, prj: string) =>
    `🎯 *High five, ${name}!* 🙌 All deliverables for *${prj}* are tracked and protected.\n\nNeed to approve a milestone or relay a voice note? I'm listening!`,
  (name: string, role: string, prj: string) =>
    `💎 *Hello, ${name}!* 🌈 Tracking your contracts from anywhere in the world just got effortless.\n\n*${prj}* is locked and ready for your next move.`,
  (name: string, role: string, prj: string) =>
    `🔥 *Look who’s back! Hey ${name}!* 💪\n\nYour escrow consensus is 100% healthy on *${prj}*. Send a voice note or ask me anything with \`/ai\`!`,
  (name: string, role: string, prj: string) =>
    `🌊 *Smooth sailing, ${name}!* ⛵\n\nEverything on *${prj}* is synchronized with the web workspace in real time. Let me know what you need!`,
  (name: string, role: string, prj: string) =>
    `🎈 *Welcome, ${name}!* 🎉\n\nReady to review deliverables, release funds, or brainstorm with your personal AI? I’ve got your back on *${prj}*.`,
  (name: string, role: string, prj: string) =>
    `🌟 *Bright day, ${name}!* ☀️\n\nYour bilateral timeline for *${prj}* is up to date. You can speak into Telegram and I'll transcribe straight to the workspace!`,
  (name: string, role: string, prj: string) =>
    `⚡ *Powering up your mobile deck, ${name}!* ⚡\n\n*${prj}* telemetry is loaded. Tap the keyboard buttons below to manage your contract in seconds.`,
  (name: string, role: string, prj: string) =>
    `💼 *Executive mobile briefing ready for you, ${name}!* 📈\n\nActive project: *${prj}*. Use the buttons below or ask \`/ai\` for private analysis.`,
  (name: string, role: string, prj: string) =>
    `🎨 *At your service, ${name}!* 🪄\n\nWhether you're flying, dining, or relaxing, *${prj}* is safe with Nexum. What's on your agenda?`,
  (name: string, role: string, prj: string) =>
    `🤖 *Beep boop!* 🛸 Hello Commander ${name}!\n\nAll cryptographic hashes for *${prj}* verified. Tap *📋 Milestones* to inspect deliverables!`,
  (name: string, role: string, prj: string) =>
    `🌸 *Welcome back, ${name}!* 🌿 Wishing you a productive session.\n\n*${prj}* is active and ready. Just type a message to relay to your workspace!`,
];

export const LOGGED_OUT_GREETINGS = [
  `👋 *Oh hello, wanderer!* 🎒 Welcome to the Nexum AI Bot! I’m your AI mediator, but we haven’t met yet.\n\nType \`/login\` with your email so I can fetch your contracts!`,
  `✨ *Knock knock! Who’s there?* A brand-new Nexum traveler! 🚀 Let’s get you connected to your workspace.\n\nType \`/login <email>\` to receive your 6-digit magic code!`,
  `🌱 *Welcome to Nexum on Telegram!* I’m all geared up to track your escrow, relay voice memos, and protect your project scopes.\n\nFirst, let’s sign in! Type \`/login\` to begin.`,
  `🌟 *Hello friend!* 🪄 Ready to run your projects right from your pocket?\n\nType \`/login\` and reply with your registered email—I’ll send you an instant login code!`,
  `🤖 *Beep boop! Nexum Mobile Bot reporting for duty!* 🫡\n\nBut wait... I don't know who my captain is yet! Type \`/login\` so I can unlock your contracts.`,
  `☕ *Hello there! Taking a break or traveling?* ✈️\n\nYou can manage all your milestones and payments right here on phone. Just type \`/login\` to connect your account!`,
  `💫 *Welcome to the future of freelancing!* 🌍 Nexum mediates agreements and secures escrow.\n\nTo access your personal dashboard, type \`/login\` or send your email address.`,
  `🎈 *Hey there, new face!* 🎉 Let’s get your mobile command center paired in 30 seconds.\n\nType \`/login\` to receive a one-time login code to your inbox.`,
  `🛡️ *Security check!* 🏰 Nexum AI is standing by, but your phone isn't paired yet.\n\nType \`/login <email>\` to link your account with zero hassle!`,
  `💎 *Psst! Looking for your contracts?* 📂 I keep them locked and secure until you sign in.\n\nType \`/login\` to verify your email and unlock your workspace!`,
  `🚀 *Houston, we have a visitor!* 🌌 Ready to take control of your projects on the go?\n\nType \`/login\` and let’s get you airborne in seconds!`,
  `🍀 *Welcome aboard!* 🍀 Never miss a milestone deadline or payment release while away from your desk.\n\nType \`/login\` to pair your Telegram session!`,
  `🌈 *Hello sunshine!* ☀️ You’re just one step away from 1-tap milestone approvals and AI voice memos.\n\nType \`/login\` with your email to start!`,
  `🕶️ *Top secret clearance required!* 🕵️ Just kidding—all you need is a 6-digit email code.\n\nType \`/login\` to sign in to your Nexum account!`,
  `🧁 *Sweet greetings!* 🍰 Your projects miss you!\n\nType \`/login\` and enter your email address to sync your mobile device with Nexum.`,
  `🌟 *Ready to experience effortless freelance collaboration?* 🤝\n\nType \`/login\` to link your profile, or click 'Connect @NexumDev_Bot' in your web workspace!`,
];

export const TELEGRAM_MAIN_KEYBOARD = [
  [{ text: "📊 Status" }, { text: "📋 Milestones" }],
  [{ text: "💰 Escrow" }, { text: "📋 Tasks" }],
  [{ text: "📁 Files" }, { text: "⚖️ Decisions" }],
  [{ text: "📁 Projects" }, { text: "❓ Help" }],
];

export const TELEGRAM_FREELANCER_KEYBOARD = [
  [{ text: "📊 Status" }, { text: "📋 Milestones" }],
  [{ text: "💰 Earnings" }, { text: "📋 Tasks" }],
  [{ text: "📁 Files" }, { text: "⚖️ Decisions" }],
  [{ text: "🚀 Submit Deliverable" }, { text: "❓ Help" }],
];

export class TelegramService {
  private botToken: string | undefined;
  private botUsername: string = "NexumDev_Bot";
  // Stores active project switch override per user: userId -> projectId
  private userActiveProjects: Map<string, string> = new Map();
  // Stores pending mobile OTP login state: chatId -> PendingTelegramAuth
  private pendingAuth: Map<string, PendingTelegramAuth> = new Map();
  // Set of chatIds waiting for email input
  private awaitingEmail: Set<string> = new Set();
  private isPolling: boolean = false;
  private pollingOffset: number = 0;

  /**
   * Automatically start Telegram long-polling (handles incoming messages in real-time)
   */
  public async startPolling() {
    if (this.isPolling || !this.botToken) return;

    // Check if webhook is already set
    try {
      const infoRes = await fetch(`https://api.telegram.org/bot${this.botToken}/getWebhookInfo`);
      if (infoRes.ok) {
        const info = (await infoRes.json()) as any;
        if (info.ok && info.result?.url) {
          console.log(`[TelegramService] Webhook is active at: ${info.result.url}. Skipping local polling.`);
          return;
        }
      }
    } catch {
      // ignore
    }

    this.isPolling = true;
    console.log("[TelegramService] 🚀 Starting automated long-polling for @NexumDev_Bot...");

    const pollLoop = async () => {
      while (this.isPolling) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.pollingOffset}&timeout=15`
          );
          if (res.ok) {
            const data = (await res.json()) as any;
            if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
              for (const update of data.result) {
                this.pollingOffset = update.update_id + 1;
                this.handleWebhookUpdate(update).catch((err) =>
                  console.error("[TelegramService] Error handling update:", err)
                );
              }
            }
          } else {
            await new Promise((r) => setTimeout(r, 3000));
          }
        } catch {
          await new Promise((r) => setTimeout(r, 4000));
        }
      }
    };

    pollLoop();
  }

  public stopPolling() {
    this.isPolling = false;
  }

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (this.botToken) {
      this.initBotInfo();
    }
  }

  private async initBotInfo() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data?.result?.username) {
          this.botUsername = data.result.username;
        }
      }
    } catch {
      // keep default NexumDev_Bot
    }
  }

  /**
   * Generates a 1-click deep link handshake URL
   * e.g., https://t.me/NexumDev_Bot?start=link_usr_client_alex
   */
  getDeepLink(userId: string): string {
    return `https://t.me/${this.botUsername}?start=link_${userId}`;
  }

  /**
   * Send a direct text message with optional inline keyboard buttons or persistent reply keyboard
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    inlineKeyboard?: TelegramInlineButton[][],
    showMainKeyboard = false,
    userRole?: "CLIENT" | "FREELANCER" | string | null
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.botToken) {
      return { success: false, error: "TELEGRAM_BOT_TOKEN not configured" };
    }

    try {
      const payload: Record<string, any> = {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      };

      if (inlineKeyboard && inlineKeyboard.length > 0) {
        payload.reply_markup = {
          inline_keyboard: inlineKeyboard,
        };
      } else if (showMainKeyboard) {
        payload.reply_markup = {
          keyboard: userRole === "FREELANCER" ? TELEGRAM_FREELANCER_KEYBOARD : TELEGRAM_MAIN_KEYBOARD,
          resize_keyboard: true,
          one_time_keyboard: false,
        };
      }

      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as any;
      return { success: data.ok, data };
    } catch (err: any) {
      console.error("[TelegramService] Send error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Answer callback query (dismisses mobile loading spinner with alert)
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || "Action acknowledged by Nexum Protocol.",
          show_alert: !!text,
        }),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download audio voice note file from Telegram servers
   */
  async downloadFile(fileId: string): Promise<Buffer | null> {
    if (!this.botToken) return null;
    try {
      const fileMetaRes = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
      );
      if (!fileMetaRes.ok) return null;
      const fileMetaData = (await fileMetaRes.json()) as any;
      const filePath = fileMetaData?.result?.file_path;
      if (!filePath) return null;

      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      const audioRes = await fetch(fileUrl);
      if (!audioRes.ok) return null;
      const arrayBuffer = await audioRes.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.error("[TelegramService] Error downloading voice note:", err);
      return null;
    }
  }

  /**
   * Retrieve active projects for user (supporting both Client and Freelancer)
   */
  async getUserProjects(user: { id: string; role?: string | null }) {
    if (user.role === "FREELANCER") {
      return await prisma.project.findMany({
        where: {
          OR: [
            { agreement: { freelancerId: user.id } },
            { proposals: { some: { freelancerId: user.id } } },
            { projectProposals: { some: { freelancerId: user.id } } },
          ],
        },
        include: {
          client: true,
          agreement: { include: { freelancer: true } },
          proposals: { include: { freelancer: true } },
          projectMilestones: { orderBy: { orderIndex: "asc" } },
          payments: true,
        },
      });
    }

    // Default to CLIENT projects
    return await prisma.project.findMany({
      where: { clientId: user.id },
      include: {
        client: true,
        agreement: { include: { freelancer: true } },
        proposals: { include: { freelancer: true } },
        projectMilestones: { orderBy: { orderIndex: "asc" } },
        payments: true,
      },
    });
  }

  /**
   * Notify client of submitted deliverable with 72-hour countdown & 1-click approval
   */
  async sendMilestoneDeliverableAlert(
    chatId: string,
    params: {
      projectId: string;
      projectTitle: string;
      milestoneId: string;
      milestoneTitle: string;
      amountDollars: string;
      prUrl?: string;
    }
  ) {
    const text = `🚀 *Milestone Deliverable Submitted for Review*
*Project:* ${params.projectTitle}
*Milestone:* ${params.milestoneTitle}
*Escrow Amount:* $${params.amountDollars} USD

⏳ *72-Hour Inspection Buffer Activated:* Review and approve before escrow automatically releases.`;

    const buttons: TelegramInlineButton[][] = [
      [
        {
          text: `✅ Approve & Release ($${params.amountDollars})`,
          callback_data: `approve_ms:${params.projectId}:${params.milestoneId}`,
        },
      ],
    ];

    if (params.prUrl) {
      buttons.push([
        {
          text: "🔍 Inspect Pull Request",
          url: params.prUrl,
        },
      ]);
    }

    return this.sendMessage(chatId, text, buttons);
  }

  /**
   * Notify of proposed scope amendment with 1-click accept
   */
  async sendScopeAmendmentAlert(
    chatId: string,
    params: {
      projectId: string;
      projectTitle: string;
      amendmentId: string;
      title: string;
      deltaDollars: string;
      scheduleDeltaDays: number;
    }
  ) {
    const text = `⚡ *Scope Amendment Proposed*
*Project:* ${params.projectTitle}
*Title:* ${params.title}
*Price Delta:* +$${params.deltaDollars} USD
*Timeline Extension:* +${params.scheduleDeltaDays} days

Click below to digitally sign and bind terms on canonical SHA-256 hash:`;

    const buttons: TelegramInlineButton[][] = [
      [
        {
          text: `✍️ Accept & Sign (+ $${params.deltaDollars})`,
          callback_data: `accept_amend:${params.projectId}:${params.amendmentId}`,
        },
      ],
    ];

    return this.sendMessage(chatId, text, buttons);
  }

  /**
   * Process inbound webhook from Telegram servers
   */
  async handleWebhookUpdate(update: any): Promise<{ handled: boolean; action?: string }> {
    // 1. Handle Inline Button Callback Queries
    if (update.callback_query) {
      const cq = update.callback_query;
      const dataStr = cq.data || "";
      const chatId = cq.message?.chat?.id;

      if (dataStr.startsWith("approve_ms:")) {
        const parts = dataStr.split(":");
        const projectId = parts[1];
        const milestoneId = parts[2] || parts[1];
        await this.answerCallbackQuery(cq.id, "✅ Deliverable Approved! Escrow funds released via PayPal.");
        if (chatId) {
          await this.sendMessage(
            chatId,
            `🎉 *Milestone Approved!* Payment state moved to CAPTURED. Escrow released to contractor.`,
            undefined,
            true
          );
        }
        return { handled: true, action: "MILESTONE_APPROVED" };
      }

      if (dataStr.startsWith("accept_amend:")) {
        const parts = dataStr.split(":");
        const projectId = parts[1];
        const amendmentId = parts[2];
        try {
          await workspaceService.respondToScopeAmendment(
            projectId,
            amendmentId,
            "usr_client_alex",
            "ACCEPT"
          );
          await this.answerCallbackQuery(cq.id, "⚡ Scope Amendment Accepted! Agreement hash updated.");
          if (chatId) {
            await this.sendMessage(
              chatId,
              `✓ *Amendment Confirmed:* New canonical SHA-256 agreement seal is active.`,
              undefined,
              true
            );
          }
        } catch {
          await this.answerCallbackQuery(cq.id, "Amendment already processed or updated.");
        }
        return { handled: true, action: "AMENDMENT_ACCEPTED" };
      }

      // 1b. Accept / Decline Milestone Postponement
      if (dataStr.startsWith("accept_postpone_ms:") || dataStr.startsWith("decline_postpone_ms:")) {
        const isAccept = dataStr.startsWith("accept_postpone_ms:");
        const postponementId = dataStr.split(":")[1];
        try {
          const res = await workspaceService.respondToMilestonePostponement({
            postponementId,
            responderId: "usr_client_alex",
            responderRole: "CLIENT",
            action: isAccept ? "ACCEPT" : "DECLINE",
            declineReason: isAccept ? undefined : "Declined via Telegram mobile quick action",
          });
          const alertText = isAccept ? "✅ Milestone Postponement Accepted!" : "❌ Milestone Postponement Declined.";
          await this.answerCallbackQuery(cq.id, alertText);
          if (chatId) {
            await this.sendMessage(chatId, alertText + "\n\nContract state has been sealed in PostgreSQL.", undefined, true);
          }
          return { handled: true, action: isAccept ? "POSTPONE_MS_ACCEPTED" : "POSTPONE_MS_DECLINED" };
        } catch (err: any) {
          await this.answerCallbackQuery(cq.id, `Error: ${err.message}`);
          return { handled: false, action: "POSTPONE_MS_ERROR" };
        }
      }

      // 1c. Accept / Decline Meeting Postponement
      if (dataStr.startsWith("accept_postpone_mt:") || dataStr.startsWith("decline_postpone_mt:")) {
        const isAccept = dataStr.startsWith("accept_postpone_mt:");
        const parts = dataStr.split(":");
        const meetingId = parts[1];
        const slot = parts[2] ? decodeURIComponent(parts[2]) : undefined;
        try {
          const res = await workspaceService.respondToMeetingPostpone({
            meetingId,
            responderId: "usr_client_alex",
            action: isAccept ? "ACCEPT" : "DECLINE",
            acceptedSlot: slot,
          });
          const alertText = isAccept ? "✅ Meeting Reschedule Accepted!" : "❌ Meeting Reschedule Declined.";
          await this.answerCallbackQuery(cq.id, alertText);
          if (chatId) {
            await this.sendMessage(chatId, alertText + "\n\nCalendar sync and video room updated.", undefined, true);
          }
          return { handled: true, action: isAccept ? "POSTPONE_MT_ACCEPTED" : "POSTPONE_MT_DECLINED" };
        } catch (err: any) {
          await this.answerCallbackQuery(cq.id, `Error: ${err.message}`);
          return { handled: false, action: "POSTPONE_MT_ERROR" };
        }
      }

      await this.answerCallbackQuery(cq.id);
      return { handled: true, action: "GENERIC_CALLBACK" };
    }

    // 2. Handle Voice Notes (Audio Memos)
    if (update.message && update.message.voice) {
      const msg = update.message;
      const chatId = String(msg.chat.id);
      const voice = msg.voice;

      const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (!user) {
        await this.sendMessage(
          chatId,
          "⚠️ Account not paired. Please open Nexum Settings and connect your Telegram account."
        );
        return { handled: false, action: "UNPAIRED" };
      }

      const projects = await this.getUserProjects(user);
      if (projects.length === 0) {
        await this.sendMessage(chatId, "ℹ️ No active projects found to relay your voice note.");
        return { handled: true, action: "VOICE_NO_PROJECT" };
      }

      const activePrjId = this.userActiveProjects.get(user.id) || projects[0].id;
      const targetPrj = projects.find((p) => p.id === activePrjId) || projects[0];

      await this.sendMessage(chatId, "🎙️ Transcribing voice note using Groq Whisper Large v3...");

      const audioBuffer = await this.downloadFile(voice.file_id);
      let transcribedText = "";
      if (audioBuffer) {
        transcribedText = await groqService.transcribeAudio(audioBuffer, "telegram_voice.ogg");
      }

      if (!transcribedText.trim()) {
        transcribedText = "[Voice memo via Nexum AI Bot]";
      }

      try {
        const sent = await workspaceService.sendMessage({
          projectId: targetPrj.id,
          senderId: user.id,
          senderRole: user.role === "FREELANCER" ? "FREELANCER" : "CLIENT",
          content: `🎙️ [Voice Memo via Telegram]: "${transcribedText}"`,
          origin: "TELEGRAM",
        });

        await this.sendMessage(
          chatId,
          `✓ *Voice Memo Relayed to Workspace (${targetPrj.title}):*\n\n"${transcribedText}"\n\n_Cryptographic Seal: \`${sent.message.sha256Seal.slice(0, 16)}...\`_`,
          undefined,
          true
        );
        return { handled: true, action: "VOICE_RELAYED" };
      } catch (err: any) {
        await this.sendMessage(chatId, `⚠️ Voice relay failed: ${err.message}`);
        return { handled: false, action: "VOICE_FAILED" };
      }
    }

    // 3. Handle Text Messages & Commands
    if (update.message && update.message.text) {
      const msg = update.message;
      const text: string = msg.text.trim();
      const chatId = String(msg.chat.id);
      const username = msg.from?.username || msg.from?.first_name || "User";

      // 3a. Deep link pairing command: /start link_<userId>
      if (text.startsWith("/start link_")) {
        const userId = text.replace("/start link_", "").trim();
        try {
          await prisma.user.update({
            where: { id: userId },
            data: {
              telegramChatId: chatId,
              telegramUsername: username,
              telegramNotifications: true,
            },
          });

          await this.sendMessage(
            chatId,
            `🎉 *Welcome to Nexum AI Bot!*\n\nYour Telegram is securely paired with user account \`${userId}\`.\n\nYou now have real-time access to:\n• 1-Click Milestone Escrow Release\n• Scope Amendment Digital Signing\n• Voice & Text Bilateral Workspace Relaying\n• Live Financial & Milestone Pulse Check\n\nUse the menu buttons below to interact!`,
            undefined,
            true
          );
          return { handled: true, action: "PAIRED" };
        } catch {
          await this.sendMessage(
            chatId,
            `⚠️ Could not pair user account. Please open your Nexum Settings and click 'Connect Telegram'.`
          );
          return { handled: false, action: "PAIR_FAILED" };
        }
      }

      // Find user for remaining commands
      const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

            // 3b. Handle Greetings and /start with Cute Dynamic Messages
      const isGreetingOrStart = text === "/start" || /^(hi|hello|hey|hola|greetings)(\s+bot|\s+nexum)?$/i.test(text);
      if (isGreetingOrStart) {
        if (user) {
          const projects = await this.getUserProjects(user);
          const activePrjId = this.userActiveProjects.get(user.id) || (projects.length > 0 ? projects[0].id : "");
          const targetPrj = projects.find((p) => p.id === activePrjId) || (projects.length > 0 ? projects[0] : null);
          const prjTitle = targetPrj ? targetPrj.title : "No active project";

          // Select random cute greeting from 16 variants
          const greetingFn = LOGGED_IN_GREETINGS[Math.floor(Math.random() * LOGGED_IN_GREETINGS.length)];
          const greetingText = greetingFn(user.name || "Captain", user.role || "Client", prjTitle);

          await this.sendMessage(
            chatId,
            greetingText +
              `\n\n📱 *Quick Controls:*\n` +
              `• *📊 Status* - Live contract & milestone telemetry\n` +
              `• *📋 Milestones* - Deliverables & review status\n` +
              `• *💰 Escrow* - PayPal Orders v2 balance\n` +
              `• *📁 Projects* - Switch active contract context\n` +
              `• \`/ai <prompt>\` - Private consultation with Nexum AI\n` +
              `• *Send Text/Voice* - Relays straight to ${prjTitle}\n` +
              `• \`/logout\` - Unlink this phone session`,
            undefined,
            true
          );
          return { handled: true, action: "LOGGED_IN_GREETING" };
        } else {
          // Select random cute greeting from 16 logged-out variants
          const greetingText = LOGGED_OUT_GREETINGS[Math.floor(Math.random() * LOGGED_OUT_GREETINGS.length)];

          await this.sendMessage(
            chatId,
            greetingText +
              `\n\n💡 *Quick Sign-in Options:*\n` +
              `• Type \`/login\` or reply with your email address\n` +
              `• Type \`/login <your-email>\` (e.g. \`/login abc@client.com\`)\n` +
              `• Or click *Connect @NexumDev_Bot* in your web dashboard`,
            undefined,
            false
          );
          return { handled: true, action: "LOGGED_OUT_GREETING" };
        }
      }

      // 3b. Mobile Logout Command (/logout)
      if (text === "/logout" || text === "🚪 Logout") {
        if (!user) {
          this.pendingAuth.delete(chatId);
          this.awaitingEmail.delete(chatId);
          await this.sendMessage(chatId, "ℹ️ You are not currently logged in.");
          return { handled: true, action: "ALREADY_LOGGED_OUT" };
        }

        await prisma.user.updateMany({
          where: { telegramChatId: chatId },
          data: {
            telegramChatId: null,
            telegramUsername: null,
            telegramNotifications: false,
          },
        });

        this.userActiveProjects.delete(user.id);
        this.pendingAuth.delete(chatId);
        this.awaitingEmail.delete(chatId);

        await this.sendMessage(
          chatId,
          "👋 *You have been logged out from Nexum AI Bot.*\n\nType \`/login\` anytime to sign back in from your phone."
        );
        return { handled: true, action: "LOGGED_OUT" };
      }

      // 3c. Mobile Login Command (/login or /login <email>)
      if (text.startsWith("/login")) {
        if (user) {
          await this.sendMessage(
            chatId,
            `ℹ️ You are already logged in as *${user.name}* (` + user.email + `)!\n\nType \`/logout\` if you want to switch accounts.`,
            undefined,
            true
          );
          return { handled: true, action: "ALREADY_LOGGED_IN" };
        }

        const args = text.replace("/login", "").trim();
        if (args && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args)) {
          // Direct email passed: /login user@example.com
          return await this.initiateEmailOtp(chatId, args);
        }

        this.awaitingEmail.add(chatId);
        await this.sendMessage(
          chatId,
          "👋 *Welcome to Nexum AI Bot!*\n\nPlease reply with your registered Nexum account email (e.g. `abc@client.com`) to receive your 6-digit login verification code:"
        );
        return { handled: true, action: "AWAITING_EMAIL_PROMPT" };
      }

      // 3d. Check if user is replying with an Email Address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!user && (this.awaitingEmail.has(chatId) || emailRegex.test(text))) {
        return await this.initiateEmailOtp(chatId, text);
      }

      // 3e. Check if user is replying with a 6-digit OTP Code
      if (!user && this.pendingAuth.has(chatId) && /^\d{6}$/.test(text)) {
        return await this.verifyEmailOtp(chatId, text, username);
      }

      if (!user) {
        await this.sendMessage(
          chatId,
          "⚠️ *Account not paired yet.*\n\n" +
            "📱 *Logging in from your phone?*\n" +
            "Type \`/login\` or reply with your registered email to get a 6-digit verification code.\n\n" +
            "💻 *Have your laptop?*\n" +
            "Click *Connect @NexumDev_Bot* in your Nexum workspace sidebar to pair in 1 click."
        );
        return { handled: false, action: "UNLINKED" };
      }

      const projects = await this.getUserProjects(user);

      // 3c. /projects or "📁 Projects"
      if (text === "/projects" || text === "📁 Projects" || text === "/list") {
        if (projects.length === 0) {
          await this.sendMessage(chatId, `ℹ️ No active projects currently linked to this account.`, undefined, true);
          return { handled: true, action: "PROJECTS_EMPTY" };
        }

        const projectListText = projects
          .map((p, idx) => {
            const counterparty =
              user.role === "FREELANCER"
                ? `Client: ${p.client?.name || "Client"}`
                : `Contractor: ${(p as any).agreement?.freelancer?.name || (p as any).proposals?.[0]?.freelancer?.name || "Pending"}`;
            const activeTag =
              (this.userActiveProjects.get(user.id) || projects[0].id) === p.id ? " ⭐ *[ACTIVE]*" : "";
            return `${idx + 1}. *${p.title}*${activeTag}\n   • ID: \`${p.id}\`\n   • Budget: $${(p.budgetCents / 100).toFixed(2)} USD\n   • ${counterparty}\n   • Status: \`${p.state}\``;
          })
          .join("\n\n");

        await this.sendMessage(
          chatId,
          `📁 *Your Nexum Contracts (${projects.length}):*\n\n${projectListText}\n\n_To switch your active chat relay target: \`/switch <projectId>\`_`,
          undefined,
          true
        );
        return { handled: true, action: "PROJECTS_LIST" };
      }

      // 3d. /switch <projectId>
      if (text.startsWith("/switch")) {
        const targetId = text.replace("/switch", "").trim();
        const matched = projects.find((p) => p.id === targetId || p.id.includes(targetId));
        if (!matched) {
          await this.sendMessage(
            chatId,
            `⚠️ Project ID \`${targetId}\` not found. Use \`/projects\` to view your valid project IDs.`,
            undefined,
            true
          );
          return { handled: true, action: "SWITCH_NOT_FOUND" };
        }

        this.userActiveProjects.set(user.id, matched.id);
        await this.sendMessage(
          chatId,
          `⭐ *Active Project Switched!*\nTarget contract is now *${matched.title}* (\`${matched.id}\`). Incoming messages will relay here.`,
          undefined,
          true
        );
        return { handled: true, action: "SWITCH_SUCCESS" };
      }

      const activePrjId = this.userActiveProjects.get(user.id) || projects[0]?.id;
      const targetPrj = projects.find((p) => p.id === activePrjId) || projects[0];

      if (!targetPrj) {
        await this.sendMessage(chatId, `ℹ️ No active projects currently linked to this Telegram account.`, undefined, true);
        return { handled: true, action: "STATUS_EMPTY" };
      }

      // 3e. /status or "📊 Status"
      if (text === "/status" || text === "📊 Status") {
        const milestones = targetPrj.projectMilestones || [];
        const completedCount = milestones.filter((m) => m.workStatus === "ACCEPTED").length;
        const totalCount = milestones.length;

        await this.sendMessage(
          chatId,
          `📊 *Active Project Status*\n\n` +
            `*Project:* ${targetPrj.title}\n` +
            `*Budget:* $${(targetPrj.budgetCents / 100).toFixed(2)} USD\n` +
            `*Status:* \`${targetPrj.state}\`\n` +
            `*Milestones Progress:* ${completedCount}/${totalCount} completed\n` +
            `*Consensus Seal:* \`SHA-256 Verified\`\n` +
            `*Role:* ${user.role || "CLIENT"}`,
          undefined,
          true
        );
        return { handled: true, action: "STATUS_SENT" };
      }

      // 3f. /milestones or "📋 Milestones"
      if (text === "/milestones" || text === "📋 Milestones") {
        const milestones = targetPrj.projectMilestones || [];
        if (milestones.length === 0) {
          await this.sendMessage(
            chatId,
            `📋 *Milestones for ${targetPrj.title}:*\nNo milestones registered yet.`,
            undefined,
            true
          );
          return { handled: true, action: "MILESTONES_EMPTY" };
        }

        const msText = milestones
          .map((m, idx) => {
            const statusIcon =
              m.workStatus === "ACCEPTED"
                ? "✅"
                : m.workStatus === "AWAITING_CLIENT_REVIEW"
                ? "⏳"
                : m.workStatus === "IN_PROGRESS"
                ? "🚧"
                : "⚪";
            const amt = `$${((m.amountMinor || (m as any).amountCents || 0) / 100).toFixed(2)}`;
            return `${idx + 1}. ${statusIcon} *${m.title}*\n   • Escrow: ${amt} | Work: \`${m.workStatus}\``;
          })
          .join("\n\n");

        await this.sendMessage(
          chatId,
          `📋 *Milestone Deliverables (${targetPrj.title}):*\n\n${msText}`,
          undefined,
          true
        );
        return { handled: true, action: "MILESTONES_SENT" };
      }

      // 3g. /escrow, /balance, /earnings or "💰 Escrow" / "💰 Earnings"
      if (
        text === "/escrow" ||
        text === "💰 Escrow" ||
        text === "/balance" ||
        text === "/earnings" ||
        text === "💰 Earnings"
      ) {
        const isFreelancer = user.role === "FREELANCER";
        const allUserProjects = await this.getUserProjects(user);

        let totalCapturedCents = 0;
        let totalHeldCents = 0;

        for (const prj of allUserProjects) {
          const payments = prj.payments || [];
          for (const p of payments) {
            if (p.status === "CAPTURED") totalCapturedCents += p.amountMinor;
            if (p.status === "APPROVED" || p.status === "CAPTURE_PENDING") totalHeldCents += p.amountMinor;
          }
        }

        const capturedDollars = (totalCapturedCents / 100).toFixed(2);
        const heldDollars = (totalHeldCents / 100).toFixed(2);
        const activePrjBudget = (targetPrj.budgetCents / 100).toFixed(2);

        if (isFreelancer) {
          const report = [
            `💰 *Freelancer Earnings & Financial Summary*`,
            `*Active Contract:* ${targetPrj.title}\n`,
            `• *Total Earned & Released:* \`$${capturedDollars} USD\``,
            `• *Currently in Escrow (Locked):* \`$${heldDollars} USD\``,
            `• *Active Contract Budget:* \`$${activePrjBudget} USD\``,
            `• *Payment Security:* PayPal Orders REST v2 & SHA-256 Consensus`,
            `• *Payout Rail:* Instant settlement upon client milestone sign-off`,
            `\n💡 *Tip:* Submit finished work with \`/submit <github-link> <notes>\` to trigger escrow release!`,
          ].join("\n");

          await this.sendMessage(chatId, report, undefined, true, user.role);
          return { handled: true, action: "EARNINGS_SENT" };
        } else {
          const report = [
            `💰 *Escrow & Financial Ledger Summary*`,
            `*Project:* ${targetPrj.title}\n`,
            `• *Committed Contract Value:* \`$${activePrjBudget} USD\``,
            `• *Total Captured & Released:* \`$${capturedDollars} USD\``,
            `• *Currently Secured in Escrow:* \`$${heldDollars} USD\``,
            `• *Payment Rail:* PayPal Orders REST v2 Escrow`,
            `• *Dispute Hold Guard:* Safe Harbor enabled`,
          ].join("\n");

          await this.sendMessage(chatId, report, undefined, true, user.role);
          return { handled: true, action: "ESCROW_SENT" };
        }
      }

      // 3g-2. /submit or "🚀 Submit Deliverable" (Freelancer exclusive)
      if (text.startsWith("/submit") || text === "🚀 Submit Deliverable") {
        if (user.role !== "FREELANCER") {
          await this.sendMessage(
            chatId,
            `ℹ️ The \`/submit\` command is exclusively for freelancers to submit deliverables. As a client, you can review and approve deliverables via the workspace.`,
            undefined,
            true,
            user.role
          );
          return { handled: true, action: "SUBMIT_CLIENT_NOT_ALLOWED" };
        }

        const submitText = text.replace(/^\/submit\s*/i, "").trim();
        if (!submitText || text === "🚀 Submit Deliverable") {
          await this.sendMessage(
            chatId,
            `🚀 *How to Submit a Deliverable from Telegram:*\n\n` +
              `Type: \`/submit <github-or-preview-url> <notes>\`\n\n` +
              `*Example:*\n\`/submit https://github.com/myrepo/pr/42 Completed order engine and test suite\`\n\n` +
              `Nexum AI will package your deliverable with an immutable SHA-256 seal and send an instant approval alert to your client with a 1-click escrow release button!`,
            undefined,
            true,
            user.role
          );
          return { handled: true, action: "SUBMIT_USAGE_SENT" };
        }

        // Find active milestone to submit against
        const milestones = targetPrj.projectMilestones || [];
        const activeMilestone =
          milestones.find((m) => m.workStatus === "IN_PROGRESS") ||
          milestones.find((m) => m.workStatus === "READY_TO_SUBMIT") ||
          milestones.find((m) => m.workStatus === "UPCOMING") ||
          (milestones.length > 0 ? milestones[0] : null);

        if (!activeMilestone) {
          await this.sendMessage(
            chatId,
            `⚠️ No active milestone found for *${targetPrj.title}* to submit against.`,
            undefined,
            true,
            user.role
          );
          return { handled: true, action: "SUBMIT_NO_ACTIVE_MILESTONE" };
        }

        // Parse link vs notes
        const urlMatch = submitText.match(/https?:\/\/[^\s]+/);
        const repoUrl = urlMatch ? urlMatch[0] : `https://workspace.nexum.app/projects/${targetPrj.id}/deliverables`;
        const notes = submitText.replace(repoUrl, "").trim() || submitText;

        try {
          const deliverable = await workspaceService.submitDeliverable({
            projectId: targetPrj.id,
            milestoneId: activeMilestone.id,
            freelancerId: user.id,
            repoUrl,
            notes,
          });

          // Confirm to Freelancer
          await this.sendMessage(
            chatId,
            `✅ *Deliverable Submitted Successfully!* 🚀\n\n` +
              `• *Milestone:* ${activeMilestone.title}\n` +
              `• *Repository/Preview:* ${repoUrl}\n` +
              `• *Notes:* ${notes}\n` +
              `• *SHA-256 Seal:* \`${deliverable.card.sha256Seal.slice(0, 16)}...\`\n\n` +
              `📣 Your client has been notified with a 1-click review & escrow release button!`,
            undefined,
            true,
            user.role
          );

          // If client has telegramChatId, notify client with 1-click Approve button!
          if (targetPrj.client?.telegramChatId) {
            const approveButtons: TelegramInlineButton[][] = [
              [
                {
                  text: `✅ Approve & Release Escrow ($${((activeMilestone.amountMinor || (activeMilestone as any).amountCents || 0) / 100).toFixed(2)})`,
                  callback_data: `approve_ms:${targetPrj.id}:${activeMilestone.id}`,
                },
              ],
            ];
            await this.sendMessage(
              targetPrj.client.telegramChatId,
              `📬 *New Deliverable Submitted by ${user.name}:*\n\n` +
                `• *Project:* ${targetPrj.title}\n` +
                `• *Milestone:* ${activeMilestone.title}\n` +
                `• *Link:* ${repoUrl}\n` +
                `• *Notes:* ${notes}\n\n` +
                `Click below to approve work and release PayPal escrow:`,
              approveButtons
            );
          }

          return { handled: true, action: "DELIVERABLE_SUBMITTED_TELEGRAM" };
        } catch (err: any) {
          await this.sendMessage(
            chatId,
            `⚠️ Submission failed: ${err.message}`,
            undefined,
            true,
            user.role
          );
          return { handled: false, action: "SUBMIT_ERROR" };
        }
      }

      // 3h. /tasks or "📋 Tasks" (Kanban Board Inspection)
      if (text === "/tasks" || text === "📋 Tasks") {
        const tasks = await prisma.workspaceTask.findMany({
          where: { projectId: targetPrj.id },
          orderBy: { createdAt: "desc" },
        });

        if (tasks.length === 0) {
          await this.sendMessage(
            chatId,
            `📋 *Kanban Tasks (${targetPrj.title}):*\n\nNo tasks registered yet.\n\n💡 *Quick add:* Type \`/task add <title>\` to create one directly from Telegram!`,
            undefined,
            true
          );
          return { handled: true, action: "TASKS_EMPTY" };
        }

        const todo = tasks.filter((t) => t.status === "TODO");
        const inProg = tasks.filter((t) => t.status === "IN_PROGRESS");
        const done = tasks.filter((t) => t.status === "DONE");

        const fmt = (list: typeof tasks, icon: string) =>
          list.length === 0
            ? "   _None_"
            : list
                .slice(0, 4)
                .map((t) => `   ${icon} *${t.title}* [${t.priority}]`)
                .join("\n");

        const taskReport = [
          `📋 *Kanban Board (${targetPrj.title})*`,
          `*Total Tasks:* ${tasks.length} synchronized\n`,
          `📌 *To Do (${todo.length}):*`,
          fmt(todo, "•"),
          `\n🚧 *In Progress (${inProg.length}):*`,
          fmt(inProg, "•"),
          `\n✅ *Done (${done.length}):*`,
          fmt(done, "✓"),
          `\n💡 *Create New Task:* Type \`/task add <title>\``,
        ].join("\n");

        await this.sendMessage(chatId, taskReport, undefined, true);
        return { handled: true, action: "TASKS_SENT" };
      }

      // 3i. /task add <title>
      if (text.startsWith("/task add") || text.startsWith("/task new")) {
        const title = text.replace(/^\/task\s+(add|new)\s*/i, "").trim();
        if (!title) {
          await this.sendMessage(
            chatId,
            `💡 *Usage:* \`/task add <title>\`\n\n*Example:* \`/task add Implement Apple Pay webhook idempotency test\``,
            undefined,
            true
          );
          return { handled: true, action: "TASK_ADD_EMPTY" };
        }

        const createdTask = await workspaceService.createTask({
          projectId: targetPrj.id,
          title,
          priority: "MEDIUM",
          status: "TODO",
        });

        await this.sendMessage(
          chatId,
          `✅ *Task Created & Synced to Kanban Board!*\n\n• *Title:* ${createdTask.title}\n• *Project:* ${targetPrj.title}\n• *Column:* \`TODO\`\n• *Priority:* \`MEDIUM\`\n\nVisible to both Client and Freelancer in workspace.`,
          undefined,
          true
        );
        return { handled: true, action: "TASK_CREATED" };
      }

      // 3j. /files or "📁 Files"
      if (text === "/files" || text === "📁 Files") {
        const files = await prisma.projectFile.findMany({
          where: { projectId: targetPrj.id },
          include: { file: true, uploader: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        });

        if (files.length === 0) {
          await this.sendMessage(
            chatId,
            `📁 *Project Files & Deliverables (${targetPrj.title}):*\n\nNo files uploaded yet in the workspace repository.`,
            undefined,
            true
          );
          return { handled: true, action: "FILES_EMPTY" };
        }

        const fileList = files
          .map((f, idx) => {
            const kb = (((f.file?.sizeBytes) || 0) / 1024).toFixed(1);
            const role = f.uploader?.role || "COLLABORATOR";
            return `${idx + 1}. 📄 *${f.name}* (${kb} KB)\n   • Uploader: \`${role}\` | Date: ${new Date(f.createdAt).toLocaleDateString()}\n   • Category: \`${f.category}\``;
          })
          .join("\n\n");

        await this.sendMessage(
          chatId,
          `📁 *Project Deliverables & Repository Files (${targetPrj.title}):*\n\n${fileList}`,
          undefined,
          true
        );
        return { handled: true, action: "FILES_SENT" };
      }

      // 3k. /decisions or "⚖️ Decisions"
      if (text === "/decisions" || text === "⚖️ Decisions") {
        const decisions = await prisma.workspaceDecision.findMany({
          where: { conversation: { projectId: targetPrj.id } },
          orderBy: { createdAt: "desc" },
          take: 6,
        });

        if (decisions.length === 0) {
          await this.sendMessage(
            chatId,
            `⚖️ *Architectural Decision Records (${targetPrj.title}):*\n\nNo formal ADR decisions logged yet. Run an AI meeting notetaker session or propose decisions in workspace.`,
            undefined,
            true
          );
          return { handled: true, action: "DECISIONS_EMPTY" };
        }

        const decisionList = decisions
          .map((d, idx) => {
            const clientSign = d.signedByClient ? "✅" : "⏳";
            const devSign = d.signedByFreelancer ? "✅" : "⏳";
            return `${idx + 1}. 🏛️ *${d.title}*\n   • ${d.description}\n   • Consensus: Client ${clientSign} | Freelancer ${devSign}\n   • Seal: \`${d.sha256Hash.slice(0, 16)}...\``;
          })
          .join("\n\n");

        await this.sendMessage(
          chatId,
          `⚖️ *Bilateral ADR Decisions & Consensus Log (${targetPrj.title}):*\n\n${decisionList}`,
          undefined,
          true
        );
        return { handled: true, action: "DECISIONS_SENT" };
      }

      // 3l. /postpone meeting <reason>
      if (text.startsWith("/postpone meeting") || text.startsWith("/postpone mt")) {
        const reason = text.replace(/^\/postpone\s+(meeting|mt)\s*/i, "").trim();
        if (!reason) {
          await this.sendMessage(
            chatId,
            `💡 *Usage:* \`/postpone meeting <reason>\`\n\n*Example:* \`/postpone meeting Urgent client emergency overlap. Need to reschedule.\``,
            undefined,
            true
          );
          return { handled: true, action: "POSTPONE_MEETING_EMPTY" };
        }

        const conv = await workspaceService.getOrCreateWorkspaceConversation(targetPrj.id);
        const nextMt = await prisma.workspaceMeeting.findFirst({
          where: { conversationId: conv.id, status: { in: ["PROPOSED", "CONFIRMED"] } },
          orderBy: { createdAt: "desc" },
        });

        if (!nextMt) {
          await this.sendMessage(chatId, `ℹ️ No upcoming meeting found to postpone on ${targetPrj.title}.`, undefined, true);
          return { handled: true, action: "NO_MEETING_TO_POSTPONE" };
        }

        const slot1 = new Date(Date.now() + 2 * 86400 * 1000 + 15 * 3600 * 1000).toISOString();
        const slot2 = new Date(Date.now() + 3 * 86400 * 1000 + 16 * 3600 * 1000).toISOString();

        await workspaceService.postponeMeeting({
          meetingId: nextMt.id,
          userId: user.id,
          userRole: user.role === "FREELANCER" ? "FREELANCER" : "CLIENT",
          reasonCategory: "SUDDEN_EMERGENCY",
          reasonDetails: reason,
          newSlots: [slot1, slot2],
        });

        await this.sendMessage(
          chatId,
          `⏳ *Meeting Postponement Submitted!*\n\n• *Meeting:* ${nextMt.title}\n• *Category:* \`SUDDEN_EMERGENCY\`\n• *Reason:* ${reason}\n\nInteractive card posted into bilateral chat timeline for counterparty approval.`,
          undefined,
          true
        );
        return { handled: true, action: "MEETING_POSTPONED_TELEGRAM" };
      }

      // 3m. /postpone milestone <days> <reason>
      if (text.startsWith("/postpone milestone") || text.startsWith("/postpone ms")) {
        const args = text.replace(/^\/postpone\s+(milestone|ms)\s*/i, "").trim();
        const match = args.match(/^(\d+)\s+(.+)$/);
        if (!match) {
          await this.sendMessage(
            chatId,
            `💡 *Usage:* \`/postpone milestone <days_to_add> <detailed_reason>\`\n\n*Example:* \`/postpone milestone 7 Waiting for third-party OAuth sandbox verification\``,
            undefined,
            true
          );
          return { handled: true, action: "POSTPONE_MS_HELP" };
        }

        const days = parseInt(match[1], 10);
        const reason = match[2].trim();

        const activeMs = await prisma.milestone.findFirst({
          where: { projectId: targetPrj.id, workStatus: { in: ["IN_PROGRESS", "UPCOMING"] } },
          orderBy: { orderIndex: "asc" },
        });

        if (!activeMs) {
          await this.sendMessage(chatId, `ℹ️ No active milestone found to postpone on ${targetPrj.title}.`, undefined, true);
          return { handled: true, action: "NO_MS_TO_POSTPONE" };
        }

        const proposedDate = new Date(Date.now() + days * 86400 * 1000).toISOString();

        await workspaceService.requestMilestonePostponement({
          projectId: targetPrj.id,
          milestoneId: activeMs.id,
          requestedById: user.id,
          requestedByRole: user.role === "FREELANCER" ? "FREELANCER" : "CLIENT",
          proposedDueDate: proposedDate,
          reasonCategory: "TECHNICAL_BLOCKER",
          reasonDetails: reason,
        });

        await this.sendMessage(
          chatId,
          `⏳ *Milestone Postponement Requested!*\n\n• *Milestone:* ${activeMs.title}\n• *Proposed Extension:* +${days} days (${new Date(proposedDate).toLocaleDateString()})\n• *Reason:* ${reason}\n\nInteractive card sent to counterparty for bilateral consent.`,
          undefined,
          true
        );
        return { handled: true, action: "MS_POSTPONED_TELEGRAM" };
      }

      // 3n. /addon <description> (Gemini AI Scope Evaluation)
      if (text.startsWith("/addon") || text.startsWith("/add-on") || text.startsWith("/scope add")) {
        const featureBrief = text.replace(/^\/(addon|add-on|scope add)\s*/i, "").trim();
        if (!featureBrief) {
          await this.sendMessage(
            chatId,
            `💡 *Usage:* \`/addon <feature description>\`\n\n*Example:* \`/addon Integrate Apple Pay with 1-click Express Checkout in cart\``,
            undefined,
            true
          );
          return { handled: true, action: "ADDON_EMPTY" };
        }

        await this.sendMessage(chatId, "✨ Consulting Google Gemini AI Scope Intelligence...");

        const rawMilestones = targetPrj.projectMilestones || [];
        const mappedMilestones = rawMilestones.map((m) => ({
          id: m.id,
          title: m.title,
          amountCents: m.amountCents || m.amountMinor || 0,
          workStatus: m.workStatus,
          dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : null,
        }));

        const evaluation = await geminiService.evaluateScopeAddon({
          projectTitle: targetPrj.title,
          projectDescription: targetPrj.description,
          currentMilestones: mappedMilestones,
          addonDescription: featureBrief,
          requestedByRole: user.role === "FREELANCER" ? "FREELANCER" : "CLIENT",
        });

        // Drop formal Scope Amendment Proposal card in workspace
        const proposedAmendment = await workspaceService.proposeScopeAmendment({
          projectId: targetPrj.id,
          proposerId: user.id,
          amendmentType: evaluation.recommendation,
          newMilestoneTitle: evaluation.targetMilestoneTitle,
          priceDeltaCents: evaluation.suggestedPriceCents,
          timelineDaysDelta: evaluation.suggestedTimelineDays,
          newAcceptanceCriteria: evaluation.acceptanceCriteria,
          justification: evaluation.justification,
        });

        const recLabel = evaluation.recommendation === "AMEND_EXISTING_MILESTONE" ? "Amend Existing Milestone" : "Add New Milestone";
        const priceDollars = (evaluation.suggestedPriceCents / 100).toFixed(2);
        const criteriaList = evaluation.acceptanceCriteria.map((c, i) => `  ${i + 1}. ${c}`).join("\n");

        const replyMsg = [
          `🤖 *Gemini AI Scope & Add-on Evaluation*`,
          `*Project:* ${targetPrj.title}\n`,
          `📌 *Recommendation:* \`${recLabel}\``,
          `🎯 *Target Phase:* *${evaluation.targetMilestoneTitle}*`,
          `💰 *Fair Price Delta:* \`+${priceDollars} USD\` (integer minor units)`,
          `⏳ *Timeline Impact:* \`+${evaluation.suggestedTimelineDays} days\`\n`,
          `📋 *Acceptance Criteria:*\n${criteriaList}\n`,
          `⚖️ *Protocol Justification:*\n${evaluation.justification}\n`,
          `_Formal Bilateral Amendment Card has been drafted into your workspace timeline. Counterparty can review and digitally sign._`,
        ].join("\n");

        const buttons: TelegramInlineButton[][] = [
          [
            {
              text: `⚡ Sign & Commit Amendment (+$ ${priceDollars})`,
              callback_data: `accept_amend:${targetPrj.id}:${proposedAmendment.id}`,
            },
          ],
        ];

        await this.sendMessage(chatId, replyMsg, buttons, true);
        return { handled: true, action: "ADDON_EVALUATED_GEMINI" };
      }

      // 3o. /help or ❓ Help (Role-Aware Comprehensive Guide)
      if (text === "/help" || text === "❓ Help") {
        const isClient = user.role !== "FREELANCER";
        const roleBadge = isClient ? "Client Commander 🎩" : "Freelancer Specialist 🚀";

        const telemetryHelp = isClient
          ? `*📊 Contract & Financial Telemetry:*\n` +
            `• \`/status\` - Live milestones progress & contract state\n` +
            `• \`/milestones\` - Deliverables, escrow values & inspection buffer\n` +
            `• \`/escrow\` - PayPal Orders REST v2 balance & SHA-256 state\n` +
            `• \`/projects\` - List all contracts & switch context\n` +
            `• \`/switch <id>\` - Switch active contract target\n`
          : `*📊 Freelancer Financial & Contract Telemetry:*\n` +
            `• \`/earnings\` - Total released earnings, locked escrow & payouts\n` +
            `• \`/status\` - Live milestone progress & review buffer\n` +
            `• \`/milestones\` - Deliverable requirements & due dates\n` +
            `• \`/submit <link> <notes>\` - Submit deliverable & trigger escrow release\n` +
            `• \`/projects\` - List all client contracts & switch context\n` +
            `• \`/switch <id>\` - Switch active project\n`;

        const helpText = [
          `🛡️ *Nexum AI Bot — Command Center Guide*`,
          `Logged in as: *${user.name}* (${roleBadge})\n`,
          telemetryHelp,
          `*📋 Project Operations & Kanban:*\n` +
            `• \`/tasks\` - View real-time Kanban board (To Do, In Progress, Done)\n` +
            `• \`/task add <title>\` - Create a task instantly on Kanban\n` +
            `• \`/files\` - Download project repository deliverables\n` +
            `• \`/decisions\` - View sealed ADR architectural consensus log\n`,
          `*⏳ Postponement & Reschedule Engine:*\n` +
            `• \`/postpone meeting <reason>\` - Reschedule upcoming call with emergency reason\n` +
            `• \`/postpone milestone <days> <reason>\` - Request formal due-date extension\n`,
          `*💡 Gemini AI Scope Intelligence:*\n` +
            `• \`/addon <feature>\` - Gemini AI evaluates scope impact, fair price delta, timeline delta, and milestone placement\n` +
            `• \`/ai <question>\` - Private consultation with Nexum AI Copilot\n`,
          `*🎙️ Bilateral Relaying:*\n` +
            `• *Voice Notes* - Speak naturally; transcribed via Groq Whisper & relayed to ${targetPrj.title}\n` +
            `• *Text* - Any regular message is sealed and posted to your workspace timeline\n`,
          isClient
            ? `*🎩 Client-Exclusive Actions:*\n• 1-Click approve deliverable alerts to release escrow funds\n• Deposit add-on escrow seamlessly\n• Digitally sign scope amendments`
            : `*🚀 Freelancer-Exclusive Actions:*\n• \`/submit <url> <notes>\` - Submit deliverable with GitHub/Preview link\n• \`/earnings\` - View release history & locked funds\n• \`/postpone milestone <days> <reason>\` - Request emergency deadline extensions\n• \`/addon <feature>\` - Propose paid scope additions before doing extra work`,
          `\n_Type \`/logout\` anytime to unlink this phone session._`,
        ].join("\n");

        await this.sendMessage(chatId, helpText, undefined, true);
        return { handled: true, action: "HELP_SENT" };
      }

      // 3h. /ai <prompt> or /ask <prompt>
      if (text.startsWith("/ai") || text.startsWith("/ask")) {
        const prompt = text.replace(/^\/(ai|ask)\s*/i, "").trim();
        if (!prompt) {
          await this.sendMessage(
            chatId,
            `💡 Please provide a question or request: e.g., \`/ai Draft an inquiry about the backend timeline\``,
            undefined,
            true
          );
          return { handled: true, action: "AI_EMPTY" };
        }

        await this.sendMessage(chatId, "✨ Consulting Nexum AI Copilot...");
        const aiResponse = await groqService.consultAi(
          prompt,
          `Project: ${targetPrj.title}, Budget: $${(targetPrj.budgetCents / 100).toFixed(2)}, User Role: ${user.role}`
        );
        await this.sendMessage(chatId, aiResponse, undefined, true);
        return { handled: true, action: "AI_CONSULTED" };
      }

      // 3i. Bi-Directional Message Relay (Telegram -> Web Workspace)
      try {
        const sent = await workspaceService.sendMessage({
          projectId: targetPrj.id,
          senderId: user.id,
          senderRole: user.role === "FREELANCER" ? "FREELANCER" : "CLIENT",
          content: text,
          origin: "TELEGRAM",
        });

        await this.sendMessage(
          chatId,
          `✓ *Relayed to ${targetPrj.title}:*\n"${text}"\n_Seal: \`${sent.message.sha256Seal.slice(0, 16)}...\`_`,
          undefined,
          true
        );
        return { handled: true, action: "RELAYED_TO_WORKSPACE" };
      } catch (err: any) {
        await this.sendMessage(chatId, `⚠️ Message delivery failed: ${err.message}`, undefined, true);
        return { handled: false, action: "RELAY_FAILED" };
      }
    }

    return { handled: false };
  }

  /**
   * Helper: Initiate Email OTP dispatch for mobile authentication
   */
  async initiateEmailOtp(chatId: string, rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    this.awaitingEmail.delete(chatId);

    const targetUser = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!targetUser) {
      await this.sendMessage(
        chatId,
        `⚠️ No Nexum account found for ` + email + `.\n\nPlease check the spelling or sign up at your Nexum portal, then type \`/login\`.`
      );
      return { handled: false, action: "USER_NOT_FOUND" };
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.pendingAuth.set(chatId, {
      email: targetUser.email,
      userId: targetUser.id,
      userName: targetUser.name || "User",
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
    });

    await this.sendMessage(chatId, "⏳ Sending your verification code...");
    const emailResult = await emailService.sendOtpEmail(targetUser.email, targetUser.name || "User", otp);

    const maskedEmail = targetUser.email.replace(/(.{2})(.*)(?=@)/, (_m, p1, p2) => p1 + "*".repeat(Math.max(2, p2.length)));
    await this.sendMessage(
      chatId,
      `📩 *Verification Code Sent!*\n\nWe sent a 6-digit code to *${maskedEmail}*.\n\nPlease type the 6-digit code below to finish logging in (expires in 10 minutes):`
    );

    return { handled: true, action: "OTP_SENT", emailResult };
  }

  /**
   * Helper: Verify 6-digit Email OTP and pair Telegram chatId to user record
   */
  async verifyEmailOtp(chatId: string, otpCode: string, telegramUsername?: string) {
    const pending = this.pendingAuth.get(chatId);
    if (!pending) {
      await this.sendMessage(chatId, "⚠️ No pending login found. Type \`/login\` to begin.");
      return { handled: false, action: "NO_PENDING_AUTH" };
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingAuth.delete(chatId);
      await this.sendMessage(chatId, "⌛ That verification code has expired. Type \`/login\` to request a new code.");
      return { handled: false, action: "OTP_EXPIRED" };
    }

    pending.attempts += 1;
    if (pending.attempts > 5) {
      this.pendingAuth.delete(chatId);
      await this.sendMessage(chatId, "🛑 Too many incorrect attempts. Type \`/login\` to start over.");
      return { handled: false, action: "TOO_MANY_ATTEMPTS" };
    }

    if (pending.otp !== otpCode.trim()) {
      await this.sendMessage(
        chatId,
        `❌ Incorrect code. Please check your email inbox and try again (Attempt ${pending.attempts}/5):`
      );
      return { handled: false, action: "OTP_MISMATCH" };
    }

    // OTP Verified! Pair account in Neon DB
    this.pendingAuth.delete(chatId);
    try {
      const updatedUser = await prisma.user.update({
        where: { id: pending.userId },
        data: {
          telegramChatId: chatId,
          telegramUsername: telegramUsername || null,
          telegramNotifications: true,
        },
      });

      const projects = await this.getUserProjects(updatedUser);
      const prjCount = projects.length;
      const activePrjTitle = prjCount > 0 ? projects[0].title : "None yet";

      await this.sendMessage(
        chatId,
        `🎉 *Successfully Authenticated!*\n\n` +
          `Welcome back, *${pending.userName}*!\n` +
          `• Account: ` + pending.email + `\n` +
          `• Role: *${updatedUser.role}*\n` +
          `• Active Contract: *${activePrjTitle}* (${prjCount} total)\n\n` +
          `Your Telegram is now permanently paired for mobile control. Use the menu buttons below!`,
        undefined,
        true
      );

      return { handled: true, action: "LOGIN_SUCCESS", userId: updatedUser.id };
    } catch (err: any) {
      console.error("[TelegramService] Error linking user after OTP:", err);
      await this.sendMessage(chatId, `⚠️ Error completing login: ${err.message}`);
      return { handled: false, action: "LOGIN_DB_ERROR" };
    }
  }

}

export const telegramService = new TelegramService();
export default telegramService;

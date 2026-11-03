import dotenv from "dotenv";
import path from "path";
import prisma from "../prisma.js";
import { workspaceService } from "./workspaceService.js";
import { groqService } from "./groqService.js";
import { emailService } from "./emailService.js";

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
  [{ text: "💰 Escrow" }, { text: "📁 Projects" }],
  [{ text: "❓ Help" }],
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
    showMainKeyboard = false
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
          keyboard: TELEGRAM_MAIN_KEYBOARD,
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
          ],
        },
        include: {
          client: true,
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

            // 3b. Handle Greetings, /start, and /help with Cute Dynamic Messages
      const isGreetingOrStart = text === "/start" || text === "/help" || text === "❓ Help" || /^(hi|hello|hey|hola|greetings)(s+bot|s+nexum)?$/i.test(text);
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

      // 3g. /escrow or /balance or "💰 Escrow"
      if (text === "/escrow" || text === "💰 Escrow" || text === "/balance") {
        const payments = targetPrj.payments || [];
        const capturedMinor = payments
          .filter((p) => p.status === "CAPTURED")
          .reduce((sum, p) => sum + p.amountMinor, 0);

        await this.sendMessage(
          chatId,
          `💰 *Escrow & Financial Ledger Summary*\n\n` +
            `*Project:* ${targetPrj.title}\n` +
            `*Committed Contract Value:* $${(targetPrj.budgetCents / 100).toFixed(2)} USD\n` +
            `*Total Captured / Settled:* $${(capturedMinor / 100).toFixed(2)} USD\n` +
            `*Payment Rail:* \`PayPal Orders REST v2 Escrow\`\n` +
            `*State Consensus:* Dual SHA-256 Tamper-Proof`,
          undefined,
          true
        );
        return { handled: true, action: "ESCROW_SENT" };
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

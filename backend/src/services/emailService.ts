import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private serviceId: string | undefined;
  private templateId: string | undefined;
  private publicKey: string | undefined;
  private privateKey: string | undefined;

  constructor() {
    this.reloadEnv();
  }

  public reloadEnv() {
    this.serviceId = process.env.EMAILJS_SERVICE_ID;
    this.templateId = process.env.EMAILJS_TEMPLATE_ID;
    this.publicKey = process.env.EMAILJS_PUBLIC_KEY;
    this.privateKey = process.env.EMAILJS_PRIVATE_KEY;
  }

  /**
   * Check if EmailJS credentials are fully populated
   */
  public isConfigured(): boolean {
    this.reloadEnv();
    return !!(this.serviceId && this.templateId && this.publicKey);
  }

  /**
   * Send 6-digit login OTP code via EmailJS
   */
  public async sendOtpEmail(
    toEmail: string,
    recipientName: string,
    otp: string
  ): Promise<EmailSendResult> {
    this.reloadEnv();

    const subject = "Nexum AI Bot Login Verification";
    const message = [
      `Hello ${recipientName || "there"},`,
      ``,
      `Your Nexum AI Bot login verification code is:`,
      ``,
      `   👉 ${otp} 👈`,
      ``,
      `This code will expire in 10 minutes.`,
      `Enter this code in Telegram (@NexumDev_Bot) to complete your phone login.`,
      ``,
      `If you did not request this code, you can safely ignore this email.`,
      ``,
      `Best regards,`,
      `Nexum AI Team`
    ].join("\n");

    if (!this.isConfigured()) {
      console.warn(
        `[EmailService] EmailJS not fully configured in environment. Dev OTP for ${toEmail}: ${otp}`
      );
      return {
        success: true,
        messageId: "dev-simulated-msg-id",
      };
    }

    try {
      const payload: Record<string, any> = {
        service_id: this.serviceId,
        template_id: this.templateId,
        user_id: this.publicKey,
        template_params: {
          to_email: toEmail,
          email: toEmail,
          user_email: toEmail,
          to_name: recipientName || "User",
          from_name: "Nexum AI Team",
          team_name: "Nexum AI Team",
          subject: "Nexum AI Bot Login Verification",
          title: "Nexum AI Bot Login Verification",
          message,
          otp,
          otp_code: otp,
          verification_code: otp,
        },
      };

      if (this.privateKey) {
        payload.accessToken = this.privateKey;
      }

      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error(`[EmailService] EmailJS API error (${response.status}):`, text);
        return {
          success: false,
          error: `EmailJS responded with HTTP ${response.status}: ${text || "Unknown error"}`,
        };
      }

      console.log(`[EmailService] Successfully sent OTP email to ${toEmail}`);
      return { success: true };
    } catch (err: any) {
      console.error("[EmailService] Error calling EmailJS REST API:", err);
      return {
        success: false,
        error: err.message || "Network error sending email via EmailJS",
      };
    }
  }

  /**
   * Generic notification dispatcher
   */
  public async sendNotificationEmail(
    toEmail: string,
    recipientName: string,
    subject: string,
    message: string
  ): Promise<EmailSendResult> {
    this.reloadEnv();

    if (!this.isConfigured()) {
      return { success: true, messageId: "dev-simulated-msg-id" };
    }

    try {
      const payload: Record<string, any> = {
        service_id: this.serviceId,
        template_id: this.templateId,
        user_id: this.publicKey,
        template_params: {
          to_email: toEmail,
          to_name: recipientName,
          subject,
          message,
        },
      };

      if (this.privateKey) {
        payload.accessToken = this.privateKey;
      }

      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return { success: false, error: text };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const emailService = new EmailService();
export default emailService;


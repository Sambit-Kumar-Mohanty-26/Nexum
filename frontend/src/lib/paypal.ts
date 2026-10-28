/**
 * Nexum PayPal REST API v2 Adapter
 * Compliant with Specification v1.2 & Phase 1 Spike A (P1-05)
 *
 * Enforces:
 * 1. Strict server-side credential isolation (never exposed to client).
 * 2. Idempotency via `PayPal-Request-Id` headers.
 * 3. Mandatory `Prefer: return=representation`.
 * 4. USD integer cents money handling.
 */

const PAYPAL_ENV = process.env.PAYPAL_ENV || "sandbox";
const PAYPAL_API_BASE =
  PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/**
 * Obtain an OAuth2 Bearer token from PayPal using client credentials.
 * Automatically caches token until 60 seconds before expiration.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.accessToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment variables."
    );
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal OAuth2 failure (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const expiresInMs = (data.expires_in || 3600) * 1000;

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + expiresInMs,
  };

  return data.access_token;
}

export interface CreateOrderParams {
  milestoneId: string;
  amountCents: number;
  currency?: string;
  description: string;
  idempotencyKey: string;
  customId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalOrderResponse {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  approvalUrl?: string;
  raw: Record<string, unknown>;
}

/**
 * Create a PayPal Orders v2 with CAPTURE intent.
 * Complies with P1-05:
 * - Header `PayPal-Request-Id: idempotencyKey`
 * - Header `Prefer: return=representation`
 */
export async function createMilestoneOrder(
  params: CreateOrderParams
): Promise<PayPalOrderResponse> {
  const token = await getPayPalAccessToken();
  const valueFormatted = (params.amountCents / 100).toFixed(2);
  const currency = params.currency || "USD";

  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const returnUrl = params.returnUrl || `${appBaseUrl}/api/paypal/return?milestoneId=${params.milestoneId}`;
  const cancelUrl = params.cancelUrl || `${appBaseUrl}/api/paypal/cancel?milestoneId=${params.milestoneId}`;

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: params.milestoneId,
        description: params.description.slice(0, 127),
        custom_id: params.customId || `nexum_${params.milestoneId}`,
        amount: {
          currency_code: currency,
          value: valueFormatted,
        },
      },
    ],
    application_context: {
      brand_name: "Nexum Protocol",
      locale: "en-US",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": params.idempotencyKey,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `PayPal Create Order Failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  interface PayPalLink {
    href: string;
    rel: string;
    method?: string;
  }
  const approvalLink = Array.isArray(data.links)
    ? (data.links as PayPalLink[]).find((l) => l.rel === "approve")
    : undefined;

  return {
    id: data.id,
    status: data.status,
    approvalUrl: approvalLink?.href,
    raw: data,
  };
}

export interface CaptureOrderParams {
  orderId: string;
  idempotencyKey: string;
}

export interface PayPalCaptureResponse {
  orderId: string;
  status: "COMPLETED" | "FAILED" | "PENDING";
  captureId?: string;
  amountCents?: number;
  raw: Record<string, unknown>;
}

/**
 * Capture an approved PayPal order.
 * Required header: `PayPal-Request-Id` for idempotent retries.
 */
export async function captureMilestoneOrder(
  params: CaptureOrderParams
): Promise<PayPalCaptureResponse> {
  const token = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${params.orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": params.idempotencyKey,
        Prefer: "return=representation",
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `PayPal Capture Failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  const captureUnit = data.purchase_units?.[0]?.payments?.captures?.[0];
  const capturedAmount = captureUnit?.amount?.value
    ? Math.round(parseFloat(captureUnit.amount.value) * 100)
    : undefined;

  return {
    orderId: data.id,
    status: data.status === "COMPLETED" ? "COMPLETED" : "FAILED",
    captureId: captureUnit?.id,
    amountCents: capturedAmount,
    raw: data,
  };
}

/**
 * GET order state for authoritative reconciliation.
 * Complies with OECD Paper 167 truthfulness requirement.
 */
export async function getPayPalOrder(orderId: string): Promise<Record<string, unknown>> {
  const token = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Order Query Failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

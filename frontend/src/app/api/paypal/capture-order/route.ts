import { NextResponse } from "next/server";
import { captureMilestoneOrder } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderId, idempotencyKey } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required." },
        { status: 400 }
      );
    }

    const key = idempotencyKey || `cap_${orderId}_${Date.now()}`;

    const capture = await captureMilestoneOrder({
      orderId,
      idempotencyKey: key,
    });

    return NextResponse.json({
      success: true,
      orderId: capture.orderId,
      status: capture.status,
      captureId: capture.captureId,
      amountCents: capture.amountCents,
    });
  } catch (error) {
    console.error("Capture PayPal Order Error:", error);
    const msg = error instanceof Error ? error.message : "Internal PayPal capture error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createMilestoneOrder } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { milestoneId, amountCents, description, idempotencyKey } = body;

    if (!milestoneId || !amountCents) {
      return NextResponse.json(
        { error: "milestoneId and amountCents are required." },
        { status: 400 }
      );
    }

    const key = idempotencyKey || `req_${milestoneId}_${Date.now()}`;

    const order = await createMilestoneOrder({
      milestoneId,
      amountCents: Number(amountCents),
      description: description || `Milestone ${milestoneId} Escrow Reservation`,
      idempotencyKey: key,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      approvalUrl: order.approvalUrl,
    });
  } catch (error) {
    console.error("Create PayPal Order Error:", error);
    const msg = error instanceof Error ? error.message : "Internal PayPal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

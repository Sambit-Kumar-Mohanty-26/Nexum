import { NextResponse } from "next/server";
import { getPayPalOrder } from "@/lib/paypal";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const orderData = await getPayPalOrder(orderId);

    return NextResponse.json({
      success: true,
      order: orderData,
    });
  } catch (error) {
    console.error("Get PayPal Order Error:", error);
    const msg = error instanceof Error ? error.message : "Internal PayPal query error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

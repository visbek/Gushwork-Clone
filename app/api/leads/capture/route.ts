import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, domain, score } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    console.log(`[leads/capture] email="${email}" domain="${domain}" score=${score}`);

    // Send notification email — fire and forget (don't block user on failure)
    resend.emails.send({
      from: "onboarding@resend.dev",
      to: "vish686@gmail.com", // TODO: replace with your actual email
      subject: "New VisibilityAI Lead 🎯",
      text: [
        "New scan completed!",
        "",
        `Email: ${email}`,
        `Domain: ${domain}`,
        `Score: ${score}/100`,
        `Time: ${new Date().toISOString()}`,
      ].join("\n"),
    }).catch((err: unknown) => {
      console.error("[leads/capture] Resend error:", err);
    });

    // TODO: Save to Supabase in Phase 2
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

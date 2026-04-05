import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function GET() {
  const anthropicKeySet = !!process.env.ANTHROPIC_API_KEY;
  const geminiKeySet = !!process.env.GEMINI_API_KEY;

  let claudeTest: { success: boolean; response?: string; error?: string } = {
    success: false,
  };

  if (anthropicKeySet) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 64,
        messages: [{ role: "user", content: "say hello" }],
      });
      const content = message.content[0];
      claudeTest = {
        success: true,
        response: content.type === "text" ? content.text : "(non-text response)",
      };
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("test endpoint Claude error:", msg);
      claudeTest = { success: false, error: msg };
    }
  } else {
    claudeTest = { success: false, error: "ANTHROPIC_API_KEY is not set" };
  }

  return NextResponse.json({
    env: {
      ANTHROPIC_API_KEY: anthropicKeySet ? "set" : "missing",
      GEMINI_API_KEY: geminiKeySet ? "set" : "missing",
    },
    claude: claudeTest,
  });
}

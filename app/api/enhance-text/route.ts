import { NextRequest, NextResponse } from "next/server";
import { enhanceText } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text cannot be empty" },
        { status: 400 }
      );
    }

    const enhancedText = await enhanceText(text);
    
    return NextResponse.json({ enhancedText });
  } catch (error) {
    console.error("Error in enhance-text API:", error);
    return NextResponse.json(
      { error: "Failed to enhance text" },
      { status: 500 }
    );
  }
}

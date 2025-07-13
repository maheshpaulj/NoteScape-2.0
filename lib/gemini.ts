import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function enhanceText(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
Please improve the following text by fixing grammar, enhancing clarity, and making it more readable while preserving the original tone and meaning. Keep the same style and voice, just make it cleaner and more polished. Return only the improved text without any additional comments or explanations.

Text to improve:
${text}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error enhancing text with Gemini:", error);
    throw new Error("Failed to enhance text. Please try again.");
  }
}

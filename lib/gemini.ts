import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function enhanceText(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
You are an expert text editor and formatter for a rich text editor (BlockNote). Your job is to enhance the given text by:

CONTENT IMPROVEMENTS:
- Fix grammar, spelling, and punctuation errors
- Enhance clarity and readability
- Improve word choice and sentence flow
- Preserve the original tone, voice, and meaning

FORMATTING INTELLIGENCE:
- Convert obvious titles/topics into proper headings using markdown hashtag syntax
- Break up long paragraphs into shorter, more digestible chunks
- Add proper line breaks between different ideas or sections
- When content lists multiple items or concepts, format them as lists
- Convert run-on sentences into well-structured sentences
- Group related ideas together with appropriate spacing

STRUCTURAL GUIDELINES:
- If the text has a clear title or main topic, format it with # ## or ###
- If the text contains steps or processes, format as numbered lists
- If the text contains multiple examples or items, format as bullet points
- If the text has different subtopics, use appropriate heading levels
- Add proper line breaks between different ideas
- Keep short, punchy content as single paragraphs
- Break long explanations into multiple paragraphs with clear separation

FORMATTING RULES:
- Use # for main titles
- Use ## for major sections  
- Use ### for subsections
- Use **bold** for emphasis on key terms
- Use *italics* for subtle emphasis
- Use - for bullet points
- Use 1. 2. 3. for numbered lists
- Add blank lines between paragraphs and sections

EXAMPLE TRANSFORMATION:
Input: "human heart

heart is a organ which helps in the blood flow. its a very important part of the body."

Output: "## Human Heart

The heart is an organ that helps facilitate blood flow throughout the body.

It is a vital and essential part of the human body."

OUTPUT FORMAT:
Return the enhanced text using proper markdown formatting with hashtags for headings and proper line breaks. Focus on making the content both more readable and visually appealing with proper structure.

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
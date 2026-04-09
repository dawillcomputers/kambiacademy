
import { GoogleGenAI } from "@google/genai";

export class AIService {
  private static getClient() {
    const provider = (process.env.AI_PROVIDER || "google").toLowerCase();
    if (provider === "google") {
      return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    if (provider === "anthropic") {
      try {
        // Dynamically import Anthropic SDK if available. Caller must set ANTHROPIC_API_KEY.
        // This avoids a hard dependency unless the provider is used.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Anthropic } = require("@anthropic/sdk");
        return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      } catch (err) {
        throw new Error(
          "Anthropic SDK not installed. Install @anthropic/sdk or set AI_PROVIDER to 'google'.",
        );
      }
    }

    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }

  static async askTutor(question: string): Promise<string> {
    const ai = this.getClient();
    const model = process.env.AI_MODEL || "claude-sonnet-4.5";
    const response = await ai.models.generateContent({
      model,
      contents: `You are an expert ICT (Information and Communication Technology) tutor at Kambi Academy. 
      A student has asked: "${question}". 
      Provide a helpful, encouraging, and technically accurate answer in 3-4 sentences.`,
    });
    return response.text || "I'm sorry, I couldn't process that question right now.";
  }

  static async generateCourseDescription(title: string, level: string): Promise<string> {
    const ai = this.getClient();
    const model = process.env.AI_MODEL || "claude-sonnet-4.5";
    const response = await ai.models.generateContent({
      model,
      contents: `Write a compelling and professional 2-3 sentence course description for an ICT course titled "${title}" at a ${level} level. Focus on what skills the student will gain.`,
    });
    return response.text || "";
  }

  static async explainQuizAnswer(question: string, correctAnswer: string): Promise<string> {
    const ai = this.getClient();
    const model = process.env.AI_MODEL || "claude-sonnet-4.5";
    const response = await ai.models.generateContent({
      model,
      contents: `Explain in simple terms for a student why the correct answer to the question "${question}" is "${correctAnswer}". Keep the explanation brief and educational.`,
    });
    return response.text || "The correct answer is simply the most accurate choice based on current ICT standards.";
  }
}


import { GoogleGenAI } from "@google/genai";

type AIProvider = "google" | "anthropic" | "openai";

export class AIService {
  private static resolveProvider(): AIProvider {
    const provider = (process.env.AI_PROVIDER || "google").toLowerCase();
    if (provider === "google" || provider === "anthropic" || provider === "openai") {
      return provider;
    }

    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }

  private static resolveModel(provider: AIProvider) {
    if (process.env.AI_MODEL) {
      return process.env.AI_MODEL;
    }

    if (provider === "openai") {
      return "gpt-4o-mini";
    }

    if (provider === "anthropic") {
      return "claude-sonnet-4-5";
    }

    return "gemini-1.5-flash";
  }

  private static async generateText(prompt: string): Promise<string> {
    const provider = this.resolveProvider();
    const model = this.resolveModel(provider);

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is required when AI_PROVIDER is 'openai'.");
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
        }),
      });

      const data = (await response.json().catch(() => null)) as any;
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || "OpenAI request failed");
      }

      return data?.choices?.[0]?.message?.content || "";
    }

    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is required when AI_PROVIDER is 'anthropic'.");
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = (await response.json().catch(() => null)) as any;
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || "Anthropic request failed");
      }

      const blocks = Array.isArray(data?.content) ? data.content : [];
      return blocks
        .filter((block: any) => block?.type === "text" && typeof block?.text === "string")
        .map((block: any) => block.text)
        .join("\n");
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is required when AI_PROVIDER is 'google'.");
    }

    if (provider === "google") {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      return response.text || "";
    }

    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }

  static async askTutor(question: string): Promise<string> {
    const response = await this.generateText(`You are an expert ICT (Information and Communication Technology) tutor at Kambi Academy. 
      A student has asked: "${question}". 
      Provide a helpful, encouraging, and technically accurate answer in 3-4 sentences.`);
    return response || "I'm sorry, I couldn't process that question right now.";
  }

  static async generateCourseDescription(title: string, level: string): Promise<string> {
    return this.generateText(
      `Write a compelling and professional 2-3 sentence course description for an ICT course titled "${title}" at a ${level} level. Focus on what skills the student will gain.`,
    );
  }

  static async explainQuizAnswer(question: string, correctAnswer: string): Promise<string> {
    const response = await this.generateText(
      `Explain in simple terms for a student why the correct answer to the question "${question}" is "${correctAnswer}". Keep the explanation brief and educational.`,
    );
    return response || "The correct answer is simply the most accurate choice based on current ICT standards.";
  }
}

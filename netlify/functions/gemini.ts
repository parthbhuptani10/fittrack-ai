import type { Handler } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!, // ✅ backend env
});

const modelName = "gemini-2.5-flash";

export const handler: Handler = async (event) => {
  try {
    const { profile, mode, history, message } = JSON.parse(event.body || "{}");

    if (mode === "plan") {
      const prompt = `Create a 7-day fitness and diet plan for:
      ${JSON.stringify(profile)}
      Output STRICT JSON only.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      return {
        statusCode: 200,
        body: response.text!,
      };
    }

    if (mode === "chat") {
      const chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: `You are FitTrack AI coach.
          User profile: ${JSON.stringify(profile)}`,
        },
      });

      const response = await chat.sendMessage({
        message,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ reply: response.text }),
      };
    }

    return { statusCode: 400, body: "Invalid mode" };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};

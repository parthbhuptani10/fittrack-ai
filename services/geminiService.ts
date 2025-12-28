
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WeeklyPlan } from '../types';

// NOTE: In a production app, never expose API keys on the client. 
// This is a requirement for this specific task environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-2.5-flash';

export const GeminiService = {
  async generateWeeklyPlan(profile: UserProfile): Promise<WeeklyPlan> {
    const prompt = `
      Create a 7-day fitness and diet plan for a user with the following profile:
      - Age: ${profile.age}
      - Gender: ${profile.gender}
      - Height: ${profile.height}cm
      - Weight: ${profile.weight}kg
      - Goal: ${profile.goal}
      - Activity Level: ${profile.activityLevel}
      - Diet Type: ${profile.dietType}
      - Dietary Restrictions: ${profile.restrictions?.join(', ') || 'None'}
      - Specific Dietary Preferences/Dislikes: ${profile.dietaryPreferences}
      - Injuries/Conditions: ${profile.injuries}
      - Allergies: ${profile.allergies}
      - Available Equipment: ${profile.equipment}

      The output must be a strictly structured JSON object.
      The diet plan MUST STRICTLY follow the "${profile.dietType}" requirement and avoid any items in "Dietary Restrictions" or "Allergies".
      For every meal, provide a list of ingredients and step-by-step cooking instructions.
      The workout plan should be safe considering injuries.
      For each exercise, provide 2 variations: one that is "Easier" (regression) and one that is "Harder" (progression).
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weeklySummary: { type: Type.STRING, description: "A motivational summary of the plan" },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayName: { type: Type.STRING },
                  focus: { type: Type.STRING, description: "Main focus, e.g., Upper Body, Cardio" },
                  workout: {
                    type: Type.OBJECT,
                    properties: {
                      durationMinutes: { type: Type.NUMBER },
                      exercises: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            sets: { type: Type.STRING },
                            reps: { type: Type.STRING },
                            tips: { type: Type.STRING, description: "Form cue or safety tip" },
                            variations: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        difficulty: { type: Type.STRING, enum: ["Easier", "Harder"] }
                                    }
                                }
                            }
                          }
                        }
                      }
                    }
                  },
                  diet: {
                    type: Type.OBJECT,
                    properties: {
                      totalCalories: { type: Type.NUMBER },
                      meals: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            type: { type: Type.STRING, enum: ["Breakfast", "Lunch", "Dinner", "Snack"] },
                            name: { type: Type.STRING },
                            calories: { type: Type.NUMBER },
                            recipeStub: { type: Type.STRING, description: "Brief description" },
                            ingredients: { 
                              type: Type.ARRAY, 
                              items: { type: Type.STRING },
                              description: "List of ingredients with quantities"
                            },
                            instructions: { 
                              type: Type.ARRAY, 
                              items: { type: Type.STRING },
                              description: "Step by step cooking instructions"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Failed to generate plan");
    
    const parsed = JSON.parse(jsonText);
    return {
      ...parsed,
      generatedAt: Date.now(),
    };
  },

  async chatWithCoach(history: { role: 'user' | 'model'; text: string }[], newMessage: string, profile: UserProfile): Promise<string> {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: `You are a supportive, expert fitness coach named FitTrack AI. 
        You have access to the user's profile: ${JSON.stringify(profile)}.
        Answer their questions about their specific workout plan, diet, or general health.
        Keep answers concise and encouraging. Use markdown for formatting.`
      }
    });

    const response = await chat.sendMessage({ 
      message: `User asked: "${newMessage}". \n\n Context(Previous conversation): ${JSON.stringify(history.slice(-5))}` 
    });

    return response.text || "I'm sorry, I couldn't process that.";
  }
};

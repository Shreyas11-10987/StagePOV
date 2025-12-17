
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiAudioService {
  private ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  async optimizeAudio(contentType: string, currentSettings: any) {
    const prompt = `Act as a world-class Dolby Atmos sound engineer. 
    Optimize the audio settings for content type: "${contentType}". 
    Current settings: ${JSON.stringify(currentSettings)}. 
    Suggest improvements for Bass (-10 to 10), Treble (-10 to 10), and Spatiality (0 to 1.0). 
    Explain why these settings work for Atmos-like surround sound.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bass: { type: Type.NUMBER },
              treble: { type: Type.NUMBER },
              spatiality: { type: Type.NUMBER },
              reasoning: { type: Type.STRING }
            },
            required: ["bass", "treble", "spatiality", "reasoning"]
          }
        }
      });
      
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini optimization failed:", error);
      return null;
    }
  }

  async explainAtmos(concept: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explain the Dolby Atmos concept of "${concept}" in 2-3 short, professional sentences for an audiophile app.`,
    });
    return response.text;
  }
}

export const geminiAudioService = new GeminiAudioService();

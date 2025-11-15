import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully,
  // but for this context, throwing an error is fine.
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const analyzeTextWithThinking = async (text: string, tone: string, level: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `You are an expert educator and orator. Your task is to analyze the following text and generate a clear, engaging, and educational script explaining its key concepts, context, and significance. The script should be written as if it were to be spoken aloud in a presentation or a documentary narration.
      
      Adapt your explanation to a "${level}" level of understanding and adopt a "${tone}" tone. Break down complex ideas into simple terms appropriate for the audience level.

      Text to analyze:
      ---
      ${text}
      ---
      
      Generate the spoken script now.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw new Error("Failed to analyze the text. The model may have returned an error.");
  }
};

export const summarizeText = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Summarize the following text, focusing on the key points and main ideas. The summary should be concise, clear, and easy to understand.

      Text to summarize:
      ---
      ${text}
      ---
      
      Provide the summary.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing text:", error);
    throw new Error("Failed to summarize the text. The model may have returned an error.");
  }
};

export const answerQuestion = async (contextText: string, question: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Based on the following text, answer the user's question. If the answer is not in the text, state that you cannot find the answer in the provided context.

        Context Text:
        ---
        ${contextText}
        ---
        
        Question:
        ---
        ${question}
        ---
        
        Answer:`,
      });
      return response.text;
    } catch (error) {
      console.error("Error answering question:", error);
      throw new Error("Failed to answer the question. The model may have returned an error.");
    }
};


export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }, // A pleasant, clear voice
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from the API.");
    }
    return base64Audio;
  } catch (error) {
      console.error("Error generating speech:", error);
      throw new Error("Failed to generate speech. The model may have returned an error.");
  }
};

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
      contents: `شما یک مربی و سخنران خبره هستید. وظیفه شما تحلیل متن زیر و تولید یک اسکریپت آموزشی واضح، جذاب و آموزنده است که مفاهیم کلیدی، زمینه و اهمیت آن را توضیح دهد. اسکریپت باید طوری نوشته شود که انگار قرار است با صدای بلند در یک ارائه یا روایت مستند خوانده شود.
      
      توضیحات خود را با سطح درک "${level}" و لحن "${tone}" تطبیق دهید. ایده‌های پیچیده را به زبان ساده و مناسب برای سطح مخاطب تقسیم کنید.

      متن برای تحلیل:
      ---
      ${text}
      ---
      
      اکنون اسکریپت گفتاری را تولید کنید.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw new Error("تحلیل متن با خطا مواجه شد. ممکن است مدل خطایی برگردانده باشد.");
  }
};

export const summarizeText = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `متن زیر را با تمرکز بر نکات کلیدی و ایده‌های اصلی خلاصه کنید. خلاصه باید مختصر، واضح و قابل فهم باشد.

      متن برای خلاصه:
      ---
      ${text}
      ---
      
      خلاصه را ارائه دهید.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing text:", error);
    throw new Error("خلاصه‌سازی متن با خطا مواجه شد. ممکن است مدل خطایی برگردانده باشد.");
  }
};

export const answerQuestion = async (contextText: string, question: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `بر اساس متن زیر، به سوال کاربر پاسخ دهید. اگر پاسخ در متن موجود نیست، اعلام کنید که نمی‌توانید پاسخ را در متن ارائه شده پیدا کنید.

        متن زمینه:
        ---
        ${contextText}
        ---
        
        سوال:
        ---
        ${question}
        ---
        
        پاسخ:`,
      });
      return response.text;
    } catch (error) {
      console.error("Error answering question:", error);
      throw new Error("پاسخ به سوال با خطا مواجه شد. ممکن است مدل خطایی برگردانده باشد.");
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
        throw new Error("دیتای صوتی از API دریافت نشد.");
    }
    return base64Audio;
  } catch (error) {
      console.error("Error generating speech:", error);
      throw new Error("تولید صدا با خطا مواجه شد. ممکن است مدل خطایی برگردانده باشد.");
  }
};

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

export const analyzeAndWrite = async (imageBuffer: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY! });
  const model = 'gemini-3-pro-preview';

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageBuffer.split(',')[1],
    },
  };

  const prompt = `Analyze this image's mood, setting, and characters. Then, write a single, atmospheric opening paragraph (about 100-150 words) for a story set in this world. 
  The tone should be immersive and literary. Start directly with the story text. After the story, add a separator "---" and then provide a brief technical analysis of the scene's mood and key elements for my creative context.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: { parts: [imagePart, { text: prompt }] },
  });

  return response.text;
};

export const chatWithGemini = async (history: { role: string; parts: { text: string }[] }[], message: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY! });
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are a creative writing assistant. You help the user expand on the story world based on the provided image and opening paragraph. Be imaginative but consistent with the established mood.",
    }
  });

  // We manually handle history if needed, but simple sendMessage works for quick chats
  const response = await chat.sendMessage({ message });
  return response.text;
};

export const generateNarration = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY! });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this story paragraph with deep emotion and atmosphere: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Charon' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
};

// Utils for audio
export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

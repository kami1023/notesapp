import { GoogleGenAI, Type } from "@google/genai";
import { Note } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const extractNotesFromUrl = async (url: string): Promise<Partial<Note>> => {
  const model = "gemini-3.1-flash-lite-preview";
  
  const prompt = `Extract the FULL educational content from this URL. Do NOT summarize or omit details. 
  Your goal is to capture every single important sentence and detail, but rephrase each one to be as concise as possible. 
  The final notes must cover 100% of the information present in the source, but in a shorter total reading time.
  Organize them into logical topics/sections. 
  For each section, provide a topic title and a comprehensive list of concise, full-sentence pointwise notes that cover all the information present in that part of the source.
  URL: ${url}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Main title of the notes" },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                points: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "A comprehensive list of full-sentence notes for this topic"
                }
              },
              required: ["topic", "points"]
            }
          }
        },
        required: ["title", "sections"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return {
    title: result.title || "Extracted Notes",
    sections: result.sections || [],
    sourceUrl: url,
  };
};

export const refineNotes = async (
  currentNotes: Partial<Note>,
  instruction: string
): Promise<Partial<Note>> => {
  const model = "gemini-3.1-flash-lite-preview";

  const prompt = `Refine the following educational notes based on this instruction: "${instruction}".
  
  CRITICAL RULE: When shortening or rephrasing, you MUST ensure NO information is lost. Every single fact, detail, and piece of content from the original must be preserved. Only the word count should decrease by using more efficient, concise language. Cover 100% of the content.
  
  Current Notes:
  ${JSON.stringify(currentNotes, null, 2)}
  
  Maintain the same JSON structure with 'title' and 'sections' (each with 'topic' and 'points').
  Ensure the output is high-quality, educational, and strictly follows the instruction.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                points: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["topic", "points"]
            }
          }
        },
        required: ["title", "sections"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return {
    ...currentNotes,
    title: result.title || currentNotes.title,
    sections: result.sections || currentNotes.sections,
  };
};

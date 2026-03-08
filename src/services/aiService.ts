import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { Note } from "../types";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const groq = new Groq({
  apiKey: GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || "" });

async function cleanContent(rawText: string): Promise<string> {
  if (!GEMINI_API_KEY) return rawText; // Fallback if no key

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a content filter. Your task is to take the raw text extracted from a website and remove all "noise" while keeping 100% of the core educational/informational content.
      
      CRITICAL: DO NOT REMOVE ANY TOPICS, HEADINGS, OR EDUCATIONAL CONTENT. Even if a heading looks like a navigation item, if it introduces a new topic, KEEP IT.
      
      REMOVE:
      - Site-wide navigation menus, top headers, and bottom footers
      - "Related articles", "Recommended for you", or "Related chapters" sections
      - Generic intros like "Welcome to our site" or "In this post we will talk about..." (unless they contain actual definitions or facts)
      - Advertisements, social media links, and comment sections
      - Cookie notices and privacy policy snippets
      
      KEEP:
      - All main headings and subheadings (e.g., "Why Non-Cooperation?", "The Rowlatt Act")
      - All factual information, explanations, and examples
      - Technical details, code snippets, and data
      - The logical flow of the main topic
      
      Output ONLY the cleaned text. Do not add any commentary.
      
      Raw Text:
      ${rawText.substring(0, 50000)}`,
    });

    return response.text || rawText;
  } catch (error) {
    console.error("Cleaning failed:", error);
    return rawText; // Fallback to raw text on error
  }
}

async function fetchUrlContent(url: string): Promise<{ title: string; content: string }> {
  try {
    // Use our server-side proxy to bypass CORS
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const pageTitle = doc.title || "";
    
    // Remove elements that are definitely not content
    const toRemove = doc.querySelectorAll('script, style, nav, iframe, noscript, .ads, .sidebar, .comments, .related-posts, .recommended');
    toRemove.forEach(s => s.remove());
    
    // Try to find the main content area first
    const mainContent = doc.querySelector('main, article, #content, .content, .post-content, .article-content, .entry-content, .byjus-content');
    let contentText = "";
    if (mainContent) {
      contentText = (mainContent as HTMLElement).innerText || mainContent.textContent || "";
    } else {
      // If no main content found, use the body but try to avoid the very top and bottom
      contentText = doc.body.innerText || doc.body.textContent || "";
    }
    
    return { title: pageTitle, content: contentText };
  } catch (error) {
    console.error("Fetch failed:", error);
    throw new Error("Could not fetch website content. This might be due to CORS restrictions or the site blocking access.");
  }
}

export const extractNotesFromUrl = async (url: string): Promise<Partial<Note>> => {
  const { title: originalTitle, content: rawContent } = await fetchUrlContent(url);
  const content = await cleanContent(rawContent);
  
  const prompt = `You are a professional educational note extractor. 
  Your task is to extract EVERY SINGLE DETAIL, SECTION, and HEADING from the provided text.
  
  CRITICAL INSTRUCTIONS:
  1. DO NOT SUMMARIZE. Your goal is to provide a highly detailed, exhaustive transcription of the information.
  2. Every heading, sub-heading, or title in the source text MUST become a "topic" in your output.
  3. Under each topic, extract ALL factual information, explanations, examples, dates, names, and events.
  4. If a section has multiple paragraphs, ensure each paragraph's key information is captured as a detailed point.
  5. Maintain the original order of the headings as they appear in the source.
  6. The output must be EXHAUSTIVE. If the source text is 1000 words, your output should be roughly 800-1000 words of structured notes.
  7. DO NOT omit technical details, nuances, or secondary points.
  8. NO SKIPPING: Ensure that sections like "Why Non-Cooperation?" or any other sub-headings are NOT skipped.
  9. TITLE MATCHING: The title of this note MUST be exactly: "${originalTitle}". Do not invent a new title.
  10. END AT CONCLUSION: The extraction MUST stop after the "Conclusion" section (or equivalent final summary section). Do not extract any "Related Articles", "Comments", or "Footer" content that follows the conclusion.
  
  Return a JSON object with:
  {
    "title": "${originalTitle}",
    "sections": [
      { "topic": "Heading Name", "points": ["Detailed Point 1 with all nuances", "Detailed Point 2 with all nuances"] }
    ]
  }

  Source Content:
  ${content.substring(0, 100000)}`; // Increased context limit for Llama 3.3

  const response = await groq.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant that outputs JSON. You prioritize completeness and detail over brevity. You never summarize unless explicitly asked." },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    max_tokens: 8192 // Ensure we have enough room for exhaustive output
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return {
    title: originalTitle || result.title || "Extracted Notes",
    sections: result.sections || [],
    sourceUrl: url,
  };
};

export const refineNotes = async (
  currentNotes: Partial<Note>,
  instruction: string
): Promise<Partial<Note>> => {
  const prompt = `You are a professional educational note refiner.
  Your task is to refine the following notes based on the instruction: "${instruction}".
  
  CRITICAL INSTRUCTIONS:
  1. DO NOT REMOVE ANY TOPICS OR SECTIONS unless specifically asked to delete them.
  2. Maintain the exhaustive and highly detailed nature of the notes.
  3. If the instruction is to "make it shorter", rephrase for conciseness but DO NOT remove factual information.
  4. If the instruction is to "make it longer", expand on every point with more detail, explanations, and context.
  5. Ensure the output follows the exact same JSON structure.
  
  Current Notes:
  ${JSON.stringify(currentNotes, null, 2)}`;

  const response = await groq.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant that outputs JSON. You prioritize completeness and detail. You never summarize unless explicitly asked." },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    max_tokens: 8192
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return {
    ...currentNotes,
    title: result.title || currentNotes.title,
    sections: result.sections || currentNotes.sections,
  };
};

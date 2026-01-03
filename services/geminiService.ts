
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const qualifyLead = async (leadInfo: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Analyze this lead information and provide a lead score (0-100), qualification status (Qualified/Unqualified/Disqualified), and two outreach drafts (Email and LinkedIn). 
    
    Lead Info: ${leadInfo}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          status: { type: Type.STRING },
          emailDraft: { type: Type.STRING },
          linkedinDraft: { type: Type.STRING },
          nextAction: { type: Type.STRING }
        },
        required: ["score", "status", "emailDraft", "linkedinDraft", "nextAction"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const summarizeMeeting = async (transcript: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize this meeting transcript. Extract key requirements, decisions made, risks identified, and clear action items with owners.
    
    Transcript: ${transcript}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          actionItems: { type: Type.STRING },
          followUpEmail: { type: Type.STRING }
        },
        required: ["summary", "actionItems", "followUpEmail"]
      }
    }
  });
  return JSON.parse(response.text);
};

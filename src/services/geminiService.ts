import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateChallengeName(problem: string, goal: string, solution: string): Promise<string> {
  const prompt = `
    다음은 DX(Digital Transformation) 과제 제안 내용입니다. 
    이 내용을 바탕으로 핵심을 관통하는 간결하고 창의적인 'DX 과제명'을 한 문장(약 15자 내외)으로 도출해주세요.
    
    1. 업무상 문제 (AS-IS): ${problem}
    2. 목표 (TO-BE): ${goal}
    3. 해결 방안: ${solution}
    
    과제명만 출력하세요. 예: "AI 기반 스마트 물류 최적화 시스템 구축"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || "새로운 DX 과제";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "DX 과제명 자동 생성 실패";
  }
}

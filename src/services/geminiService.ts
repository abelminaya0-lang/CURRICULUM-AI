import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface EvaluationResult {
  resultado: "APTO" | "NO APTO";
  puntaje: number;
  motivo: string;
}

export async function evaluateCV(cvText: string): Promise<EvaluationResult> {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: `Analiza el siguiente CV y clasifícalo como APTO o NO APTO según estos criterios:
1. Experiencia mínima de 1 año en restaurante.
2. Experiencia en cocina o atención al cliente.
3. Edad aproximada entre 18 y 35 años.

CV TEXT:
${cvText}

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "resultado": "APTO" | "NO APTO",
  "puntaje": número del 0 al 100,
  "motivo": "explicación breve de por qué es apto o no"
}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          resultado: { type: Type.STRING, enum: ["APTO", "NO APTO"] },
          puntaje: { type: Type.NUMBER },
          motivo: { type: Type.STRING },
        },
        required: ["resultado", "puntaje", "motivo"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  return result as EvaluationResult;
}

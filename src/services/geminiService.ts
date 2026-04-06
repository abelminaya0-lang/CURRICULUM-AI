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
    contents: `Analiza el siguiente CV y clasifícalo como APTO o NO APTO según estos criterios estrictos:

1. SI EL PUESTO ES COCINERO:
   - Experiencia mínima: 2 a 3 años.
   - Edad permitida: Hasta 40 años (rango ideal 25-40).

2. SI EL PUESTO ES MOZO:
   - Experiencia: Con o sin experiencia (no es excluyente).
   - Edad permitida: Estrictamente entre 20 y 28 años.

3. PARA OTROS PUESTOS:
   - Edad permitida: Entre 20 y 28 años.

CV TEXT / CONTEXTO:
${cvText}

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "resultado": "APTO" | "NO APTO",
  "puntaje": número del 0 al 100 (basado en qué tanto cumple los requisitos),
  "motivo": "explicación breve mencionando experiencia y edad"
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

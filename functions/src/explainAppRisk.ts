import {GoogleGenAI, ThinkingLevel} from '@google/genai';
import {HttpsError, onCall} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {buildUserPrompt, SYSTEM_INSTRUCTION} from './prompt';
import {
  EXPLANATION_JSON_SCHEMA,
  ExplainAppRiskError,
  SAFE_UNAVAILABLE,
  getGeminiModel,
  parseExplanation,
  validateExplainAppRiskRequest,
  type AiExplanationResult,
} from './schema';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export type GenerateExplanation = (args: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
}) => Promise<string>;

function toHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }
  if (error instanceof ExplainAppRiskError) {
    return new HttpsError(error.code, error.message);
  }
  return new HttpsError('internal', SAFE_UNAVAILABLE);
}

function mapProviderError(error: unknown): ExplainAppRiskError {
  const code = typeof error === 'object' && error && 'status' in error
    ? Number((error as {status?: unknown}).status)
    : typeof error === 'object' && error && 'code' in error
      ? Number((error as {code?: unknown}).code)
      : NaN;

  if (code === 429) {
    return new ExplainAppRiskError('resource-exhausted', SAFE_UNAVAILABLE);
  }
  if (code === 408 || code === 504 || code === 503) {
    return new ExplainAppRiskError('unavailable', SAFE_UNAVAILABLE);
  }
  return new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
}

export const generateWithGemini: GenerateExplanation = async ({
  apiKey,
  model,
  systemInstruction,
  userPrompt,
}) => {
  const ai = new GoogleGenAI({apiKey});
  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: EXPLANATION_JSON_SCHEMA,
        maxOutputTokens: 512,
        thinkingConfig: {thinkingLevel: ThinkingLevel.LOW},
      },
    });
    const text = response.text?.trim();
    if (!text) {
      throw new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
    }
    return text;
  } catch (error) {
    if (error instanceof ExplainAppRiskError) {
      throw error;
    }
    throw mapProviderError(error);
  }
};

export async function handleExplainAppRisk(
  auth: {uid: string} | null | undefined,
  data: unknown,
  generate: GenerateExplanation,
  apiKey: string,
): Promise<AiExplanationResult> {
  if (!auth?.uid) {
    throw new ExplainAppRiskError('unauthenticated', 'Sign in to request an explanation.');
  }
  if (!apiKey.trim()) {
    throw new ExplainAppRiskError('failed-precondition', SAFE_UNAVAILABLE);
  }

  const request = validateExplainAppRiskRequest(data);
  const model = getGeminiModel();
  let raw: string;
  try {
    raw = await generate({
      apiKey,
      model,
      systemInstruction: SYSTEM_INSTRUCTION,
      userPrompt: buildUserPrompt(request),
    });
  } catch (error) {
    if (error instanceof ExplainAppRiskError) {
      throw error;
    }
    const code = typeof error === 'object' && error && 'status' in error
      ? Number((error as {status?: unknown}).status)
      : NaN;
    if (code === 429) {
      throw new ExplainAppRiskError('resource-exhausted', SAFE_UNAVAILABLE);
    }
    if (code === 408 || code === 504 || code === 503) {
      throw new ExplainAppRiskError('unavailable', SAFE_UNAVAILABLE);
    }
    throw new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
  }
  const explanation = parseExplanation(raw);

  return {explanation, model};
}

export const explainAppRisk = onCall(
  {
    secrets: [geminiApiKey],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    try {
      return await handleExplainAppRisk(
        request.auth,
        request.data,
        generateWithGemini,
        geminiApiKey.value(),
      );
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

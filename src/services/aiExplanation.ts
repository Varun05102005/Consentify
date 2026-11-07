import {httpsCallable} from 'firebase/functions';
import {functions} from '../lib/firebase';
import {requestAppRiskExplanation} from '../lib/aiExplanation';
import {AI_EXPLANATION_UNAVAILABLE} from '../types/aiExplanation';
import type {AiExplainAppRiskRequest, AiExplanationResult} from '../types/aiExplanation';

const callable = httpsCallable<AiExplainAppRiskRequest, AiExplanationResult>(
  functions,
  'explainAppRisk',
);

function normalizeCallableError(error: unknown): Error {
  if (error instanceof Error && error.message.trim()) {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    if (
      code.includes('unauthenticated') ||
      code.includes('invalid-argument') ||
      code.includes('resource-exhausted') ||
      code.includes('unavailable') ||
      code.includes('internal') ||
      code.includes('failed-precondition')
    ) {
      return new Error(AI_EXPLANATION_UNAVAILABLE);
    }
  }
  return new Error(AI_EXPLANATION_UNAVAILABLE);
}

export async function explainAppRisk(
  input: AiExplainAppRiskRequest,
): Promise<AiExplanationResult> {
  try {
    return await requestAppRiskExplanation(input, async (payload) => {
      const result = await callable(payload);
      return result.data;
    });
  } catch (error) {
    throw normalizeCallableError(error);
  }
}

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {canonicalizeAiRequest, toAiExplainAppRiskRequest} from '../lib/aiExplanation';
import {AI_EXPLANATION_UNAVAILABLE} from '../types/aiExplanation';
import type {AiExplainAppRiskRequest, AiExplanation, AiExplanationResult} from '../types/aiExplanation';
import type {AppRiskResult, PermissionRiskResult} from '../types';

export type AiExplanationUiStatus = 'idle' | 'loading' | 'success' | 'error';

export type RequestAiExplanation = (
  input: AiExplainAppRiskRequest,
) => Promise<AiExplanationResult>;

export function useAiRiskExplanation(
  appName: string,
  appRisk: AppRiskResult,
  requestExplanation: RequestAiExplanation,
  rankedPermissions?: PermissionRiskResult[],
) {
  const payload = useMemo(
    () => toAiExplainAppRiskRequest(appName, appRisk, rankedPermissions),
    [appName, appRisk, rankedPermissions],
  );
  const payloadKey = useMemo(() => canonicalizeAiRequest(payload), [payload]);

  const [status, setStatus] = useState<AiExplanationUiStatus>('idle');
  const [explanation, setExplanation] = useState<AiExplanation | null>(null);
  const [errorMessage, setErrorMessage] = useState(AI_EXPLANATION_UNAVAILABLE);
  const generationRef = useRef(0);
  const inflightRef = useRef(false);
  const payloadKeyRef = useRef(payloadKey);

  useEffect(() => {
    if (payloadKeyRef.current === payloadKey) {
      return;
    }
    payloadKeyRef.current = payloadKey;
    generationRef.current += 1;
    inflightRef.current = false;
    setStatus('idle');
    setExplanation(null);
    setErrorMessage(AI_EXPLANATION_UNAVAILABLE);
  }, [payloadKey]);

  const explain = useCallback(async () => {
    if (inflightRef.current) {
      return;
    }

    inflightRef.current = true;
    const generation = generationRef.current;
    setStatus('loading');
    setErrorMessage(AI_EXPLANATION_UNAVAILABLE);

    try {
      const result = await requestExplanation(payload);
      if (generation !== generationRef.current) {
        return;
      }
      setExplanation(result.explanation);
      setStatus('success');
    } catch {
      if (generation !== generationRef.current) {
        return;
      }
      setExplanation(null);
      setErrorMessage(AI_EXPLANATION_UNAVAILABLE);
      setStatus('error');
    } finally {
      if (generation === generationRef.current) {
        inflightRef.current = false;
      }
    }
  }, [payload, requestExplanation]);

  return {
    status,
    explanation,
    errorMessage,
    payload,
    explain,
  };
}

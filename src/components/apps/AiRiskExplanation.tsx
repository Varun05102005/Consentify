import {Loader2, Sparkles} from 'lucide-react';
import {useAiRiskExplanation, type RequestAiExplanation} from '../../hooks/useAiRiskExplanation';
import {AI_EXPLANATION_UNAVAILABLE} from '../../types/aiExplanation';
import type {AiExplainAppRiskRequest, AiExplanationResult} from '../../types/aiExplanation';
import type {AppRiskResult, PermissionRiskResult} from '../../types';
import {Button} from '../ui/Button';
import {Card} from '../ui/Card';
import {SectionHeader} from '../ui/SectionHeader';
import {AiExplanationCard} from './AiExplanationCard';

async function defaultRequestExplanation(
  input: AiExplainAppRiskRequest,
): Promise<AiExplanationResult> {
  const {explainAppRisk} = await import('../../services/aiExplanation');
  return explainAppRisk(input);
}

export function AiRiskExplanation({
  appName,
  appRisk,
  rankedPermissions,
  requestExplanation = defaultRequestExplanation,
}: {
  appName: string;
  appRisk: AppRiskResult;
  rankedPermissions?: PermissionRiskResult[];
  requestExplanation?: RequestAiExplanation;
}) {
  const {status, explanation, errorMessage, explain} = useAiRiskExplanation(
    appName,
    appRisk,
    requestExplanation,
    rankedPermissions,
  );

  const busy = status === 'loading';

  return (
    <section aria-busy={busy}>
      <SectionHeader
        title="AI Risk Explanation"
        subtitle="AI explanation is based on Consentify's calculated risk factors."
      />

      <Card className="mt-3 min-w-0">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 shrink-0 rounded-cf-md bg-brand-soft text-brand flex items-center justify-center"
            aria-hidden="true"
          >
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <p className="cf-card-title">Plain-language explanation</p>
            <p className="cf-secondary mt-1">
              Gemini explains Consentify's calculated risk. It does not calculate a new score.
            </p>
          </div>
        </div>

        {status === 'idle' ? (
          <div className="mt-4 space-y-3">
            <p id="ai-risk-explanation-help" className="cf-body min-w-0 break-words">
              Gemini will generate a plain-language explanation from Consentify's calculated risk factors.
            </p>
            <Button
              className="w-full"
              onClick={() => { void explain(); }}
              aria-describedby="ai-risk-explanation-help"
            >
              <Sparkles size={18} aria-hidden="true" />
              Explain this risk with AI
            </Button>
          </div>
        ) : null}

        {status === 'loading' ? (
          <div className="mt-4 space-y-3" role="status" aria-live="polite">
            <div
              className="h-1 w-full rounded-cf-pill bg-canvas-subtle overflow-hidden"
              aria-hidden="true"
            >
              <div className="h-full w-1/3 rounded-cf-pill bg-brand motion-safe:animate-pulse" />
            </div>
            <Button className="w-full" disabled aria-busy="true">
              <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />
              Generating explanation...
            </Button>
          </div>
        ) : null}

        {status === 'success' && explanation ? (
          <div className="mt-4 min-w-0">
            <AiExplanationCard explanation={explanation} />
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="mt-4 space-y-3" role="alert">
            <p className="cf-body font-medium text-danger min-w-0 break-words">
              {errorMessage || AI_EXPLANATION_UNAVAILABLE}
            </p>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => { void explain(); }}
            >
              Try again
            </Button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

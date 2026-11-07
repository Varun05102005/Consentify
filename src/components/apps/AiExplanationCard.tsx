import type {AiExplanation} from '../../types/aiExplanation';
import {Divider} from '../ui/Divider';

function safeLines(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.filter((value) => typeof value === 'string' && value.trim());
}

function ExplanationList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0">
      <h3 className="cf-card-title">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 24)}`} className="cf-body min-w-0 break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiExplanationCard({explanation}: {explanation: AiExplanation}) {
  const summary = typeof explanation.summary === 'string' ? explanation.summary.trim() : '';
  const keyFactors = safeLines(explanation.keyFactors);
  const userGuidance = safeLines(explanation.userGuidance);
  const limitations = typeof explanation.limitations === 'string' ? explanation.limitations.trim() : '';

  return (
    <div className="space-y-4 min-w-0 cf-fade-in">
      {summary ? (
        <div className="min-w-0">
          <h3 className="cf-card-title">Summary</h3>
          <p className="cf-body mt-2 min-w-0 break-words">{summary}</p>
        </div>
      ) : null}

      {keyFactors.length > 0 ? <Divider /> : null}
      <ExplanationList title="Key Factors" items={keyFactors} />

      {userGuidance.length > 0 ? <Divider /> : null}
      <ExplanationList title="What you can do" items={userGuidance} />

      {limitations ? (
        <>
          <Divider />
          <div className="min-w-0">
            <h3 className="cf-card-title">Limitations</h3>
            <p className="cf-secondary mt-2 min-w-0 break-words">{limitations}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

import {Card} from '../ui/Card';
import {SectionHeader} from '../ui/SectionHeader';

export function RiskMethodology() {
  return (
    <section>
      <SectionHeader title="How Consentify calculates risk" />
      <Card className="mt-3 space-y-2">
        <p className="cf-body">
          Consentify calculates permission risk from recorded permission metadata. It does not determine whether an application is malicious.
        </p>
        <ul className="space-y-1.5">
          <li className="cf-secondary">Each permission type has a base sensitivity.</li>
          <li className="cf-secondary">Permission status (granted, denied, restricted, or unknown) affects the score.</li>
          <li className="cf-secondary">Background access can increase calculated risk when the permission is granted.</li>
          <li className="cf-secondary">Recent usage metadata can contribute when it is available.</li>
          <li className="cf-secondary">Application risk aggregates those permission-level results.</li>
        </ul>
      </Card>
    </section>
  );
}

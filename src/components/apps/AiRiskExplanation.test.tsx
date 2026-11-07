import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import '../../test/domSetup.ts';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {AiRiskExplanation} from './AiRiskExplanation';
import {calculateAppRisk, permissionsByRisk} from '../../lib/riskEngine';
import {AI_EXPLANATION_UNAVAILABLE} from '../../types/aiExplanation';
import type {AiExplainAppRiskRequest, AiExplanationResult, UserApp} from '../../types';

function sampleApp(): UserApp {
  return {
    id: 'maps',
    ownerUid: 'uid-secret',
    name: 'Maps',
    packageName: 'com.maps.preview',
    category: 'tools',
    icon: '',
    status: 'connected',
    risk: 'High',
    permissions: [
      {
        type: 'location',
        label: 'Location',
        status: 'granted',
        risk: 'High',
        backgroundAccess: true,
        lastUsedAt: null,
      },
    ],
    lastScannedAt: null,
    createdAt: null,
    updatedAt: null,
  };
}

const validResult: AiExplanationResult = {
  explanation: {
    summary: 'Maps has a high calculated permission risk because location is granted in the background.',
    keyFactors: ['Location is granted.', 'Background access was supplied as enabled.'],
    userGuidance: ['Review background location.', 'Limit the permission if it is not needed.'],
    limitations: 'This uses recorded permission metadata. It is not live monitoring or a privacy guarantee.',
  },
  model: 'gemini-3.8-flash',
};

async function renderExplanation(
  app: UserApp,
  requestExplanation: (input: AiExplainAppRiskRequest) => Promise<AiExplanationResult>,
) {
  const appRisk = calculateAppRisk(app);
  const rankedPermissions = permissionsByRisk(appRisk.permissionBreakdown);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(AiRiskExplanation, {
        appName: app.name,
        appRisk,
        rankedPermissions,
        requestExplanation,
      }),
    );
  });

  return {container, root, appRisk, rankedPermissions};
}

async function unmount(root: Root) {
  await act(async () => {
    root.unmount();
  });
}

async function click(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll('button')].find((node) =>
    (node.textContent ?? '').includes(label),
  );
  assert.ok(button, `button "${label}" should exist`);
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
  });
}

describe('AiRiskExplanation', () => {
  it('renders the initial state without making an AI request', async () => {
    let calls = 0;
    const {container, root} = await renderExplanation(sampleApp(), async () => {
      calls += 1;
      return validResult;
    });

    assert.match(container.textContent ?? '', /Explain this risk with AI/);
    assert.match(container.textContent ?? '', /Gemini will generate a plain-language explanation/);
    assert.doesNotMatch(container.textContent ?? '', /Generating explanation/);
    assert.equal(calls, 0);
    await unmount(root);
  });

  it('does not request automatically on render', async () => {
    let calls = 0;
    const {root} = await renderExplanation(sampleApp(), async () => {
      calls += 1;
      return validResult;
    });
    assert.equal(calls, 0);
    await unmount(root);
  });

  it('calls the service once when the explain action is clicked', async () => {
    let calls = 0;
    const {container, root} = await renderExplanation(sampleApp(), async () => {
      calls += 1;
      return validResult;
    });

    await click(container, 'Explain this risk with AI');
    assert.equal(calls, 1);
    await unmount(root);
  });

  it('shows a loading state while the request is pending', async () => {
    let release!: (value: AiExplanationResult) => void;
    const gate = new Promise<AiExplanationResult>((resolve) => {
      release = resolve;
    });
    const {container, root} = await renderExplanation(sampleApp(), () => gate);

    await click(container, 'Explain this risk with AI');

    assert.match(container.textContent ?? '', /Generating explanation/);
    const disabled = container.querySelector('button[disabled]');
    assert.ok(disabled);

    await act(async () => {
      release(validResult);
      await gate;
    });
    await unmount(root);
  });

  it('renders summary, key factors, guidance, and limitations after success', async () => {
    const {container, root} = await renderExplanation(sampleApp(), async () => validResult);

    await click(container, 'Explain this risk with AI');

    const text = container.textContent ?? '';
    assert.match(text, /Summary/);
    assert.match(text, /Maps has a high calculated permission risk/);
    assert.match(text, /Key Factors/);
    assert.match(text, /Location is granted/);
    assert.match(text, /What you can do/);
    assert.match(text, /Review background location/);
    assert.match(text, /Limitations/);
    assert.match(text, /recorded permission metadata/);
    assert.doesNotMatch(text, /gemini-3\.8-flash/);
    assert.doesNotMatch(text, /AI detected this risk/);
    await unmount(root);
  });

  it('renders the safe error state when the service fails', async () => {
    const {container, root} = await renderExplanation(sampleApp(), async () => {
      throw new Error('provider exploded');
    });

    await click(container, 'Explain this risk with AI');

    assert.match(container.textContent ?? '', new RegExp(AI_EXPLANATION_UNAVAILABLE));
    assert.match(container.textContent ?? '', /Try again/);
    assert.doesNotMatch(container.textContent ?? '', /provider exploded/);
    await unmount(root);
  });

  it('retries the service from the error state', async () => {
    let calls = 0;
    const {container, root} = await renderExplanation(sampleApp(), async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error('unavailable');
      }
      return validResult;
    });

    await click(container, 'Explain this risk with AI');
    assert.equal(calls, 1);
    assert.match(container.textContent ?? '', /Try again/);

    await click(container, 'Try again');
    assert.equal(calls, 2);
    assert.match(container.textContent ?? '', /Summary/);
    await unmount(root);
  });

  it('does not modify deterministic app or permission risk data', async () => {
    const app = sampleApp();
    const {container, root, appRisk, rankedPermissions} = await renderExplanation(app, async () => validResult);
    const scoreBefore = appRisk.riskScore;
    const levelBefore = appRisk.riskLevel;
    const permissionsBefore = JSON.stringify(appRisk.permissionBreakdown);
    const rankedBefore = JSON.stringify(rankedPermissions);

    await click(container, 'Explain this risk with AI');

    assert.equal(appRisk.riskScore, scoreBefore);
    assert.equal(appRisk.riskLevel, levelBefore);
    assert.equal(JSON.stringify(appRisk.permissionBreakdown), permissionsBefore);
    assert.equal(JSON.stringify(rankedPermissions), rankedBefore);
    assert.equal(app.risk, 'High');
    await unmount(root);
  });
});

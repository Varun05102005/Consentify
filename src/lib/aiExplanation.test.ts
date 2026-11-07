import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  parseAiExplanationResult,
  requestAppRiskExplanation,
  resetAiExplanationInflight,
  toAiExplainAppRiskRequest,
} from './aiExplanation';
import {calculateAppRisk} from './riskEngine';
import {AI_EXPLANATION_UNAVAILABLE} from '../types/aiExplanation';
import type {AiExplainAppRiskRequest, UserApp} from '../types';

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

function validRequest(): AiExplainAppRiskRequest {
  return {
    appName: 'Maps',
    appRiskScore: 50,
    appRiskLevel: 'High',
    topContributor: 'Location',
    summary: 'Location is granted with background access.',
    reasons: ['The permission is currently granted.'],
    permissions: [
      {
        type: 'location',
        label: 'Location',
        status: 'granted',
        riskScore: 50,
        riskLevel: 'High',
        backgroundAccess: true,
        factualReasons: ['Location is a sensitive permission.'],
      },
    ],
  };
}

const validResult = {
  explanation: {
    summary: 'Maps has a high calculated permission risk because location is granted in the background.',
    keyFactors: ['Location is granted.', 'Background access was supplied as enabled.'],
    userGuidance: ['Review background location.', 'Limit the permission if it is not needed.'],
    limitations: 'This uses recorded permission metadata. It is not live monitoring or a privacy guarantee.',
  },
  model: 'gemini-3.8-flash',
};

describe('toAiExplainAppRiskRequest', () => {
  it('omits identity fields and keeps the engine score', () => {
    const app = sampleApp();
    const appRisk = calculateAppRisk(app);
    const payload = toAiExplainAppRiskRequest(app.name, appRisk);

    assert.equal(payload.appRiskScore, appRisk.riskScore);
    assert.equal(payload.appRiskLevel, appRisk.riskLevel);
    assert.equal('packageName' in payload, false);
    assert.equal('ownerUid' in payload, false);
    assert.equal('id' in payload, false);
    assert.equal(JSON.stringify(payload).includes('uid-secret'), false);
    assert.equal(JSON.stringify(payload).includes('com.maps.preview'), false);
  });

  it('uses supplied ranked permissions without adding identity fields', () => {
    const app = sampleApp();
    const appRisk = calculateAppRisk(app);
    const ranked = [...appRisk.permissionBreakdown];
    const payload = toAiExplainAppRiskRequest(app.name, appRisk, ranked);

    assert.equal(payload.permissions.length <= 8, true);
    assert.equal(payload.appRiskScore, appRisk.riskScore);
    assert.equal('packageName' in payload, false);
  });
});

describe('parseAiExplanationResult', () => {
  it('accepts a valid result', () => {
    const parsed = parseAiExplanationResult(validResult);
    assert.equal(parsed.model, 'gemini-3.8-flash');
    assert.equal('appRiskScore' in parsed.explanation, false);
  });

  it('rejects a malformed response', () => {
    assert.throws(
      () => parseAiExplanationResult({explanation: {summary: 'nope'}}),
      (error: unknown) => error instanceof Error && error.message === AI_EXPLANATION_UNAVAILABLE,
    );
  });

  it('rejects a response that includes a new risk score', () => {
    assert.throws(
      () => parseAiExplanationResult({
        ...validResult,
        explanation: {...validResult.explanation, appRiskScore: 9},
      }),
      (error: unknown) => error instanceof Error && error.message === AI_EXPLANATION_UNAVAILABLE,
    );
  });
});

describe('requestAppRiskExplanation', () => {
  it('accepts a valid request through the caller', async () => {
    resetAiExplanationInflight();
    const result = await requestAppRiskExplanation(validRequest(), async () => validResult);
    assert.equal(result.explanation.keyFactors.length > 0, true);
  });

  it('deduplicates in-flight identical requests', async () => {
    resetAiExplanationInflight();
    let calls = 0;
    const caller = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return validResult;
    };
    const input = validRequest();
    const [first, second] = await Promise.all([
      requestAppRiskExplanation(input, caller),
      requestAppRiskExplanation(input, caller),
    ]);
    assert.equal(calls, 1);
    assert.equal(first.explanation.summary, second.explanation.summary);
  });

  it('does not change the deterministic request score', async () => {
    resetAiExplanationInflight();
    const input = validRequest();
    const before = input.appRiskScore;
    await requestAppRiskExplanation(input, async () => validResult);
    assert.equal(input.appRiskScore, before);
    assert.equal(input.appRiskLevel, 'High');
  });
});

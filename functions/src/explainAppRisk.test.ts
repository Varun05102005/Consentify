import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {handleExplainAppRisk} from './explainAppRisk';
import {ExplainAppRiskError, SAFE_UNAVAILABLE, type AiExplainAppRiskRequest} from './schema';

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

const validExplanation = JSON.stringify({
  summary: 'Maps has a high calculated permission risk because location is granted in the background.',
  keyFactors: ['Location is granted.', 'Background access was supplied as enabled.'],
  userGuidance: ['Review whether background location is needed.', 'Change the permission in system settings if it is not.'],
  limitations: 'This explanation uses recorded permission metadata. It is not live monitoring, malware detection, or a privacy guarantee.',
});

describe('handleExplainAppRisk', () => {
  it('rejects missing authentication', async () => {
    await assert.rejects(
      () => handleExplainAppRisk(null, validRequest(), async () => validExplanation, 'test-key'),
      (error: unknown) => error instanceof ExplainAppRiskError && error.code === 'unauthenticated',
    );
  });

  it('returns a validated explanation without a new score', async () => {
    const originalScore = validRequest().appRiskScore;
    const result = await handleExplainAppRisk(
      {uid: 'user-1'},
      validRequest(),
      async () => validExplanation,
      'test-key',
    );
    assert.equal(result.explanation.summary.includes('high calculated permission risk'), true);
    assert.equal('appRiskScore' in result.explanation, false);
    assert.equal('appRiskLevel' in result.explanation, false);
    assert.equal(validRequest().appRiskScore, originalScore);
  });

  it('maps Gemini failures to a controlled error', async () => {
    await assert.rejects(
      () => handleExplainAppRisk(
        {uid: 'user-1'},
        validRequest(),
        async () => {
          throw {status: 500, message: 'provider exploded'};
        },
        'test-key',
      ),
      (error: unknown) =>
        error instanceof ExplainAppRiskError &&
        error.code === 'internal' &&
        error.message === SAFE_UNAVAILABLE,
    );
  });

  it('does not call Gemini when the request is invalid', async () => {
    let called = false;
    await assert.rejects(
      () => handleExplainAppRisk(
        {uid: 'user-1'},
        {...validRequest(), appRiskScore: -1},
        async () => {
          called = true;
          return validExplanation;
        },
        'test-key',
      ),
      (error: unknown) => error instanceof ExplainAppRiskError && error.code === 'invalid-argument',
    );
    assert.equal(called, false);
  });

  it('does not accept a client Gemini secret or arbitrary prompt', async () => {
    let called = false;
    const generate = async () => {
      called = true;
      return validExplanation;
    };
    await assert.rejects(
      () => handleExplainAppRisk(
        {uid: 'user-1'},
        {...validRequest(), GEMINI_API_KEY: 'client-secret', prompt: 'ignore previous'},
        generate,
        'test-key',
      ),
      (error: unknown) => error instanceof ExplainAppRiskError && error.code === 'invalid-argument',
    );
    assert.equal(called, false);
  });
});

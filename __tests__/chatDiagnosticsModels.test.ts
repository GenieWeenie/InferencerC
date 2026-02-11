import { buildReadinessSteps, getDiagnosticsStatus } from '../src/renderer/lib/chatDiagnosticsModels';

describe('chatDiagnosticsModels', () => {
  it('builds readiness steps deterministically from status inputs', () => {
    const steps = buildReadinessSteps({
      providerReady: false,
      localStatus: 'checking',
      remoteStatus: 'none',
      modelReady: true,
      modelLabel: 'LM Studio',
      promptReady: false,
    });

    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({
      id: 'provider',
      title: 'Provider Reachable',
      description: 'Checking provider status...',
      complete: false,
    });
    expect(steps[1].description).toBe('Selected: LM Studio');
    expect(steps[2].complete).toBe(false);
  });

  it('returns expected diagnostics status variants', () => {
    expect(getDiagnosticsStatus({ providerReady: false, modelReady: false, historyLength: 0, promptReady: false }).label).toBe('Provider Issue');
    expect(getDiagnosticsStatus({ providerReady: true, modelReady: false, historyLength: 0, promptReady: false }).label).toBe('Model Needed');
    expect(getDiagnosticsStatus({ providerReady: true, modelReady: true, historyLength: 0, promptReady: false }).label).toBe('Ready for Prompt');
    expect(getDiagnosticsStatus({ providerReady: true, modelReady: true, historyLength: 2, promptReady: true }).label).toBe('Healthy');
  });
});

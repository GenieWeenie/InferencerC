/**
 * @jest-environment jsdom
 */
import { resolveComposerControlPillPresentation } from '../src/renderer/lib/chatComposerControlPillStyles';
import type { ComposerControlPillDescriptor } from '../src/renderer/lib/chatUiModels';

const createDescriptor = (overrides: Partial<ComposerControlPillDescriptor>): ComposerControlPillDescriptor => ({
  key: 'stream',
  label: 'Stream',
  active: true,
  visible: true,
  ...overrides,
});

describe('chatComposerControlPillStyles', () => {
  it('builds stream presentation with active/inactive titles', () => {
    const active = resolveComposerControlPillPresentation(createDescriptor({ key: 'stream', active: true }));
    const inactive = resolveComposerControlPillPresentation(createDescriptor({ key: 'stream', active: false }));

    expect(active.title).toContain('Disable streaming');
    expect(inactive.title).toContain('Enable streaming');
    expect(active.className).not.toBe(inactive.className);
  });

  it('keeps neutral classes for analytics/recommendations', () => {
    const analytics = resolveComposerControlPillPresentation(createDescriptor({ key: 'analytics', active: false }));
    const recommendations = resolveComposerControlPillPresentation(createDescriptor({ key: 'recommendations', active: false }));

    expect(analytics.className).toBe(recommendations.className);
    expect(analytics.title).toContain('analytics');
    expect(recommendations.title).toContain('relevant conversations');
  });

  it('assigns active battle style only when descriptor is active', () => {
    const active = resolveComposerControlPillPresentation(createDescriptor({ key: 'battle', active: true }));
    const inactive = resolveComposerControlPillPresentation(createDescriptor({ key: 'battle', active: false }));

    expect(active.className).toContain('from-orange-500');
    expect(inactive.className).not.toContain('from-orange-500');
  });
});

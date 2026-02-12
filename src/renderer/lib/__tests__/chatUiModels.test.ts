import { buildInspectorAlternativeRows } from '../chatUiModels';

describe('buildInspectorAlternativeRows', () => {
    it('filters synthetic placeholder alternatives', () => {
        const rows = buildInspectorAlternativeRows([
            { token: 'resources', logprob: -0.2 },
            { token: 'alt1', logprob: -2.3 },
            { token: 'alt2', logprob: -3.1 },
        ]);

        expect(rows).toHaveLength(1);
        expect(rows[0]?.token).toBe('resources');
    });

    it('deduplicates repeated alternatives', () => {
        const rows = buildInspectorAlternativeRows([
            { token: 'A', logprob: -0.2 },
            { token: 'A', logprob: -0.3 },
            { token: 'B', logprob: -1.2 },
        ]);

        expect(rows.map((row) => row.token)).toEqual(['A', 'B']);
    });
});

import { registerHooks } from 'node:module';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Node 24 runs the actual erasable TypeScript source; no duplicate test implementation.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
      const candidate = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(candidate)) return next(candidate.href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.json'))
      return {
        format: 'module',
        source: 'export default ' + readFileSync(fileURLToPath(url), 'utf8'),
        shortCircuit: true,
      };
    return next(url, context);
  },
});
const { pointById } = await import('../lib/atlas.ts');
const reference = JSON.parse(
  readFileSync(new URL('../lib/point-reference.json', import.meta.url)),
);
const rows = Object.values(pointById).map((p) => ({
  id: p.id,
  name: p.name,
  channel: p.channel,
  hasSummary: !!p.indications,
  manual: !!reference[p.id]?.manual,
  hasPointSource: !!p.indicationStudy?.references?.length,
  sourceKind: p.indicationStudy?.kind || null,
}));
const result = {
  scope:
    'Unique current point records; source link presence is not an efficacy or full-text validation rating.',
  total: rows.length,
  withSummary: rows.filter((r) => r.hasSummary).length,
  withPointSource: rows.filter((r) => r.hasPointSource).length,
  manualWithoutPointSource: rows.filter((r) => r.manual && !r.hasPointSource),
  missingSummary: rows.filter((r) => !r.hasSummary),
  rows,
};
writeFileSync(
  process.argv[2] || 'work/indication-coverage.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify({ ...result, rows: undefined }, null, 2));

// Export authored coordinates, never re-register previously bound coordinates.
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
      const candidate = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(candidate)) return next(candidate.href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    // Export unbound source coordinates even when adding a point whose binding
    // has not yet been generated. This override exists only in this exporter.
    if (url.endsWith('/lib/human-mesh.ts'))
      return {
        format: 'module',
        source: 'export function attachHumanMesh() {}',
        shortCircuit: true,
      };
    if (url.endsWith('.json'))
      return {
        format: 'module',
        source: 'export default ' + readFileSync(fileURLToPath(url), 'utf8'),
        shortCircuit: true,
      };
    return next(url, context);
  },
});
const { pointById, channels } = await import('../lib/atlas.ts');
const { torsoRules, forearmRules } = await import('../lib/placement-rules.ts');
const { placementGuides } = await import('../lib/body-landmarks.ts');
process.stdout.write(
  JSON.stringify({
    points: Object.values(pointById).map((p) => ({
      id: p.id,
      channel: p.channel,
      position: p.templatePosition || p.position,
      positions: p.templatePosition ? p.templatePositions : p.positions,
      bilateral: p.bilateral,
    })),
    channels: channels.map((c) => ({
      id: c.id,
      route: c.templateRoute || c.route,
      routes: c.templateRoute ? c.templateRoutes : c.routes,
    })),
    torsoRules,
    forearmRules,
    guides: placementGuides,
  }),
);

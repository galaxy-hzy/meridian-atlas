import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
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
const { luoSegments } = await import('../lib/luo.ts');
const { pointById } = await import('../lib/atlas.ts');
const { humanMesh } = await import('../lib/human-mesh.ts');
const segments = Object.fromEntries(
  Object.entries(luoSegments).map(([id, paths]) => [
    id,
    paths.map((path) => ({
      label: path.label,
      fixedPath: path.fittedPath,
      nodes: path.nodes.map((node) =>
        typeof node === 'string'
          ? { id: node, position: pointById[node].position, surface: true }
          : { ...node, surface: !!node.binding },
      ),
    })),
  ]),
);
process.stdout.write(
  JSON.stringify({ assetSha256: humanMesh.assetSha256, segments }, null, 2) +
    '\n',
);

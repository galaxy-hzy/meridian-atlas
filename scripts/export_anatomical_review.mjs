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
// Export the actual application's canonical bindings; aliases are not new entries.
const { pointById } = await import('../lib/atlas.ts');
const { default: mesh } = await import('../lib/mesh-registration.json');
const { default: facts } = await import('../lib/standard-location-facts.json');
const { default: extras } = await import('../lib/extra-standard.json');
const { default: names } = await import('../lib/point-pronunciation.json');
const standardNames = new Map(names.map((p) => [p.id, p]));
const extraFacts = new Map(extras.entries.map((p) => [p.id, p]));
const { createHash } = await import('node:crypto');
const hash = (relative) => createHash('sha256').update(readFileSync(new URL(relative, import.meta.url))).digest('hex');
const modelHash = hash('../public/models/human-learning.glb');
if (modelHash !== mesh.assetSha256) throw new Error('Model and bindings differ');
const ids = Object.keys(mesh.points);
if (ids.length !== 419 || ids.some((id) => !pointById[id])) throw new Error('Incomplete canonical point coverage');
const entries = ids.map((id) => {
  const point = pointById[id];
  const binding = mesh.points[id];
  const standard = standardNames.get(id);
  const location = facts.points[id] || extraFacts.get(id);
  if (standard && standard.name !== point.name) throw new Error('Standard name mismatch: ' + id);
  if (JSON.stringify(point.position) !== JSON.stringify(binding.position)) throw new Error('Displayed point differs: ' + id);
  return {
    id, name: point.name, channel: point.channel,
    catalog: point.catalog || 'standard-meridian',
    location: point.location || null,
    locationReference: point.locationReference || null,
    source: point.source || null,
    standard: standard ? { name: standard.standard, clause: standard.clause, pdfPage: standard.pdfPage, sourceSha256: standard.sourceSha256 } : null,
    locationFacts: location || null,
    modelPlacement: point.modelPlacement || null,
    bilateral: point.bilateral ?? null,
    displayedPositions: point.positions || [point.position],
    binding,
    previewUrl: 'http://localhost:4318/?points=' + encodeURIComponent(id),
    review: { status: 'pending-full-anatomical-review', reviewer: null, evidence: [],
      modelLandmarks: [], reviewedPositions: [], rationale: null },
  };
});
process.stdout.write(JSON.stringify({
  schemaVersion: 1,
  purpose: '逐穴解剖审校交接；不自动导入坐标或宣称审校通过',
  assetSha256: modelHash, registrationSha256: hash('../lib/mesh-registration.json'),
  sourceHashes: Object.fromEntries(['atlas.ts', 'human-mesh.ts', 'extra-points.ts', 'extra-standard.ts',
    'standard-location-facts.json', 'extra-standard.json', 'point-pronunciation.json'].map((p) => [p, hash('../lib/' + p)])),
  coordinateConvention: { axes: 'X横向、Y向上、正Z向前', modelHeight: 1.85,
    note: '绑定position包含显示偏移；解剖标志请记录模型顶点/面与依据，不能把显示偏移当组织深度。' },
  instructions: ['按模型与绑定哈希固定审校版本；不同版本的坐标不能直接混用。',
    '每穴对照所列标准定位、骨性或肌腱标志、体位、比例距离；缺失项保留未验证。',
    '穴组及左右侧需分别核对，保留各子点关系；419是条目数，不是全部空间点数。',
    '已有模型说明保留；pending表示完整解剖验收未完成，不抹去此前体表复核。',
    '审校结果仅作交接，当前没有自动将填写内容导入应用的行为。'],
  entries,
}, null, 2) + '\n');

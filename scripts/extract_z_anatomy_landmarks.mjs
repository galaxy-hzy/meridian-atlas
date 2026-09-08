// Read-only reference extraction. Source label endpoints are not calibrated atlas points.
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Vector3, Triangle } from 'three';

const [fbxPath, prefabPath, outputPath] = process.argv.slice(2);
if (!fbxPath || !prefabPath || !outputPath || process.argv.length !== 5) {
  throw new Error('Usage: node scripts/extract_z_anatomy_landmarks.mjs SKELETON.fbx HUMAN.prefab OUTPUT.json');
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fbx = readFileSync(fbxPath);
const prefab = readFileSync(prefabPath);
if (sha(fbx) !== '294a649765cd060a62a4095da52b9c8ef2d97769aa447e196448aa5f7d596dea') {
  throw new Error('Unexpected skeleton source; review source version before extraction');
}
if (sha(prefab) !== 'bac5a3258e48bea1503ccc74eeed117e4f5552aa876938e1c2ad9e892615c0f2') {
  throw new Error('Unexpected prefab source; review source version before extraction');
}
// Use the installed, trusted FBX parser without changing node_modules or executing dataset code.
const loaderUrl = import.meta.resolve('three/examples/jsm/loaders/FBXLoader.js');
const loaderSource = readFileSync(fileURLToPath(loaderUrl), 'utf8');
const adapted = loaderSource.replace(/from '([^']+)'/g, (match, specifier) =>
  `from '${specifier.startsWith('.') ? new URL(specifier, loaderUrl).href : import.meta.resolve(specifier)}'`);
const { FBXLoader, BinaryParser } = await import(`data:text/javascript;base64,${Buffer.from(`${adapted}\nexport { BinaryParser };`).toString('base64')}`);
const array = fbx.buffer.slice(fbx.byteOffset, fbx.byteOffset + fbx.byteLength);
const tree = new BinaryParser().parse(array);
const scene = new FBXLoader().parse(array, '');
scene.updateMatrixWorld(true);
const sceneModels = new Map();
scene.traverse(object => { if (object.ID) sceneModels.set(object.ID, object); });

// Read only Unity's simple serialized GameObject/Transform fields; no YAML constructors/scripts.
const chunks = prefab.toString('utf8').split(/^--- !u!(\d+) &(-?\d+)\r?\n/m);
const names = new Map();
const transforms = [];
const scalar = (body, name) => body.match(new RegExp(`^  ${name}: (.+)$`, 'm'))?.[1];
const ref = (body, name) => scalar(body, name)?.match(/^\{fileID: (-?\d+)\}$/)?.[1];
const xyz = text => {
  const match = text?.match(/^\{x: ([\d.eE+-]+), y: ([\d.eE+-]+), z: ([\d.eE+-]+)\}$/);
  if (!match) throw new Error('Unexpected serialized vector');
  return match.slice(1).map(Number);
};
for (let i = 1; i < chunks.length; i += 3) {
  const [type, id, body] = chunks.slice(i, i + 3);
  if (type === '1') names.set(id, scalar(body, 'm_Name'));
  if (type === '4' || type === '224') transforms.push({ id, body, object: ref(body, 'm_GameObject'), parent: ref(body, 'm_Father') });
}
const byName = new Map();
for (const transform of transforms) {
  const name = names.get(transform.object);
  const entries = byName.get(name) ?? [];
  entries.push(transform);
  byName.set(name, entries);
}
const children = new Map();
for (const transform of transforms) {
  const entries = children.get(transform.parent) ?? [];
  entries.push(transform);
  children.set(transform.parent, entries);
}
const geometryForModel = new Map();
for (const [child, parent] of tree.Connections.connections) {
  if (tree.Objects.Geometry?.[child]) geometryForModel.set(parent, tree.Objects.Geometry[child]);
}
const landmarks = [];
const unresolved = [];
for (const model of Object.values(tree.Objects.Model)) {
  if (!/\.[ij]$/.test(model.attrName)) continue;
  const geometry = geometryForModel.get(model.id);
  const object = sceneModels.get(model.id);
  const candidates = byName.get(model.attrName) ?? [];
  const fail = reason => unresolved.push({ name: model.attrName, reason });
  if (!geometry) { fail('No source geometry connected to named model'); continue; }
  if (!object) { fail('Named model missing from parsed scene'); continue; }
  if (candidates.length !== 1) { fail(`Prefab transform name match count: ${candidates.length}`); continue; }
  if (['GeometricTranslation', 'GeometricRotation', 'GeometricScaling'].some(key => key in model)) { fail('Geometric pretransform needs explicit handling'); continue; }
  const endpoints = (children.get(candidates[0].id) ?? []).filter(child => names.get(child.object) === 'maxPoint');
  if (endpoints.length !== 1) { fail('Missing or nonunique serialized maxPoint'); continue; }
  const local = xyz(scalar(endpoints[0].body, 'm_LocalPosition'));
  // Unity importer reflects X and converts source centimeters to meters in mesh-local data.
  // Validate this against an actual source control point for every record; never assume vertex order.
  const sourceLocal = new Vector3(-100 * local[0], 100 * local[1], 100 * local[2]);
  const vertices = geometry.Vertices.a;
  const matches = [];
  for (let i = 0; i < vertices.length; i += 3) {
    const distance = sourceLocal.distanceTo(new Vector3().fromArray(vertices, i));
    if (distance < 1e-7) matches.push({ index: i / 3, distance });
  }
  if (matches.length !== 1) { fail('Serialized endpoint does not uniquely match source control point'); continue; }
  const point = new Vector3().fromArray(vertices, matches[0].index * 3).applyMatrix4(object.matrixWorld);
  let parent = object.parent;
  while (parent && !parent.isMesh) parent = parent.parent;
  const record = {
    name: model.attrName.replace(/\.[ij]$/, ''), sourceModelName: model.attrName,
    sourceModelId: model.id, sourceGeometryId: geometry.id,
    prefabTransformId: candidates[0].id, prefabMaxPointTransformId: endpoints[0].id,
    prefabLocalEndpoint: local, matchedSourceControlPoint: matches[0].index,
    localMatchResidual: matches[0].distance, positionFbxWorld: point.toArray(),
    parentMesh: parent?.userData.originalName ?? null,
  };
  if (parent && /^(External occipital protuberance|Superior nuchal line|Mastoid process)$/.test(record.name)) {
    const positions = parent.geometry.attributes.position;
    const index = parent.geometry.index;
    const count = index?.count ?? positions.count;
    const triangle = new Triangle();
    const q = new Vector3();
    let best = Infinity;
    let hit;
    for (let i = 0; i < count; i += 3) {
      for (const [key, offset] of [['a', 0], ['b', 1], ['c', 2]]) {
        triangle[key].fromBufferAttribute(positions, index ? index.getX(i + offset) : i + offset).applyMatrix4(parent.matrixWorld);
      }
      triangle.closestPointToPoint(point, q);
      const distance = point.distanceTo(q);
      if (distance < best) { best = distance; hit = { distanceFbxUnits: distance, face: i / 3, position: q.toArray() }; }
    }
    record.nearestParentSurface = hit;
  }
  landmarks.push(record);
}
const result = {
  status: 'independent-source-label-endpoints-only',
  sourceCommit: '6c7f9016bd5899ac8edafd31b9900c151df42ed6',
  inputs: { fbx: { path: realpathSync(fbxPath), sha256: sha(fbx) }, prefab: { path: realpathSync(prefabPath), sha256: sha(prefab) }, loaderSha256: sha(loaderSource) },
  axisMetadata: Object.fromEntries(['UpAxis', 'UpAxisSign', 'FrontAxis', 'FrontAxisSign', 'CoordAxis', 'CoordAxisSign', 'UnitScaleFactor'].map(key => [key, tree.GlobalSettings[key]?.value])),
  method: 'Match serialized Unity maxPoint to raw FBX control point after validated local reflection/scale; apply source model world transform. No vertex-order assumption.',
  limitations: ['These are author-placed illustration leader endpoints, not independently validated clinical acupuncture locations.', 'Nearness to source bone proves geometric correspondence only.', 'No transformation to the retained atlas model has been accepted; no atlas points changed.'],
  landmarks, unresolved,
};
// Exclusive creation avoids accidentally overwriting an input, prior report, or application data.
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ extracted: landmarks.length, unresolved: unresolved.length, examples: landmarks.filter(x => x.nearestParentSurface) }, null, 2));

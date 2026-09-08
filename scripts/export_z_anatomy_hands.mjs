// Extract independent hand references. No atlas transformation or point assignment.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { Vector3 } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const [sourceDir, output] = process.argv.slice(2);
if (!sourceDir || !output || process.argv.length !== 4) throw new Error('Usage: export_z_anatomy_hands.mjs SOURCE_DIR OUTPUT.json');
const bone = /^(?:Radius|Ulna|(?:Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate) bone|(?:First|Second|Third|Fourth|Fifth) metacarpal bone|(?:Proximal|Middle|Distal) phalanx of (?:first|second|third|fourth|fifth) finger of hand)\.[lr]$/;
const skin = /^(?:Palm|Dorsum of hand|Dorsal surfaces of digits of hand|Palmar surfaces of digits of hand|Nail plate|Radial foveola|Anterior region of wrist|Posterior region of wrist)\.[lr]$/;
const inputs = [
  ['SkeletalSystem100.fbx', '294a649765cd060a62a4095da52b9c8ef2d97769aa447e196448aa5f7d596dea', bone, 'bone'],
  ['Regions of human body100.fbx', '9d8da01d4719f9a61ee6ccfcaef85f788c4c67e9bcd74f5725c6946ab8b44199', skin, 'surface'],
];
const meshes = [];
for (const [file, expectedHash, select, kind] of inputs) {
  const bytes = readFileSync(join(sourceDir, file));
  if (createHash('sha256').update(bytes).digest('hex') !== expectedHash) throw new Error(`Unexpected source: ${file}`);
  const scene = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.updateMatrixWorld(true);
  scene.traverse(object => {
    const name = object.userData.originalName ?? '';
    if (!object.isMesh || !select.test(name)) return;
    const positions = object.geometry.attributes.position;
    meshes.push({name, kind, side: name.slice(-1), sourceFile: file, sourceModelId: object.ID,
      matrixWorld: object.matrixWorld.toArray(),
      vertices: Array.from({length: positions.count}, (_, i) => new Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).toArray()),
      index: object.geometry.index ? Array.from(object.geometry.index.array) : null});
  });
}
for (const side of ['l', 'r']) {
  if (meshes.filter(m => m.side === side && m.kind === 'bone').length !== 29) throw new Error(`Expected 27 hand bones plus radius and ulna on ${side}`);
  if (meshes.filter(m => m.side === side && m.kind === 'surface').length !== 8) throw new Error(`Expected eight hand surface groups on ${side}`);
}
const result = {sourceCommit: '6c7f9016bd5899ac8edafd31b9900c151df42ed6',
  sourceHashes: Object.fromEntries(inputs.map(([name, hash]) => [name, hash])),
  method: 'Exact named anatomical meshes, source world transforms applied. No smoothing, deformation, skin fitting or atlas point assignment.',
  coordinateConvention: 'FBX source world coordinates retained; source UnitScaleFactor=1, Y up. Not application meters.',
  limitations: ['Independent illustration anatomy; not accepted target-model correspondence.', 'Surface-region boundaries and label endpoints are not acupuncture point definitions.'], meshes};
writeFileSync(output, JSON.stringify(result), {flag: 'wx'});
console.log(JSON.stringify({output, meshes: meshes.length, expandedVertices: meshes.reduce((n, m) => n + m.vertices.length, 0)}));

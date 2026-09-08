// Extract named source head surfaces only; never alter the retained atlas model.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Vector3 } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const [input, output] = process.argv.slice(2);
if (!input || !output || process.argv.length !== 4) throw new Error('Usage: export_z_anatomy_head.mjs REGIONS.fbx OUTPUT.json');
const bytes = readFileSync(input);
const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
if (sourceSha256 !== '9d8da01d4719f9a61ee6ccfcaef85f788c4c67e9bcd74f5725c6946ab8b44199') throw new Error('Unexpected source regions file');
const scene = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.updateMatrixWorld(true);
const meshes = [];
scene.traverse(object => {
  if (!object.isMesh || /\.[ijst]$/.test(object.userData.originalName ?? '') || object.name.includes('Hairs')) return;
  let parent = object;
  let isHead = false;
  while (parent) {
    if (parent.userData.originalName === 'Regions of head.g') isHead = true;
    parent = parent.parent;
  }
  if (!isHead) return;
  const positions = object.geometry.attributes.position;
  meshes.push({
    name: object.name, originalName: object.userData.originalName, sourceModelId: object.ID,
    vertices: Array.from({ length: positions.count }, (_, i) => new Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).toArray()),
    index: object.geometry.index ? Array.from(object.geometry.index.array) : null,
  });
});
if (!meshes.length || !meshes.some(m => m.name.startsWith('Occipital_region'))) throw new Error('Head regions missing');
const result = { sourceFile: 'Regions of human body100.fbx', sourceCommit: '6c7f9016bd5899ac8edafd31b9900c151df42ed6', sourceSha256,
  method: 'Named meshes descending from Regions of head.g, excluding label leaders and hair; source world transforms applied, no deformation.', meshes };
writeFileSync(output, JSON.stringify(result), { flag: 'wx' });
console.log(JSON.stringify({ meshes: meshes.length, expandedVertices: meshes.reduce((n, m) => n + m.vertices.length, 0), sourceSha256 }));

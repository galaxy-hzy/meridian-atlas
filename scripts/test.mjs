import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
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
const {
  channels,
  primaryChannels,
  extraPoints,
  pointById,
  channelAtHour,
  timeLabel,
  roleNames,
  mnemonic,
  canInspectPoint,
  resolvePointId,
  parseComparisonPoints,
} = await import('../lib/atlas.ts');
const { default: nationalStandard } =
  await import('../lib/national-standard.json');
const { classicSongs } = await import('../lib/classics.ts');
const { luoStudies, getLuoStudy } = await import('../lib/luo-data.ts');
const { luoChannels, luoSegments, studyChannels } =
  await import('../lib/luo.ts');
const { closestPolylinePoint, boundedPolyline } =
  await import('../lib/regional-anchor.ts');
test('regional connection endpoints follow the current bounded meridian geometry', () => {
  const bound = Object.values(luoSegments).flatMap((paths) =>
    paths.flatMap((path) =>
      path.nodes.filter((node) => typeof node !== 'string' && node.binding),
    ),
  );
  assert.equal(bound.length, 9);
  for (const region of bound) {
    const { channel, from, to, reference } = region.binding;
    const route = channels.find((c) => c.id === channel).route;
    const a = pointById[from].position,
      b = pointById[to].position;
    const distance = Math.hypot(
      ...region.position.map((v, j) => v - pointById[reference].position[j]),
    );
    assert.ok(distance < 0.09, `${region.label}: detached from its local limb`);
    assert.ok(
      region.position[1] >= Math.min(a[1], b[1]) - 1e-5 &&
        region.position[1] <= Math.max(a[1], b[1]) + 1e-5,
    );
    const path = boundedPolyline(route, a, b);
    assert.ok(path.length > 2);
    assert.ok(region.position.every(Number.isFinite));
  }
});
test('regional polyline binding is bounded, pose dependent, and handles duplicate vertices', () => {
  const path = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 2, 0],
    [2, 2, 0],
  ];
  assert.deepEqual(closestPolylinePoint(path, [1, 1, 0]), [0, 1, 0]);
  assert.deepEqual(closestPolylinePoint(path, [3, 2, 0]), [2, 2, 0]);
  const shifted = path.map((p) => p.map((v, j) => v + [4, -3, 2][j]));
  assert.deepEqual(closestPolylinePoint(shifted, [5, -2, 2]), [4, -2, 2]);
  assert.deepEqual(boundedPolyline(path, [2, 2, 0], [0, 2, 0]), [
    [0, 2, 0],
    [2, 2, 0],
  ]);
  assert.throws(() => boundedPolyline(path, [0, 0, 1], [0, 2, 0]));
  assert.throws(() => closestPolylinePoint([[0, 0, 0]], [0, 0, 0]));
});
test('fifteen collaterals use existing points without changing the twelve-hour cycle or twenty meridians', () => {
  const expected = [
    'LU7',
    'LI6',
    'ST40',
    'SP4',
    'HT5',
    'SI7',
    'BL58',
    'KI4',
    'PC6',
    'TE5',
    'GB37',
    'LR5',
    'CV15',
    'GV1',
    'SP21',
  ];
  assert.deepEqual(
    luoStudies.map((s) => s.pointId),
    expected,
  );
  assert.equal(new Set(luoStudies.map((s) => s.id)).size, 15);
  assert.equal(channels.length, 20);
  assert.equal(studyChannels.length, 35);
  assert.equal(Object.keys(pointById).length, 419);
  assert.equal(primaryChannels.length, 12);
  for (const c of luoChannels) {
    assert.equal(c.hour, undefined);
    assert.equal(c.points.length, 1);
    assert.strictEqual(c.points[0], pointById[c.points[0].id]);
  }
  assert.equal(getLuoStudy('LUO-SP').pointId, 'SP4');
  assert.equal(getLuoStudy('LUO-SP-MAJOR').pointId, 'SP21');
  assert.match(getLuoStudy('LUO-CV').excerpt, /尾翳/);
  assert.equal(getLuoStudy('__proto__'), undefined);
});
test('collateral selection unlocks its own luo point and never all parent or paired meridian points', () => {
  for (const s of luoStudies) {
    for (const p of Object.values(pointById)) {
      assert.equal(
        canInspectPoint(s.id, p),
        p.id === s.pointId,
        `${s.id}/${p.id}`,
      );
    }
    assert.equal(canInspectPoint(null, pointById[s.pointId]), false);
    assert.equal(canInspectPoint(s.id, null), false);
  }
  assert.equal(canInspectPoint('LUO-LU', pointById.LI4), false);
  assert.equal(canInspectPoint('LUO-SP', pointById.SP21), false);
  assert.equal(canInspectPoint('LU', pointById.LU7), true);
});
test('every collateral has anchored finite regional geometry and explicitly unclocked source study', () => {
  for (const c of luoChannels) {
    const s = getLuoStudy(c.id);
    assert.ok(s.summary && s.excerpt && s.connection);
    assert.deepEqual(c.routes[0][0], pointById[s.pointId].position);
    assert.equal(c.routes.length, luoSegments[c.id].length);
    for (const [i, route] of c.routes.entries()) {
      assert.ok(route.length >= 2);
      assert.equal(c.routePresentation.paths[i].kind, 'region');
      assert.equal(c.routePresentation.paths[i].animate, false);
      for (const node of route) {
        assert.equal(node.length, 3);
        assert.ok(node.every(Number.isFinite));
        assert.ok(node[1] >= 0 && node[1] <= 2);
      }
    }
  }
});
const { standardLocations, describeStandardLocation } =
  await import('../lib/standard-locations.ts');
const { default: standardLocationData } =
  await import('../lib/standard-location-facts.json');
test('all 362 national entries expose basic Chinese anatomical facts with matching clauses and page references', () => {
  assert.equal(standardLocationData.sourceSha256, nationalStandard.sha256);
  assert.deepEqual(
    Object.keys(standardLocations).sort(),
    Object.keys(nationalStandard.points).sort(),
  );
  for (const [id, facts] of Object.entries(standardLocations)) {
    assert.equal(facts.clause, nationalStandard.points[id].clause);
    assert.equal(facts.pdfPage, nationalStandard.points[id].pdfPage);
    assert.ok(facts.region && facts.relations.length > 0);
    assert.ok(pointById[id].location.includes('区域：'));
    assert.doesNotMatch(
      pointById[id].location,
      /体表区域：|完整文字定位见 WHO|正在核对/,
    );
    if (!id.startsWith('LI'))
      assert.equal(pointById[id].location, describeStandardLocation(facts));
    for (const r of facts.relations) {
      if (r.kind === 'distance')
        assert.ok(Number.isFinite(r.cun) && r.cun > 0 && r.cun < 30);
      if (r.kind === 'line')
        for (const point of r.pointIds) assert.ok(pointById[point]);
    }
  }
});
test('national digests retain clinically distinct sides, proximal/distal locations, modern landmarks and reviewed PDF corrections', () => {
  assert.match(pointById.SP1.location, /末节内侧/);
  assert.match(pointById.LR1.location, /末节外侧/);
  assert.match(pointById.SI2.location, /尺侧远端/);
  assert.match(pointById.SI3.location, /尺侧近端/);
  assert.match(pointById.ST30.location, /耻骨联合上缘/);
  assert.match(pointById.ST30.location, /动脉搏动/);
  assert.match(pointById.ST41.location, /拇长伸肌腱与趾长伸肌腱/);
  assert.match(pointById.GB31.location, /腘横纹上 9 寸/);
  assert.match(pointById.GB31.location, /髂胫束后缘/);
  assert.match(pointById.TE13.location, /三角肌后缘相交/);
  assert.match(pointById.PC8.location, /偏于第3掌骨/);
  assert.match(pointById.CV15.location, /剑突尖下 1 寸/);
  assert.match(pointById.CV16.location, /剑突尖所在/);
  assert.match(pointById.CV1.location, /男性.*女性/);
  assert.match(pointById.ST26.location, /脐中下 1 寸/);
  assert.equal(standardLocationData.extractionCorrections.length, 2);
});
const { diabetesCore, diabetesPatterns, classicalDiabetes, confluentPairs } =
  await import('../lib/combinations.ts');
test('362 national-standard points match the source index, with unique names, clauses and stable codes', () => {
  const counts = {
    LU: 11,
    LI: 20,
    ST: 45,
    SP: 21,
    HT: 9,
    SI: 19,
    BL: 67,
    KI: 27,
    PC: 9,
    TE: 23,
    GB: 44,
    LR: 14,
    CV: 24,
    GV: 29,
  };
  let total = 0;
  for (const [id, count] of Object.entries(counts)) {
    const c = channels.find((c) => c.id === id);
    assert.ok(c);
    assert.equal(c.points.length, count);
    total += count;
    c.points.forEach((p, i) => {
      const expected =
        id === 'GV' && i >= 24 ? (i === 24 ? 'GV24+' : `GV${i}`) : id + (i + 1);
      assert.equal(p.id, expected);
      assert.equal(p.index, i + 1);
      assert.equal(p.name, nationalStandard.points[p.id].name);
      assert.ok(
        p.locationReference.url.endsWith(
          '#page=' + nationalStandard.points[p.id].pdfPage,
        ),
      );
      assert.ok(p.location);
      assert.ok(p.indications);
      assert.ok(p.source);
      assert.equal(pointById[p.id], p);
    });
  }
  assert.equal(total, 362);
  assert.equal(Object.keys(nationalStandard.points).length, total);
  assert.equal(
    new Set(Object.values(nationalStandard.points).map((p) => p.clause)).size,
    total,
  );
  assert.equal(channels.length, 20);
  assert.equal(primaryChannels.length, 12);
  assert.equal(new Set(Object.keys(pointById)).size, 419);
});
test('all 1440 minutes belong to the correct traditional two-hour interval, including midnight', () => {
  const order = [
    'LU',
    'LI',
    'ST',
    'SP',
    'HT',
    'SI',
    'BL',
    'KI',
    'PC',
    'TE',
    'GB',
    'LR',
  ];
  for (let minute = 0; minute < 1440; minute++) {
    const expected = order[Math.floor(((minute - 180 + 1440) % 1440) / 120)];
    assert.equal(channelAtHour(minute / 60).id, expected);
  }
  for (const [h, id] of [
    [0, 'GB'],
    [1, 'LR'],
    [2.999, 'LR'],
    [3, 'LU'],
    [4.999, 'LU'],
    [5, 'LI'],
    [23, 'GB'],
    [24, 'GB'],
    [-1, 'GB'],
  ])
    assert.equal(channelAtHour(h).id, id);
  assert.equal(timeLabel(3), '03:00');
  assert.equal(timeLabel(23.99), '23:59');
  assert.equal(timeLabel(24), '00:00');
  assert.throws(() => channelAtHour(NaN));
});
test('Five-Shu and Yuan/Luo are separate, multi-role classifications', () => {
  for (const c of primaryChannels) {
    for (const role of roleNames)
      assert.equal(
        c.points.filter((p) => p.roles.includes(role)).length,
        1,
        `${c.id}/${role}`,
      );
    const peer = channels.find((p) => p.id === c.pair);
    assert.equal(peer.pair, c.id);
  }
  assert.deepEqual(pointById.LU9.roles, ['输', '原']);
  assert.deepEqual(pointById.LU7.roles, ['络']);
  assert.ok(pointById.SI8.roles.includes('合'));
  assert.ok(pointById.HT3.roles.includes('合'));
  assert.ok(pointById.GB38.roles.includes('经'));
  assert.deepEqual(pointById.CV1.roles, []);
  assert.deepEqual(pointById.GV1.roles, ['络']);
  assert.deepEqual(pointById.CV15.roles, ['络']);
  assert.deepEqual(pointById.SP21.roles, ['大络']);
});
test('a point is only detailed after selecting its meridian (or an associated extraordinary vessel)', () => {
  assert.equal(canInspectPoint(null, pointById.LU9), false);
  assert.equal(canInspectPoint('LI', pointById.LU9), false);
  assert.equal(canInspectPoint('LU', pointById.LU9), true);
  assert.equal(canInspectPoint('YINWEI', pointById.PC6), true);
  assert.equal(canInspectPoint('EX', pointById['EX-B3']), true);
  assert.equal(canInspectPoint('LU', null), false);
});
test('geometries have finite bounded coordinates and the bladder route does not jump from knee to shoulder', () => {
  for (const c of channels) {
    for (const p of c.route) {
      assert.equal(p.length, 3);
      assert.ok(p.every(Number.isFinite));
      assert.ok(Math.abs(p[0]) < 1);
      // A 3 mm surface offset extends below the foot's zero-height sole.
      assert.ok(p[1] >= -0.00301 && p[1] < 2);
      assert.ok(Math.abs(p[2]) < 0.5);
    }
  }
  const bl = channels.find((c) => c.id === 'BL');
  assert.equal(bl.routes.length, 2);
  for (const path of bl.routes)
    for (let i = 1; i < path.length; i++)
      assert.ok(
        Math.hypot(...path[i].map((v, j) => v - path[i - 1][j])) < 0.6,
        'discontinuous branch',
      );
});
test('51 standard extra entries and six supplements preserve real groups without duplicating reclassified points', () => {
  assert.equal(extraPoints.length, 57);
  assert.equal(new Set(extraPoints.map((p) => p.id)).size, 57);
  assert.equal(
    extraPoints.some((p) => p.name === '印堂'),
    false,
  );
  assert.equal(pointById['EX-B2'].positions.length, 17);
  assert.equal(pointById['EX-HN1'].positions.length, 4);
  assert.equal(pointById['EX-HN1'].bilateral, false);
  assert.equal(pointById['EX-UE11'].positions.length, 5);
  assert.ok(pointById['EX-B3'].aliases.includes('消渴'));
  assert.ok(pointById['EX-B3'].location.includes('第8胸椎'));
  assert.equal(pointById['EX-HN12'].bilateral, false);
  for (const p of extraPoints) {
    assert.ok(p.location);
    assert.ok(p.indications || p.source.includes('主治另待文献核对'));
    for (const pos of p.positions || [p.position])
      assert.ok(pos.every(Number.isFinite));
  }
});
test('classical songs and modern numbering keep documented differences', () => {
  for (const c of channels) {
    assert.ok(mnemonic(c));
    if (c.id.length === 2) {
      assert.ok(classicSongs[c.id].url.startsWith('https:'));
    }
  }
  for (const id of ['ST', 'BL', 'TE', 'LR', 'GV'])
    assert.ok(classicSongs[id].note);
  assert.match(classicSongs.GV.text, /二十七/);
  assert.equal(channels.find((c) => c.id === 'GV').points.length, 29);
  assert.match(classicSongs.GV.note, /GV24\+/);
});
test('Yintang aliases resolve to a single governor point and encoded comparison URLs preserve the plus sign', () => {
  const gv = channels.find((c) => c.id === 'GV');
  assert.deepEqual(
    gv.points.slice(23, 27).map((p) => p.id),
    ['GV24', 'GV24+', 'GV25', 'GV26'],
  );
  assert.equal(
    Object.values(pointById).filter((p) => p.name === '印堂').length,
    1,
  );
  assert.equal(pointById['GV24+'].bilateral, false);
  const yintangPoint = pointById['GV24+'];
  assert.equal(yintangPoint.indicationStudy.kind, 'secondary');
  assert.equal(yintangPoint.indications, yintangPoint.indicationStudy.summary);
  assert.ok(
    yintangPoint.indicationStudy.references.some(
      (ref) => ref.url === 'https://m.dayi.org.cn/acupuncture/1141758.html',
    ),
  );
  assert.notEqual(
    yintangPoint.locationReference.url,
    yintangPoint.indicationStudy.references[0].url,
  );

  assert.equal(canInspectPoint('GV', pointById['GV24+']), true);
  assert.equal(canInspectPoint('EX', pointById['GV24+']), false);
  for (const value of ['EX-HN3', 'GV29', 'gv24+', ' ex-hn3 '])
    assert.equal(resolvePointId(value), 'GV24+');
  for (const value of ['constructor', '__proto__', 'GV30', 'GV24++', ''])
    assert.equal(resolvePointId(value), null);
  const query = new URLSearchParams({
    points: 'GV24+,GV25,EX-HN3,GV29,__proto__',
  }).toString();
  assert.match(query, /GV24%2B/);
  assert.deepEqual(
    parseComparisonPoints(new URLSearchParams(query).get('points')),
    ['GV24+', 'GV25'],
  );
});
test('large-intestine location facts retain distal/proximal distinctions, forearm offsets and current arm landmarks', async () => {
  const { locationFacts } = await import('../lib/location-facts.ts');
  assert.equal(Object.keys(locationFacts).length, 20);
  assert.match(pointById.LI2.location, /远端/);
  assert.match(pointById.LI3.location, /近端/);
  for (const [id, distance] of [
    ['LI6', 3],
    ['LI7', 5],
    ['LI8', 4],
    ['LI9', 3],
    ['LI10', 2],
  ]) {
    assert.ok(pointById[id].location.includes(`${distance} 寸`));
    assert.ok(pointById[id].location.includes('阳溪—曲池'));
  }
  assert.ok(locationFacts.LI14.landmarks.includes('三角肌前缘'));
  assert.equal(pointById.TE11.name, '清泠渊');
  assert.match(pointById.LU7.location, /拇短伸肌腱与拇长展肌腱/);
});
test('all sourced combinations resolve across meridians and can be opened as comparison links', () => {
  const groups = [
    diabetesCore,
    ...diabetesPatterns.map((p) => p.points),
    classicalDiabetes.points,
    ...confluentPairs.map((p) => p.points),
  ];
  for (const group of groups)
    for (const id of group) assert.ok(Object.hasOwn(pointById, id), id);
  assert.equal(diabetesCore.length, 6);
  assert.ok(diabetesCore.includes('EX-B3'));
  assert.equal(confluentPairs.length, 4);
  assert.equal(new Set(confluentPairs.flatMap((p) => p.points)).size, 8);
  const encoded = encodeURIComponent(diabetesCore.join(','));
  assert.deepEqual(
    new URLSearchParams('points=' + encoded).get('points').split(','),
    diabetesCore,
  );
  assert.equal(Object.hasOwn(pointById, 'constructor'), false);
});

const { closestOnScreenSegment, screenPickOrder } =
  await import('../lib/picking.ts');
const { humanMesh } = await import('../lib/human-mesh.ts');
test('all displayed mesh attachments reconstruct from the actual GLB triangles, including grouped extra points', () => {
  const glb = readFileSync(
    new URL('../public/models/human-learning.glb', import.meta.url),
  );
  assert.equal(
    createHash('sha256').update(glb).digest('hex'),
    humanMesh.assetSha256,
  );
  assert.equal(glb.readUInt32LE(0), 0x46546c67);
  const jsonLength = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
  const binaryOffset = 28 + jsonLength;
  const vertexOffset = binaryOffset + doc.bufferViews[0].byteOffset;
  const indexOffset = binaryOffset + doc.bufferViews[2].byteOffset;
  const faceCount = doc.accessors[2].count / 3;
  assert.equal(doc.accessors[0].count, 13380);
  assert.equal(faceCount, 26756);
  assert.deepEqual(
    Object.keys(humanMesh.points).sort(),
    Object.keys(pointById).sort(),
  );
  function verify(binding) {
    assert.ok(
      Number.isInteger(binding.face) &&
        binding.face >= 0 &&
        binding.face < faceCount,
    );
    assert.ok(
      binding.barycentric.every(
        (n) => Number.isFinite(n) && n >= -1e-7 && n <= 1 + 1e-7,
      ),
    );
    assert.ok(Math.abs(binding.barycentric.reduce((a, b) => a + b) - 1) < 1e-7);
    assert.ok(Math.abs(Math.hypot(...binding.offset) - 0.003) < 1e-8);
    const indices = [0, 1, 2].map((i) =>
      glb.readUInt32LE(indexOffset + (binding.face * 3 + i) * 4),
    );
    for (let axis = 0; axis < 3; axis++) {
      const value =
        indices.reduce(
          (v, index, i) =>
            v +
            glb.readFloatLE(vertexOffset + (index * 3 + axis) * 4) *
              binding.barycentric[i],
          0,
        ) + binding.offset[axis];
      assert.ok(Math.abs(value - binding.position[axis]) < 1e-7);
    }
  }
  for (const [id, binding] of Object.entries(humanMesh.points)) {
    verify(binding);
    assert.deepEqual(pointById[id].position, binding.position);
    assert.ok(pointById[id].templatePosition);
    assert.match(pointById[id].modelPlacement, /不代表解剖定位已经校准/);
    if (binding.groupBindings) {
      assert.equal(
        binding.groupBindings.length,
        pointById[id].templatePositions.length,
      );
      binding.groupBindings.forEach(verify);
      assert.deepEqual(
        pointById[id].positions,
        binding.groupBindings.map((b) => b.position),
      );
    }
  }
});
test('registered torso preserves navel, unequal abdominal fractions and shared meridian levels on the new mesh', () => {
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
  close(pointById.CV8.position[1], humanMesh.landmarks.navelY);
  close(
    pointById.CV12.position[1],
    (humanMesh.landmarks.navelY + humanMesh.landmarks.xiphoidY) / 2,
  );
  close(
    pointById.CV6.position[1],
    (pointById.CV5.position[1] + pointById.CV7.position[1]) / 2,
  );
  close(
    pointById.KI17.position[1] - pointById.KI16.position[1],
    2 * (pointById.CV9.position[1] - pointById.CV8.position[1]),
  );
  for (const id of ['KI16', 'ST25', 'SP15'])
    close(pointById[id].position[1], pointById.CV8.position[1]);
  close(pointById.ST25.position[0], 4 * pointById.KI16.position[0]);
  close(pointById.SP15.position[0], 2 * pointById.ST25.position[0]);
  close(pointById.ST17.position[0], humanMesh.landmarks.nippleX);
  close(pointById.ST17.position[1], humanMesh.landmarks.nippleY);
  for (let rib = 0; rib < 6; rib++)
    for (const p of humanMesh.guides[rib])
      close(p[1], humanMesh.intercostalY[rib + 1]);
});
test('registered channels preserve every point anchor, both bladder branches and extraordinary routes', () => {
  for (const c of channels) {
    assert.ok(c.templateRoute && c.routes.length);
    for (const route of c.routes)
      for (let i = 1; i < route.length; i++)
        assert.ok(
          Math.hypot(...route[i].map((v, j) => v - route[i - 1][j])) < 0.04,
          `surface path jump: ${c.id}`,
        );
    if (c.id.length !== 2) continue;
    const all = c.routes.flat();
    for (const p of c.points)
      assert.ok(
        all.some((v) => v.every((n, i) => Math.abs(n - p.position[i]) < 1e-8)),
        `missing route anchor: ${p.id}`,
      );
  }
  assert.equal(channels.find((c) => c.id === 'BL').routes.length, 2);
  assert.equal(Object.keys(humanMesh.routes).length, 20);
  assert.ok(humanMesh.guides.length > 0);
});
const { torsoRules, forearmRules, alongForearm } =
  await import('../lib/placement-rules.ts');
const { bodyLandmarks, torsoRadii, surfaceLift } =
  await import('../lib/body-landmarks.ts');
test('retained template torso rules preserve the standard unequal abdominal spacing and cross-meridian levels', () => {
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
  close(pointById.CV8.templatePosition[1], bodyLandmarks.umbilicusY);
  close(pointById.CV2.templatePosition[1], bodyLandmarks.pubicUpperY);
  close(pointById.CV16.templatePosition[1], bodyLandmarks.xiphoidTipY);
  close(
    pointById.CV12.templatePosition[1],
    (pointById.CV8.templatePosition[1] + pointById.CV16.templatePosition[1]) /
      2,
  );
  close(
    pointById.CV6.templatePosition[1],
    (pointById.CV5.templatePosition[1] + pointById.CV7.templatePosition[1]) / 2,
  );
  const upperCun =
    pointById.CV9.templatePosition[1] - pointById.CV8.templatePosition[1];
  close(
    pointById.KI17.templatePosition[1] - pointById.KI16.templatePosition[1],
    2 * upperCun,
  );
  for (const group of [
    ['CV8', 'KI16', 'ST25', 'SP15'],
    ['CV11', 'KI18', 'ST22', 'SP16'],
    ['CV20', 'KI26', 'ST14', 'LU1'],
    ['CV17', 'KI23', 'ST17', 'SP18', 'PC1'],
  ]) {
    for (const id of group)
      close(
        pointById[id].templatePosition[1],
        pointById[group[0]].templatePosition[1],
      );
  }
  close(
    pointById.ST25.templatePosition[0] / pointById.KI16.templatePosition[0],
    4,
  );
  close(
    pointById.SP15.templatePosition[0] / pointById.ST25.templatePosition[0],
    2,
  );
  for (const id of Object.keys(torsoRules)) {
    const [x, y, z] = pointById[id].templatePosition;
    const [rx, rz] = torsoRadii(y);
    close((x / rx) ** 2 + ((z - surfaceLift) / rz) ** 2, 1);
    assert.ok(pointById[id].modelPlacement);
    const channel = channels.find((c) => c.id === pointById[id].channel);
    assert.equal(
      channel.templateRoute[channel.points.indexOf(pointById[id])],
      pointById[id].templatePosition,
    );
  }
  assert.ok(
    pointById.LU1.templatePosition[0] <
      torsoRadii(pointById.LU1.templatePosition[1])[0],
    'Lung chest point must not float outside torso',
  );
});
test('retained template forearm points use twelve proportional units, including unequal spacing and same-level TE6/TE7', () => {
  for (const [id, rule] of Object.entries(forearmRules)) {
    const wrist = pointById[rule.wrist].templatePosition;
    const elbow =
      typeof rule.elbow === 'string'
        ? pointById[rule.elbow].templatePosition
        : rule.elbow;
    const expected = alongForearm(wrist, elbow, rule.cun);
    pointById[id].templatePosition.forEach((v, i) =>
      assert.ok(Math.abs(v - expected[i] - (rule.sideOffset?.[i] || 0)) < 1e-9),
    );
  }
  assert.equal(forearmRules.LU6.cun, 7);
  assert.equal(forearmRules.LI8.cun, 8); // 4 cun below elbow, not 4 above wrist.
  assert.equal(forearmRules.TE9.cun, 7); // 5 cun below olecranon.
  assert.equal(
    pointById.TE6.templatePosition[1],
    pointById.TE7.templatePosition[1],
  );
  assert.notDeepEqual(
    pointById.TE6.templatePosition,
    pointById.TE7.templatePosition,
  );
  assert.throws(() => alongForearm([0, 0, 0], [1, 1, 1], 13), RangeError);
});
test('screen-space line hit works between samples and clamps to route endpoints', () => {
  assert.deepEqual(closestOnScreenSegment(50, 4, 0, 0, 100, 0), {
    t: 0.5,
    distance: 4,
  });
  assert.deepEqual(closestOnScreenSegment(-3, 4, 0, 0, 100, 0), {
    t: 0,
    distance: 5,
  });
  assert.deepEqual(closestOnScreenSegment(103, 4, 0, 0, 100, 0), {
    t: 1,
    distance: 5,
  });
  assert.deepEqual(closestOnScreenSegment(3, 4, 0, 0, 0, 0), {
    t: 0,
    distance: 5,
  });
  assert.equal(closestOnScreenSegment(4, 50, 0, 0, 0, 100).distance, 4);
});
test('point centers remain clickable while enlarged point targets leave nearby meridians selectable', () => {
  const line = { distance: 3, pixels: 0, radius: 5 };
  const point = { distance: 3.004, pixels: 4, radius: 5, pointCore: 2.5 };
  assert.deepEqual(screenPickOrder([]), []);
  assert.deepEqual(screenPickOrder([point, line]), [1, 0]);
  assert.deepEqual(screenPickOrder([{ ...point, pixels: 1 }, line]), [0, 1]);
  assert.deepEqual(screenPickOrder([point]), [0]);
  assert.deepEqual(screenPickOrder([{ ...line, pixels: 6 }]), []);
  assert.deepEqual(screenPickOrder([{ ...line, distance: -1 }]), []);
  assert.deepEqual(screenPickOrder([line, { ...line, distance: 2 }]), [1, 0]);
  // The same offset on a touch screen gets a larger target; it stays a line hit.
  assert.deepEqual(screenPickOrder([{ ...line, pixels: 8, radius: 10 }]), [0]);
});

const { extraStandard, extraCodeAliases } =
  await import('../lib/extra-standard.ts');
test('extra standard has all 51 clauses, preserves uncoded entries and separates supplementary material', () => {
  assert.equal(extraStandard.entries.length, 51);
  assert.equal(
    extraPoints.filter((p) => p.catalog === 'standard-extra').length,
    51,
  );
  assert.equal(
    extraPoints.filter((p) => p.catalog === 'supplement-extra').length,
    6,
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(
      (n) =>
        extraStandard.entries.filter((p) => p.clause.startsWith(`7.${n}.`))
          .length,
    ),
    [17, 2, 8, 1, 11, 12],
  );
  const uncoded = extraStandard.entries.filter((e) => !e.standardCodes.length);
  assert.equal(uncoded.length, 8);
  for (const entry of extraStandard.entries) {
    const p = pointById[entry.id];
    assert.equal(p.name, entry.name);
    assert.equal(p.catalog, 'standard-extra');
    assert.deepEqual(p.standardCodes, entry.standardCodes);
    assert.match(
      p.locationReference.label,
      new RegExp(entry.clause.replaceAll('.', '\\.')),
    );
    assert.equal(
      p.locationReference.url,
      extraStandard.documentUrl + '#page=' + entry.pdfPage,
    );
    assert.ok(p.location.includes(entry.region));
    if (!entry.standardCodes.length)
      assert.equal(p.displayCode, '国标未设代码');
  }
  for (const p of extraPoints.filter((p) => p.catalog === 'supplement-extra')) {
    assert.equal(p.locationReference, undefined);
    assert.match(p.catalogNote, /未收入|不计入/);
  }
  assert.match(pointById['EX-UE5'].location, /拇指背面；掌指关节/);
  assert.match(pointById['EXTRA-LINEITING'].location, /足底/);
  assert.match(pointById['EX-LE11'].location, /远端趾间关节/);
});
test('extra aliases and paired Jinjin/Yuye preserve old URLs without duplicate points or lost classical names', () => {
  for (const [alias, id] of Object.entries(extraCodeAliases)) {
    assert.equal(resolvePointId(alias.toLowerCase()), id);
    assert.equal(Object.hasOwn(pointById, alias), false);
  }
  assert.deepEqual(
    parseComparisonPoints('EX-HN12,EX-HN13,M-HN14,EX-HN8,M-LE26,ST35'),
    ['EX-HN12', 'EX-HN8', 'ST35'],
  );
  const pair = pointById['EX-HN12'];
  assert.equal(pair.name, '金津玉液');
  assert.equal(pair.positions.length, 2);
  assert.equal(pair.bilateral, false);
  assert.ok(pair.positions[0][0] > 0 && pair.positions[1][0] < 0);
  assert.match(pair.aliases, /金津；玉液/);
  assert.equal(classicalDiabetes.points.length, 10);
  assert.ok(classicalDiabetes.points.includes('EX-HN12'));
  assert.match(classicalDiabetes.note, /左右两个穴点/);
  assert.equal(pointById['EX-LE1'].positions.length, 2);
  assert.equal(pointById['EX-LE12'].positions.length, 5);
});
test('new extra mesh placement retains abdominal proportions and sole versus dorsal landmarks', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8);
  near(pointById['EX-CA1'].position[1], pointById.CV3.position[1]);
  near(pointById['EXTRA-TITUO'].position[1], pointById.CV4.position[1]);
  near(
    pointById['EXTRA-TITUO'].position[0] / pointById['EX-CA1'].position[0],
    4 / 3,
  );
  assert.ok(
    pointById['EXTRA-LINEITING'].position[1] < pointById.ST44.position[1],
  );
  near(
    pointById['EX-B3'].position[1],
    (pointById.BL17.position[1] + pointById.BL18.position[1]) / 2,
  );
  assert.match(pointById['EX-HN10'].modelPlacement, /没有黏膜与舌部解剖层/);
});

test('extra indication references remain separate from location standards and respect the detail gate', () => {
  const classicalIds = [
    'EX-HN2',
    'EX-HN9',
    'EX-HN10',
    'EX-HN11',
    'EXTRA-JIEJI',
    'EX-UE5',
    'EX-UE6',
    'EX-LE1',
    'EX-LE8',
    'EX-LE9',
    'EX-LE11',
    'EX-LE12',
  ];
  const secondaryIds = [
    'EXTRA-XINSHE',
    'EXTRA-XUEYADIAN',
    'EXTRA-TITUO',
    'EX-B6',
    'EXTRA-LINEITING',
  ];
  for (const [kind, ids] of [
    ['classical', classicalIds],
    ['secondary', secondaryIds],
  ]) {
    for (const id of ids) {
      const point = pointById[id];
      assert.equal(point.indicationStudy.kind, kind, id);
      assert.ok(point.indications.length > 0, id);
      assert.match(point.locationReference.label, /GB\/T 40997-2021/, id);
      assert.ok(point.indicationStudy.references.length > 0, id);
      for (const ref of point.indicationStudy.references) {
        assert.equal(new URL(ref.url).protocol, 'https:', id);
        assert.ok(ref.label.length > 0, id);
      }
      assert.equal(canInspectPoint(null, point), false, id);
      assert.equal(canInspectPoint('LU', point), false, id);
      assert.equal(canInspectPoint('EX', point), true, id);
      if (kind === 'secondary') {
        assert.match(point.indicationStudy.note, /待校|待核/, id);
        assert.equal(point.indicationStudy.excerpt, undefined, id);
      }
    }
  }
  assert.match(pointById['EX-HN11'].indicationStudy.note, /并非完全对应/);
  assert.match(pointById['EX-LE1'].indicationStudy.note, /资料性附录/);
  assert.match(pointById['EX-LE12'].indicationStudy.note, /病证语境/);
  assert.equal(pointById['EXTRA-LINEITING'].displayCode, '国标未设代码');
  assert.notEqual(
    pointById['EXTRA-LINEITING'].indications,
    pointById.ST44.indications,
  );
  assert.ok(!pointById['EXTRA-XUEYADIAN'].indications.includes('头像强痛'));
});

const {
  advanceLearningHour,
  periodProgress,
  advanceFlowFrame,
  curveProgress,
  forkTimelines,
} = await import('../lib/flow.ts');
test('clock flow covers every minute of every two-hour period without midnight drift', () => {
  for (const channel of primaryChannels) {
    for (let minute = 0; minute < 120; minute++) {
      const hour = advanceLearningHour(channel.hour, minute / 60);
      assert.equal(channelAtHour(hour).id, channel.id);
      assert.ok(
        Math.abs(periodProgress(hour, channel.hour) - minute / 120) < 1e-7,
      );
    }
    assert.equal(
      periodProgress(advanceLearningHour(channel.hour, 2), channel.hour),
      null,
    );
  }
  assert.equal(periodProgress(3, 3), 0);
  assert.equal(periodProgress(4, 3), 0.5);
  assert.equal(periodProgress(0, 23), 0.5);
  let hour = 3;
  for (let i = 0; i < 1200; i++) hour = advanceLearningHour(hour, 0.02);
  assert.equal(hour, 3);
  assert.equal(timeLabel(3.05), '03:03');
  assert.equal(timeLabel(-0.5), '23:30');
  assert.throws(() => advanceLearningHour(Infinity, 1));
});
test('single-channel flow starts at its origin, pauses without hidden elapsed time, and resets when changing meridians', () => {
  let frame = {
    channel: null,
    elapsed: 0,
    at: 0,
    running: false,
    started: false,
  };
  frame = advanceFlowFrame(frame, 'LU', true, 90000);
  assert.equal(frame.elapsed, 0);
  frame = advanceFlowFrame(frame, 'LU', true, 93500);
  assert.equal(frame.elapsed, 3500);
  frame = advanceFlowFrame(frame, 'LU', false, 93600);
  frame = advanceFlowFrame(frame, 'LU', true, 120000);
  assert.equal(frame.elapsed, 3500);
  frame = advanceFlowFrame(frame, 'LU', true, 120100);
  assert.equal(frame.elapsed, 3600);
  frame = advanceFlowFrame(frame, 'LI', true, 120200);
  assert.equal(frame.elapsed, 0);
  assert.equal(frame.started, true);
  frame = advanceFlowFrame(frame, null, false, 120300);
  assert.equal(frame.started, false);
});
test('branch animation shares head and join stages without starting a second branch early or wrapping trails to the end', () => {
  const timelines = forkTimelines(6, 1 / 3, 8, 1 / 2);
  assert.equal(curveProgress(0, timelines[0]), 0);
  assert.equal(curveProgress(0, timelines[1]), null);
  assert.equal(curveProgress(0.2, timelines[0]), 1 / 3);
  assert.equal(curveProgress(0.2, timelines[1]), 0);
  assert.equal(curveProgress(0.6, timelines[0]), 1);
  assert.equal(curveProgress(0.6, timelines[1]), 0.5);
  assert.equal(curveProgress(0.8, timelines[0]), null);
  assert.equal(curveProgress(1, timelines[1]), 1);
  assert.equal(
    curveProgress(-0.025, [
      [0, 0],
      [1, 1],
    ]),
    null,
  );
});

const { vesselStudies, confluentPointIds } =
  await import('../lib/vessel-points.ts');
test('six extraordinary-vessel literature indexes resolve to existing national points without duplicate acupoints', () => {
  const counts = {
    CHONG: 12,
    DAI: 4,
    YINQIAO: 4,
    YANGQIAO: 11,
    YINWEI: 7,
    YANGWEI: 16,
  };
  for (const [id, count] of Object.entries(counts)) {
    const study = vesselStudies[id],
      channel = channels.find((c) => c.id === id);
    assert.equal(study.members.length, count, id);
    assert.equal(new Set(study.members.map((p) => p.id)).size, count, id);
    for (const member of study.members) {
      assert.ok(nationalStandard.points[member.id], member.id);
      assert.equal(
        channel.points.find((p) => p.id === member.id),
        pointById[member.id],
      );
      assert.equal(canInspectPoint(id, pointById[member.id]), true);
      assert.equal(canInspectPoint(null, pointById[member.id]), false);
    }
    for (const ref of study.references)
      assert.equal(new URL(ref.url).protocol, 'https:');
    assert.equal(
      channel.points.length,
      new Set([...study.members.map((p) => p.id), ...confluentPointIds[id]])
        .size,
    );
  }
  assert.equal(Object.keys(pointById).length, 419);
  assert.equal(channels.find((c) => c.id === 'CV').points.length, 24);
  assert.equal(channels.find((c) => c.id === 'GV').points.length, 29);
});
test('confluent points and book-specific route references stay distinct, including ambiguous classical names', () => {
  assert.deepEqual(confluentPointIds.CV, ['LU7']);
  assert.deepEqual(confluentPointIds.GV, ['SI3']);
  assert.equal(canInspectPoint('CV', pointById.LU7), true);
  assert.equal(canInspectPoint('CV', pointById.LU9), false);
  assert.equal(canInspectPoint('CHONG', pointById.KI20), true);
  assert.equal(canInspectPoint('CHONG', pointById.BL66), false);
  assert.equal(canInspectPoint('YANGWEI', pointById.GB15), true);
  assert.equal(canInspectPoint('YANGWEI', pointById.GB41), false);
  assert.equal(canInspectPoint('YANGQIAO', pointById.BL63), false);
  assert.equal(canInspectPoint('YANGQIAO', pointById.TE5), false);
  assert.equal(
    vesselStudies.YINQIAO.members.find((p) => p.id === 'KI2').landmark,
    true,
  );
  assert.ok(!vesselStudies.CHONG.members.some((p) => p.id === 'SP4'));
  assert.ok(
    !vesselStudies.YANGQIAO.references.some((r) =>
      r.url.includes('wikisource'),
    ),
  );
});

const { default: vesselRouteSpecs } =
  await import('../lib/vessel-route-specs.json');
const { sequentialTimelines } = await import('../lib/flow.ts');
test('extraordinary routes retain their actual named anchors and exclude confluent-only points', () => {
  assert.equal(
    humanMesh.vesselRoutes.specSha256,
    createHash('sha256')
      .update(
        readFileSync(
          new URL('../lib/vessel-route-specs.json', import.meta.url),
        ),
      )
      .digest('hex'),
  );
  for (const [id, study] of Object.entries(vesselStudies)) {
    const channel = channels.find((c) => c.id === id);
    assert.ok(channel.routePresentation);
    const routePoints = channel.routes.flat();
    for (const member of study.members.filter((m) => !m.landmark)) {
      assert.ok(
        routePoints.some(
          (p) =>
            Math.hypot(
              ...p.map((v, i) => v - pointById[member.id].position[i]),
            ) < 1e-8,
        ),
        `${id} misses ${member.id}`,
      );
    }
    const anchorIds = channel.routePresentation.paths.flatMap(
      (p) => p.anchorIds,
    );
    for (const confluent of confluentPointIds[id]) {
      if (!study.members.some((m) => m.id === confluent))
        assert.ok(!anchorIds.includes(confluent));
    }
    assert.equal(
      channel.routes.length,
      vesselRouteSpecs.channels[id].paths.length,
    );
  }
  assert.ok(
    !channels
      .find((c) => c.id === 'YINQIAO')
      .routePresentation.paths.flatMap((p) => p.anchorIds)
      .includes('KI2'),
  );
  assert.deepEqual(
    channels.find((c) => c.id === 'CHONG').route[0],
    pointById.ST30.position,
  );
  assert.deepEqual(
    channels.find((c) => c.id === 'YANGQIAO').route.at(-1),
    pointById.GB20.position,
  );
});
test('projected internal segments have connected endpoints; the belt loop is closed and non-directional', () => {
  for (const id of ['YINQIAO', 'YINWEI']) {
    const c = channels.find((c) => c.id === id);
    assert.equal(c.routePresentation.sequential, true);
    assert.equal(c.routePresentation.paths[1].kind, 'projection');
    for (let i = 1; i < c.routes.length; i++)
      assert.deepEqual(c.routes[i - 1].at(-1), c.routes[i][0]);
  }
  const dai = channels.find((c) => c.id === 'DAI');
  assert.equal(dai.routePresentation.sequential, false);
  assert.equal(dai.routePresentation.paths[2].closed, true);
  assert.equal(dai.routePresentation.paths[2].animate, false);
  assert.deepEqual(dai.routes[2][0], dai.routes[2].at(-1));
  assert.equal(dai.routes[0][0][0], -dai.routes[1][0][0]);
  assert.equal(dai.routes[0][0][1], dai.routes[1][0][1]);
});
test('segmented route animation progresses through a projection before starting the next surface segment', () => {
  const t = sequentialTimelines([2, 3, 5]);
  assert.equal(curveProgress(0.1, t[0]), 0.5);
  assert.equal(curveProgress(0.1, t[1]), null);
  assert.equal(curveProgress(0.35, t[0]), null);
  assert.ok(Math.abs(curveProgress(0.35, t[1]) - 0.5) < 1e-10);
  assert.equal(curveProgress(0.35, t[2]), null);
  assert.equal(curveProgress(0.75, t[2]), 0.5);
  assert.equal(curveProgress(1, t[2]), 1);
  assert.throws(() => sequentialTimelines([2, 0]));
});
test('the belt ring stays at waist height and cannot snap to either forearm', () => {
  const ring = channels.find((c) => c.id === 'DAI').routes[2];
  const height = pointById.GB26.position[1];
  for (const p of ring) {
    assert.ok(Math.abs(p[1] - height) < 0.008, 'belt escaped its torso plane');
    assert.ok(Math.abs(p[0]) < 0.2, 'belt snapped to an arm');
  }
});

const { screenPickChoices } = await import('../lib/picking.ts');
test('overlapping channels offer distinct visible targets instead of silently selecting the nearest one', () => {
  const line = { distance: 3, pixels: 1, radius: 5 };
  const hits = [
    { ...line, key: 'channel:LR' },
    { ...line, key: 'channel:DAI', pixels: 2 },
    { ...line, key: 'channel:LR', pixels: 1.2 },
    { ...line, key: 'channel:DAI', pixels: 3, distance: 4 },
    { ...line, key: 'channel:CV', pixels: 6 },
  ];
  assert.deepEqual(
    screenPickChoices(hits).map((i) => hits[i].key),
    ['channel:LR', 'channel:DAI'],
  );
  assert.deepEqual(screenPickChoices([hits[0]]), [0]);
  assert.deepEqual(screenPickChoices([]), []);
});
test('point center selection remains direct over crossing lines, while genuinely overlapping point centers can be distinguished', () => {
  const point = {
    key: 'point:LU9',
    distance: 3,
    pixels: 1,
    radius: 5,
    pointCore: 2.5,
  };
  const line = { key: 'channel:LU', distance: 3, pixels: 0, radius: 5 };
  assert.deepEqual(screenPickChoices([line, point]), [1]);
  assert.deepEqual(
    screenPickChoices([line, point, { ...point, key: 'point:LU8', pixels: 2 }]),
    [1, 2],
  );
  assert.deepEqual(screenPickChoices([line, { ...point, pixels: 4 }]), [0]);
  assert.deepEqual(screenPickChoices([{ ...point, pixels: 4 }]), [0]);
});
test('touch ambiguity respects the larger target and still deduplicates mirrored markers', () => {
  const a = { key: 'channel:CHONG', distance: 3, pixels: 8, radius: 10 };
  const b = { ...a, key: 'channel:KI', pixels: 9 };
  assert.deepEqual(screenPickChoices([a, b, { ...a, pixels: 9 }]), [0, 1]);
  assert.deepEqual(
    screenPickChoices([
      { ...a, radius: 5 },
      { ...b, radius: 5 },
    ]),
    [],
  );
  assert.deepEqual(screenPickChoices([{ ...a, distance: -1 }]), []);
});

const { lookupPronunciation } = await import('../lib/pronunciation.ts');
const { default: pointPronunciations } =
  await import('../lib/point-pronunciation.json');
test('413 sourced pronunciations preserve standard names, clauses, PDF hashes and declared editorial differences', () => {
  assert.equal(pointPronunciations.length, 413);
  for (const r of pointPronunciations) {
    const source =
      r.standard === nationalStandard.standard
        ? nationalStandard
        : extraStandard;
    const original =
      source.points?.[r.id] || source.entries.find((e) => e.id === r.id);
    assert.equal(r.name, original.name);
    assert.equal(r.clause, original.clause);
    assert.equal(r.pdfPage, original.pdfPage);
    assert.equal(r.sourceSha256, source.sha256);
    assert.equal(r.syllables.length, Array.from(r.name).length);
    const normalized = r.sourcePinyin
      .toLowerCase()
      .replace(/[\s’']/g, '')
      .replaceAll('ɡ', 'g');
    assert.equal(
      r.syllables.join(''),
      r.id === 'EX-HN15' ? normalized.replace('jìng', 'jǐng') : normalized,
    );
    if (r.id === 'EX-HN15') assert.match(r.note, /Jìngbǎiláo/);
  }
});
test('point readings override generic heteronyms, including consecutive names in a mnemonic', () => {
  const reading = (text) =>
    lookupPronunciation(text)
      .units.map((u) => u.reading || u.text)
      .join(' ');
  assert.equal(reading('膻中'), 'dàn zhōng');
  assert.equal(reading('少商曲池攒竹'), 'shào shāng qū chí cuán zhú');
  assert.equal(reading('肩髎郄门蠡沟'), 'jiān liáo xì mén lí gōu');
  assert.equal(reading('胃脘下俞肺俞'), 'wèi wǎn xià shū fèi shū');
  assert.equal(reading('颈百劳'), 'jǐng bǎi láo');
  assert.equal(lookupPronunciation('俞').units[0].reading, 'yú');
  assert.ok(lookupPronunciation('俞').units[0].readings.includes('shù'));
  assert.match(lookupPronunciation('肺俞').sources[0].note, /shù/);
});
test('lookup preserves mixed text and punctuation, bounds input, and handles empty input', () => {
  assert.deepEqual(lookupPronunciation('  ').units, []);
  const mixed = '膻中 CV17，肩髎！😀';
  assert.equal(
    lookupPronunciation(mixed)
      .units.map((u) => u.text)
      .join(''),
    mixed,
  );
  assert.equal(
    Array.from(lookupPronunciation('穴'.repeat(501)).text).length,
    500,
  );
  assert.equal(
    lookupPronunciation('ABC123').units.some((u) => u.reading),
    false,
  );
  assert.equal(lookupPronunciation('胃脘下俞').sources.length, 1);
});
test('all currently catalogued point names receive a reading and every song remains within lookup limit', () => {
  for (const p of Object.values(pointById)) {
    const units = lookupPronunciation(p.name).units;
    assert.equal(units.map((u) => u.text).join(''), p.name);
    assert.ok(
      units.every((u) => !u.unknown),
      p.name,
    );
  }
  for (const c of channels)
    assert.ok(Array.from(mnemonic(c)).length <= 500, c.id);
});

const { jingmaiStudies, jingmaiSource } = await import('../lib/jingmai.ts');
test('twelve route studies form exactly one circulation sequence, including liver back to lung', () => {
  assert.deepEqual(
    Object.keys(jingmaiStudies).sort(),
    primaryChannels.map((c) => c.id).sort(),
  );
  const visited = [];
  let id = 'LU';
  for (let i = 0; i < 12; i++) {
    visited.push(id);
    const next = jingmaiStudies[id].next;
    const from = primaryChannels.find((c) => c.id === id);
    const to = primaryChannels.find((c) => c.id === next);
    assert.equal((from.hour + 2) % 24, to.hour);
    id = next;
  }
  assert.equal(new Set(visited).size, 12);
  assert.equal(id, 'LU');
});
test('each route study has distinct source prose, resolvable surface references and intact point-detail ownership', () => {
  assert.equal(jingmaiSource.revision, '2520099');
  assert.equal(
    jingmaiSource.sourceSha256,
    '4e358bf3a62201878e9a0ca7efc1a73a07df95b4ed8e503fe340fdd06696c4f9',
  );
  assert.equal(new Set(Object.values(jingmaiSource.passages)).size, 12);
  for (const c of primaryChannels) {
    const study = jingmaiStudies[c.id];
    assert.ok(
      study.origin && study.belonging && study.connection && study.junction,
    );
    assert.ok(study.sections.length >= 3);
    assert.match(jingmaiSource.passages[c.id], /其支者/);
    assert.doesNotMatch(jingmaiSource.passages[c.id], /是动则病|为此诸病/);
    assert.ok(Array.from(jingmaiSource.passages[c.id]).length <= 500);
    for (const section of study.sections)
      for (const id of section.pointIds) {
        assert.ok(pointById[id], `${c.id} ${id}`);
        assert.equal(pointById[id].channel, c.id);
        assert.ok(canInspectPoint(c.id, pointById[id]));
      }
  }
});
test('course summaries retain wrist branches, facial crossing and source variants without inventing point-to-point continuity', () => {
  assert.equal(jingmaiStudies.LU.origin, '中焦');
  assert.match(jingmaiStudies.LU.sections[2].summary, /腕后.*食指/);
  assert.deepEqual(jingmaiStudies.LU.sections[2].pointIds, []);
  assert.match(jingmaiStudies.LI.sections[2].summary, /下齿.*左右交叉/);
  assert.match(jingmaiStudies.PC.sections[2].summary, /无名指/);
  assert.match(jingmaiStudies.BL.sections[2].summary, /腘窝会合/);
  assert.match(jingmaiSource.passages.ST, /〔一作“次指外间”〕/);
  assert.match(jingmaiSource.passages.SI, /䪼 䪼/);
  assert.match(jingmaiStudies.SI.note, /重复/);
});

const closeLegLevel = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const { default: lowerLegSpec } = await import('../lib/lower-leg-spec.json');
test('lower-leg registration uses separate medial 15 and lateral 16 divisions tied to fixed mesh references', () => {
  const leg = humanMesh.lowerLeg;
  assert.ok(leg);
  assert.equal(leg.sourceSha256, nationalStandard.sha256);
  assert.equal(
    leg.specSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/lower-leg-spec.json', import.meta.url)),
      )
      .digest('hex'),
  );
  assert.equal(lowerLegSpec.assetSha256, humanMesh.assetSha256);
  closeLegLevel((leg.kneeY - leg.medialTipY) / leg.medialUnit, 15);
  closeLegLevel((leg.kneeY - leg.lateralTipY) / leg.lateralUnit, 16);
  closeLegLevel(
    (pointById.SP9.position[1] - leg.medialTipY) / leg.medialUnit,
    13,
  );
  closeLegLevel(
    (pointById.SP9.position[1] - pointById.SP8.position[1]) / leg.medialUnit,
    3,
  );
  for (const [id, cun] of [
    ['SP6', 3],
    ['SP7', 6],
    ['KI7', 2],
    ['KI8', 2],
    ['KI9', 5],
    ['LR5', 5],
    ['LR6', 7],
  ])
    closeLegLevel(
      (pointById[id].position[1] - leg.medialTipY) / leg.medialUnit,
      cun,
    );
  for (const [id, cun] of [
    ['ST36', 3],
    ['ST37', 6],
    ['ST38', 8],
    ['ST39', 9],
    ['BL55', 2],
    ['BL56', 5],
  ])
    closeLegLevel(
      (leg.kneeY - pointById[id].position[1]) / leg.lateralUnit,
      cun,
    );
  for (const [id, cun] of [
    ['GB35', 7],
    ['GB36', 7],
    ['GB37', 5],
    ['GB38', 4],
    ['GB39', 3],
    ['ST40', 8],
    ['BL59', 3],
  ])
    closeLegLevel(
      (pointById[id].position[1] - leg.lateralTipY) / leg.lateralUnit,
      cun,
    );
});
test('leg same-level groups preserve different bone sides and do not collapse into one point', () => {
  for (const ids of [
    ['GB35', 'GB36', 'ST39'],
    ['ST38', 'ST40'],
    ['KI7', 'KI8'],
    ['KI9', 'LR5'],
    ['SP9', 'LR7'],
    ['ST35', 'BL40', 'KI10', 'LR8'],
  ]) {
    for (const id of ids)
      closeLegLevel(pointById[id].position[1], pointById[ids[0]].position[1]);
    assert.equal(
      new Set(ids.map((id) => JSON.stringify(pointById[id].position))).size,
      ids.length,
    );
  }
  assert.ok(pointById.GB35.position[2] < pointById.GB36.position[2]);
  assert.ok(pointById.ST40.position[0] > pointById.ST38.position[0]);
  closeLegLevel(
    pointById.KI8.position[2] - pointById.KI7.position[2],
    humanMesh.lowerLeg.medialUnit * 0.5,
  );
  closeLegLevel(
    pointById.SP9.position[2] - pointById.LR7.position[2],
    humanMesh.lowerLeg.medialUnit,
  );
});
test('front leg points follow the ST35-ST41 projected line and dependent extra point follows its new reference', () => {
  const a = pointById.ST35.position,
    b = pointById.ST41.position;
  for (const id of ['ST36', 'ST37', 'ST38', 'ST39', 'EX-LE7']) {
    const p = pointById[id].position;
    const t = (p[1] - a[1]) / (b[1] - a[1]);
    closeLegLevel(p[0], a[0] + t * (b[0] - a[0]));
  }
  closeLegLevel(
    pointById['EX-LE7'].position[1] - pointById.ST37.position[1],
    humanMesh.lowerLeg.lateralUnit,
  );
  assert.equal(humanMesh.lowerLeg.pointIds.length, 34);
  for (const id of humanMesh.lowerLeg.pointIds)
    assert.match(pointById[id].modelPlacement, /端点仍为模型估计/);
  assert.match(pointById.BL57.modelPlacement, /推导模型层级/);
  assert.match(pointById.BL58.modelPlacement, /约当关系/);
});

const { lungCourse, lungCourseTimelines } =
  await import('../lib/lung-course.ts');
const THREE = await import('three');
test('lung course preserves fixed original, paired mesh, wrist fork and thumb/index distinction', () => {
  assert.equal(lungCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(lungCourse.passage, jingmaiSource.passages.LU);
  assert.equal(lungCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    lungCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  assert.deepEqual(lungCourse.internal.at(-1), pointById.LU1.position);
  assert.deepEqual(lungCourse.branch[0], pointById.LU7.position);
  assert.deepEqual(lungCourse.branch.at(-1), pointById.LI1.position);
  assert.ok(!lungCourse.surfaceReferences.includes('LU11'));
  assert.equal(pointById.LI1.channel, 'LI');
  assert.equal(channels.find((c) => c.id === 'LU').points.length, 11);
  assert.match(lungCourse.note, /不是古籍对现代穴名的指定/);
  assert.ok(lungCourse.nodes[1].position[1] < lungCourse.nodes[0].position[1]);
  for (const p of [...lungCourse.internal, ...lungCourse.branch])
    assert.ok(p.length === 3 && p.every(Number.isFinite));
  for (let i = 1; i < lungCourse.branch.length; i++)
    assert.ok(
      new THREE.Vector3(...lungCourse.branch[i]).distanceTo(
        new THREE.Vector3(...lungCourse.branch[i - 1]),
      ) < 0.04,
    );
});
test('lung animation enters the surface once then splits at the actual wrist, never at the thumb tip', () => {
  const make = (nodes) =>
    new THREE.CatmullRomCurve3(
      nodes.map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
  const internal = make(lungCourse.internal),
    surface = make(channels.find((c) => c.id === 'LU').routes[0]),
    branch = make(lungCourse.branch);
  const wrist = new THREE.Vector3(...pointById.LU7.position);
  const samples = surface.getSpacedPoints(4000);
  let nearest = 0;
  for (let i = 1; i < samples.length; i++)
    if (
      samples[i].distanceToSquared(wrist) <
      samples[nearest].distanceToSquared(wrist)
    )
      nearest = i;
  const t = lungCourseTimelines(
    internal.getLength(),
    surface.getLength(),
    nearest / 4000,
    branch.getLength(),
  );
  const emerge = t.internal.at(-1)[0],
    split = t.branch[0][0];
  assert.equal(curveProgress(emerge - 0.0001, t.surface), null);
  assert.equal(curveProgress(split - 0.0001, t.branch), null);
  assert.equal(curveProgress(emerge, t.surface), 0);
  assert.equal(curveProgress(split, t.branch), 0);
  assert.ok(
    surface
      .getPointAt(curveProgress(split, t.surface))
      .distanceTo(branch.getPointAt(0)) < 0.001,
  );
  assert.ok(curveProgress(split, t.surface) < 1);
  assert.ok(internal.getPointAt(1).distanceTo(surface.getPointAt(0)) < 1e-8);
  assert.ok(
    Math.abs(Math.max(t.surface.at(-1)[0], t.branch.at(-1)[0]) - 1) < 1e-12,
  );
  assert.throws(() => lungCourseTimelines(1, 0, 0.7, 1));
});

const { pointLabel } = await import('../lib/point-labels.ts');
test('model labels retain combined categories without changing the external role order', () => {
  assert.equal(pointLabel('太渊', ['原', '输', '原']), '太渊（输、原）');
  assert.equal(pointLabel('尺泽', ['合']), '尺泽（合）');
  assert.equal(pointLabel('列缺', ['络']), '列缺（络）');
  assert.equal(pointLabel('大包', pointById.SP21.roles), '大包（大络）');
  assert.equal(pointLabel('鸠尾', pointById.CV15.roles), '鸠尾（络）');
  assert.equal(pointLabel('长强', pointById.GV1.roles), '长强（络）');
  assert.equal(pointLabel('中府', []), '中府');
  assert.deepEqual(roleNames, ['井', '荥', '输', '经', '合', '原', '络']);
  for (const c of primaryChannels)
    for (const p of c.points)
      for (const role of p.roles)
        assert.ok(pointLabel(p.name, p.roles).includes(role));
});

const { liCourse, liCourseTimelines } = await import('../lib/li-course.ts');
test('LI course preserves source and branches from the same supraclavicular point to viscera and opposite nose', () => {
  assert.equal(liCourse.passage, jingmaiSource.passages.LI);
  assert.equal(liCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(liCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    liCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const { stem, internal, neck, oral, face } = liCourse.paths;
  assert.deepEqual(stem.points[0], pointById.LI1.position);
  assert.deepEqual(stem.points.at(-1), pointById.ST12.position);
  assert.deepEqual(internal.points[0], stem.points.at(-1));
  assert.deepEqual(neck.points[0], stem.points.at(-1));
  assert.deepEqual(neck.points.at(-1), oral.points[0]);
  assert.deepEqual(oral.points.at(-1), face.points[0]);
  assert.deepEqual(face.points.at(-1), [
    -pointById.LI20.position[0],
    ...pointById.LI20.position.slice(1),
  ]);
  for (let i = 1; i <= 16; i++)
    assert.ok(
      stem.points.some((p) =>
        p.every((n, k) => n === pointById[`LI${i}`].position[k]),
      ),
    );
  assert.ok(
    face.points.some((p) =>
      p.every((n, k) => n === pointById.GV26.position[k]),
    ),
  );
  assert.match(liCourse.passage, /左之右，右之左/);
  assert.equal(pointById.ST12.channel, 'ST');
  assert.equal(pointById.GV26.channel, 'GV');
  assert.equal(liCourse.paths.oral.kind, 'internal');
  for (const path of Object.values(liCourse.paths))
    for (const p of path.points)
      assert.ok(p.length === 3 && p.every(Number.isFinite));
});
test('LI course flow forks after its stem and traverses neck, lower teeth and face serially', () => {
  const lengths = Object.fromEntries(
    Object.entries(liCourse.paths).map(([id, path]) => [
      id,
      new THREE.CatmullRomCurve3(
        path.points.map((p) => new THREE.Vector3(...p)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = liCourseTimelines(lengths);
  assert.equal(t.stem.at(-1)[0], t.internal[0][0]);
  assert.equal(t.internal[0][0], t.neck[0][0]);
  assert.equal(t.neck.at(-1)[0], t.oral[0][0]);
  assert.equal(t.oral.at(-1)[0], t.face[0][0]);
  assert.equal(curveProgress(t.neck[0][0] - 0.0001, t.neck), null);
  assert.equal(curveProgress(t.face[0][0] - 0.0001, t.face), null);
  assert.ok(
    Math.abs(Math.max(t.internal.at(-1)[0], t.face.at(-1)[0]) - 1) < 1e-12,
  );
  assert.throws(() => liCourseTimelines({ ...lengths, oral: 0 }));
});

const { htCourse, htCourseTimelines } = await import('../lib/ht-course.ts');
const { courseCatalog, hasRegionalCourse } =
  await import('../lib/course-catalog.ts');
test('HT deep paths share the heart system and join the unchanged nine-point arm course at HT1', () => {
  assert.equal(htCourse.passage, jingmaiSource.passages.HT);
  assert.equal(htCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(htCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    htCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = htCourse.paths;
  for (const key of ['viscera', 'eye', 'emerge'])
    assert.deepEqual(p[key].points[0], p.stem.points.at(-1));
  assert.deepEqual(p.emerge.points.at(-1), pointById.HT1.position);
  assert.deepEqual(p.arm.points, channels.find((c) => c.id === 'HT').routes[0]);
  assert.deepEqual(p.arm.points.at(-1), pointById.HT9.position);
  assert.ok(p.viscera.points.at(-1)[1] < p.stem.points[0][1]);
  assert.ok(p.eye.points.at(-1)[1] > p.stem.points.at(-1)[1]);
  assert.equal(channels.find((c) => c.id === 'HT').points.length, 9);
  assert.equal(
    p.eye.points.at(-1)[1],
    (pointById['EX-HN4'].position[1] + pointById.ST1.position[1]) / 2,
  );
});
test('HT flow starts all three branches at the heart system but delays the arm until emergence', () => {
  const lengths = Object.fromEntries(
    Object.entries(htCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = htCourseTimelines(lengths),
    fork = t.stem.at(-1)[0];
  for (const key of ['viscera', 'eye', 'emerge'])
    assert.equal(t[key][0][0], fork);
  assert.equal(t.emerge.at(-1)[0], t.arm[0][0]);
  assert.equal(curveProgress(t.arm[0][0] - 0.0001, t.arm), null);
  assert.ok(
    Math.abs(
      Math.max(t.arm.at(-1)[0], t.eye.at(-1)[0], t.viscera.at(-1)[0]) - 1,
    ) < 1e-12,
  );
  assert.throws(() => htCourseTimelines({ ...lengths, eye: NaN }));
});
test('shared course catalog retains LI geometry and timing while advertising only implemented modes', () => {
  assert.deepEqual(courseCatalog.LI.paths, liCourse.paths);
  assert.deepEqual(courseCatalog.HT.paths, htCourse.paths);
  const lengths = { stem: 2, internal: 1, neck: 0.3, oral: 0.1, face: 0.2 };
  assert.deepEqual(
    courseCatalog.LI.timelines(lengths),
    liCourseTimelines(lengths),
  );
  for (const id of ['LU', 'LI', 'HT', 'SI', 'PC', 'TE', 'SP', 'KI', 'LR'])
    assert.equal(hasRegionalCourse(id), true);
  for (const id of ['DAI', 'unknown', null])
    assert.equal(hasRegionalCourse(id), false);
});

const { siCourse, siCourseTimelines } = await import('../lib/si-course.ts');
test('SI preserves canonical points and separates outer canthus, ear and inner canthus branches', () => {
  assert.equal(siCourse.passage, jingmaiSource.passages.SI);
  assert.equal(siCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(siCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    siCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = siCourse.paths;
  for (let i = 1; i <= 15; i++)
    assert.ok(
      p.stem.points.some((v) =>
        v.every((n, k) => n === pointById[`SI${i}`].position[k]),
      ),
    );
  for (const [child, parent] of [
    ['internal', 'stem'],
    ['neck', 'stem'],
    ['outer', 'neck'],
    ['ear', 'outer'],
    ['earDepth', 'ear'],
    ['inner', 'neck'],
    ['cheek', 'inner'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  for (const [key, id] of [
    ['stem', 'ST12'],
    ['neck', 'SI18'],
    ['outer', 'GB1'],
    ['ear', 'SI19'],
    ['inner', 'BL1'],
    ['cheek', 'SI18'],
  ])
    assert.deepEqual(p[key].points.at(-1), pointById[id].position);
  assert.equal(pointById.GB1.channel, 'GB');
  assert.equal(pointById.BL1.channel, 'BL');
  assert.equal(channels.find((c) => c.id === 'SI').points.length, 19);
  assert.equal(hasRegionalCourse('SI'), true);
  assert.deepEqual(courseCatalog.SI.paths, p);
});
test('SI flow reaches each branch junction before showing its particles without restarting a cheek loop', () => {
  const lengths = Object.fromEntries(
    Object.entries(siCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = siCourseTimelines(lengths);
  for (const [child, parent] of [
    ['internal', 'stem'],
    ['neck', 'stem'],
    ['outer', 'neck'],
    ['ear', 'outer'],
    ['earDepth', 'ear'],
    ['inner', 'neck'],
    ['cheek', 'inner'],
  ]) {
    assert.equal(t[child][0][0], t[parent].at(-1)[0]);
    assert.equal(curveProgress(t[child][0][0] - 0.0001, t[child]), null);
  }
  assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  assert.throws(() => siCourseTimelines({ ...lengths, earDepth: 0 }));
  assert.throws(() => siCourseTimelines({ ...lengths, neck: undefined }));
});

const { pcCourse, pcCourseTimelines } = await import('../lib/pc-course.ts');
test('PC study splits the unchanged canonical route at the palm and reaches the ring finger independently', () => {
  assert.equal(pcCourse.passage, jingmaiSource.passages.PC);
  assert.equal(pcCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(pcCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    pcCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = pcCourse.paths;
  assert.deepEqual(
    [...p.arm.points, ...p.middle.points.slice(1)],
    channels.find((c) => c.id === 'PC').routes[0],
  );
  assert.deepEqual(p.arm.points.at(-1), pointById.PC8.position);
  assert.deepEqual(p.middle.points.at(-1), pointById.PC9.position);
  assert.deepEqual(p.ring.points[0], pointById.PC8.position);
  assert.deepEqual(p.ring.points.at(-1), pointById.TE1.position);
  assert.ok(
    !p.ring.points.some((v) =>
      v.every((n, k) => n === pointById.PC9.position[k]),
    ),
  );
  assert.equal(pointById.TE1.channel, 'TE');
  assert.equal(channels.find((c) => c.id === 'PC').points.length, 9);
  for (const [child, parent] of [
    ['viscera', 'stem'],
    ['emerge', 'stem'],
    ['arm', 'emerge'],
    ['middle', 'arm'],
    ['ring', 'arm'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.equal(hasRegionalCourse('PC'), true);
  assert.equal(courseCatalog.PC.focusPoint, 'PC8');
});
test('PC flow forks at the palm only after traversing the emergence and arm', () => {
  const lengths = Object.fromEntries(
    Object.entries(pcCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = pcCourseTimelines(lengths);
  for (const [child, parent] of [
    ['viscera', 'stem'],
    ['emerge', 'stem'],
    ['arm', 'emerge'],
    ['middle', 'arm'],
    ['ring', 'arm'],
  ]) {
    assert.equal(t[child][0][0], t[parent].at(-1)[0]);
    assert.equal(curveProgress(t[child][0][0] - 0.0001, t[child]), null);
  }
  assert.equal(t.middle[0][0], t.ring[0][0]);
  assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  assert.throws(() => pcCourseTimelines({ ...lengths, ring: NaN }));
  assert.throws(() => pcCourseTimelines({ ...lengths, arm: 0 }));
});

const { teCourse, teCourseTimelines } = await import('../lib/te-course.ts');
test('TE chest and ear branches preserve all 23 canonical points and distinct cheek/eye endings', () => {
  assert.equal(teCourse.passage, jingmaiSource.passages.TE);
  assert.equal(teCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(teCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    teCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = teCourse.paths;
  for (let i = 1; i <= 23; i++)
    assert.ok(
      Object.values(p).some((path) =>
        path.points.some((v) =>
          v.every((n, k) => n === pointById[`TE${i}`].position[k]),
        ),
      ),
    );
  for (const [child, parent] of [
    ['chest', 'stem'],
    ['viscera', 'chest'],
    ['rise', 'chest'],
    ['neck', 'rise'],
    ['upper', 'neck'],
    ['ear', 'neck'],
    ['eye', 'ear'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.deepEqual(p.stem.points.at(-1), pointById.ST12.position);
  assert.deepEqual(p.upper.points.at(-1), pointById.SI18.position);
  assert.deepEqual(p.eye.points.at(-1), pointById.GB1.position);
  assert.deepEqual(p.rise.points, [...p.chest.points].reverse());
  assert.equal(pointById.SI18.channel, 'SI');
  assert.equal(pointById.GB1.channel, 'GB');
  assert.equal(channels.find((c) => c.id === 'TE').points.length, 23);
  assert.equal(p.ear.kind, 'internal');
  assert.equal(p.upper.kind, 'surface');
  assert.equal(hasRegionalCourse('TE'), true);
});
test('TE flow enters the chest before ascending and splits behind the ear before reaching the eye', () => {
  const lengths = Object.fromEntries(
    Object.entries(teCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = teCourseTimelines(lengths);
  for (const [child, parent] of [
    ['chest', 'stem'],
    ['viscera', 'chest'],
    ['rise', 'chest'],
    ['neck', 'rise'],
    ['upper', 'neck'],
    ['ear', 'neck'],
    ['eye', 'ear'],
  ]) {
    assert.equal(t[child][0][0], t[parent].at(-1)[0]);
    assert.equal(curveProgress(t[child][0][0] - 0.0001, t[child]), null);
  }
  assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  assert.throws(() => teCourseTimelines({ ...lengths, ear: 0 }));
  assert.throws(() => teCourseTimelines({ ...lengths, rise: Infinity }));
});

const { spCourse, spCourseTimelines } = await import('../lib/sp-course.ts');
test('SP keeps the calibrated leg course and forks from the stomach toward tongue and heart', () => {
  assert.equal(spCourse.passage, jingmaiSource.passages.SP);
  assert.equal(spCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(spCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    spCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = spCourse.paths,
    base = channels.find((c) => c.id === 'SP').routes[0];
  assert.deepEqual(p.stem.points, base.slice(0, p.stem.points.length));
  assert.deepEqual(p.stem.points.at(-1), pointById.SP16.position);
  for (const [child, parent] of [
    ['viscera', 'stem'],
    ['throat', 'viscera'],
    ['tongue', 'throat'],
    ['heart', 'viscera'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.equal(channels.find((c) => c.id === 'SP').points.length, 21);
  assert.ok(p.throat.points.at(-1)[1] > pointById.CV23.position[1]);
  assert.ok(p.throat.points.at(-1)[1] < pointById.ST1.position[1]);
  assert.ok(p.tongue.points.at(-1)[2] < pointById.ST4.position[2]);
  assert.ok(p.heart.points.at(-1)[1] > p.viscera.points.at(-1)[1]);
  assert.equal(hasRegionalCourse('SP'), true);
});
test('SP flow reaches the stomach before the heart/throat fork and the tongue only after the throat', () => {
  const lengths = Object.fromEntries(
    Object.entries(spCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = spCourseTimelines(lengths);
  for (const [child, parent] of [
    ['viscera', 'stem'],
    ['throat', 'viscera'],
    ['tongue', 'throat'],
    ['heart', 'viscera'],
  ]) {
    assert.equal(t[child][0][0], t[parent].at(-1)[0]);
    assert.equal(curveProgress(t[child][0][0] - 0.0001, t[child]), null);
  }
  assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  assert.throws(() => spCourseTimelines({ ...lengths, heart: 0 }));
  assert.throws(() => spCourseTimelines({ ...lengths, throat: NaN }));
});

const { kiCourse, kiCourseTimelines } = await import('../lib/ki-course.ts');
test('KI starts below the little toe, visits heel and keeps the calibrated calf before entering the trunk', () => {
  assert.equal(kiCourse.passage, jingmaiSource.passages.KI);
  assert.equal(kiCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(kiCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    kiCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = kiCourse.paths;
  assert.ok(p.sole.points[0][1] < pointById.BL67.position[1]);
  assert.deepEqual(p.sole.points.at(-1), pointById.KI1.position);
  for (let i = 1; i <= 10; i++)
    assert.ok(
      p.leg.points.some((v) =>
        v.every((n, k) => n === pointById[`KI${i}`].position[k]),
      ),
    );
  const base = channels.find((c) => c.id === 'KI').routes[0];
  const from = base.findIndex((v) =>
    v.every((n, k) => n === pointById.KI7.position[k]),
  );
  const to = base.findIndex((v) =>
    v.every((n, k) => n === pointById.KI10.position[k]),
  );
  assert.deepEqual(
    p.leg.points.slice(-(to - from + 1)),
    base.slice(from, to + 1),
  );
  for (const [child, parent] of [
    ['leg', 'sole'],
    ['thigh', 'leg'],
    ['kidney', 'thigh'],
    ['bladder', 'kidney'],
    ['lung', 'kidney'],
    ['tongue', 'lung'],
    ['heart', 'lung'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.equal(channels.find((c) => c.id === 'KI').points.length, 27);
  assert.equal(pointById.BL67.channel, 'BL');
  assert.ok(p.bladder.points.at(-1)[1] < p.kidney.points.at(-1)[1]);
  assert.ok(p.thigh.points.at(-1)[2] < 0);
  assert.equal(hasRegionalCourse('KI'), true);
});
test('KI flow splits at kidney and lung after traversing sole, leg and thigh', () => {
  const lengths = Object.fromEntries(
    Object.entries(kiCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = kiCourseTimelines(lengths);
  for (const [child, parent] of [
    ['leg', 'sole'],
    ['thigh', 'leg'],
    ['kidney', 'thigh'],
    ['bladder', 'kidney'],
    ['lung', 'kidney'],
    ['tongue', 'lung'],
    ['heart', 'lung'],
  ]) {
    assert.equal(t[child][0][0], t[parent].at(-1)[0]);
    assert.equal(curveProgress(t[child][0][0] - 0.0001, t[child]), null);
  }
  assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  assert.throws(() => kiCourseTimelines({ ...lengths, sole: 0 }));
  assert.throws(() => kiCourseTimelines({ ...lengths, lung: NaN }));
});

const { lrCourse, lrCourseTimelines } = await import('../lib/lr-course.ts');
test('LR connects liver and eye forks, reaches the crown and mirrors two inner-lip arcs', () => {
  assert.equal(lrCourse.passage, jingmaiSource.passages.LR);
  assert.equal(lrCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(lrCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    lrCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = lrCourse.paths;
  assert.deepEqual(
    p.stem.points,
    channels
      .find((c) => c.id === 'LR')
      .routes[0].slice(0, p.stem.points.length),
  );
  for (const [child, parent] of [
    ['liver', 'stem'],
    ['gall', 'liver'],
    ['eye', 'gall'],
    ['forehead', 'eye'],
    ['crown', 'forehead'],
    ['cheek', 'eye'],
    ['lips', 'cheek'],
    ['lung', 'liver'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.deepEqual(p.crown.points.at(-1), pointById.GV20.position);
  assert.equal(pointById.GV20.channel, 'GV');
  assert.equal(channels.find((c) => c.id === 'LR').points.length, 14);
  assert.equal(p.lips.points[0][0], 0);
  assert.equal(p.lips.points.at(-1)[0], 0);
  assert.ok(p.lips.points[1][0] > 0);
  assert.ok(p.lips.points[0][1] > p.lips.points.at(-1)[1]);
  assert.equal(
    p.eye.points.at(-1)[1],
    (pointById['EX-HN4'].position[1] + pointById.ST1.position[1]) / 2,
  );
  assert.equal(hasRegionalCourse('LR'), true);
});
test('LR flow branches at liver and eye, then traverses cheek before lips and forehead before crown', () => {
  const lengths = Object.fromEntries(
    Object.entries(lrCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = lrCourseTimelines(lengths);
  for (const [child, parent] of [
    ['liver', 'stem'],
    ['gall', 'liver'],
    ['eye', 'gall'],
    ['forehead', 'eye'],
    ['crown', 'forehead'],
    ['cheek', 'eye'],
    ['lips', 'cheek'],
    ['lung', 'liver'],
  ]) {
    assert.equal(t[child][0][0], t[parent].at(-1)[0]);
    assert.equal(curveProgress(t[child][0][0] - 0.0001, t[child]), null);
  }
  assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  assert.throws(() => lrCourseTimelines({ ...lengths, lips: 0 }));
  assert.throws(() => lrCourseTimelines({ ...lengths, eye: NaN }));
});

const { blCourse, blCourseTimelines } = await import('../lib/bl-course.ts');
test('BL preserves both back routes and calf while adding cranial and lumbar visceral branches', () => {
  assert.equal(blCourse.passage, jingmaiSource.passages.BL);
  assert.equal(blCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(blCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    blCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = blCourse.paths,
    [inner, outer] = channels.find((c) => c.id === 'BL').routes;
  assert.deepEqual([...p.outer.points, ...p.tail.points.slice(1)], outer);
  const start = inner.findIndex((v) =>
    v.every((n, k) => n === pointById.BL10.position[k]),
  );
  assert.deepEqual(
    [...p.back.points, ...p.innerLower.points.slice(1)],
    inner.slice(start),
  );
  for (const [child, parent] of [
    ['ear', 'head'],
    ['brain', 'head'],
    ['nape', 'brain'],
    ['back', 'nape'],
    ['viscera', 'back'],
    ['innerLower', 'back'],
    ['outer', 'nape'],
    ['tail', 'innerLower'],
    ['tail', 'outer'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.deepEqual(p.head.points.at(-1), pointById.GV20.position);
  assert.deepEqual(p.ear.points.at(-1), pointById.TE20.position);
  assert.equal(pointById.TE20.channel, 'TE');
  assert.equal(channels.find((c) => c.id === 'BL').points.length, 67);
  assert.equal(hasRegionalCourse('BL'), true);
});
test('BL shared calf waits for both back routes and never starts at the first arrival', () => {
  const lengths = Object.fromEntries(
    Object.entries(blCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  for (const candidate of [lengths, { ...lengths, outer: lengths.outer * 3 }]) {
    const t = blCourseTimelines(candidate);
    assert.equal(
      t.tail[0][0],
      Math.max(t.innerLower.at(-1)[0], t.outer.at(-1)[0]),
    );
    assert.equal(curveProgress(t.tail[0][0] - 0.0001, t.tail), null);
    assert.equal(t.viscera[0][0], t.back.at(-1)[0]);
    assert.equal(t.brain[0][0], t.ear[0][0]);
    assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  }
  assert.throws(() => blCourseTimelines({ ...lengths, tail: 0 }));
});

const { gbCourse, gbCourseTimelines } = await import('../lib/gb-course.ts');
test('GB ear and visceral paths join at hip and preserve calibrated leg before the great-toe branch', () => {
  assert.equal(gbCourse.passage, jingmaiSource.passages.GB);
  assert.equal(gbCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(gbCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    gbCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = gbCourse.paths,
    base = channels.find((c) => c.id === 'GB').routes[0];
  const start = base.findIndex((v) =>
    v.every((n, k) => n === pointById.GB30.position[k]),
  );
  assert.deepEqual(
    [...p.leg.points, ...p.fourth.points.slice(1)],
    base.slice(start),
  );
  for (const [child, parent] of [
    ['ear', 'head'],
    ['neck', 'head'],
    ['viscera', 'face'],
    ['pelvis', 'viscera'],
    ['trunk', 'neck'],
    ['leg', 'pelvis'],
    ['leg', 'trunk'],
    ['fourth', 'leg'],
    ['great', 'leg'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.deepEqual(p.head.points[0], p.face.points[0]);
  assert.deepEqual(p.great.points[0], pointById.GB41.position);
  assert.ok(
    p.great.points.some((v) =>
      v.every((n, k) => n === pointById.SP1.position[k]),
    ),
  );
  assert.ok(p.great.points.at(-1)[2] < pointById.SP1.position[2]);
  assert.equal(pointById.SP1.channel, 'SP');
  assert.equal(channels.find((c) => c.id === 'GB').points.length, 44);
  assert.equal(hasRegionalCourse('GB'), true);
});
test('GB flow waits for both hip arrivals then forks at foot dorsum', () => {
  const lengths = Object.fromEntries(
    Object.entries(gbCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  for (const candidate of [lengths, { ...lengths, trunk: lengths.trunk * 5 }]) {
    const t = gbCourseTimelines(candidate);
    assert.equal(t.leg[0][0], Math.max(t.pelvis.at(-1)[0], t.trunk.at(-1)[0]));
    assert.equal(t.great[0][0], t.leg.at(-1)[0]);
    assert.equal(t.fourth[0][0], t.great[0][0]);
    assert.equal(curveProgress(t.leg[0][0] - 0.0001, t.leg), null);
    assert.equal(t.head[0][0], 0);
    assert.equal(t.face[0][0], 0);
    assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  }
  assert.throws(() => gbCourseTimelines({ ...lengths, great: 0 }));
});

const { stCourse, stCourseTimelines } = await import('../lib/st-course.ts');
test('ST preserves source toe variants and calibrated leg points while adding distinct toe branches', () => {
  assert.equal(stCourse.passage, jingmaiSource.passages.ST);
  assert.equal(stCourse.source.sourceSha256, jingmaiSource.sourceSha256);
  assert.equal(stCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    stCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = stCourse.paths,
    base = channels.find((c) => c.id === 'ST').routes[0];
  const start = base.findIndex((v) =>
    v.every((n, k) => n === pointById.ST30.position[k]),
  );
  assert.deepEqual(
    [...p.leg.points, ...p.calf.points.slice(1), ...p.second.points.slice(1)],
    base.slice(start),
  );
  for (const [child, parent] of [
    ['teeth', 'nose'],
    ['lips', 'teeth'],
    ['jaw', 'lips'],
    ['head', 'jaw'],
    ['neck', 'jaw'],
    ['stomach', 'neck'],
    ['spleen', 'stomach'],
    ['abdomen', 'stomach'],
    ['trunk', 'neck'],
    ['leg', 'abdomen'],
    ['leg', 'trunk'],
    ['calf', 'leg'],
    ['second', 'calf'],
    ['third', 'leg'],
    ['great', 'calf'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.deepEqual(p.second.points.at(-1), pointById.ST45.position);
  assert.deepEqual(p.great.points.at(-1), pointById.SP1.position);
  assert.notDeepEqual(p.third.points.at(-1), pointById.ST45.position);
  assert.match(stCourse.passage, /中指内间〔一作“次指外间”〕/);
  assert.equal(pointById.SP1.channel, 'SP');
  assert.equal(channels.find((c) => c.id === 'ST').points.length, 45);
});
test('ST waits for abdominal/skin convergence and starts knee and dorsum branches at distinct stages', () => {
  const lengths = Object.fromEntries(
    Object.entries(stCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  for (const candidate of [
    lengths,
    { ...lengths, abdomen: lengths.abdomen * 4 },
  ]) {
    const t = stCourseTimelines(candidate);
    assert.equal(t.leg[0][0], Math.max(t.abdomen.at(-1)[0], t.trunk.at(-1)[0]));
    assert.equal(t.third[0][0], t.leg.at(-1)[0]);
    assert.equal(t.great[0][0], t.calf.at(-1)[0]);
    assert.ok(t.great[0][0] > t.third[0][0]);
    assert.equal(curveProgress(t.leg[0][0] - 0.0001, t.leg), null);
    assert.equal(Math.max(...Object.values(t).map((v) => v.at(-1)[0])), 1);
  }
  assert.throws(() => stCourseTimelines({ ...lengths, third: 0 }));
});
test('all twelve primary meridians now expose regional course mode while extraordinary completion remains separate', () => {
  for (const id of [
    'LU',
    'LI',
    'ST',
    'SP',
    'HT',
    'SI',
    'BL',
    'KI',
    'PC',
    'TE',
    'GB',
    'LR',
  ])
    assert.equal(hasRegionalCourse(id), true);
  for (const id of ['DAI']) assert.equal(hasRegionalCourse(id), false);
});

const { cvCourse, cvCourseTimelines } = await import('../lib/cv-course.ts');
const renmaiSource = JSON.parse(
  readFileSync(new URL('../lib/renmai-source.json', import.meta.url)),
);
test('CV preserves a single trunk with explicit bilateral face paths and edition differences', () => {
  assert.equal(cvCourse.source.sourceSha256, renmaiSource.sourceSha256);
  assert.equal(cvCourse.source.revision, '119706');
  assert.match(cvCourse.passage, /二十七穴/);
  assert.match(cvCourse.passage, /并无循面以下之说/);
  assert.equal(cvCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    cvCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = cvCourse.paths;
  for (const [child, parent] of [
    ['emerge', 'origin'],
    ['abdomen', 'emerge'],
    ['chest', 'abdomen'],
    ['lipLeft', 'chest'],
    ['lipRight', 'chest'],
    ['gums', 'lipLeft'],
    ['gums', 'lipRight'],
    ['faceLeft', 'gums'],
    ['faceRight', 'gums'],
    ['collateralLeft', 'abdomen'],
    ['collateralRight', 'abdomen'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.deepEqual(p.faceLeft.points.at(-1), pointById.ST1.position);
  assert.deepEqual(p.faceRight.points.at(-1), [
    -pointById.ST1.position[0],
    ...pointById.ST1.position.slice(1),
  ]);
  assert.equal(pointById.ST1.channel, 'ST');
  assert.equal(channels.find((c) => c.id === 'CV').points.length, 24);
  assert.equal(hasRegionalCourse('CV'), true);
});
test('CV face follows the lip and gum segments while the collateral leaves from the abdomen', () => {
  const lengths = Object.fromEntries(
    Object.entries(cvCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = cvCourseTimelines(lengths);
  assert.equal(
    t.gums[0][0],
    Math.max(t.lipLeft.at(-1)[0], t.lipRight.at(-1)[0]),
  );
  assert.equal(t.faceLeft[0][0], t.gums.at(-1)[0]);
  assert.equal(t.faceRight[0][0], t.faceLeft[0][0]);
  assert.equal(t.collateralLeft[0][0], t.abdomen.at(-1)[0]);
  assert.equal(curveProgress(t.faceLeft[0][0] - 0.0001, t.faceLeft), null);
  assert.throws(() => cvCourseTimelines({ ...lengths, gums: 0 }));
});

const { gvCourse, gvCourseTimelines } = await import('../lib/gv-course.ts');
test('GV separates the book collateral from the midline route and preserves modern point ownership', () => {
  assert.equal(gvCourse.source.revision, '119708');
  assert.match(gvCourse.passage, /凡三十一穴/);
  assert.match(gvCourse.passage, /督脉别络/);
  assert.equal(gvCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    gvCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = gvCourse.paths;
  for (const [child, parent] of [
    ['entryLeft', 'origin'],
    ['entryRight', 'origin'],
    ['spine', 'entryLeft'],
    ['spine', 'entryRight'],
    ['tongue', 'spine'],
    ['brain', 'spine'],
    ['head', 'brain'],
    ['frontCollateral', 'entryLeft'],
    ['faceLeft', 'frontCollateral'],
    ['faceRight', 'frontCollateral'],
    ['collateralBrain', 'faceLeft'],
    ['collateralBrain', 'faceRight'],
    ['returnLeft', 'collateralBrain'],
    ['returnRight', 'collateralBrain'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.deepEqual(p.head.points.at(-1), pointById.GV28.position);
  assert.equal(channels.find((c) => c.id === 'GV').points.length, 29);
  assert.equal(pointById.BL35.channel, 'BL');
  assert.ok(p.returnLeft.points.at(-1)[0] > 0);
  assert.ok(p.returnRight.points.at(-1)[0] < 0);
  assert.equal(pointById['GV24+'].name, '印堂');
  assert.equal(pointById['GV24+'].channel, 'GV');
  assert.equal(hasRegionalCourse('GV'), true);
});
test('GV collateral returns from its own brain arrival and does not restart the main spinal route', () => {
  const lengths = Object.fromEntries(
    Object.entries(gvCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = gvCourseTimelines(lengths);
  assert.equal(t.returnLeft[0][0], t.collateralBrain.at(-1)[0]);
  assert.equal(t.returnRight[0][0], t.returnLeft[0][0]);
  assert.equal(
    t.collateralBrain[0][0],
    Math.max(t.faceLeft.at(-1)[0], t.faceRight.at(-1)[0]),
  );
  assert.equal(t.head[0][0], t.brain.at(-1)[0]);
  assert.equal(t.frontCollateral[0][0], t.spine[0][0]);
  assert.equal(curveProgress(t.returnLeft[0][0] - 0.0001, t.returnLeft), null);
  assert.throws(() => gvCourseTimelines({ ...lengths, brain: 0 }));
});

const { chongCourse, chongCourseTimelines } =
  await import('../lib/chong-course.ts');
test('CHONG retains the abdominal route and distinguishes source variants from point ownership', () => {
  assert.equal(chongCourse.source.revision, '2084064');
  assert.match(chongCourse.passage, /循腹右上行/);
  assert.match(chongCourse.passage, /挟脐左右/);
  assert.equal(chongCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    chongCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const mesh = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const p = chongCourse.paths;
  assert.deepEqual(p.abdomen.points, mesh.routes.CHONG[0]);
  for (const [child, parent] of [
    ['emerge', 'origin'],
    ['abdomen', 'emerge'],
    ['upper', 'abdomen'],
    ['nasal', 'upper'],
    ['mouth', 'upper'],
    ['lips', 'mouth'],
    ['back', 'origin'],
    ['lowerOrigin', 'origin'],
    ['thigh', 'lowerOrigin'],
    ['calf', 'thigh'],
    ['sole', 'calf'],
    ['dorsum', 'calf'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.deepEqual(p.sole.points.at(-1), pointById.KI1.position);
  assert.deepEqual(p.dorsum.points.at(-1), pointById.LR2.position);
  assert.equal(pointById.LR2.channel, 'LR');
  assert.equal(pointById.SP4.channel, 'SP');
  assert.ok(!chongCourse.surfaceReferences.includes('SP4'));
  assert.equal(hasRegionalCourse('CHONG'), true);
});
test('CHONG upper and lower forks wait for their own branch arrival', () => {
  const lengths = Object.fromEntries(
    Object.entries(chongCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = chongCourseTimelines(lengths);
  assert.equal(t.back[0][0], t.emerge[0][0]);
  assert.equal(t.lowerOrigin[0][0], t.emerge[0][0]);
  assert.equal(t.mouth[0][0], t.nasal[0][0]);
  assert.equal(t.sole[0][0], t.calf.at(-1)[0]);
  assert.equal(t.dorsum[0][0], t.sole[0][0]);
  assert.equal(curveProgress(t.sole[0][0] - 0.0001, t.sole), null);
  assert.throws(() => chongCourseTimelines({ ...lengths, calf: 0 }));
});

const { yinqiaoCourse, yinqiaoCourseTimelines } =
  await import('../lib/yinqiao-course.ts');
test('YINQIAO preserves the lower route while moving chest projection into regional depth', () => {
  const mesh = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  assert.equal(yinqiaoCourse.source.revision, '119701');
  assert.match(yinqiaoCourse.passage, /足少陽然谷/);
  assert.match(yinqiaoCourse.passage, /會於睛明而上行/);
  assert.equal(yinqiaoCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    yinqiaoCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  const p = yinqiaoCourse.paths;
  assert.deepEqual(p.leg.points, mesh.routes.YINQIAO[0]);
  for (const [child, parent] of [
    ['pelvis', 'leg'],
    ['chest', 'pelvis'],
    ['neck', 'chest'],
    ['cheek', 'neck'],
    ['eye', 'cheek'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.equal(p.chest.kind, 'internal');
  assert.deepEqual(p.eye.points.at(-1), pointById.BL1.position);
  assert.notDeepEqual(p.leg.points[0], pointById.KI2.position);
  assert.equal(pointById.KI2.channel, 'KI');
  assert.equal(pointById.BL1.channel, 'BL');
  assert.equal(hasRegionalCourse('YINQIAO'), true);
});
test('YINQIAO playback reaches chest and throat before the inner canthus', () => {
  const lengths = Object.fromEntries(
    Object.entries(yinqiaoCourse.paths).map(([id, p]) => [
      id,
      new THREE.CatmullRomCurve3(
        p.points.map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      ).getLength(),
    ]),
  );
  const t = yinqiaoCourseTimelines(lengths);
  for (const [child, parent] of [
    ['pelvis', 'leg'],
    ['chest', 'pelvis'],
    ['neck', 'chest'],
    ['cheek', 'neck'],
    ['eye', 'cheek'],
  ])
    assert.equal(t[child][0][0], t[parent].at(-1)[0]);
  assert.equal(curveProgress(t.eye[0][0] - 0.0001, t.eye), null);
  assert.equal(t.eye.at(-1)[0], 1);
  assert.throws(() => yinqiaoCourseTimelines({ ...lengths, chest: 0 }));
});

test('Yang-qiao source preserves missing characters and uses the correct vessel paragraph', () => {
  const source = JSON.parse(
    readFileSync(new URL('../lib/yangqiao-source.json', import.meta.url)),
  );
  assert.match(source.passage, /陽蹻者，足太陽之別脈/);
  assert.match(source.passage, /肩〼/);
  assert.match(source.passage, /入風池而終凡二十二穴/);
  assert.doesNotMatch(source.passage, /陽維起於諸陽之會/);
  assert.equal(source.lineIds[0], '817');
  assert.equal(source.lineIds.at(-1), '826');
  assert.match(source.note, /跟中起始与肩面回行/);
});

const { yangqiaoCourse, yangqiaoCourseTimelines } =
  await import('../lib/yangqiao-course.ts');
const { courseHasInternalSegments } = await import('../lib/course-catalog.ts');
test('YANGQIAO adds heel origin while preserving all existing route nodes and opaque skin', () => {
  const mesh = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const p = yangqiaoCourse.paths;
  assert.equal(yangqiaoCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    yangqiaoCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  assert.deepEqual(
    [...p.body.points, ...p.head.points.slice(1)],
    mesh.routes.YANGQIAO[0],
  );
  assert.deepEqual(p.heel.points.at(-1), pointById.BL62.position);
  assert.notDeepEqual(p.heel.points[0], pointById.BL62.position);
  assert.deepEqual(p.head.points.at(-1), pointById.GB20.position);
  assert.equal(courseHasInternalSegments('YANGQIAO'), false);
  assert.equal(hasRegionalCourse('YANGQIAO'), true);
  assert.equal(courseHasInternalSegments('YINQIAO'), true);
  assert.equal(courseHasInternalSegments('LU'), true);
});
test('YANGQIAO playback starts at heel and reaches inner canthus before returning behind ear', () => {
  const t = yangqiaoCourseTimelines({ heel: 1, body: 7, head: 2 });
  assert.equal(t.body[0][0], t.heel.at(-1)[0]);
  assert.equal(t.head[0][0], t.body.at(-1)[0]);
  assert.equal(curveProgress(0.79, t.head), null);
  assert.equal(t.head.at(-1)[0], 1);
  assert.throws(() => yangqiaoCourseTimelines({ heel: 0, body: 7, head: 2 }));
});

const { yinweiCourse, yinweiCourseTimelines } =
  await import('../lib/yinwei-course.ts');
test('YINWEI retains lower registration and book-specific crown without inventing points', () => {
  const mesh = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const p = yinweiCourse.paths;
  assert.equal(yinweiCourse.source.revision, '119698');
  assert.match(yinweiCourse.passage, /上至頂前而終/);
  assert.match(yinweiCourse.passage, /凡一十四穴/);
  assert.equal(yinweiCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    yinweiCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  assert.deepEqual(p.lower.points, mesh.routes.YINWEI[0]);
  assert.equal(p.crown.kind, 'region');
  for (const [child, parent] of [
    ['chest', 'lower'],
    ['throat', 'chest'],
    ['crown', 'throat'],
  ])
    assert.deepEqual(p[child].points[0], p[parent].points.at(-1));
  assert.equal(p.chest.kind, 'internal');
  assert.deepEqual(p.crown.points.at(-1), mesh.routes.YINWEI[2].at(-1));
  assert.deepEqual(p.lower.points[0], pointById.KI9.position);
  assert.equal(pointById.KI9.channel, 'KI');
  assert.equal(pointById.CV23.channel, 'CV');
  assert.equal(hasRegionalCourse('YINWEI'), true);
});
test('YINWEI animation reaches throat before crown and rejects invalid phases', () => {
  const t = yinweiCourseTimelines({ lower: 6, chest: 2, throat: 1, crown: 1 });
  assert.equal(t.chest[0][0], t.lower.at(-1)[0]);
  assert.equal(t.throat[0][0], t.chest.at(-1)[0]);
  assert.equal(t.crown[0][0], t.throat.at(-1)[0]);
  assert.equal(curveProgress(0.89, t.crown), null);
  assert.throws(() =>
    yinweiCourseTimelines({ lower: 6, chest: NaN, throat: 1, crown: 1 }),
  );
});

const { yangweiCourse, yangweiCourseTimelines } =
  await import('../lib/yangwei-course.ts');
test('YANGWEI preserves route through Yangbai and represents ear passage before Benshen', () => {
  const mesh = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const base = mesh.routes.YANGWEI[0],
    p = yangweiCourse.paths;
  const index = base.findIndex(
    (v) => JSON.stringify(v) === JSON.stringify(pointById.GB14.position),
  );
  assert.deepEqual(p.body.points, base.slice(0, index + 1));
  assert.equal(yangweiCourse.source.revision, '2305131');
  assert.match(yangweiCourse.passage, /循頭入耳/);
  assert.equal(yangweiCourse.assetSha256, humanMesh.assetSha256);
  assert.equal(
    yangweiCourse.registrationSha256,
    createHash('sha256')
      .update(
        readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
      )
      .digest('hex'),
  );
  assert.deepEqual(p.ear.points[0], p.body.points.at(-1));
  assert.deepEqual(p.return.points[0], p.ear.points.at(-1));
  assert.deepEqual(p.return.points.at(-1), pointById.GB13.position);
  assert.deepEqual(p.body.points[0], pointById.BL63.position);
  assert.equal(p.ear.kind, 'region');
  assert.equal(p.return.kind, 'region');
  assert.equal(hasRegionalCourse('YANGWEI'), true);
});
test('YANGWEI reaches its ear region before ascending to Benshen', () => {
  const t = yangweiCourseTimelines({ body: 8, ear: 1, return: 1 });
  assert.equal(t.ear[0][0], t.body.at(-1)[0]);
  assert.equal(t.return[0][0], t.ear.at(-1)[0]);
  assert.equal(curveProgress(0.89, t.return), null);
  assert.throws(() => yangweiCourseTimelines({ body: 8, ear: 0, return: 1 }));
});

test('DAI source distinguishes its nondirectional belt from kidney divergent connection', () => {
  const source = JSON.parse(
    readFileSync(new URL('../lib/daimai-source.json', import.meta.url)),
  );
  assert.equal(source.revision, '119710');
  assert.match(source.passage, /圍身一周/);
  assert.match(source.kidneyDivergent, /足少陰之正/);
  assert.match(source.relationNote, /不能把腘中當作|不能把腘中当作/);
  const specs = JSON.parse(
    readFileSync(new URL('../lib/vessel-route-specs.json', import.meta.url)),
  );
  const ring = specs.channels.DAI.paths.find((p) => p.closed);
  assert.equal(ring.animate, false);
  assert.equal(ring.kind, 'region');
});

test('HT2 indication is tied to its reviewed scan rather than inherited manual cardiac pain', () => {
  assert.match(pointById.HT2.indications, /目黄/);
  assert.doesNotMatch(pointById.HT2.indications, /心痛/);
  assert.match(pointById.HT2.indicationStudy.excerpt, /肩臂不舉/);
  assert.match(pointById.HT2.indicationStudy.references[0].url, /#page=112$/);
  assert.equal(pointById.HT2.channel, 'HT');
});

test('SI shoulder indications retain distinct scan entries and cross-page attribution', () => {
  assert.match(pointById.SI10.indicationStudy.excerpt, /臂痠無力/);
  assert.match(pointById.SI14.indicationStudy.excerpt, /肩胛痛/);
  assert.doesNotMatch(pointById.SI14.indications, /颈项拘急/);
  assert.match(pointById.SI15.indicationStudy.excerpt, /目視不明/);
  assert.doesNotMatch(pointById.SI15.indications, /肩背痛/);
  assert.match(pointById.SI15.indicationStudy.references[0].url, /#page=120$/);
  for (const id of ['SI10', 'SI14', 'SI15'])
    assert.equal(pointById[id].channel, 'SI');
});

test('BL back-shu manual summaries now point to their individual scan entries', () => {
  assert.match(pointById.BL16.indicationStudy.excerpt, /雷鳴氣逆/);
  assert.match(pointById.BL26.indicationStudy.excerpt, /小便難/);
  assert.match(pointById.BL27.indicationStudy.excerpt, /淋瀝遺溺/);
  assert.doesNotMatch(pointById.BL27.indications, /遗精/);
  assert.match(pointById.BL28.indications, /脚膝无力/);
  for (const id of ['BL16', 'BL26', 'BL27', 'BL28']) {
    assert.equal(pointById[id].channel, 'BL');
    assert.match(
      pointById[id].indicationStudy.references[0].url,
      /#page=(127|130)$/,
    );
  }
});

test('ST17 is a landmark note and does not treat historical operative text as modern guidance', () => {
  assert.match(pointById.ST17.indications, /定位参照/);
  assert.match(pointById.ST17.indications, /不列治疗主治/);
  assert.doesNotMatch(pointById.ST17.indications, /现代针灸标准通常/);
  assert.match(pointById.ST17.indicationStudy.references[0].url, /#page=91$/);
  assert.equal(pointById.ST17.channel, 'ST');
});

test('volume four scan records resolve their own document and preserve volume three links', () => {
  for (const [id, page] of [
    ['TE11', 13],
    ['GB18', 21],
    ['GB34', 24],
  ]) {
    const study = pointById[id].indicationStudy;
    assert.ok(study.excerpt.length > 0);
    assert.match(study.references[0].label, /第四册/);
    assert.ok(study.references[0].url.includes('1215_'));
    assert.ok(study.references[0].url.endsWith(`#page=${page}`));
    assert.equal(pointById[id].indications, study.summary);
  }
  assert.match(pointById.ST17.indicationStudy.references[0].label, /第三册/);
  assert.ok(pointById.ST17.indicationStudy.references[0].url.includes('1214_'));
  assert.doesNotMatch(pointById.TE11.indications, /头痛/);
  assert.doesNotMatch(pointById.GB34.indications, /口苦|胁痛/);
});

test('remaining manual scan summaries distinguish canonical points from historical names', () => {
  for (const [id, page] of [
    ['LR7', 32],
    ['GV3', 47],
    ['GV26', 52],
  ]) {
    const p = pointById[id];
    assert.ok(p.indicationStudy.references[0].url.endsWith(`#page=${page}`));
    assert.match(p.indicationStudy.references[0].label, /第四册/);
    assert.equal(p.indications, p.indicationStudy.summary);
  }
  assert.equal(pointById.GV3.name, '腰阳关');
  assert.equal(pointById.GV3.channel, 'GV');
  assert.match(pointById.GV3.indicationStudy.note, /不与胆经膝阳关混同/);
  assert.match(pointById.GV26.indicationStudy.note, /消渴不等同于现代糖尿病/);
});

test('carousel navigation releases both subscriptions and reflects changing scroll limits', async () => {
  const { subscribeNavigation, navigationSnapshot } =
    await import('../components/ui/carousel-state.ts');
  const events = new Map();
  let previous = false,
    next = true,
    calls = 0;
  const api = {
    on: (event, cb) => events.set(event, cb),
    off: (event, cb) => {
      assert.equal(events.get(event), cb);
      events.delete(event);
    },
    canScrollPrev: () => previous,
    canScrollNext: () => next,
  };
  const cleanup = subscribeNavigation(api, () => calls++);
  assert.equal(navigationSnapshot(undefined), 0);
  assert.equal(navigationSnapshot(api), 2);
  previous = true;
  next = false;
  events.get('select')();
  events.get('reInit')();
  assert.equal(calls, 2);
  assert.equal(navigationSnapshot(api), 1);
  cleanup();
  assert.equal(events.size, 0);
});

test('pointer picking rejects pinch and returning drags, then permits a fresh tap', async () => {
  const { createPickGesture } = await import('../lib/pick-gesture.ts');
  const g = createPickGesture();
  const first = {
    pointerId: 1,
    clientX: 20,
    clientY: 20,
    button: 0,
    isPrimary: true,
  };
  const second = { ...first, pointerId: 2, isPrimary: false };
  g.down(first);
  g.down(second);
  assert.equal(g.up(first), false);
  assert.equal(g.active, true);
  assert.equal(g.up(second), false);
  g.down(first);
  g.move({ ...first, clientX: 40 });
  g.move(first);
  assert.equal(g.up(first), false);
  g.down(first);
  g.cancel();
  assert.equal(g.up(first), false);
  g.down(first);
  assert.equal(g.up(first), true);
  assert.equal(g.active, false);
});

test('graphics context loss allows restoration and lifecycle listeners are released', async () => {
  const { observeGraphicsContext } =
    await import('../lib/graphics-lifecycle.ts');
  const target = new EventTarget();
  let lost = 0,
    restored = 0;
  const cleanup = observeGraphicsContext(
    target,
    () => lost++,
    () => restored++,
  );
  const event = new Event('webglcontextlost', { cancelable: true });
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(lost, 1);
  target.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(restored, 1);
  cleanup();
  target.dispatchEvent(new Event('webglcontextlost'));
  target.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(lost, 1);
  assert.equal(restored, 1);
});

test('all eleven lung points have individual scan citations with unchanged canonical order', () => {
  const lung = channels.find((c) => c.id === 'LU');
  assert.equal(lung.points.length, 11);
  const pages = [74, 75, 75, 75, 75, 75, 76, 76, 76, 77, 77];
  lung.points.forEach((p, i) => {
    assert.equal(p.id, `LU${i + 1}`);
    assert.ok(p.indicationStudy.excerpt.length > 0);
    assert.equal(p.indications, p.indicationStudy.summary);
    assert.match(p.indicationStudy.references[0].label, /第三册/);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
  });
  assert.match(pointById.LU9.indicationStudy.note, /续至第77页/);
});

test('all twenty large intestine points cite their own scanned entries', () => {
  const channel = channels.find((c) => c.id === 'LI');
  assert.equal(channel.points.length, 20);
  const pages = [
    80, 80, 80, 80, 81, 81, 81, 81, 82, 82, 82, 82, 82, 83, 83, 83, 84, 84, 84,
    84,
  ];
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `LI${i + 1}`);
    assert.ok(p.indicationStudy.excerpt.length > 0);
    assert.equal(p.indications, p.indicationStudy.summary);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
  });
  assert.match(pointById.LI13.indicationStudy.note, /手五里保留/);
  assert.match(pointById.LI19.indicationStudy.note, /口禾髎保留/);
});

test('all nine heart points cite scanned entries without changing Qingling scope', () => {
  const channel = channels.find((c) => c.id === 'HT');
  const pages = [112, 112, 112, 113, 113, 113, 113, 114, 114];
  assert.equal(channel.points.length, 9);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `HT${i + 1}`);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
    assert.ok(p.indicationStudy.excerpt.length > 0);
  });
  assert.doesNotMatch(pointById.HT2.indications, /心痛/);
  assert.match(pointById.HT9.indicationStudy.note, /续左半页首/);
});

test('four extra point scans preserve incomplete Taiyang wording and separate adjacent entries', () => {
  for (const [id, page] of [
    ['EX-HN4', 72],
    ['EX-HN5', 73],
    ['EX-HN6', 72],
    ['EX-HN12', 72],
  ]) {
    const study = pointById[id].indicationStudy;
    assert.equal(study.kind, 'classical');
    assert.ok(study.references.some((r) => r.url.endsWith(`#page=${page}`)));
    assert.match(study.references[0].label, /卷七/);
  }
  assert.equal(pointById['EX-HN5'].indicationStudy.excerpt, '治眼紅腫');
  assert.doesNotMatch(pointById['EX-HN5'].indications, /头痛/);
  assert.match(pointById['EX-HN5'].indicationStudy.note, /沒有|没有完整/);
  assert.doesNotMatch(pointById['EX-HN12'].indications, /咳喘|久嗽|舌强/);
});

test('extra chapter scan batch preserves page mapping and historical name distinctions', () => {
  const pages = {
    'EX-HN9': 72,
    'EX-HN10': 72,
    'EX-HN11': 72,
    'EX-UE4': 73,
    'EX-UE5': 73,
    'EX-LE10': 73,
    'EX-UE2': 74,
    'EX-UE11': 74,
    'EX-LE8': 74,
    'EX-LE9': 74,
    'EX-LE11': 74,
    'EX-UE6': 75,
    'EX-CA1': 75,
    'EX-UE10': 75,
  };
  for (const [id, page] of Object.entries(pages)) {
    const study = pointById[id].indicationStudy;
    assert.equal(study.kind, 'classical');
    assert.ok(study.references.some((r) => r.url.endsWith(`#page=${page}`)));
    assert.match(study.references[0].label, /卷七/);
  }
  assert.match(
    pointById['EX-UE2'].indicationStudy.note,
    /不把二白与心包经郄门PC4合并/,
  );
  assert.match(
    pointById['EX-UE5'].indicationStudy.note,
    /不由古文覆盖现代位置/,
  );
  assert.match(pointById['EX-LE9'].indicationStudy.note, /不等同于足癣/);
  assert.doesNotMatch(pointById['EX-UE11'].indications, /昏厥|急救/);
  assert.equal(
    pointById['EX-UE10'].indicationStudy.excerpt,
    '治小兒胡孫勞等症',
  );
});

test('source coverage separates text, independent references and scans without duplicate points', async () => {
  const { summarizeSourceCoverage } = await import('../lib/source-coverage.ts');
  const a = {
    id: 'A',
    indications: 'text',
    indicationStudy: { references: [{ url: 'https://example.com/a' }] },
  };
  const b = { id: 'B', indications: 'text' };
  const c = {
    id: 'C',
    indicationStudy: { references: [{ url: 'https://example.com/c' }] },
  };
  assert.deepEqual(summarizeSourceCoverage([a, a, b, c], ['A', 'missing']), {
    total: 3,
    withText: 2,
    withReference: 2,
    withScan: 1,
    otherReference: 1,
    withoutReference: 1,
  });
});

test('all small intestine points link the scanned entry including page continuations', () => {
  const channel = channels.find((c) => c.id === 'SI');
  const pages = [
    117, 117, 117, 118, 118, 118, 118, 119, 119, 119, 119, 119, 119, 119, 120,
    120, 120, 120, 120,
  ];
  assert.equal(channel.points.length, 19);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `SI${i + 1}`);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
    assert.ok(p.indicationStudy.excerpt.length > 0);
  });
  assert.match(pointById.SI3.indicationStudy.note, /第118页/);
  assert.match(pointById.SI8.indicationStudy.note, /主治位于第119页/);
  assert.match(pointById.SI18.indicationStudy.note, /续左半页首/);
});

test('pericardium scanned entries use volume four and preserve continuation notes', () => {
  const channel = channels.find((c) => c.id === 'PC');
  const pages = [7, 7, 7, 7, 8, 8, 8, 8, 9];
  assert.equal(channel.points.length, 9);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `PC${i + 1}`);
    assert.match(p.indicationStudy.references[0].url, /1215_/);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
    assert.ok(p.indicationStudy.excerpt.length > 0);
  });
  assert.match(pointById.PC5.indicationStudy.note, /主治续至第8页/);
  assert.match(pointById.PC8.indicationStudy.note, /未用古文覆盖现代坐标/);
});

test('liver scan coverage preserves fourteen modern points without inventing Jimai entry', () => {
  const channel = channels.find((c) => c.id === 'LR');
  const pages = {
    1: 30,
    2: 30,
    3: 31,
    4: 31,
    5: 31,
    6: 32,
    7: 32,
    8: 32,
    9: 32,
    10: 32,
    11: 33,
    13: 33,
    14: 33,
  };
  assert.equal(channel.points.length, 14);
  for (const [n, page] of Object.entries(pages)) {
    const p = pointById[`LR${n}`];
    assert.match(p.indicationStudy.references[0].url, /1215_/);
    assert.ok(p.indicationStudy.references[0].url.endsWith(`#page=${page}`));
  }
  assert.equal(pointById.LR12.name, '急脉');
  assert.match(pointById.LR10.indicationStudy.note, /手五里分开/);
  assert.match(pointById.LR11.indicationStudy.note, /不把该断言转写为疗效承诺/);
});

test('triple energizer scanned entries preserve modern order and Qinglengyuan record', () => {
  const channel = channels.find((c) => c.id === 'TE');
  const pages = [
    11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 14, 14, 14, 14,
    14, 15, 15, 15,
  ];
  assert.equal(channel.points.length, 23);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `TE${i + 1}`);
    assert.match(p.indicationStudy.references[0].url, /1215_/);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
  });
  assert.equal(pointById.TE11.name, '清泠渊');
  assert.match(pointById.TE23.indicationStudy.note, /现代目录顺序保留/);
});

test('all spleen point studies use scan pages and keep appended cases separate', () => {
  const channel = channels.find((c) => c.id === 'SP');
  const pages = [
    103, 103, 103, 103, 104, 104, 105, 105, 105, 106, 106, 106, 106, 106, 106,
    107, 107, 107, 107, 107, 107,
  ];
  assert.equal(channel.points.length, 21);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `SP${i + 1}`);
    assert.match(p.indicationStudy.references[0].url, /1214_/);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
  });
  assert.match(pointById.SP6.indicationStudy.note, /后附妊娠医案/);
  assert.match(pointById.SP16.indicationStudy.note, /主治续至第107页首/);
  assert.match(pointById.SP21.indicationStudy.note, /分别置于实、虚语境/);
});

test('all kidney scans map to modern point IDs with historical title notes', () => {
  const channel = channels.find((c) => c.id === 'KI');
  const pages = [
    144, 145, 145, 146, 146, 146, 146, 147, 147, 147, 147, 148, 148, 148, 148,
    148, 149, 149, 149, 149, 149, 150, 150, 150, 150, 150, 150,
  ];
  assert.equal(channel.points.length, 27);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `KI${i + 1}`);
    assert.match(p.indicationStudy.references[0].url, /1214_/);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
  });
  assert.match(pointById.KI20.indicationStudy.note, /足通谷分开/);
  assert.match(pointById.KI26.indicationStudy.note, /保留彧中/);
  assert.match(pointById.KI3.indicationStudy.note, /脉诊预后论述未并入/);
});

test('all conception vessel scans point to their own entry or continuation', () => {
  const channel = channels.find((c) => c.id === 'CV');
  const pages = [
    37, 38, 38, 38, 39, 39, 39, 40, 40, 40, 41, 41, 41, 42, 43, 43, 43, 43, 43,
    44, 44, 44, 44, 45,
  ];
  assert.equal(channel.points.length, 24);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `CV${i + 1}`);
    assert.match(p.indicationStudy.references[0].url, /1215_/);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
  });
  assert.match(pointById.CV15.indicationStudy.note, /条目起于第42页/);
  assert.match(pointById.CV22.indicationStudy.note, /疗效论述未并入/);
});

test('governing vessel scans preserve the modern catalog and historical omissions', () => {
  const channel = channels.find((c) => c.id === 'GV');
  assert.equal(channel.points.length, 29);
  const pages = {
    1: 47,
    2: 47,
    4: 47,
    5: 47,
    6: 47,
    8: 48,
    9: 48,
    10: 48,
    11: 48,
    12: 48,
    13: 48,
    14: 49,
    15: 49,
    16: 49,
    17: 50,
    18: 50,
    19: 50,
    20: 50,
    21: 51,
    22: 51,
    23: 51,
    24: 52,
    25: 52,
    27: 52,
    28: 53,
  };
  for (const [n, page] of Object.entries(pages)) {
    const p = pointById[`GV${n}`];
    assert.match(p.indicationStudy.references[0].url, /1215_/);
    assert.ok(p.indicationStudy.references[0].url.endsWith(`#page=${page}`));
  }
  assert.ok(pointById.GV7);
  assert.ok(pointById['GV24+']);
  assert.match(
    pointById.GV10.indicationStudy.note,
    /不能据此归为《素问》直接引文/,
  );
  assert.match(pointById.GV24.indicationStudy.note, /条起于第51页/);
});

test('posture-dependent small intestine landmarks reach point details without changing mesh bindings', () => {
  for (const id of ['SI2', 'SI3', 'SI6', 'SI8', 'SI9']) {
    assert.ok(standardLocations[id].postureNote);
    assert.ok(
      pointById[id].location.includes(
        `体位提示：${standardLocations[id].postureNote}`,
      ),
    );
    assert.equal(standardLocations[id].pdfPage, 24);
  }
  assert.match(pointById.SI6.location, /手掌旋后/);
  assert.match(pointById.SI9.location, /臂内收/);
  assert.doesNotMatch(
    describeStandardLocation({
      region: '手',
      relations: [],
      clause: 'test',
      pdfPage: 1,
    }),
    /体位提示|undefined/,
  );
});

test('national posture notes survive both standard and authored LI location renderers', () => {
  const notes = Object.entries(standardLocations).filter(
    ([, p]) => p.postureNote,
  );
  assert.equal(notes.length, 50);
  for (const [id, p] of notes) {
    assert.ok(pointById[id].location.includes(p.postureNote), id);
    assert.equal(pointById[id].location.split('体位提示：').length, 2, id);
  }
  assert.match(pointById.LI15.location, /前方较深者对应肩髃/);
  assert.match(pointById.TE14.location, /后方者对应肩髎/);
  assert.match(pointById.ST7.location, /闭口/);
  assert.match(pointById.SI19.location, /微张口/);
  assert.match(pointById.PC6.location, /续于PDF第34页/);
  assert.match(pointById.CV1.location, /续于PDF第44页/);
});

test('upper stomach scans follow historical entry order and preserve ST17 landmark status', () => {
  const pages = {
    1: 88,
    2: 89,
    3: 89,
    4: 89,
    5: 89,
    6: 88,
    7: 88,
    8: 88,
    9: 90,
    10: 90,
    11: 90,
    12: 90,
    13: 90,
    14: 90,
    15: 90,
    16: 91,
    18: 91,
  };
  for (const [n, page] of Object.entries(pages)) {
    const p = pointById[`ST${n}`];
    assert.match(p.indicationStudy.references[0].url, /1214_/);
    assert.ok(p.indicationStudy.references[0].url.endsWith(`#page=${page}`));
  }
  assert.match(pointById.ST15.indicationStudy.note, /续至第91页/);
  assert.match(pointById.ST17.indicationStudy.references[0].url, /#page=91$/);
  assert.equal(channels.find((c) => c.id === 'ST').points.length, 45);
});

test('all stomach points now link to their own scan including historical lower leg names', () => {
  const pages = [
    88, 89, 89, 89, 89, 88, 88, 88, 90, 90, 90, 90, 90, 90, 90, 91, 91, 91, 92,
    92, 92, 92, 92, 92, 92, 93, 93, 93, 93, 93, 94, 94, 94, 94, 94, 95, 96, 96,
    97, 97, 97, 98, 98, 98, 98,
  ];
  const channel = channels.find((c) => c.id === 'ST');
  assert.equal(channel.points.length, 45);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `ST${i + 1}`);
    assert.match(p.indicationStudy.references[0].url, /1214_/);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
  });
  assert.match(pointById.ST37.indicationStudy.note, /古籍上廉/);
  assert.match(pointById.ST39.indicationStudy.note, /古籍下廉/);
  assert.match(pointById.ST25.indicationStudy.note, /续至第93页/);
});

test('gallbladder scans cover all 44 modern points without conflating shared historical names', () => {
  const pages = [
    18, 18, 18, 18, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21,
    21, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 25, 25,
    25, 26, 26, 26, 26, 26,
  ];
  const channel = channels.find((c) => c.id === 'GB');
  assert.equal(channel.points.length, 44);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `GB${i + 1}`);
    assert.match(p.indicationStudy.references[0].url, /1215_/);
    assert.ok(
      p.indicationStudy.references[0].url.endsWith(`#page=${pages[i]}`),
    );
  });
  assert.match(pointById.GB11.indicationStudy.note, /头窍阴/);
  assert.match(pointById.GB44.indicationStudy.note, /足窍阴/);
  assert.match(pointById.GB15.indicationStudy.note, /头临泣/);
  assert.match(pointById.GB41.indicationStudy.note, /足临泣/);
  assert.match(pointById.GB33.indicationStudy.note, /不与督脉腰阳关混同/);
});

test('upper bladder scans use each entry including cross-page back shu summaries', () => {
  const pages = [
    123, 124, 124, 124, 124, 125, 125, 125, 125, 125, 126, 126, 126, 127, 127,
    127, 127, 128, 128, 128,
  ];
  pages.forEach((page, i) => {
    const p = pointById[`BL${i + 1}`];
    assert.match(p.indicationStudy.references[0].url, /1214_/);
    assert.ok(p.indicationStudy.references[0].url.endsWith(`#page=${page}`));
  });
  assert.match(pointById.BL11.indicationStudy.note, /条目起于第125页/);
  assert.match(pointById.BL19.indicationStudy.note, /未将四花等同单个胆俞穴/);
  assert.equal(channels.find((c) => c.id === 'BL').points.length, 67);
});

test('middle bladder scans distinguish sacral and outer back entries', () => {
  const pages = {
    21: 129,
    22: 129,
    23: 129,
    24: 130,
    25: 130,
    29: 131,
    30: 131,
    31: 131,
    32: 131,
    33: 131,
    34: 132,
    35: 132,
    36: 135,
    37: 135,
    41: 132,
    42: 132,
    43: 133,
    44: 133,
    45: 134,
    46: 134,
    47: 134,
    48: 134,
    49: 134,
    50: 135,
    51: 135,
    52: 135,
    53: 135,
    54: 135,
  };
  for (const [n, page] of Object.entries(pages)) {
    const p = pointById[`BL${n}`];
    assert.match(p.indicationStudy.references[0].url, /1214_/);
    assert.ok(p.indicationStudy.references[0].url.endsWith(`#page=${page}`));
  }
  assert.match(pointById.BL33.indicationStudy.note, /与此前中膂俞分开/);
  assert.match(pointById.BL43.indicationStudy.note, /不作现代疗效证据/);
  assert.match(pointById.BL44.indicationStudy.note, /续至第134页/);
});

test('all 67 bladder entries now have scan references and lower leg cross-pages remain explicit', () => {
  const channel = channels.find((c) => c.id === 'BL');
  assert.equal(channel.points.length, 67);
  channel.points.forEach((p, i) => {
    assert.equal(p.id, `BL${i + 1}`);
    assert.match(
      p.indicationStudy.references[0].url,
      /1214_.*#page=1[23][0-9]$/,
    );
  });
  const pages = {
    38: 136,
    39: 136,
    40: 136,
    55: 136,
    56: 136,
    57: 137,
    58: 137,
    59: 137,
    60: 137,
    61: 138,
    62: 138,
    63: 138,
    64: 138,
    65: 139,
    66: 139,
    67: 139,
  };
  for (const [n, page] of Object.entries(pages)) {
    assert.ok(
      pointById[`BL${n}`].indicationStudy.references[0].url.endsWith(
        `#page=${page}`,
      ),
    );
  }
  assert.match(pointById.BL66.indicationStudy.note, /不与肾经腹通谷混同/);
  assert.match(pointById.BL60.indicationStudy.note, /续至第138页/);
});

test('standard indication references reach the actual atlas without changing location or classic sources', () => {
  const expected = [
    'LR12',
    'GV7',
    'EX-HN15',
    'EX-B2',
    'EX-B3',
    'EX-B4',
    'EX-B7',
    'EX-B8',
    'EX-UE1',
    'EX-UE7',
    'EX-LE2',
    'EX-LE6',
    'EX-LE7',
  ];
  for (const id of expected) {
    const point = pointById[id];
    assert.equal(point.indicationStudy.kind, 'standard');
    assert.equal(point.indications, point.indicationStudy.summary);
    assert.match(point.indicationStudy.references[0].label, /GB\/T 30233-2013/);
    assert.match(
      point.indicationStudy.references[0].url,
      /#page=(29|30|34|35)$/,
    );
    assert.notEqual(
      point.locationReference.url,
      point.indicationStudy.references[0].url,
    );
  }
  assert.match(pointById['EX-B2'].indications, /上胸.*下胸.*腰段/);
  assert.equal(pointById.LU1.indicationStudy.kind, 'classical');
});

test('Sishencong and Dingchuan prioritize checked standard clauses and preserve separate hospital accounts', async () => {
  const { getIndicationStudies } = await import('../lib/indication-studies.ts');
  const expected = [
    ['EX-HN1', '5.1.1', 33, 'yxhospital.com', '头痛、眩晕；失眠、健忘；癫痫。'],
    ['EX-B1', '5.3.1', 34, 'yantai.gov.cn', '气喘、咳嗽。'],
  ];
  for (const [id, clause, page, hospitalHost, summary] of expected) {
    const point = pointById[id];
    assert.equal(point.indications, summary);
    const studies = getIndicationStudies(point, true);
    assert.equal(studies.length, 2);
    assert.equal(studies[0].kind, 'standard');
    assert.ok(studies[0].references[0].label.includes(clause));
    assert.ok(studies[0].references[0].url.endsWith(`#page=${page}`));
    assert.equal(studies[1].kind, 'secondary');
    assert.ok(studies[1].references[0].url.includes(hospitalHost));
    assert.ok(studies[1].note.includes('科普'));
    assert.notEqual(point.locationReference.url, studies[0].references[0].url);
    assert.deepEqual(getIndicationStudies(point, false), []);
  }
  assert.ok(
    pointById['EX-B1'].additionalIndicationStudies[0].summary.includes(
      '肩背痛',
    ),
  );
  assert.equal(pointById['EX-HN1'].positions.length, 4);
});

test('supplement knee group exposes its own reference without changing standard membership', () => {
  const group = pointById['EX-LE5'];
  assert.equal(group.catalog, 'supplement-extra');
  assert.equal(group.indications, group.indicationStudy.summary);
  assert.match(group.indicationStudy.references[0].url, /hbszyy/);
  assert.equal(pointById['EX-LE4'].catalog, 'standard-extra');
  assert.notEqual(group, pointById['EX-LE4']);
  assert.notEqual(group, pointById.ST35);
});

test('every current point has a separately attributed indication or landmark source', () => {
  for (const point of Object.values(pointById)) {
    assert.ok(point.indicationStudy, point.id);
    assert.ok(point.indicationStudy.note, point.id);
    assert.ok(
      point.indicationStudy.references.some((ref) =>
        ref.url.startsWith('https://'),
      ),
      point.id,
    );
  }
  assert.equal(pointById.ST17.indicationStudy.kind, 'classical');
});

test('reading sessions recover from immediate speech failure and ignore duplicate browser completion', async () => {
  const { createReadAloudSession } = await import('../lib/read-aloud.ts');
  const failed = { onend: null, onerror: null };
  const results = [];
  createReadAloudSession(
    {
      speak() {
        throw new Error('service unavailable');
      },
      cancel() {},
    },
    failed,
    (reason) => results.push(reason),
  ).start();
  assert.deepEqual(results, ['error']);
  assert.equal(failed.onend, null);
  assert.equal(failed.onerror, null);
  const retried = { onend: null, onerror: null };
  const session = createReadAloudSession(
    { speak() {}, cancel() {} },
    retried,
    (reason) => results.push(reason),
  );
  session.start();
  const lateError = retried.onerror;
  retried.onend();
  lateError();
  assert.deepEqual(results, ['error', 'ended']);
  assert.equal(retried.onend, null);
});

test('stopping reading detaches callbacks before cancellation and cannot affect a newer session', async () => {
  const { createReadAloudSession } = await import('../lib/read-aloud.ts');
  const utterance = { onend: null, onerror: null };
  let cancelCount = 0;
  const results = [];
  const session = createReadAloudSession(
    {
      speak() {},
      cancel() {
        cancelCount++;
        assert.equal(utterance.onerror, null);
        throw new Error('device disconnected during cleanup');
      },
    },
    utterance,
    (reason) => results.push(reason),
  );
  session.start();
  const queuedError = utterance.onerror;
  session.stop();
  session.stop();
  const nextUtterance = { onend: null, onerror: null };
  const next = createReadAloudSession(
    { speak() {}, cancel() {} },
    nextUtterance,
    (reason) => results.push(reason),
  );
  next.start();
  queuedError();
  assert.deepEqual(results, []);
  nextUtterance.onend();
  assert.deepEqual(results, ['ended']);
  assert.equal(cancelCount, 1);
});

test('global point search finds extra aliases and codes independently of the selected meridian', async () => {
  const { searchPoints } = await import('../lib/point-search.ts');
  const all = Object.values(pointById);
  assert.deepEqual(
    searchPoints(all, '消渴').map((p) => p.id),
    ['EX-B3'],
  );
  assert.ok(searchPoints(all, '胰俞').some((p) => p.id === 'EX-B3'));
  assert.deepEqual(
    searchPoints(all, ' l u 9 ').map((p) => p.id),
    ['LU9'],
  );
  assert.equal(searchPoints(all, '不存在的穴位').length, 0);
  assert.equal(searchPoints(all, '   ').length, 0);
  for (const point of all) {
    const matches = searchPoints(all, point.name);
    assert.ok(
      matches.some((p) => p.id === point.id),
      point.id,
    );
    assert.equal(new Set(matches.map((p) => p.id)).size, matches.length);
  }
  assert.equal(canInspectPoint('LU', searchPoints(all, '消渴')[0]), false);
});

test('thoracic shared levels align standard back points without reversing their order', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const { rules } = data.thoracicLevels;
  assert.equal(Object.keys(rules).length, 24);
  for (const [id, rule] of Object.entries(rules)) {
    const position = pointById[id].position;
    assert.ok(Math.abs(position[1] - rule.height) < 1e-9, id);
    assert.ok(Math.abs(position[0] - rule.previousPosition[0]) < 1e-9, id);
    assert.equal(data.points[id].regionRule, 'shared-thoracic-level');
  }
  for (const [a, b] of [
    ['BL13', 'GV12'],
    ['BL15', 'GV11'],
    ['BL16', 'GV10'],
    ['BL17', 'GV9'],
    ['BL18', 'GV8'],
    ['BL42', 'BL13'],
    ['BL44', 'BL15'],
    ['SI15', 'GV14'],
  ]) {
    assert.ok(
      Math.abs(pointById[a].position[1] - pointById[b].position[1]) < 1e-9,
      `${a}/${b}`,
    );
  }
  assert.ok(
    Math.abs(
      pointById['EX-B3'].position[1] -
        (pointById.GV9.position[1] + pointById.GV8.position[1]) / 2,
    ) < 1e-9,
  );
  for (const [from, to] of [
    [11, 22],
    [41, 51],
  ]) {
    for (let i = from; i < to; i++)
      assert.ok(
        pointById[`BL${i}`].position[1] > pointById[`BL${i + 1}`].position[1],
        `BL${i}`,
      );
  }
});

test('lumbar and sacral points share their explicit standard reference levels', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const expected = {
    BL22: 'GV5',
    BL23: 'GV4',
    BL51: 'GV5',
    BL52: 'GV4',
    BL27: 'BL31',
    BL28: 'BL32',
    BL29: 'BL33',
    BL30: 'BL34',
    BL53: 'BL32',
    BL54: 'BL34',
  };
  assert.equal(Object.keys(data.lumbosacralLevels.rules).length, 10);
  for (const [id, ref] of Object.entries(expected)) {
    assert.ok(
      Math.abs(pointById[id].position[1] - pointById[ref].position[1]) < 1e-9,
      id,
    );
    assert.ok(
      Math.abs(
        pointById[id].position[0] -
          data.lumbosacralLevels.rules[id].previousPosition[0],
      ) < 1e-9,
      id,
    );
  }
  for (let i = 21; i < 30; i++)
    assert.ok(
      pointById[`BL${i}`].position[1] > pointById[`BL${i + 1}`].position[1],
      `BL${i}`,
    );
  for (let i = 50; i < 54; i++)
    assert.ok(
      pointById[`BL${i}`].position[1] > pointById[`BL${i + 1}`].position[1],
      `BL${i}`,
    );
});

test('lumbar midline and back extra points retain the standard level order', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const expected = {
    GV3: 'BL25',
    'EX-B6': 'BL25',
    'EX-B7': 'BL25',
    'EX-B8': 'BL26',
  };
  for (const [id, reference] of Object.entries(expected)) {
    assert.ok(
      Math.abs(pointById[id].position[1] - pointById[reference].position[1]) <
        1e-9,
      id,
    );
    assert.ok(
      Math.abs(
        pointById[id].position[0] -
          data.backExtraLevels.rules[id].previousPosition[0],
      ) < 1e-9,
      id,
    );
  }
  assert.ok(pointById.BL24.position[1] > pointById.GV3.position[1]);
  assert.ok(pointById.GV3.position[1] > pointById.BL26.position[1]);
  assert.ok(
    data.routes.GV[0].some((p) =>
      p.every((v, i) => Math.abs(v - pointById.GV3.position[i]) < 1e-9),
    ),
  );
  const references = [
    'BL11',
    'BL12',
    'BL13',
    'BL14',
    'BL15',
    'BL16',
    'BL17',
    'EX-B3',
    'BL18',
    'BL19',
    'BL20',
    'BL21',
    'BL22',
    'BL23',
    'BL24',
    'BL25',
    'BL26',
  ];
  const jiaji = pointById['EX-B2'].positions;
  assert.equal(jiaji.length, 17);
  jiaji.forEach((p, index) => {
    assert.ok(
      Math.abs(p[1] - pointById[references[index]].position[1]) < 1e-9,
      `Jiaji ${index + 1}`,
    );
    if (index > 0) assert.ok(jiaji[index - 1][1] > p[1]);
  });
  assert.deepEqual(
    data.points['EX-B2'].position,
    data.points['EX-B2'].positions[0],
  );
});

test('thyroid level keeps the standard anterior middle posterior point relationship', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  for (const id of ['LI18', 'SI16']) {
    assert.ok(
      Math.abs(pointById[id].position[1] - pointById.ST9.position[1]) < 1e-9,
    );
    assert.match(pointById[id].modelPlacement, /肌肉边界仍待复核/);
  }
  assert.ok(pointById.ST9.position[2] > pointById.LI18.position[2]);
  assert.ok(pointById.LI18.position[2] > pointById.SI16.position[2]);
  assert.ok(pointById.ST9.position[0] < pointById.LI18.position[0]);
  assert.ok(pointById.LI18.position[0] < pointById.SI16.position[0]);
  for (const [id, channel] of [
    ['LI18', 'LI'],
    ['SI16', 'SI'],
  ]) {
    assert.ok(
      data.routes[channel][0].some((p) =>
        p.every((v, i) => Math.abs(v - pointById[id].position[i]) < 1e-9),
      ),
    );
  }
});

test('LI17 shares the ST10 level and remains posterior without moving its transverse reference', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const position = pointById.LI17.position;
  assert.ok(Math.abs(position[1] - pointById.ST10.position[1]) < 1e-9);
  assert.equal(position[0], data.cricoidLevel.previousPosition[0]);
  assert.ok(position[2] < pointById.ST10.position[2]);
  assert.ok(position[1] < pointById.LI18.position[1]);
  assert.match(pointById.LI17.modelPlacement, /扶突直下关系仍需解剖复核/);
  for (const path of [data.routes.LI[0], liCourse.paths.neck.points]) {
    assert.ok(
      path.some((p) => p.every((v, i) => Math.abs(v - position[i]) < 1e-9)),
    );
    assert.ok(
      !path.some((p) =>
        p.every(
          (v, i) => Math.abs(v - data.cricoidLevel.previousPosition[i]) < 1e-9,
        ),
      ),
    );
  }
});

test('checked WHO illustrations retain edition page mapping and the point detail gate', async () => {
  const { getLocationIllustration, whoLocationIllustrationSource } =
    await import('../lib/location-illustrations.ts');
  assert.equal(whoLocationIllustrationSource.edition, '2009 修订重印版');
  assert.equal(whoLocationIllustrationSource.pdfPages, 258);
  for (const [id, page, printed] of [
    ['LI17', 51, 42],
    ['LI18', 51, 42],
    ['ST9', 59, 50],
    ['ST10', 59, 50],
    ['SI16', 104, 95],
  ]) {
    const entry = getLocationIllustration(id, true);
    assert.equal(entry.pdfPage, page);
    assert.equal(entry.printedPage, printed);
    assert.ok(entry.url.endsWith(`#page=${page}`));
    assert.equal(getLocationIllustration(id, false), null);
  }
  for (const id of [undefined, 'ST11', 'EX-HN1', 'constructor', '__proto__'])
    assert.equal(getLocationIllustration(id, true), null);
});

test('supplemental scans preserve independently attributed primary accounts and remain gated', async () => {
  const { getIndicationStudies } = await import('../lib/indication-studies.ts');
  const expected = { 'GV24+': 75, 'EX-UE3': 75, 'EX-LE1': 75, 'EX-UE9': 73 };
  for (const [id, page] of Object.entries(expected)) {
    const p = pointById[id];
    assert.equal(p.additionalIndicationStudies.length, 1);
    assert.equal(p.indications, p.indicationStudy.summary);
    assert.equal(getIndicationStudies(p, true).length, 2);
    assert.deepEqual(getIndicationStudies(p, false), []);
    const scan = p.additionalIndicationStudies[0];
    assert.equal(scan.kind, 'classical');
    assert.ok(scan.references[0].url.endsWith(`#page=${page}`));
    assert.notEqual(
      scan.references[0].url,
      p.indicationStudy.references[0].url,
    );
  }
  assert.equal(pointById['GV24+'].channel, 'GV');
  assert.match(pointById['GV24+'].indications, /失眠/);
  assert.equal(
    pointById['GV24+'].additionalIndicationStudies[0].excerpt,
    '治小兒驚風',
  );
  assert.match(pointById['EX-LE1'].indications, /膝部红肿/);
  assert.equal(
    pointById['EX-LE1'].additionalIndicationStudies[0].excerpt,
    '治腿痛',
  );
  assert.match(
    pointById['EX-UE3'].indicationStudy.references[0].label,
    /奇效良方/,
  );
  assert.match(
    pointById['EX-UE9'].additionalIndicationStudies[0].summary,
    /大都.*上都、中都、下都/,
  );
  assert.deepEqual(getIndicationStudies(null, true), []);
  const { summarizeSourceCoverage } = await import('../lib/source-coverage.ts');
  const extraOnly = {
    id: 'A',
    indications: 'summary',
    additionalIndicationStudies: [
      { references: [{ url: 'https://example.com/scan' }] },
    ],
  };
  const coverage = summarizeSourceCoverage([extraOnly, extraOnly], ['A']);
  assert.equal(coverage.total, 1);
  assert.equal(coverage.withReference, 1);
  assert.equal(coverage.withScan, 1);
});

test('Bizhong stays on the forearm midpoint plane of the pinned model', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const { wrist, elbow } = data.forearmMidpoint;
  const point = pointById['M-UE30'].position;
  const axis = elbow.map((v, i) => v - wrist[i]);
  const fraction =
    axis.reduce((sum, v, i) => sum + v * (point[i] - wrist[i]), 0) /
    axis.reduce((sum, v) => sum + v * v, 0);
  assert.ok(Math.abs(fraction - 0.5) < 1e-9);
  assert.equal(data.points['M-UE30'].regionRule, 'forearm-midpoint');
});

test('kidney collateral wraps the retained heel surface without cutting through it', async () => {
  const THREE = await import('three');
  const { default: fitted } = await import('../lib/luo-heel.json');
  assert.equal(fitted.assetSha256, humanMesh.assetSha256);
  for (const [id, position] of Object.entries(fitted.references))
    assert.deepEqual(
      position,
      pointById[id].position,
      `${id}: regenerate heel route after moving reference`,
    );
  const route = luoChannels.find((c) => c.id === 'LUO-KI').routes[0];
  assert.deepEqual(route, fitted.points);
  assert.deepEqual(route[0], pointById.KI4.position);
  assert.deepEqual(route.at(-1), pointById.BL60.position);
  assert.ok(
    fitted.heelBinding.position[2] < Math.min(route[0][2], route.at(-1)[2]),
  );
  assert.equal(luoChannels.find((c) => c.id === 'LUO-KI').points.length, 1);
  assert.match(getLuoStudy('LUO-KI').note, /不认定为固定终点/);
  const glb = readFileSync(
    new URL('../public/models/human-learning.glb', import.meta.url),
  );
  const length = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + length).toString());
  const base = 28 + length;
  const vertexOffset = base + doc.bufferViews[0].byteOffset;
  const indexOffset = base + doc.bufferViews[2].byteOffset;
  const vertex = (i) =>
    new THREE.Vector3(
      ...[0, 1, 2].map((axis) =>
        glb.readFloatLE(vertexOffset + (i * 3 + axis) * 4),
      ),
    );
  const faces = [];
  for (let i = 0; i < doc.accessors[2].count; i += 3) {
    const triangle = new THREE.Triangle(
      ...[0, 1, 2].map((k) =>
        vertex(glb.readUInt32LE(indexOffset + (i + k) * 4)),
      ),
    );
    const box = new THREE.Box3().setFromPoints([
      triangle.a,
      triangle.b,
      triangle.c,
    ]);
    faces.push({ triangle, box });
  }
  const curve = new THREE.CatmullRomCurve3(
    route.map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal',
  );
  curve.arcLengthDivisions = 2000;
  for (const sample of curve.getSpacedPoints(120)) {
    let distance = Infinity,
      closest,
      normal;
    for (const { triangle, box } of faces) {
      if (box.distanceToPoint(sample) > Math.min(distance, 0.02)) continue;
      const point = triangle.closestPointToPoint(sample, new THREE.Vector3());
      const d = point.distanceTo(sample);
      if (d < distance) {
        distance = d;
        closest = point;
        normal = triangle.getNormal(new THREE.Vector3());
      }
    }
    assert.ok(distance < 0.005, `heel route detached: ${distance}`);
    assert.ok(
      sample.clone().sub(closest).dot(normal) > 0.001,
      'heel curve cuts through the skin',
    );
  }
});

test('all fifteen fitted collateral paths retain source anchors and uncertain internal links', async () => {
  const { default: fitted } = await import('../lib/luo-surface.json');
  assert.equal(fitted.assetSha256, humanMesh.assetSha256);
  assert.deepEqual(
    Object.keys(fitted.paths).sort(),
    luoStudies.map((s) => s.id).sort(),
  );
  let count = 0;
  for (const c of luoChannels) {
    const records = fitted.paths[c.id];
    assert.equal(records.length, luoSegments[c.id].length);
    for (const [index, p] of records.entries()) {
      const segment = luoSegments[c.id][index];
      const expected = segment.nodes.map((node) =>
        typeof node === 'string'
          ? { id: node, position: pointById[node].position, surface: true }
          : { ...node, surface: !!node.binding },
      );
      assert.deepEqual(
        p.references,
        expected,
        `${c.id}/${index}: regenerate after changing a reference`,
      );
      assert.deepEqual(c.routes[index], p.points);
      if (segment.fittedPath) {
        assert.deepEqual(p.points, segment.fittedPath);
        continue;
      }
      assert.equal(p.spans.length, expected.length - 1);
      for (const span of p.spans) {
        assert.deepEqual(p.points[span.from], expected[span.nodePair].position);
        assert.deepEqual(
          p.points[span.to],
          expected[span.nodePair + 1].position,
        );
        assert.equal(
          span.surface,
          expected[span.nodePair].surface &&
            expected[span.nodePair + 1].surface,
        );
        if (span.surface) count++;
        else
          assert.equal(
            span.to - span.from,
            1,
            'do not project internal regions onto skin',
          );
      }
    }
  }
  assert.equal(count, 82);
});

test('rendered collateral surface connections stay close to and outside the retained skin', async () => {
  const THREE = await import('three');
  const { default: fitted } = await import('../lib/luo-surface.json');
  const glb = readFileSync(
    new URL('../public/models/human-learning.glb', import.meta.url),
  );
  assert.equal(
    createHash('sha256').update(glb).digest('hex'),
    fitted.assetSha256,
  );
  const length = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + length).toString());
  const base = 28 + length;
  const vertexOffset = base + doc.bufferViews[0].byteOffset;
  const indexOffset = base + doc.bufferViews[2].byteOffset;
  const vertex = (i) =>
    new THREE.Vector3(
      ...[0, 1, 2].map((axis) =>
        glb.readFloatLE(vertexOffset + (i * 3 + axis) * 4),
      ),
    );
  const faces = [];
  for (let i = 0; i < doc.accessors[2].count; i += 3) {
    const triangle = new THREE.Triangle(
      ...[0, 1, 2].map((k) =>
        vertex(glb.readUInt32LE(indexOffset + (i + k) * 4)),
      ),
    );
    faces.push({
      triangle,
      box: new THREE.Box3().setFromPoints([triangle.a, triangle.b, triangle.c]),
    });
  }
  for (const [id, paths] of Object.entries(fitted.paths))
    for (const [index, p] of paths.entries())
      for (const side of [1, -1]) {
        const curve = new THREE.CatmullRomCurve3(
          luoChannels
            .find((c) => c.id === id)
            .routes[index].map(
              (p) => new THREE.Vector3(p[0] * side, p[1], p[2]),
            ),
          false,
          'centripetal',
        );
        for (const span of p.spans.filter((s) => s.surface))
          for (let i = 0; i <= 20; i++) {
            const sample = curve.getPoint(
              (span.from + ((span.to - span.from) * i) / 20) /
                (p.points.length - 1),
            );
            let distance = Infinity,
              closest,
              normal;
            for (const { triangle, box } of faces) {
              if (box.distanceToPoint(sample) > Math.min(distance, 0.02))
                continue;
              const point = triangle.closestPointToPoint(
                sample,
                new THREE.Vector3(),
              );
              const d = point.distanceTo(sample);
              if (d < distance) {
                distance = d;
                closest = point;
                normal = triangle.getNormal(new THREE.Vector3());
              }
            }
            const context = `${id}/${side}/${index}/${span.nodePair}/${i}`;
            assert.ok(
              distance < 0.01,
              `${context}: detached surface connection ${distance}`,
            );
            assert.ok(
              sample.clone().sub(closest).dot(normal) > -0.001,
              `${context}: curve cuts through skin`,
            );
          }
      }
});

test('anterior thigh levels follow standard 2/3/4/6-cun relationships and shared extra-point levels', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const audit = data.thighLevels;
  const y = (id) => pointById[id].position[1];
  const unit = (y('ST32') - y('ST33')) / 3;
  const base = y('ST33') - 3 * unit;
  assert.deepEqual(audit.references.ST32, pointById.ST32.position);
  assert.deepEqual(audit.references.ST33, pointById.ST33.position);
  assert.ok(Math.abs(audit.baseY - base) < 1e-9);
  assert.ok(Math.abs(audit.unit - unit) < 1e-9);
  assert.ok(Math.abs(base - y('EX-LE2')) < 0.005);
  for (const [id, cun] of Object.entries({
    ST34: 2,
    SP10: 2,
    LR9: 4,
    'EX-LE1': 2,
    'EX-LE3': 3,
  })) {
    const p = pointById[id];
    const positions = p.positions || [p.position];
    assert.equal(positions.length, audit.previousPositions[id].length);
    positions.forEach((pos, i) => {
      assert.ok(Math.abs(pos[1] - base - cun * unit) < 1e-8, id);
      assert.ok(
        Math.abs(pos[0] - audit.previousPositions[id][i][0]) < 1e-8,
        id,
      );
    });
    assert.match(p.modelPlacement, /真实骨点、肌缘及横向距离仍需解剖校准/);
  }
  assert.ok(
    y('ST32') > y('LR9') && y('LR9') > y('ST33') && y('ST33') > y('ST34'),
  );
  for (const [channel, id, part] of [
    ['ST', 'ST34', 'leg'],
    ['SP', 'SP10', 'stem'],
    ['LR', 'LR9', 'stem'],
  ]) {
    const p = pointById[id].position;
    assert.ok(
      channels
        .find((c) => c.id === channel)
        .route.some((q) => q.every((v, i) => v === p[i])),
    );
    const course = JSON.parse(
      readFileSync(
        new URL(`../lib/${channel.toLowerCase()}-course.json`, import.meta.url),
      ),
    );
    assert.ok(
      course.paths[part].points.some((q) => q.every((v, i) => v === p[i])),
    );
    const old = audit.previousPositions[id][0];
    assert.ok(
      !course.paths[part].points.some((q) => q.every((v, i) => v === old[i])),
    );
  }
});

test('shared finger, toe and knee group markers coincide with their canonical anchors', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const links = {
    'EX-LE5': { 0: 'EX-LE4', 1: 'ST35' },
    'EX-UE9': { 3: 'TE2' },
    'EX-UE11': { 2: 'PC9' },
    'EX-LE10': { 0: 'LR2', 1: 'ST44', 3: 'GB43' },
  };
  assert.deepEqual(data.sharedGroups.links, links);
  for (const [group, refs] of Object.entries(links)) {
    const p = pointById[group];
    const before = data.sharedGroups.previousPositions[group];
    assert.equal(p.positions.length, before.length);
    assert.deepEqual(data.points[group].sharedAnchorRefs, refs);
    for (let i = 0; i < p.positions.length; i++) {
      if (refs[i]) {
        assert.deepEqual(
          p.positions[i],
          pointById[refs[i]].position,
          `${group}/${i}/${refs[i]}`,
        );
        for (const key of ['face', 'barycentric', 'offset', 'position'])
          assert.deepEqual(
            data.points[group].groupBindings[i][key],
            data.points[refs[i]][key],
          );
      } else
        assert.deepEqual(
          p.positions[i],
          before[i],
          'unrelated group members must not move',
        );
    }
    assert.deepEqual(p.position, p.positions[0]);
    assert.match(p.modelPlacement, /同位的标记已共用对应模型坐标/);
    assert.notEqual(
      p,
      pointById[Object.values(refs)[0]],
      'same position does not merge catalog entries',
    );
  }
  assert.equal(pointById['EX-LE4'].position[1], pointById.ST35.position[1]);
  assert.ok(pointById['EX-LE4'].position[0] < pointById.ST35.position[0]);
  assert.match(
    pointById['EX-LE4'].modelPlacement,
    /实际髌韧带边缘和凹陷仍待解剖校核/,
  );
  assert.equal(canInspectPoint('EX', pointById.ST35), false);
  assert.equal(canInspectPoint('ST', pointById['EX-LE5']), false);
  assert.equal(canInspectPoint('EX', pointById['EX-LE5']), true);
});

test('GB32 and SP11 respect their explicit longitudinal reference ratios', () => {
  const data = JSON.parse(
    readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)),
  );
  const audit = data.thighRatios;
  const y = (id) => pointById[id].position[1];
  for (const [id, pos] of Object.entries(audit.references))
    assert.deepEqual(pointById[id].position, pos);
  assert.ok(
    Math.abs((y('GB32') - y('BL40')) / (y('GB31') - y('BL40')) - 7 / 9) < 1e-8,
  );
  assert.ok(
    Math.abs(
      (y('SP11') - audit.patellaBaseY) / (y('SP12') - audit.patellaBaseY) -
        2 / 3,
    ) < 1e-8,
  );
  assert.equal(audit.patellaBaseY, data.thighLevels.baseY);
  assert.ok(
    Math.abs(pointById.GB32.position[2] - audit.previousPositions.GB32[2]) <
      1e-8,
  );
  assert.ok(
    Math.abs(pointById.SP11.position[0] - audit.previousPositions.SP11[0]) <
      1e-8,
  );
  assert.match(pointById.GB32.modelPlacement, /髂胫束后缘仍为待核对/);
  assert.match(
    pointById.SP11.modelPlacement,
    /完整连线及肌缘动脉标志仍需解剖校核/,
  );
  for (const [ch, id, key] of [
    ['GB', 'GB32', 'leg'],
    ['SP', 'SP11', 'stem'],
  ]) {
    const p = pointById[id].position;
    const course = JSON.parse(
      readFileSync(
        new URL(`../lib/${ch.toLowerCase()}-course.json`, import.meta.url),
      ),
    );
    assert.ok(
      channels
        .find((c) => c.id === ch)
        .route.some((q) => q.every((v, i) => v === p[i])),
    );
    assert.ok(
      course.paths[key].points.some((q) => q.every((v, i) => v === p[i])),
    );
    assert.ok(
      !course.paths[key].points.some((q) =>
        q.every((v, i) => v === audit.previousPositions[id][i]),
      ),
    );
  }
});

test('nail-root points use proximal same-source borders instead of the free nail edge', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const r = data.nailRootReferences;
  assert.deepEqual(Object.keys(r.points).sort(), ['HT9', 'LI1', 'LU11', 'SI1', 'TE1']);
  const glb = readFileSync(new URL('../public/models/human-learning.glb', import.meta.url));
  const size = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + size).toString());
  const start = 28 + size + doc.bufferViews[0].byteOffset;
  const vertex = (id) => [0, 1, 2].map((k) => glb.readFloatLE(start + (id * 3 + k) * 4));
  for (const [id, ref] of Object.entries(r.points)) {
    const local = (p) => ref.frameRows.map((row) => row.reduce((sum, x, k) => sum + x * (p[k] - ref.center[k]), 0));
    const coords = ref.nailVertices.map((i) => local(vertex(i)));
    const expectedX = (ref.side === 'radial' ? Math.max : Math.min)(...coords.map((p) => p[0]));
    const expectedY = Math.min(...coords.map((p) => p[1]));
    const skin = data.points[id].position.map((v, k) => v - data.points[id].offset[k]);
    const projected = local(skin);
    assert.ok(Math.abs(projected[0] - expectedX) < 1e-9, id + ' lateral nail border');
    assert.ok(Math.abs(projected[1] - expectedY) < 1e-9, id + ' proximal nail border');
    assert.ok(projected[1] < 0);
    const old = ref.previousBinding.position.map((v, k) => v - ref.previousBinding.offset[k]);
    assert.ok(local(old)[1] > 0, id + ' former distal placement');
    assert.match(pointById[id].modelPlacement, /0.1指寸距离及真实甲沟边界仍待核对/);
    assert.equal(data.points[id].regionRule, 'provisional-nail-root');
  }
  assert.equal(r.nailGroupSource.sourceObjSha256, '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c');
  assert.equal(data.middleFingertipReference.glbVertex, 8787);
  assert.deepEqual(pointById['EX-UE11'].positions[2], pointById.PC9.position);
});

test('middle fingertip and its shared Shixuan member use the reviewed terminal surface', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const r = data.middleFingertipReference;
  const glb = readFileSync(new URL('../public/models/human-learning.glb', import.meta.url));
  const size = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + size).toString());
  const start = 28 + size + doc.bufferViews[0].byteOffset;
  const vertex = (id) => [0, 1, 2].map((k) => glb.readFloatLE(start + (id * 3 + k) * 4));
  const skin = vertex(r.glbVertex);
  assert.deepEqual(r.surfacePosition, skin);
  assert.equal(r.status, 'model-surface-reviewed');
  assert.equal(r.glbVertex, 8787);
  const bound = data.points.PC9;
  skin.forEach((v, k) => assert.ok(Math.abs(bound.position[k] - bound.offset[k] - v) < 1e-12));
  assert.ok(r.surfaceSeparationMm > 5 && r.surfaceSeparationMm < 7);
  assert.deepEqual(pointById['EX-UE11'].positions[2], pointById.PC9.position);
  assert.match(pointById.PC9.modelPlacement, /中指末端顶点/);
  assert.match(pointById.PC9.modelPlacement, /不代表骨骼、甲根或个体临床定位均已校准/);
  const pc = JSON.parse(readFileSync(new URL('../lib/pc-course.json', import.meta.url)));
  assert.deepEqual(pc.paths.middle.points.at(-1), pointById.PC9.position);
  assert.ok(!pc.paths.middle.points.some((p) => p.every((v, k) => v === r.previousBinding.position[k])));
});

test('reviewed lip landmarks bind to retained surface morphology and all affected routes follow them', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const review = data.lipLandmarks;
  const glb = readFileSync(new URL('../public/models/human-learning.glb', import.meta.url));
  const size = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + size).toString());
  const offset = 28 + size + doc.bufferViews[0].byteOffset;
  const vertex = (id) => [0, 1, 2].map((k) => glb.readFloatLE(offset + (id * 3 + k) * 4));
  assert.deepEqual(Object.keys(review.points).sort(), ['CV24', 'GV27']);
  for (const [id, item] of Object.entries(review.points)) {
    const skin = vertex(item.glbVertex);
    assert.deepEqual(item.surfacePosition, skin);
    assert.equal(item.originalVertex, item.glbVertex);
    assert.equal(skin[0], 0);
    const neighbors = item.neighbors.map(vertex);
    assert.ok(neighbors[0][1] > skin[1] && skin[1] > neighbors[1][1]);
    assert.ok(item.extremum === 'maximum' ? neighbors.every((p) => p[2] < skin[2]) : neighbors.every((p) => p[2] > skin[2]));
    assert.deepEqual(pointById[id].position, [skin[0], skin[1], skin[2] + .003]);
    assert.equal(item.reviewStatus, 'model-surface-reviewed');
    assert.match(pointById[id].modelPlacement, /仅完成此模型的体表形态对应/);
    assert.match(pointById[id].modelPlacement, /非个体临床定位验证/);
  }
  assert.equal(review.points.GV27.glbVertex, 466);
  assert.equal(review.points.CV24.glbVertex, 724);
  const affected = {
    gv: { head: 'GV27', frontCollateral: 'CV24', faceLeft: 'CV24', faceRight: 'CV24' },
    cv: { chest: 'CV24', lipLeft: 'CV24', lipRight: 'CV24' },
    st: { lips: 'CV24', jaw: 'CV24' },
  };
  for (const [ch, paths] of Object.entries(affected)) {
    const course = JSON.parse(readFileSync(new URL(`../lib/${ch}-course.json`, import.meta.url)));
    for (const [key, id] of Object.entries(paths)) {
      assert.ok(course.paths[key].points.some((p) => p.every((x, i) => x === pointById[id].position[i])), `${ch}/${key} updated landmark`);
      assert.ok(!course.paths[key].points.some((p) => p.every((x, i) => x === review.points[id].previousPosition[i])), `${ch}/${key} stale landmark`);
    }
  }
});

test('nasal tip uses its mesh landmark while philtrum and mouth corrections remain explicitly provisional', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const review = data.noseMouthLandmarks;
  const glb = readFileSync(new URL('../public/models/human-learning.glb', import.meta.url));
  const size = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + size).toString());
  const offset = 28 + size + doc.bufferViews[0].byteOffset;
  const vertex = (id) => [0, 1, 2].map((k) => glb.readFloatLE(offset + (id * 3 + k) * 4));
  for (const [id, position] of Object.entries(review.vertices)) assert.deepEqual(vertex(Number(id)), position);
  assert.equal(review.points.GV25.status, 'model-surface-reviewed');
  assert.equal(review.points.GV26.status, 'provisional-boundaries');
  assert.equal(review.points.ST4.status, 'provisional-distance');
  for (let i = 0; i < doc.accessors[0].count; i++) {
    const p = vertex(i);
    if (p[0] === 0 && p[1] > 1.66 && p[1] < 1.70) assert.ok(p[2] <= vertex(297)[2]);
  }
  for (const [id, vid] of [['GV25', 297], ['ST4', 7139]]) {
    const p = vertex(vid);
    assert.deepEqual(pointById[id].position, [p[0], p[1], p[2] + .003]);
  }
  const chain = review.points.GV26.chain.map(vertex);
  const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
  const lengths = chain.slice(1).map((p, i) => distance(p, chain[i]));
  const j = review.points.GV26.segment;
  const f = review.points.GV26.segmentFraction;
  const skin = chain[j].map((x, i) => x * (1 - f) + chain[j + 1][i] * f);
  assert.ok(Math.abs((lengths.slice(0, j).reduce((a, b) => a + b, 0) + lengths[j] * f) / lengths.reduce((a, b) => a + b, 0) - 1 / 3) < 1e-9);
  assert.ok(distance(pointById.GV26.position, [skin[0], skin[1], skin[2] + .003]) < 1e-7);
  const y = (id) => pointById[id].position[1];
  assert.ok(y('GV25') > y('GV26') && y('GV26') > y('GV27') && y('GV27') > y('ST4') && y('ST4') > y('CV24'));
  assert.match(pointById.GV26.modelPlacement, /模型沟界仍待独立校核/);
  assert.match(pointById.ST4.modelPlacement, /口角旁开0.4寸及沟线形态仍需独立核实/);
  for (const id of ['GV26', 'ST4']) assert.match(pointById[id].modelPlacement, /尚不列为完整解剖校准通过/);
  for (const { ch, key, ids } of [{ ch: 'gv', key: 'head', ids: ['GV25', 'GV26'] }, { ch: 'li', key: 'oral', ids: ['ST4'] }, { ch: 'li', key: 'face', ids: ['ST4', 'GV26'] }, { ch: 'yangqiao', key: 'body', ids: ['ST4'] }]) {
    const course = JSON.parse(readFileSync(new URL(`../lib/${ch}-course.json`, import.meta.url)));
    for (const id of ids) {
      assert.ok(course.paths[key].points.some((p) => p.every((x, i) => x === pointById[id].position[i])), `${ch}/${key}/${id}`);
      assert.ok(!course.paths[key].points.some((p) => p.every((x, i) => x === review.previousPositions[id][i])), `stale ${ch}/${key}/${id}`);
    }
  }
});

test('infraorbital points share the same-source eye reference while anatomical limits stay explicit', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const r = data.eyeAxisReference;
  assert.equal(r.sourceObjSha256, '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c');
  assert.equal(r.status, 'provisional-eye-axis');
  assert.deepEqual(r.changedPoints, ['ST1', 'ST3']);
  for (const e of Object.values(r.eyes)) {
    assert.equal(new Set(e.frontPoleVertexIds).size, 8);
    assert.equal(e.frontPoleVertices.length, 8);
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(e.frontPoleVertices.reduce((sum, p) => sum + p[k], 0) / 8 - e.frontPoleCenter[k]) < 1e-12);
  }
  const axis = r.eyes.l.frontPoleCenter[0];
  assert.ok(Math.abs(axis - 0.034176176098061686) < 1e-10);
  assert.ok(Math.abs(axis + r.eyes.r.frontPoleCenter[0]) < 1e-10);
  for (const id of ['ST1', 'ST3']) {
    assert.ok(Math.abs(pointById[id].position[0] - axis) < 1e-10);
    assert.ok(Math.abs(pointById[id].position[1] - r.previousPositions[id][1]) < 1e-10);
    assert.ok(pointById[id].position[2] > .145);
    assert.match(pointById[id].modelPlacement, /眼部前极只是模型参考/);
    assert.match(pointById[id].modelPlacement, /仍待解剖核对/);
  }
  assert.equal(r.rejectedST1UpwardProbe.dy, .0005);
  assert.ok(r.rejectedST1UpwardProbe.position[2] < r.eyes.l.frontPoleCenter[2] - .02);
  assert.notDeepEqual(pointById.ST1.position, r.rejectedST1UpwardProbe.position);
  for (const { ch, path, id, side } of [
    { ch: 'st', path: 'nose', id: 'ST1', side: 1 },
    { ch: 'st', path: 'nose', id: 'ST3', side: 1 },
    { ch: 'st', path: 'teeth', id: 'ST3', side: 1 },
    { ch: 'yangqiao', path: 'body', id: 'ST1', side: 1 },
    { ch: 'yangqiao', path: 'body', id: 'ST3', side: 1 },
    { ch: 'cv', path: 'faceLeft', id: 'ST1', side: 1 },
    { ch: 'cv', path: 'faceRight', id: 'ST1', side: -1 },
    { ch: 'gv', path: 'faceLeft', id: 'ST1', side: 1 },
    { ch: 'gv', path: 'faceRight', id: 'ST1', side: -1 },
  ]) {
    const course = JSON.parse(readFileSync(new URL(`../lib/${ch}-course.json`, import.meta.url)));
    const expected = pointById[id].position.map((v, k) => k ? v : v * side);
    const stale = r.previousPositions[id].map((v, k) => k ? v : v * side);
    assert.ok(course.paths[path].points.some((p) => p.every((v, k) => v === expected[k])), `${ch}/${path}/${id}`);
    assert.ok(!course.paths[path].points.some((p) => p.every((v, k) => v === stale[k])), `stale ${ch}/${path}/${id}`);
  }
  const brow = pointById['EX-HN4'].position;
  const below = pointById.ST1.position;
  const eye = brow.map((v, i) => (v + below[i]) / 2 - (i === 2 ? .045 : 0));
  for (const ch of ['ht', 'lr']) {
    const course = JSON.parse(readFileSync(new URL(`../lib/${ch}-course.json`, import.meta.url)));
    assert.deepEqual(course.paths.eye.points.at(-1), eye);
    if (ch === 'lr') {
      assert.deepEqual(course.paths.forehead.points[0], eye);
      assert.deepEqual(course.paths.cheek.points[0], eye);
    }
  }

});

test('postauricular scalp arc preserves surface edges, standard fractions and branch endpoints', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const r = data.earArcReference;
  assert.equal(r.status, 'provisional-ear-arc');
  const glb = readFileSync(new URL('../public/models/human-learning.glb', import.meta.url));
  const size = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + size).toString());
  const bin = 28 + size;
  const primitive = doc.meshes[0].primitives[0];
  const pa = doc.accessors[primitive.attributes.POSITION];
  const ia = doc.accessors[primitive.indices];
  assert.equal(pa.componentType, 5126);
  const po = bin + (doc.bufferViews[pa.bufferView].byteOffset || 0) + (pa.byteOffset || 0);
  const io = bin + (doc.bufferViews[ia.bufferView].byteOffset || 0) + (ia.byteOffset || 0);
  const vertex = (id) => [0, 1, 2].map((k) => glb.readFloatLE(po + (id * 3 + k) * 4));
  const stride = ia.componentType === 5125 ? 4 : 2;
  assert.ok([5123, 5125].includes(ia.componentType));
  const index = (i) => stride === 4 ? glb.readUInt32LE(io + i * stride) : glb.readUInt16LE(io + i * stride);
  const edges = new Set();
  for (let i = 0; i < ia.count; i += 3) {
    const tri = [index(i), index(i + 1), index(i + 2)];
    for (let j = 0; j < 3; j++) edges.add([tri[j], tri[(j + 1) % 3]].sort((a, b) => a - b).join(','));
  }
  for (const [id, position] of Object.entries(r.referenceVertices)) assert.deepEqual(vertex(Number(id)), position);
  const chain = r.vertexChain.map(vertex);
  const lengths = chain.slice(1).map((p, i) => Math.hypot(...p.map((v, k) => v - chain[i][k])));
  for (let i = 0; i < lengths.length; i++) {
    assert.ok(edges.has([r.vertexChain[i], r.vertexChain[i + 1]].sort((a, b) => a - b).join(',')), 'reference stays on real mesh edges');
  }
  const total = lengths.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - r.totalSurfaceLength) < 1e-10);
  assert.deepEqual(pointById.TE17.position, chain.at(-1).map((v, k) => v + (k === 0 ? .003 : 0)));
  assert.deepEqual(pointById.TE20.position, chain[0].map((v, k) => v + (k === 0 ? .003 : 0)));
  assert.ok(Math.abs(pointById.TE20.position[1] - vertex(12012)[1]) < .001, 'upper reference beside natural auricle');
  for (const [id, fraction] of [['TE19', 1 / 3], ['TE18', 2 / 3]]) {
    const p = r.placements[id];
    const covered = lengths.slice(0, p.segment).reduce((a, b) => a + b, 0) + lengths[p.segment] * p.segmentFraction;
    assert.ok(Math.abs(covered / total - fraction) < 1e-10);
    assert.equal(data.points[id].regionRule, 'provisional-ear-arc');
    assert.match(pointById[id].modelPlacement, /两端、耳轮弧线及乳突标志仍待解剖核对/);
    assert.ok(pointById[id].position[2] > r.previousPositions[id][2] + .02, 'old posterior displacement removed');
  }
  assert.ok(pointById.TE20.position[1] > pointById.TE19.position[1]);
  assert.ok(pointById.TE19.position[1] > pointById.TE18.position[1]);
  assert.ok(pointById.TE18.position[1] > pointById.TE17.position[1]);
  assert.match(pointById.TE20.modelPlacement, /耳郭向前对折后的耳尖正对发际/);
  for (const { ch, path, ids } of [{ ch: 'te', path: 'upper', ids: ['TE18', 'TE19', 'TE20'] }, { ch: 'bl', path: 'ear', ids: ['TE20'] }]) {
    const c = JSON.parse(readFileSync(new URL(`../lib/${ch}-course.json`, import.meta.url)));
    for (const id of ids) {
      assert.ok(c.paths[path].points.some((p) => p.every((v, k) => v === pointById[id].position[k])), `${ch}/${path}/${id}`);
      assert.ok(!c.paths[path].points.some((p) => p.every((v, k) => v === r.previousPositions[id][k])), `stale ${ch}/${path}/${id}`);
    }
  }
});

test('ear surface references correct the preauricular row and lobe relation without claiming bone validation', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const r = data.earSurfaceReferences;
  assert.equal(r.status, 'provisional-ear-surface');
  const glb = readFileSync(new URL('../public/models/human-learning.glb', import.meta.url));
  const size = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + size).toString());
  const offset = 28 + size + doc.bufferViews[0].byteOffset;
  const vertex = (id) => [0, 1, 2].map((k) => glb.readFloatLE(offset + (id * 3 + k) * 4));
  for (const [id, position] of Object.entries(r.referenceVertices)) assert.deepEqual(vertex(Number(id)), position);
  for (const [id, vid] of Object.entries(r.earFrontHeightReferences)) {
    const p = pointById[id].position;
    assert.ok(Math.abs(p[1] - vertex(vid)[1]) < 1e-9);
    assert.ok(p[2] > vertex(vid)[2]);
    assert.ok(Math.abs(p[2] - r.earFrontZ) < 1e-9);
    assert.match(pointById[id].modelPlacement, /下颌骨髁突及微张口凹陷仍待解剖核对/);
  }
  assert.ok(pointById.TE21.position[1] > pointById.SI19.position[1]);
  assert.ok(pointById.SI19.position[1] > pointById.GB2.position[1]);
  const lobeRear = vertex(11883);
  assert.deepEqual(pointById.TE17.position, [lobeRear[0] + .003, lobeRear[1], lobeRear[2]]);
  assert.ok(pointById.TE17.position[2] < vertex(12330)[2]);
  assert.match(pointById.TE17.modelPlacement, /乳突下端及其前方凹陷仍待解剖核对/);
  for (const { ch, path, id } of [
    { ch: 'si', path: 'ear', id: 'SI19' },
    { ch: 'si', path: 'earDepth', id: 'SI19' },
    { ch: 'te', path: 'neck', id: 'TE17' },
    { ch: 'te', path: 'upper', id: 'TE17' },
    { ch: 'te', path: 'ear', id: 'TE21' },
    { ch: 'te', path: 'eye', id: 'TE21' },
    { ch: 'gb', path: 'head', id: 'GB2' },
    { ch: 'gb', path: 'ear', id: 'GB2' },
  ]) {
    const c = JSON.parse(readFileSync(new URL(`../lib/${ch}-course.json`, import.meta.url)));
    assert.ok(c.paths[path].points.some((p) => p.every((v, i) => v === pointById[id].position[i])), `${ch}/${path}/${id}`);
    assert.ok(!c.paths[path].points.some((p) => p.every((v, i) => v === r.previousPositions[id][i])), `stale ${ch}/${path}/${id}`);
  }
  const yw = JSON.parse(readFileSync(new URL('../lib/yangwei-course.json', import.meta.url)));
  const a = pointById.TE21.position, b = pointById.SI19.position;
  const ear = a.map((v, i) => (v + b[i]) / 2 - (i === 0 ? .012 : 0));
  assert.deepEqual(yw.paths.ear.points.at(-1), ear);
  assert.deepEqual(yw.paths.return.points[0], ear);
});

test('canthus review distinguishes retained directions from the corrected cheek axis and updates linked courses', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const r = data.canthusReference;
  assert.equal(r.status, 'provisional-canthus-reference');
  const glb = readFileSync(new URL('../public/models/human-learning.glb', import.meta.url));
  const size = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + size).toString());
  const offset = 28 + size + doc.bufferViews[0].byteOffset;
  const vertex = (id) => [0, 1, 2].map((k) => glb.readFloatLE(offset + (id * 3 + k) * 4));
  for (const [id, position] of Object.entries(r.referenceVertices)) assert.deepEqual(vertex(Number(id)), position);
  const inner = vertex(r.innerReferenceVertex), outer = vertex(r.outerReferenceVertex);
  assert.deepEqual(pointById.BL1.position, r.previousPositions.BL1);
  assert.deepEqual(pointById.GB1.position, r.previousPositions.GB1);
  assert.ok(pointById.BL1.position[0] < inner[0] && pointById.BL1.position[1] > inner[1]);
  assert.ok(pointById.GB1.position[0] > outer[0]);
  assert.equal(pointById.SI18.position[0], outer[0]);
  assert.equal(pointById.SI18.position[1], r.previousPositions.SI18[1]);
  assert.ok(Math.abs(r.previousPositions.SI18[0] - outer[0]) > .01);
  assert.match(pointById.SI18.modelPlacement, /颧骨下缘凹陷仍待解剖核对/);
  assert.match(pointById.BL1.modelPlacement, /闭目体位、内上方0.1寸与眶内侧壁凹陷仍待解剖核对/);
  assert.match(pointById.GB1.modelPlacement, /外侧0.5寸及局部凹陷仍待解剖核对/);
  for (const { ch, paths } of [{ ch: 'si', paths: ['neck', 'outer', 'inner', 'cheek'] }, { ch: 'te', paths: ['upper'] }, { ch: 'gb', paths: ['face'] }]) {
    const c = JSON.parse(readFileSync(new URL(`../lib/${ch}-course.json`, import.meta.url)));
    for (const path of paths) {
      assert.ok(c.paths[path].points.some((p) => p.every((v, k) => v === pointById.SI18.position[k])), `${ch}/${path}`);
      assert.ok(!c.paths[path].points.some((p) => p.every((v, k) => v === r.previousPositions.SI18[k])), `stale ${ch}/${path}`);
    }
  }
});

test('LI19 remains level with its provisional philtrum reference and the crossed facial course uses the updated point', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const r = data.philtrumLevelReference;
  assert.equal(r.status, 'provisional-shared-level');
  assert.equal(r.reference, 'GV26');
  assert.deepEqual(r.referencePosition, pointById.GV26.position);
  assert.equal(r.referenceStatus, 'provisional-philtrum-surface');
  assert.deepEqual(data.points.LI19.sharedLevelRefs, ['GV26']);
  assert.ok(Math.abs(pointById.LI19.position[1] - pointById.GV26.position[1]) < 1e-9);
  assert.ok(Math.abs(pointById.LI19.position[0] - r.previousPosition[0]) < 1e-9);
  assert.ok(pointById.LI19.position[1] > pointById.GV27.position[1], 'LI19 above upper lip, not below mouth');
  assert.ok(pointById.LI19.position[1] - r.previousPosition[1] > .03);
  assert.match(pointById.LI19.modelPlacement, /水沟的人中沟边界、鼻孔外缘及旁开0.5寸仍待解剖核对/);
  const c = JSON.parse(readFileSync(new URL('../lib/li-course.json', import.meta.url)));
  for (const id of ['LI19', 'GV26']) assert.ok(c.paths.face.points.some((p) => p.every((v, k) => v === pointById[id].position[k])), id);
  assert.ok(!c.paths.face.points.some((p) => p.every((v, k) => v === r.previousPosition[k])));
  assert.deepEqual(c.paths.face.points.at(-1), pointById.LI20.position.map((v, k) => k ? v : -v));
});

test('abdominal shared levels update bilateral Dai references and preserve uncertainty', () => {
  const data = JSON.parse(readFileSync(new URL('../lib/mesh-registration.json', import.meta.url)));
  const r = data.abdominalSharedLevels;
  assert.equal(r.status, 'provisional-shared-levels');
  for (const [id, ref] of Object.entries(r.references)) {
    assert.deepEqual(r.referencePositions[ref], pointById[ref].position);
    assert.deepEqual(data.points[id].sharedLevelRefs, [ref]);
    assert.ok(Math.abs(pointById[id].position[1] - pointById[ref].position[1]) < 1e-9);
    assert.match(pointById[id].modelPlacement, /仍待解剖核对/);
  }
  assert.ok(Math.abs(pointById.GB26.position[0]) < .2, 'GB26 must not project onto a forearm');
  const dai = channels.find((c) => c.id === 'DAI');
  for (const id of ['GB26', 'GB27']) for (const side of [1, -1]) {
    const expected = pointById[id].position.map((v, k) => k ? v : v * side);
    const old = r.previousPositions[id].map((v, k) => k ? v : v * side);
    assert.ok(dai.routes[side === 1 ? 0 : 1].some((p) => p.every((v, k) => v === expected[k])), `${id}/${side}`);
    assert.ok(!dai.routes.flat().some((p) => p.every((v, k) => v === old[k])), `old ${id}/${side}`);
  }
  assert.deepEqual(dai.routes[2][0], dai.routes[2].at(-1));
  assert.ok(dai.routes[2].every((p) => Math.abs(p[1] - pointById.CV8.position[1]) < 1e-9));
  for (const { ch, path, ids } of [{ ch: 'gb', path: 'trunk', ids: ['GB26', 'GB27'] }, { ch: 'lr', path: 'stem', ids: ['LR12'] }, { ch: 'lr', path: 'liver', ids: ['LR12'] }]) {
    const c = JSON.parse(readFileSync(new URL(`../lib/${ch}-course.json`, import.meta.url)));
    for (const id of ids) assert.ok(c.paths[path].points.some((p) => p.every((v, k) => v === pointById[id].position[k])), `${ch}/${path}/${id}`);
  }
});

test('rendered rebuilt waist ring remains near and outside the torso skin', async () => {
  const THREE = await import('three');
  const glb = readFileSync(new URL('../public/models/human-learning.glb', import.meta.url));
  const length = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + length).toString());
  const base = 28 + length, vo = base + doc.bufferViews[0].byteOffset, io = base + doc.bufferViews[2].byteOffset;
  const vertex = (i) => new THREE.Vector3(...[0, 1, 2].map((k) => glb.readFloatLE(vo + (i * 3 + k) * 4)));
  const height = pointById.GB26.position[1], faces = [];
  for (let i = 0; i < doc.accessors[2].count; i += 3) {
    const triangle = new THREE.Triangle(...[0, 1, 2].map((k) => vertex(glb.readUInt32LE(io + (i + k) * 4))));
    const box = new THREE.Box3().setFromPoints([triangle.a, triangle.b, triangle.c]);
    if (box.min.y < height + .02 && box.max.y > height - .02 && box.min.x > -.2 && box.max.x < .2) faces.push({ triangle, box });
  }
  const points = channels.find((c) => c.id === 'DAI').routes[2];
  const curve = new THREE.CatmullRomCurve3(points.slice(0, -1).map((p) => new THREE.Vector3(...p)), true, 'centripetal');
  for (let i = 0; i <= 440; i++) {
    const sample = curve.getPoint(i / 440);let distance = Infinity, closest, normal;
    for (const { triangle, box } of faces) {
      if (box.distanceToPoint(sample) > Math.min(distance, .02)) continue;
      const point = triangle.closestPointToPoint(sample, new THREE.Vector3());const d = point.distanceTo(sample);
      if (d < distance) { distance = d;closest = point;normal = triangle.getNormal(new THREE.Vector3()); }
    }
    assert.ok(distance < .008, `waist ring detached at ${i}: ${distance}`);
    assert.ok(sample.clone().sub(closest).dot(normal) > -.001, `waist ring crosses skin at ${i}`);
  }
});

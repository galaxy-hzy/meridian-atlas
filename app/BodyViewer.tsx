'use client';
import { observeGraphicsContext } from '../lib/graphics-lifecycle';
import { createPickGesture } from '../lib/pick-gesture';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  extraPoints,
  canInspectPoint,
  type Point,
  type Vec3,
} from '@/lib/atlas';
import { studyChannels as channels } from '@/lib/luo';
import { getLuoStudy } from '@/lib/luo-data';
import {
  closestOnScreenSegment,
  screenPickOrder,
  screenPickChoices,
  type ScreenPick,
} from '@/lib/picking';
import {
  advanceFlowFrame,
  curveProgress,
  forkTimelines,
  sequentialTimelines,
  type FlowFrame,
  type FlowTimeline,
} from '@/lib/flow';
import { humanMesh } from '@/lib/human-mesh';
import { pointLabel } from '@/lib/point-labels';
import { lungCourse, lungCourseTimelines } from '@/lib/lung-course';
import {
  courseCatalog,
  hasRegionalCourse,
  courseHasInternalSegments,
} from '@/lib/course-catalog';

type Props = {
  selected: string | null;
  point: string | null;
  showAll: boolean;
  labels: boolean;
  flow: boolean;
  clockProgress?: number;
  view: string;
  onChannel: (id: string) => void;
  onPoint: (p: Point) => void;
  onPickStart: () => void;
  highlights?: string[];
  guides?: boolean;
  internalCourse?: boolean;
  extraScope?: string;
};
export default function BodyViewer(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  useLayoutEffect(() => {
    current.current = props;
  });
  const [error, setError] = useState('');
  const [graphicsLost, setGraphicsLost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState('');
  const [choices, setChoices] = useState<{
    x: number;
    y: number;
    items: {
      kind: 'point' | 'channel';
      id: string;
      name: string;
      point?: Point;
    }[];
  } | null>(null);
  const choicePanel = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (choices)
      choicePanel.current
        ?.querySelector<HTMLButtonElement>('.model-pick-list button')
        ?.focus({ preventScroll: true });
  }, [choices]);
  const api = useRef<
    | {
        update: () => void;
        view: (v: string) => void;
        closeChoices: () => void;
      }
    | undefined
  >(undefined);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    // Renderer creation must follow DOM mount; expose its failure as accessible fallback UI.
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // oxlint-disable-next-line react/react-compiler -- DOM renderer initialization failure requires fallback state.
      setError(
        '当前设备无法启动 WebGL。仍可通过左侧经络和穴位列表学习；请使用支持 WebGL 的浏览器查看三维模型。',
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      'aria-label',
      '三维人体经络模型，拖动旋转，滚轮缩放；也可使用周围按钮和穴位列表',
    );
    const scene = new THREE.Scene();
    scene.visible = false;
    let disposed = false;
    const modelRequest = new AbortController();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.01, 50);
    camera.position.set(0.15, 1.08, 3.75);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.97, 0);
    controls.enableDamping = true;
    controls.minDistance = 1.05;
    controls.maxDistance = 8;
    let fittedDistance = 3.75;
    controls.maxPolarAngle = Math.PI * 0.94;
    const hemi = new THREE.HemisphereLight('#d7f2ff', '#244251', 2.5);
    scene.add(hemi);
    const light = new THREE.DirectionalLight('#e0f1ff', 3.5);
    light.position.set(-2, 3, 4);
    scene.add(light);
    const rim = new THREE.DirectionalLight('#4bafc6', 2);
    rim.position.set(2, 2, -3);
    scene.add(rim);
    const skin = new THREE.MeshPhysicalMaterial({
      color: '#8aafb9',
      roughness: 0.72,
      metalness: 0.04,
      transparent: true,
      opacity: 0.96,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    const body = new THREE.Group();
    scene.add(body);
    // Point attachments and this asset are paired by SHA-256. A stale or
    // missing mesh must never leave plausible points floating over another body.
    const disposeModel = (root: THREE.Object3D) => {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
      });
    };
    void (async () => {
      try {
        const response = await fetch(
          `${humanMesh.assetUrl}?v=${humanMesh.assetSha256.slice(0, 12)}`,
          { signal: modelRequest.signal },
        );
        if (!response.ok) throw new Error('Model asset request failed');
        const bytes = await response.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const hash = Array.from(new Uint8Array(digest), (n) =>
          n.toString(16).padStart(2, '0'),
        ).join('');
        if (hash !== humanMesh.assetSha256)
          throw new Error('Model version mismatch');
        const gltf = await new GLTFLoader().parseAsync(bytes, '');
        if (disposed) {
          disposeModel(gltf.scene);
          return;
        }
        gltf.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              m.dispose();
            o.material = skin;
          }
        });
        body.add(gltf.scene);
        scene.visible = true;
        setLoading(false);
      } catch {
        if (!disposed) {
          setError(
            '人体模型未能载入。请刷新重试；经络目录与穴位资料仍可使用。',
          );
          setLoading(false);
        }
      }
    })();
    const guides = new THREE.Group();
    guides.visible = false;
    const guideMaterial = new THREE.LineBasicMaterial({
      color: '#d4d0ae',
      transparent: true,
      opacity: 0.3,
      depthTest: true,
    });
    for (const line of humanMesh.guides) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        line.map((p) => new THREE.Vector3(...p)),
      );
      guides.add(new THREE.Line(geometry, guideMaterial));
    }
    scene.add(guides);
    const floor = new THREE.Mesh(
      new THREE.RingGeometry(0.37, 0.375, 100),
      new THREE.MeshBasicMaterial({
        color: '#36606b',
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.008;
    scene.add(floor);
    const pathObjects: {
      mesh: THREE.Mesh;
      id: string;
      glow?: boolean;
      courseOnly?: boolean;
      hideInCourse?: boolean;
    }[] = [];
    const dots: { mesh: THREE.Mesh; p: Point }[] = [];
    const particles: {
      mesh: THREE.Mesh;
      curve: THREE.CatmullRomCurve3;
      id: string;
      offset: number;
      timeline: FlowTimeline;
      courseTimeline?: FlowTimeline;
      courseOnly?: boolean;
      surfaceOnly?: boolean;
    }[] = [];
    const pickPaths: { mesh: THREE.Mesh; samples: THREE.Vector3[] }[] = [];
    const labels: {
      sprite: THREE.Sprite;
      id: string;
      channel: string;
      enabled: boolean;
      width: number;
      aspect: number;
      courseOnly?: boolean;
    }[] = [];
    const labelTextures: THREE.Texture[] = [];
    function addLabel(
      p: Pick<Point, 'id' | 'name' | 'channel'> & { roles?: string[] },
      pos: Vec3,
      courseOnly = false,
    ) {
      const canvas = document.createElement('canvas');
      canvas.height = 80;
      const ctx = canvas.getContext('2d')!;
      const text = pointLabel(p.name, p.roles || []);
      ctx.font = '500 30px sans-serif';
      canvas.width = Math.ceil(ctx.measureText(text).width) + 24;
      ctx.fillStyle = '#e6f6fa';
      ctx.font = '500 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#13232c';
      ctx.lineWidth = 4;
      ctx.strokeText(text, canvas.width / 2, 43);
      ctx.fillText(text, canvas.width / 2, 43);
      const texture = new THREE.CanvasTexture(canvas);
      labelTextures.push(texture);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
          transparent: true,
        }),
      );
      sprite.position.set(
        pos[0] + (pos[0] < 0 ? -0.12 : 0.12),
        pos[1] + 0.018,
        pos[2] + 0.024,
      );
      sprite.scale.set(0.14, 0.044, 1);
      scene.add(sprite);
      sprite.renderOrder = 5;
      labels.push({
        sprite,
        id: p.id,
        channel: p.channel,
        enabled: false,
        width: canvas.width * 0.4,
        aspect: canvas.width / canvas.height,
        courseOnly,
      });
    }
    const dotGeometry = new THREE.SphereGeometry(0.007, 10, 8);
    for (const c of channels) {
      for (const side of ['CV', 'GV', 'DAI'].includes(c.id) ? [1] : [1, -1]) {
        const routes = c.routes || [c.route];
        const curves = routes.map((route, index) => {
          const closed = !!c.routePresentation?.paths[index]?.closed;
          const nodes = closed ? route.slice(0, -1) : route;
          const curve = new THREE.CatmullRomCurve3(
            nodes.map((p) => new THREE.Vector3(p[0] * side, p[1], p[2])),
            closed,
            'centripetal',
          );
          if (c.routePresentation)
            curve.arcLengthDivisions = Math.max(2000, route.length * 10);
          return curve;
        });
        let timelines: FlowTimeline[] = curves.map(() => [
          [0, 0],
          [1, 1],
        ]);
        if (c.routePresentation?.sequential)
          timelines = sequentialTimelines(
            curves.map((curve) => curve.getLength()),
          );
        if (c.id === 'BL' && curves.length === 2) {
          const fractionAt = (
            curve: THREE.CatmullRomCurve3,
            pointIndex: number,
          ) => {
            const pos = c.points[pointIndex].position;
            const target = new THREE.Vector3(pos[0] * side, pos[1], pos[2]);
            const samples = curve.getSpacedPoints(2000);
            let nearest = 0;
            for (let i = 1; i < samples.length; i++)
              if (
                samples[i].distanceToSquared(target) <
                samples[nearest].distanceToSquared(target)
              )
                nearest = i;
            return nearest / 2000;
          };
          timelines = forkTimelines(
            curves[0].getLength(),
            fractionAt(curves[0], 9),
            curves[1].getLength(),
            fractionAt(curves[1], 39),
          );
        }
        const study = courseCatalog[c.id];
        if (study && study.assetSha256 === humanMesh.assetSha256) {
          const keys = Object.keys(study.paths);
          const courseCurves = Object.fromEntries(
            keys.map((key) => [
              key,
              new THREE.CatmullRomCurve3(
                study.paths[key].points.map(
                  (p) => new THREE.Vector3(p[0] * side, p[1], p[2]),
                ),
                false,
                'centripetal',
              ),
            ]),
          ) as Record<string, THREE.CatmullRomCurve3>;
          const timing = study.timelines(
            Object.fromEntries(
              keys.map((key) => [key, courseCurves[key].getLength()]),
            ) as Record<string, number>,
          );
          for (const key of keys) {
            const curve = courseCurves[key];
            const geometry = new THREE.TubeGeometry(
              curve,
              500,
              0.0027,
              6,
              false,
            );
            if (study.paths[key].kind !== 'surface') {
              const indices = Array.from(geometry.index!.array);
              const length = curve.getLength();
              geometry.setIndex(
                indices.filter(
                  (_, i) => ((Math.floor(i / 36) / 500) * length) % 0.03 < 0.02,
                ),
              );
            }
            const mesh = new THREE.Mesh(
              geometry,
              new THREE.MeshBasicMaterial({
                color: c.color,
                depthTest: false,
                depthWrite: false,
                transparent: true,
              }),
            );
            mesh.userData = { channel: c.id };
            scene.add(mesh);
            pathObjects.push({ mesh, id: c.id, courseOnly: true });
            pickPaths.push({ mesh, samples: curve.getSpacedPoints(500) });
            for (let k = 0; k < 3; k++) {
              const dot = new THREE.Mesh(
                new THREE.SphereGeometry(0.008, 10, 8),
                new THREE.MeshBasicMaterial({
                  color: '#f2ffff',
                  transparent: true,
                  depthTest: false,
                  depthWrite: false,
                }),
              );
              dot.renderOrder = 4;
              scene.add(dot);
              particles.push({
                mesh: dot,
                curve,
                id: c.id,
                offset: k * 0.025,
                timeline: timing[key],
                courseOnly: true,
              });
            }
          }
          if (side === 1)
            for (const node of study.nodes)
              addLabel(
                {
                  id: `course:${c.id}:${node.label}`,
                  name: node.label,
                  channel: c.id,
                },
                node.position,
                true,
              );
        }
        let courseTiming: ReturnType<typeof lungCourseTimelines> | undefined;
        if (c.id === 'LU' && lungCourse.assetSha256 === humanMesh.assetSha256) {
          const curveFrom = (nodes: Vec3[]) =>
            new THREE.CatmullRomCurve3(
              nodes.map((p) => new THREE.Vector3(p[0] * side, p[1], p[2])),
              false,
              'centripetal',
            );
          const internal = curveFrom(lungCourse.internal);
          const branch = curveFrom(lungCourse.branch);
          const wrist = c.points.find(
            (p) => p.id === lungCourse.branchStart,
          )!.position;
          const target = new THREE.Vector3(wrist[0] * side, wrist[1], wrist[2]);
          const samples = curves[0].getSpacedPoints(4000);
          let nearest = 0;
          for (let i = 1; i < samples.length; i++)
            if (
              samples[i].distanceToSquared(target) <
              samples[nearest].distanceToSquared(target)
            )
              nearest = i;
          courseTiming = lungCourseTimelines(
            internal.getLength(),
            curves[0].getLength(),
            nearest / 4000,
            branch.getLength(),
          );
          for (const [kind, curve] of [
            ['internal', internal],
            ['branch', branch],
          ] as const) {
            const geometry = new THREE.TubeGeometry(
              curve,
              400,
              0.0027,
              6,
              false,
            );
            if (kind === 'internal') {
              const indices = Array.from(geometry.index!.array);
              const length = curve.getLength();
              geometry.setIndex(
                indices.filter(
                  (_, i) => ((Math.floor(i / 36) / 400) * length) % 0.03 < 0.02,
                ),
              );
            }
            const mesh = new THREE.Mesh(
              geometry,
              new THREE.MeshBasicMaterial({
                color: c.color,
                depthTest: false,
                depthWrite: false,
                transparent: true,
              }),
            );
            mesh.userData = { channel: c.id };
            scene.add(mesh);
            pathObjects.push({ mesh, id: c.id, courseOnly: true });
            pickPaths.push({ mesh, samples: curve.getSpacedPoints(400) });
            for (let k = 0; k < 3; k++) {
              const dot = new THREE.Mesh(
                new THREE.SphereGeometry(0.008, 10, 8),
                new THREE.MeshBasicMaterial({
                  color: '#f2ffff',
                  transparent: true,
                  depthWrite: false,
                  depthTest: false,
                }),
              );
              dot.renderOrder = 4;
              scene.add(dot);
              particles.push({
                mesh: dot,
                curve,
                id: c.id,
                offset: k * 0.025,
                timeline: courseTiming[kind],
                courseOnly: true,
              });
            }
          }
          if (side === 1)
            for (const node of lungCourse.nodes.filter((n) =>
              ['中焦', '络大肠', '属肺', '肺系'].includes(n.label),
            ))
              addLabel(
                { id: `course:${node.label}`, name: node.label, channel: c.id },
                node.position,
                true,
              );
        }
        for (const [routeIndex, route] of routes.entries()) {
          const curve = curves[routeIndex];
          const presentation = c.routePresentation?.paths[routeIndex];
          for (const glow of [false, true]) {
            const segments = Math.max(80, route.length * 5);
            const geometry = new THREE.TubeGeometry(
              curve,
              segments,
              glow ? 0.009 : 0.0025,
              6,
              !!presentation?.closed,
            );
            if (presentation && presentation.kind !== 'surface') {
              // Break both core and halo at the same distance intervals so
              // projected/internal or ring regions remain visibly dashed.
              const indices = Array.from(geometry.index!.array);
              const length = curve.getLength();
              geometry.setIndex(
                indices.filter(
                  (_, i) =>
                    ((Math.floor(i / 36) / segments) * length) % 0.028 < 0.018,
                ),
              );
            }
            const mesh = new THREE.Mesh(
              geometry,
              new THREE.MeshBasicMaterial({
                color: c.color,
                transparent: true,
                opacity: glow ? 0.1 : 0.8,
                depthWrite: false,
              }),
            );
            mesh.userData = { channel: c.id };
            scene.add(mesh);
            pathObjects.push({
              mesh,
              id: c.id,
              glow,
              hideInCourse: !!study,
            });
            if (glow)
              pickPaths.push({
                mesh,
                samples: curve.getSpacedPoints(Math.max(80, route.length * 5)),
              });
          }
          if (presentation?.animate === false) continue;
          for (let k = 0; k < 3; k++) {
            const mesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.008, 10, 8),
              new THREE.MeshBasicMaterial({
                color: '#f2ffff',
                // Join the transparent pass so renderOrder places this above
                // the translucent skin as well as the meridian strokes.
                transparent: true,
                depthWrite: false,
                depthTest: false,
              }),
            );
            scene.add(mesh);
            mesh.renderOrder = 4;
            particles.push({
              mesh,
              curve,
              id: c.id,
              offset: k * 0.025,
              timeline: timelines[routeIndex],
              courseTimeline: courseTiming?.surface,
              surfaceOnly: !!study,
            });
          }
        }
        // Shared points of extraordinary vessels are rendered once at their real meridian anchors.
        if (c.id.length <= 2)
          for (const p of c.points) {
            const pos: [number, number, number] = [
              p.position[0] * side,
              p.position[1],
              p.position[2],
            ];
            const mesh = new THREE.Mesh(
              dotGeometry,
              new THREE.MeshBasicMaterial({
                color: c.color,
                transparent: true,
              }),
            );
            mesh.position.set(...pos);
            mesh.userData = { point: p };
            scene.add(mesh);
            dots.push({ mesh, p });
            if (side === 1) addLabel(p, pos);
          }
      }
    }
    for (const p of extraPoints) {
      for (const pos of p.positions || [p.position])
        for (const s of p.bilateral === false || pos[0] === 0 ? [1] : [1, -1]) {
          const mesh = new THREE.Mesh(
            dotGeometry,
            new THREE.MeshBasicMaterial({
              color: '#fbdf85',
              transparent: true,
            }),
          );
          mesh.position.set(pos[0] * s, pos[1], pos[2]);
          mesh.userData = { point: p };
          scene.add(mesh);
          dots.push({ mesh, p });
        }
      addLabel(p, p.position);
    }
    function update() {
      const p = current.current;
      guides.visible = !!p.guides;
      const courseActive = !!p.internalCourse && hasRegionalCourse(p.selected);
      const revealInterior =
        courseActive && courseHasInternalSegments(p.selected);
      skin.opacity = revealInterior ? 0.22 : 0.96;
      skin.depthWrite = !revealInterior;
      for (const o of pathObjects) {
        const active = o.id === p.selected,
          compared = !!p.highlights?.some((id) => id.startsWith(o.id));
        o.mesh.visible = getLuoStudy(o.id)
          ? active || (!!getLuoStudy(p.selected) && p.showAll)
          : o.courseOnly
            ? courseActive && active
            : !(o.hideInCourse && courseActive && active) &&
              (p.showAll || active || compared);
        const mat = o.mesh.material as THREE.MeshBasicMaterial;
        mat.depthTest = !(active || compared);
        o.mesh.renderOrder = active || compared ? 2 : 0;
        mat.opacity = o.glow
          ? active
            ? 0.16
            : compared
              ? 0.09
              : 0.015
          : active
            ? 1
            : compared
              ? 0.75
              : 0.14;
      }
      const excludedExtras = new Set(
        extraPoints
          .filter(
            (point) =>
              p.selected === 'EX' &&
              p.extraScope &&
              p.extraScope !== 'all' &&
              point.catalog !== p.extraScope,
          )
          .map((point) => point.id),
      );
      for (const d of dots) {
        const active = canInspectPoint(p.selected, d.p),
          marked = d.p.id === p.point || p.highlights?.includes(d.p.id);
        d.mesh.visible =
          (p.showAll || active || !!marked) &&
          (!excludedExtras.has(d.p.id) || !!marked);
        (d.mesh.material as THREE.MeshBasicMaterial).opacity =
          marked || active ? 1 : 0.37;
        d.mesh.scale.setScalar(marked ? 2.1 : active ? 1.15 : 1);
        (d.mesh.material as THREE.MeshBasicMaterial).depthTest = !(
          active || marked
        );
        d.mesh.renderOrder = active || marked ? 3 : 0;
      }
      const selectedChannel = channels.find((c) => c.id === p.selected);
      const selectedIds = new Set([
        ...(selectedChannel?.points.map((point) => point.id) || []),
        ...(selectedChannel?.confluentPointIds || []),
      ]);
      for (const l of labels)
        l.enabled =
          p.labels &&
          (!l.courseOnly || courseActive) &&
          !excludedExtras.has(l.id) &&
          (l.id === p.point ||
            l.channel === p.selected ||
            selectedIds.has(l.id) ||
            !!p.highlights?.includes(l.id));
    }
    function view(v: string) {
      setChoices(null);
      const [side, serial] = v.split(':');
      void serial;
      const views: Record<string, Vec3> = {
        front: [0, 1.02, fittedDistance],
        back: [0, 1.02, -fittedDistance],
        left: [fittedDistance, 1.02, 0],
        right: [-fittedDistance, 1.02, 0],
      };
      if (views[side]) {
        controls.minDistance = 1.05;
        camera.position.set(...views[side]);
        controls.target.set(0, 0.97, 0);
      }
      if (side === 'face') {
        controls.minDistance = 0.35;
        controls.target.set(0, 1.62, 0.12);
        camera.position.set(0, 1.62, 0.97);
      }
      if (
        side.startsWith('point-') ||
        side.startsWith('sole-') ||
        side.startsWith('dorsum-') ||
        side.startsWith('lateral-')
      ) {
        const binding = humanMesh.points[side.slice(side.indexOf('-') + 1)];
        if (binding) {
          const [x, y, z] = binding.position;
          controls.minDistance = 0.16;
          controls.target.set(x, y - 0.025, z);
          if (side.startsWith('sole-')) {
            controls.target.set(x, y, z - 0.015);
            camera.position.set(x, y - 0.36, z + 0.24);
          } else if (side.startsWith('dorsum-')) {
            controls.target.set(x, y, z);
            camera.position.set(x, y + 0.36, z + 0.24);
          } else if (side.startsWith('lateral-')) {
            camera.position.set(x + 0.42, y + 0.06, z - 0.12);
          } else camera.position.set(x, y - 0.025, z + 0.45);
        }
      }
      if (side === 'in')
        camera.position
          .sub(controls.target)
          .multiplyScalar(0.82)
          .add(controls.target);
      if (side === 'out')
        camera.position
          .sub(controls.target)
          .multiplyScalar(1.2)
          .add(controls.target);
      controls.update();
    }
    api.current = { update, view, closeChoices: () => setChoices(null) };
    update();
    const resize = () => {
      setChoices(null);
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      // Reserve space beside the hands for the view controls on narrow screens.
      const usableAspect =
        Math.max(width - 112, width * 0.5) / Math.max(height, 1);
      const nextDistance = Math.max(
        3.75,
        1.55 / (2 * Math.tan((camera.fov * Math.PI) / 360) * usableAspect),
      );
      camera.position
        .sub(controls.target)
        .multiplyScalar(nextDistance / fittedDistance)
        .add(controls.target);
      fittedDistance = nextDistance;
      controls.maxDistance = Math.max(8, fittedDistance * 1.5);
      camera.updateProjectionMatrix();
      controls.update();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const ray = new THREE.Raycaster();
    const gesture = createPickGesture();
    const projected = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const hit = (e: PointerEvent, collectAll = false) => {
      if (!scene.visible) return [];
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return [];
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      const touch = e.pointerType === 'touch';
      const lineRadius = touch ? 10 : 5;
      camera.updateMatrixWorld();
      const candidates: (ScreenPick & {
        key: string;
        object: THREE.Mesh;
        world: THREE.Vector3;
      })[] = [];
      const project = (world: THREE.Vector3) => {
        projected.copy(world).project(camera);
        return {
          x: ((projected.x + 1) * rect.width) / 2,
          y: ((1 - projected.y) * rect.height) / 2,
          z: projected.z,
        };
      };
      for (const { mesh } of dots) {
        if (!mesh.visible) continue;
        const screen = project(mesh.position);
        if (screen.z < -1 || screen.z > 1) continue;
        const depth = -mesh.position
          .clone()
          .applyMatrix4(camera.matrixWorldInverse).z;
        const visibleRadius =
          (0.007 * mesh.scale.x * rect.height) /
          (2 * Math.tan((camera.fov * Math.PI) / 360) * Math.max(depth, 0.01));
        const pointCore = Math.max(touch ? 4 : 2.5, visibleRadius);
        const radius = Math.max(touch ? 10 : 5, pointCore);
        const pixels = Math.hypot(screen.x - x, screen.y - y);
        if (pixels <= radius)
          candidates.push({
            key: `point:${mesh.userData.point.id}`,
            object: mesh,
            world: mesh.position,
            distance: camera.position.distanceTo(mesh.position),
            pixels,
            radius,
            pointCore,
          });
      }
      for (const { mesh, samples } of pickPaths) {
        if (!mesh.visible) continue;
        let previous = project(samples[0]);
        for (let i = 1; i < samples.length; i++) {
          const next = project(samples[i]);
          if (
            previous.z >= -1 &&
            previous.z <= 1 &&
            next.z >= -1 &&
            next.z <= 1
          ) {
            const nearest = closestOnScreenSegment(
              x,
              y,
              previous.x,
              previous.y,
              next.x,
              next.y,
            );
            if (nearest.distance <= lineRadius) {
              // Perspective-correct interpolation gives the surface position used
              // for occlusion, including after the user rotates or zooms the body.
              const a = samples[i - 1],
                b = samples[i];
              const za = -a.clone().applyMatrix4(camera.matrixWorldInverse).z;
              const zb = -b.clone().applyMatrix4(camera.matrixWorldInverse).z;
              const weight =
                (nearest.t * za) / ((1 - nearest.t) * zb + nearest.t * za);
              const world = a.clone().lerp(b, weight);
              candidates.push({
                key: `channel:${mesh.userData.channel}`,
                object: mesh,
                world,
                distance: camera.position.distanceTo(world),
                pixels: nearest.distance,
                radius: lineRadius,
              });
            }
          }
          previous = next;
        }
      }
      const visible: typeof candidates = [];
      const seen = new Set<string>();
      for (const index of screenPickOrder(candidates)) {
        const candidate = candidates[index];
        if (seen.has(candidate.key)) continue;
        if ((candidate.object.material as THREE.MeshBasicMaterial).depthTest) {
          direction.copy(candidate.world).sub(camera.position).normalize();
          ray.set(camera.position, direction);
          const surface = ray.intersectObject(body, true)[0];
          // Small tolerance includes markers attached just beneath the smoothed
          // skin; distant hidden back-side points must not steal a visible click.
          if (surface && surface.distance + 0.012 < candidate.distance)
            continue;
        }
        visible.push(candidate);
        seen.add(candidate.key);
        if (!collectAll) break;
      }
      return visible;
    };
    const down = (e: PointerEvent) => {
      gesture.down(e);
      if (!e.isPrimary || e.button !== 0) return;
      setChoices(null);
      setHover('');
    };
    const up = (e: PointerEvent) => {
      if (!gesture.up(e)) return;
      const hits = hit(e, true);
      const options = screenPickChoices(hits).map((index) => hits[index]);
      if (!options.length) return;
      current.current.onPickStart();
      if (options.length === 1) {
        const d = options[0].object.userData;
        if (d.point) current.current.onPoint(d.point);
        else current.current.onChannel(d.channel);
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      setHover('');
      setChoices({
        x: Math.max(
          12,
          Math.min(e.clientX - rect.left - 110, rect.width - 244),
        ),
        y: Math.max(12, Math.min(e.clientY - rect.top + 12, rect.height - 260)),
        items: options.map(({ object }) => {
          const d = object.userData;
          return d.point
            ? {
                kind: 'point' as const,
                id: d.point.id,
                name: d.point.name,
                point: d.point,
              }
            : {
                kind: 'channel' as const,
                id: d.channel,
                name: channels.find((c) => c.id === d.channel)!.name,
              };
        }),
      });
    };
    const move = (e: PointerEvent) => {
      gesture.move(e);
      if (gesture.active || e.pointerType === 'touch') return;
      const h = hit(e)[0];
      renderer.domElement.style.cursor = h ? 'pointer' : 'grab';
      setHover(
        h
          ? h.object.userData.point?.name ||
              channels.find((c) => c.id === h.object.userData.channel)?.name ||
              ''
          : '',
      );
    };
    const leave = () => setHover('');
    const cancel = () => {
      gesture.cancel();
      setHover('');
      setChoices(null);
    };
    const stopObservingGraphics = observeGraphicsContext(
      renderer.domElement,
      () => {
        cancel();
        controls.enabled = false;
        setGraphicsLost(true);
      },
      () => {
        controls.enabled = true;
        setGraphicsLost(false);
      },
    );
    const dismissChoices = () => setChoices(null);
    const outsideChoices = (e: PointerEvent) => {
      if (e.target instanceof Node && !choicePanel.current?.contains(e.target))
        setChoices(null);
    };
    controls.addEventListener('start', dismissChoices);
    document.addEventListener('pointerdown', outsideChoices);
    renderer.domElement.addEventListener('pointerleave', leave);
    renderer.domElement.addEventListener('pointercancel', cancel);
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointermove', move);
    let frame = 0;
    let flowFrame: FlowFrame = {
      channel: null,
      elapsed: 0,
      at: performance.now(),
      running: false,
      started: false,
    };
    function render() {
      frame = requestAnimationFrame(render);
      controls.update();
      camera.updateMatrixWorld();
      const { width, height } = renderer.domElement.getBoundingClientRect();
      const occupied: { x: number; y: number; width: number }[] = [];
      const priority = (id: string) =>
        id === current.current.point
          ? 2
          : current.current.highlights?.includes(id)
            ? 1
            : 0;
      const ordered = [...labels].sort(
        (a, b) => priority(b.id) - priority(a.id),
      );
      for (const l of ordered) {
        l.sprite.visible = false;
        if (!l.enabled) continue;
        const depth = -l.sprite.position
          .clone()
          .applyMatrix4(camera.matrixWorldInverse).z;
        const projected = l.sprite.position.clone().project(camera);
        if (depth <= 0 || projected.z < -1 || projected.z > 1) continue;
        const box = {
          x: ((projected.x + 1) * width) / 2,
          y: ((1 - projected.y) * height) / 2,
          width: l.width,
        };
        if (
          box.x < l.width / 2 ||
          box.x > width - l.width / 2 ||
          box.y < 16 ||
          box.y > height - 16
        )
          continue;
        if (
          occupied.some(
            (other) =>
              Math.abs(box.x - other.x) < (box.width + other.width) / 2 + 5 &&
              Math.abs(box.y - other.y) < 19,
          )
        )
          continue;
        occupied.push(box);
        const h =
          (32 * 2 * Math.tan((camera.fov * Math.PI) / 360) * depth) /
          Math.max(height, 1);
        l.sprite.scale.set(h * l.aspect, h, 1);
        l.sprite.visible = true;
      }
      const active = current.current;
      flowFrame = advanceFlowFrame(
        flowFrame,
        active.clockProgress === undefined
          ? active.selected &&
              `${active.selected}:${active.internalCourse && hasRegionalCourse(active.selected) ? 'course' : 'surface'}`
          : null,
        active.clockProgress === undefined && active.flow,
        performance.now(),
      );
      const phase = active.clockProgress ?? (flowFrame.elapsed % 7000) / 7000;
      for (const p of particles) {
        const courseActive =
          !!active.internalCourse && hasRegionalCourse(active.selected);
        const position = curveProgress(
          phase - p.offset,
          courseActive && p.courseTimeline ? p.courseTimeline : p.timeline,
        );
        p.mesh.visible =
          (active.clockProgress !== undefined || flowFrame.started) &&
          p.id === active.selected &&
          (!p.courseOnly || courseActive) &&
          (!p.surfaceOnly || !courseActive) &&
          position !== null;
        if (p.mesh.visible) p.mesh.position.copy(p.curve.getPointAt(position!));
      }
      renderer.render(scene, camera);
    }
    render();
    return () => {
      disposed = true;
      modelRequest.abort();
      skin.dispose();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('start', dismissChoices);
      stopObservingGraphics();
      controls.dispose();
      document.removeEventListener('pointerdown', outsideChoices);
      renderer.domElement.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('pointercancel', cancel);
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointermove', move);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
        if (o instanceof THREE.Sprite) o.material.dispose();
      });
      labelTextures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      api.current = undefined;
    };
  }, []);
  useEffect(() => {
    api.current?.update();
  }, [
    props.selected,
    props.point,
    props.showAll,
    props.labels,
    props.guides,
    props.internalCourse,
    props.highlights,
    props.extraScope,
  ]);
  useEffect(() => {
    api.current?.view(props.view);
  }, [props.view]);
  useEffect(() => {
    api.current?.closeChoices();
  }, [
    props.selected,
    props.point,
    props.showAll,
    props.extraScope,
    props.internalCourse,
  ]);
  return (
    <div className="body-host" ref={host}>
      {graphicsLost && (
        <div className="webgl-error" role="alert">
          三维绘图暂时中断，正在等待浏览器恢复。仍可使用经络与穴位列表；若一直未恢复，请刷新页面。
        </div>
      )}
      {loading && !error && !graphicsLost && (
        <output className="webgl-error">正在载入三维人体…</output>
      )}
      {error && (
        <div className="webgl-error" role="alert">
          {error}
        </div>
      )}
      {hover && !choices && <div className="model-tooltip">{hover}</div>}
      {choices && (
        <dialog
          open
          className="model-pick-choices"
          aria-label={
            choices.items[0].kind === 'channel'
              ? '选择此处的经络'
              : '选择此处的穴位'
          }
          ref={choicePanel}
          style={{ left: choices.x, top: choices.y }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setChoices(null);
              host.current
                ?.querySelector('canvas')
                ?.focus({ preventScroll: true });
            }
          }}
        >
          <div className="model-pick-heading">
            <span>
              {choices.items[0].kind === 'channel'
                ? '此处有多条经络'
                : '此处有多个穴位'}
            </span>
            <button
              aria-label="取消本次点选"
              onClick={() => {
                setChoices(null);
                host.current
                  ?.querySelector('canvas')
                  ?.focus({ preventScroll: true });
              }}
            >
              ×
            </button>
          </div>
          <div className="model-pick-list">
            {choices.items.map((item) => (
              <button
                key={`${item.kind}:${item.id}`}
                onClick={() => {
                  setChoices(null);
                  if (item.point) current.current.onPoint(item.point);
                  else current.current.onChannel(item.id);
                  host.current
                    ?.querySelector('canvas')
                    ?.focus({ preventScroll: true });
                }}
              >
                {item.name} <small>{item.id}</small>
              </button>
            ))}
          </div>
        </dialog>
      )}
    </div>
  );
}

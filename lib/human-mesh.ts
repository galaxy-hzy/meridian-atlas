import data from './mesh-registration.json';
import type { Channel, Point, Vec3, RoutePresentation } from './atlas';

export type SurfaceBinding = {
  face: number;
  barycentric: Vec3;
  offset: Vec3;
  position: Vec3;
  positions?: Vec3[];
  groupBindings?: SurfaceBinding[];
  method: string;
  regionRule?: string;
  proportionNote?: string;
  seedDistance: number;
};
export const humanMesh = data as unknown as {
  schemaVersion: number;
  assetUrl: string;
  assetSha256: string;
  sourceCommit: string;
  templateSha256: string;
  status: string;
  landmarks: Record<string, number>;
  intercostalY: number[];
  points: Record<string, SurfaceBinding>;
  routes: Record<string, Vec3[][]>;
  guides: Vec3[][];
  lowerLeg?: {
    specSha256: string;
    sourceSha256: string;
    source: string;
    kneeY: number;
    medialTipY: number;
    lateralTipY: number;
    medialUnit: number;
    lateralUnit: number;
    pointIds: string[];
    changedPrimaryRoutes: string[];
    note: string;
  };
  vesselRoutes?: {
    specSha256: string;
    channels: Record<string, RoutePresentation>;
  };
};

export function attachHumanMesh(
  points: Record<string, Point>,
  channels: Channel[],
) {
  for (const p of Object.values(points)) {
    const binding = humanMesh.points[p.id];
    if (!binding) throw new Error(`Missing human mesh attachment: ${p.id}`);
    p.templatePosition = p.position;
    p.templatePositions = p.positions;
    p.position = binding.position;
    p.positions = binding.positions;
    p.modelPlacement =
      (p.modelPlacement ? p.modelPlacement + ' ' : '') +
      '已绑定学习体位人体网格；体表吸附不代表解剖定位已经校准。' +
      (binding.proportionNote ? ' ' + binding.proportionNote : '');
  }
  for (const c of channels) {
    const routes = humanMesh.routes[c.id];
    if (!routes?.length) throw new Error(`Missing human mesh route: ${c.id}`);
    c.templateRoute = c.route;
    c.templateRoutes = c.routes;
    c.route = routes[0];
    c.routes = routes;
    c.routePresentation = humanMesh.vesselRoutes?.channels[c.id];
  }
}

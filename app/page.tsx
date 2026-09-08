import AtlasApp from './AtlasApp';
import { parseComparisonPoints } from '@/lib/atlas';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const raw = Array.isArray(query.points) ? query.points[0] : query.points;
  const initialPoints = parseComparisonPoints(raw || '');
  return (
    <AtlasApp
      key={initialPoints.join(',')}
      mode="atlas"
      initialPoints={initialPoints}
    />
  );
}

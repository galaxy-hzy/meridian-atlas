type SourcePoint = {
  id: string;
  indications?: string;
  indicationStudy?: { references: { url: string }[] };
  additionalIndicationStudies?: { references: { url: string }[] }[];
};

export function summarizeSourceCoverage(
  points: SourcePoint[],
  scanIds: string[],
) {
  const unique = new Map(points.map((point) => [point.id, point]));
  const scans = new Set(scanIds);
  let withText = 0,
    withReference = 0,
    withScan = 0;
  for (const point of unique.values()) {
    if (point.indications?.trim()) withText++;
    const studies = [
      point.indicationStudy,
      ...(point.additionalIndicationStudies ?? []),
    ];
    if (
      studies.some((study) => study?.references.some((ref) => ref.url.trim()))
    ) {
      withReference++;
      if (scans.has(point.id)) withScan++;
    }
  }
  return {
    total: unique.size,
    withText,
    withReference,
    withScan,
    otherReference: withReference - withScan,
    withoutReference: unique.size - withReference,
  };
}

import type { IndicationStudy } from './extra-indications';

type StudyPoint = {
  indicationStudy?: IndicationStudy;
  additionalIndicationStudies?: IndicationStudy[];
};

/** Keep independently attributed accounts separate, behind the existing detail gate. */
export function getIndicationStudies(
  point: StudyPoint | null,
  detailed: boolean,
): IndicationStudy[] {
  if (!point || !detailed) return [];
  return [
    point.indicationStudy,
    ...(point.additionalIndicationStudies ?? []),
  ].filter((study): study is IndicationStudy => !!study);
}

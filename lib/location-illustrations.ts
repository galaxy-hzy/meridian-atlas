/** Page references checked against the WHO 2009 reprint; GB/T remains primary. */
export const whoLocationIllustrationSource = {
  title: 'WHO 标准针灸穴位定位',
  edition: '2009 修订重印版',
  pdfPages: 258,
  sha256: 'c9d4095383c636f85e61b5bc5d7631a658308c0336e8f691b0eb29f517d5bf5b',
  officialUrl:
    'https://iris.who.int/bitstream/handle/10665/353407/9789290613831-eng.pdf',
  downloadUrl: 'https://medbox.org/dl/627a4de115110145a1723f64',
  catalogUrl:
    'https://medbox.org/document/who-standard-acupuncture-point-locations-in-the-western-pacific-region',
} as const;

const checkedPages: Record<
  string,
  { pdfPage: number; printedPage: number; note: string }
> = {
  LI17: {
    pdfPage: 51,
    printedPage: 42,
    note: '可对照天鼎与扶突、水突及胸锁乳突肌的位置关系。',
  },
  LI18: {
    pdfPage: 51,
    printedPage: 42,
    note: '可对照扶突与胸锁乳突肌前、后缘的位置关系。',
  },
  ST9: {
    pdfPage: 59,
    printedPage: 50,
    note: '图中同时标出人迎、扶突、天窗，可对照三穴的同层及前后关系。',
  },
  ST10: {
    pdfPage: 59,
    printedPage: 50,
    note: '可对照水突、环状软骨及胸锁乳突肌前缘的位置关系。',
  },
  SI16: {
    pdfPage: 104,
    printedPage: 95,
    note: '图中同时标出天窗、扶突、人迎，可对照肌肉后缘位置。',
  },
};

export function getLocationIllustration(
  pointId: string | undefined,
  detailed: boolean,
) {
  if (!detailed || !pointId || !Object.hasOwn(checkedPages, pointId))
    return null;
  const page = checkedPages[pointId];
  return {
    ...page,
    label: `WHO 定位图示 · 2009 版 · PDF 第 ${page.pdfPage} 页`,
    url: `${whoLocationIllustrationSource.downloadUrl}#page=${page.pdfPage}`,
  };
}

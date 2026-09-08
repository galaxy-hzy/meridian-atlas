'use client';
import primaryScans from '@/lib/primary-indication-scan.json';
import { summarizeSourceCoverage } from '@/lib/source-coverage';
import { searchPoints } from '@/lib/point-search';
import { getLocationIllustration } from '@/lib/location-illustrations';
import { getIndicationStudies } from '@/lib/indication-studies';
import { studyChannels as channels } from '@/lib/luo';
import { getLuoStudy, luoMemory, luoSource } from '@/lib/luo-data';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  Compass,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  Search,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import Combinations from './Combinations';
import Pronunciation from './Pronunciation';
import JingmaiPanel from './JingmaiPanel';
import yangqiaoSource from '@/lib/yangqiao-source.json';
import daimaiSource from '@/lib/daimai-source.json';
import {
  classicSongs,
  extraordinarySong,
  classicalReferences,
} from '@/lib/classics';
import { useAtlasTools } from '@/lib/useAtlasTools';
import BodyViewer from './BodyViewer';
import { advanceLearningHour, periodProgress } from '@/lib/flow';
import { lungCourse } from '@/lib/lung-course';
import {
  courseCatalog,
  hasRegionalCourse,
  courseHasInternalSegments,
} from '@/lib/course-catalog';
import {
  primaryChannels,
  extraPoints,
  pointById,
  channelAtHour,
  timeLabel,
  canInspectPoint,
  roleNames,
  mnemonic,
  sources,
  type Point,
} from '@/lib/atlas';

const sourceCoverage = summarizeSourceCoverage(
  Object.values(pointById),
  Object.keys(primaryScans.points),
);

type Mode = 'atlas' | 'clock' | 'combinations' | 'sources';
export default function AtlasApp({
  mode = 'atlas',
  initialPoints = [],
}: {
  mode?: Mode;
  initialPoints?: string[];
}) {
  const [manualSelected, setSelected] = useState<string | null>(
    initialPoints.length ? null : 'LU',
  );
  const [point, setPoint] = useState<Point | null>(null);
  const [query, setQuery] = useState('');
  const [pronunciationText, setPronunciationText] = useState<string | null>(
    null,
  );
  const openPronunciation = (text: string) => {
    setPlaying(false);
    setFlow(false);
    setReciting(false);
    setPronunciationText(text);
  };
  const [category, setCategory] = useState('primary');
  const [role, setRole] = useState('全部');
  const [extraScope, setExtraScope] = useState('all');
  const [showAll, setShowAll] = useState(!initialPoints.length),
    [labels, setLabels] = useState(true),
    [guides, setGuides] = useState(false),
    [internalCourse, setInternalCourse] = useState(false),
    [flow, setFlow] = useState(false),
    [hour, setHour] = useState(3),
    [playing, setPlaying] = useState(false),
    [view, setView] = useState('front:0');
  const [clockLinked, setClockLinked] = useState(mode === 'clock');
  const selected = clockLinked ? channelAtHour(hour).id : manualSelected;
  const clockProgress = clockLinked
    ? periodProgress(hour, channelAtHour(hour).hour!)!
    : undefined;
  const [compared, setCompared] = useState<string[]>(initialPoints);
  const [reciting, setReciting] = useState(false),
    [reciteIndex, setReciteIndex] = useState(0);
  const channel = channels.find((c) => c.id === selected);
  const luo = getLuoStudy(selected);
  const detailed = canInspectPoint(selected, point);
  const locationIllustration = getLocationIllustration(point?.id, detailed);
  const indicationStudies = getIndicationStudies(point, detailed);
  const courseData =
    selected === 'LU'
      ? {
          ...lungCourse,
          toggleLabel: '体内经过与腕后分支',
          focusLabel: '',
          summary:
            '中焦 → 络大肠 → 胃口 → 膈 → 属肺 → 肺系 → 出腋下；主段至拇指，腕后另分支至食指。',
        }
      : courseCatalog[selected || ''];
  const routeSource =
    selected === 'YANGQIAO'
      ? yangqiaoSource
      : selected === 'DAI'
        ? { ...daimaiSource, note: daimaiSource.scope }
        : null;
  const selectChannel = (id: string) => {
    setPlaying(false);
    setClockLinked(false);
    setSelected(id);
    setPoint(null);
    setRole('全部');
    setReciting(false);
    setReciteIndex(0);
    setFlow(false);
    if (getLuoStudy(id)) {
      setCategory('luo');
      setShowAll(false);
      setCompared([]);
      setInternalCourse(false);
    } else if (id !== 'EX') {
      setCategory(
        channels.find((c) => c.id === id)?.hour !== undefined
          ? 'primary'
          : 'extra',
      );
    }
  };
  const camera = (v: string) => setView(`${v}:${Date.now()}`);
  const moveHour = (h: number) => {
    setHour(h);
    selectChannel(channelAtHour(h).id);
    setClockLinked(true);
    setFlow(false);
  };
  const inspectPoint = (p: Point) => {
    setPoint(p);
    setPlaying(false);
    setFlow(false);
    setReciting(false);
  };
  useAtlasTools(
    { selected, point, hour },
    { selectChannel, setPoint: inspectPoint, moveHour },
    mode === 'atlas' || mode === 'clock',
  );
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () => setHour((h) => advanceLearningHour(h, 0.02)),
      40,
    );
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => {
    if (!reciting || !channel) return;
    const t = setInterval(
      () => setReciteIndex((i) => (i + 1) % channel.points.length),
      1300,
    );
    return () => clearInterval(t);
  }, [reciting, channel]);
  const globalPointMatches = useMemo(
    () => searchPoints(Object.values(pointById), query),
    [query],
  );
  const visiblePoints = useMemo(() => {
    const all =
      selected === 'EX'
        ? extraPoints
        : channel?.points ||
          (compared.length
            ? compared.map((id) => pointById[id])
            : Object.values(pointById));
    const q = query.toLowerCase().replace(/\s/g, '');
    return all.filter(
      (p) =>
        (selected !== 'EX' ||
          extraScope === 'all' ||
          p.catalog === extraScope) &&
        (role === '全部' || p.roles.includes(role)) &&
        (!q ||
          p.name.includes(q) ||
          p.aliases?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)),
    );
  }, [channel, query, role, selected, compared, extraScope]);
  const list = channels.filter(
    (c) =>
      (category === 'primary'
        ? c.hour !== undefined
        : c.polarity === (category === 'luo' ? '十五络脉' : '奇经八脉')) &&
      (!query ||
        c.name.includes(query) ||
        c.id.toLowerCase().includes(query.toLowerCase()) ||
        c.points.some(
          (p) =>
            p.name.includes(query) ||
            p.aliases?.toLowerCase().includes(query.toLowerCase()) ||
            p.id.toLowerCase().includes(query.toLowerCase().replace(/\s/g, '')),
        )),
  );
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Activity size={23} />
          </span>
          <span>
            经络图谱<small>MERIDIAN ATLAS</small>
          </span>
        </Link>
        <nav aria-label="主导航">
          {(
            [
              ['atlas', '/', '三维图谱', Layers3],
              ['clock', '/clock', '十二时辰', Clock3],
              ['combinations', '/combinations', '配穴研习', BookOpen],
            ] as const
          ).map(([id, url, label, Icon]) => (
            <Link
              key={id}
              href={url}
              aria-current={mode === id ? 'page' : undefined}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <button
            type="button"
            className="pronunciation-trigger"
            onClick={() =>
              openPronunciation(
                window.getSelection()?.toString().trim() || point?.name || '',
              )
            }
          >
            查读音
          </button>
          <a
            className="text-link"
            href="https://github.com/galaxy-hzy/meridian-atlas"
            target="_blank"
            rel="noreferrer"
          >
            源码 ↗
          </a>
          <Link href="/sources" className="edition">
            <span />
            研究预览版 <span className="edition-version">v0.1</span>
          </Link>
        </div>
      </header>
      {pronunciationText !== null && (
        <Pronunciation
          initialText={pronunciationText}
          onClose={() => setPronunciationText(null)}
        />
      )}
      {(mode === 'atlas' || mode === 'clock') && luo && (
        <section
          className="mnemonic-card workspace-mnemonic"
          aria-label="十五络记忆提要"
        >
          <div>
            <BookOpen size={17} />
            <strong>十五络穴 · 记忆提要</strong>
            <button type="button" onClick={() => openPronunciation(luoMemory)}>
              提要注音
            </button>
          </div>
          <p>{luoMemory}</p>
          <p className="variant-note">
            按当前目录编写，非古籍歌诀原文。十二经各一络，加任脉络、督脉络与脾之大络，共十五络。
          </p>
        </section>
      )}
      {(mode === 'atlas' || mode === 'clock') && channel && !luo && (
        <section
          className="mnemonic-card workspace-mnemonic"
          aria-label="经络歌诀"
        >
          <div>
            <BookOpen size={17} />
            <strong>{channel.name} · 《针灸大成》歌诀</strong>
            <button
              type="button"
              onClick={() => openPronunciation(mnemonic(channel))}
            >
              歌诀注音
            </button>
            <button
              aria-pressed={reciting}
              onClick={() => {
                setPoint(null);
                setPlaying(false);
                setFlow(false);
                setReciting(!reciting);
                setReciteIndex(0);
              }}
            >
              {reciting ? '停止' : '逐穴带读'}
            </button>
          </div>
          <p>{mnemonic(channel)}</p>
          <a
            className="text-link"
            href={(classicSongs[channel.id] || extraordinarySong).url}
            target="_blank"
            rel="noreferrer"
          >
            古籍原文 ↗
          </a>
          {(classicSongs[channel.id] || extraordinarySong).note && (
            <p className="variant-note">
              {(classicSongs[channel.id] || extraordinarySong).note}
            </p>
          )}
          {channel.vesselStudy && (
            <p className="variant-note">
              逐穴带读按下方相关穴目录顺序进行；奇经歌诀与沿线关联穴目录分别供记忆、查阅，目录不代表完整循行次序。
            </p>
          )}
          {reciting && (
            <output>
              {channel.points[reciteIndex]?.id} ·{' '}
              {channel.points[reciteIndex]?.name}
            </output>
          )}
        </section>
      )}
      {mode === 'sources' ? (
        <section className="document-page">
          <div className="eyebrow">REFERENCE & METHODOLOGY</div>
          <h1>每一层信息，都有边界。</h1>
          <p>
            这是用于学习传统经络理论的交互图谱。经络光流表示传统循行顺序，不能解释为人体血管中的血液流动。
          </p>
          <div className="source-grid">
            {[
              ...sources,
              ...classicalReferences,
              {
                label: luoSource.title,
                url: luoSource.url,
                scope: '十五络脉循行、络穴古今名称与经间联系。',
              },
            ].map((s) => (
              <a
                className="source-card"
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen />
                <h2>{s.label}</h2>
                <p>{s.scope}</p>
                <span>查看来源 ↗</span>
              </a>
            ))}
          </div>
          <h2>逐穴资料核对进度</h2>
          <p>
            当前共 {sourceCoverage.total} 个独立穴位条目，
            {sourceCoverage.withText} 条已有学习文字， 其中{' '}
            {sourceCoverage.withReference} 条附有逐穴独立参考资料。
          </p>
          <ul>
            <li>{sourceCoverage.withScan} 条已核对所附古籍扫描条文。</li>
            <li>
              {sourceCoverage.otherReference} 条附有其他逐穴文献或公开引文。
            </li>
            <li>
              {sourceCoverage.withoutReference}{' '}
              条尚未附独立逐穴出处，现有汇编摘要仍待核对。
            </li>
          </ul>
          <p className="micro-note">
            此处统计文献记录，包含乳中的定位说明；不等同于治疗主治数量、现代疗效证据或解剖定位校准进度。节选范围及古今差异见各穴详情。
          </p>
          <div className="source-grid">
            {Object.values(primaryScans.documents).map((document) => (
              <a
                className="source-card"
                key={document.url}
                href={document.url}
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen />
                <h2>{document.title}扫描本</h2>
                <p>逐穴出处链接会定位到对应 PDF 页；原文与学习摘要分列。</p>
                <span>查看扫描本 ↗</span>
              </a>
            ))}
          </div>
          <h2>当前模型与资料状态</h2>
          <p>
            默认目录采用 GB/T 12346-2021 的 362 个经穴，包含督脉印堂 GV24+；WHO
            361 穴体系中的印堂 EX-HN3 可用旧编号检索。362
            穴均已整理中文基本定位要点，并链接对应条款与原文页码；特殊体位和条文注释需查看原文。人体采用
            CC0
            通用网格，已调整学习体位并绑定穴位标记；骨度参考和体表吸附尚未经过全身逐穴解剖校准，不能用于临床定位。奇经除任督以外的六脉显示概念路线与八脉交会穴，不重复制造独立经穴。
          </p>
          <p>
            五输穴、原穴和络穴可同时归类。例如太渊既是输穴也是原穴。原络配穴与五输穴的应用不局限于内科疾病，需要结合辨证。
          </p>
          <p>
            十四经显示《针灸大成》原歌，另列现代标准穴序。肝经、督脉穴数和部分古歌顺序差异逐条标注。已录入
            51 个 GB/T 40997-2021 奇穴条目，另保留 6
            条补充资料。金津玉液合为一组，外膝眼归并犊鼻；未设英文代码的条目不编造国标编号。胃脘下俞以胰俞为别名，消渴穴列为教学检索称呼。
          </p>
        </section>
      ) : mode === 'combinations' ? (
        <Combinations
          onExplore={(ids) => {
            window.location.href =
              '/?points=' + encodeURIComponent(ids.join(','));
          }}
        />
      ) : (
        <>
          <div className="workspace">
            <aside className="left-panel">
              <div className="panel-heading">
                <span className="eyebrow">CHANNEL LIBRARY</span>
                <span className="count">20 经脉 · 15 络脉</span>
              </div>
              <h1>{mode === 'clock' ? '循时观脉' : '探索经络'}</h1>
              <p className="subtle">从一条经，认识全身的联系。</p>
              <label className="search">
                <Search size={17} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="查找经络、穴名或编码"
                  aria-label="查找经络、穴位"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="清空搜索">
                    <X size={15} />
                  </button>
                )}
              </label>
              {query.trim() && (
                <section aria-label="全身穴位搜索结果">
                  <div className="section-label" aria-live="polite">
                    全身穴位搜索结果 · {globalPointMatches.length} 个
                  </div>
                  <div className="channel-list">
                    {globalPointMatches.map((p) => (
                      <button
                        key={p.id}
                        className="channel-row"
                        onClick={() => inspectPoint(p)}
                      >
                        <span className="channel-row-text">
                          <b>{p.name}</b>
                          <small>
                            {p.displayCode || p.id} ·{' '}
                            {channels.find((c) => c.id === p.channel)?.name ||
                              '经外奇穴'}
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                    {!globalPointMatches.length && (
                      <p className="empty">
                        没有匹配的穴位，可尝试穴名、别名或编码。
                      </p>
                    )}
                  </div>
                </section>
              )}
              <Tabs
                value={category}
                onValueChange={(v) => setCategory(String(v))}
              >
                <TabsList className="library-tabs">
                  <TabsTrigger value="primary">十二正经</TabsTrigger>
                  <TabsTrigger value="extra">奇经八脉</TabsTrigger>
                  <TabsTrigger value="luo">十五络脉</TabsTrigger>
                </TabsList>
                <TabsContent value={category}>
                  <div className="channel-list">
                    {list.map((c) => (
                      <button
                        key={c.id}
                        className={`channel-row ${selected === c.id ? 'selected' : ''}`}
                        onClick={() => selectChannel(c.id)}
                        style={
                          { '--channel-color': c.color } as React.CSSProperties
                        }
                      >
                        <span className="channel-symbol">{c.short}</span>
                        <span className="channel-row-text">
                          <b>{c.name}</b>
                          <small>
                            {getLuoStudy(c.id)
                              ? `${c.points[0].name} · ${c.points[0].id}`
                              : c.hour === undefined
                                ? '奇经 · 循行示意'
                                : `${c.branch}时 · ${String(c.hour).padStart(2, '0')}:00–${String((c.hour + 2) % 24).padStart(2, '0')}:00`}
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                    {!list.length && (
                      <p className="empty">
                        {globalPointMatches.length
                          ? '本分类没有匹配经络，可点击上方穴位搜索结果。'
                          : '没有匹配的经络。试试“肺”或“LU9”。'}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              <button
                className={`extra-link ${selected === 'EX' ? 'selected' : ''}`}
                onClick={() => selectChannel('EX')}
              >
                <Compass size={18} />
                <span>
                  经外奇穴
                  <small>国标 51 条 · 补充 6 条</small>
                </span>
                <ChevronRight size={16} />
              </button>
              <div className="library-foot">
                <span className="status-dot" />
                学习模式<span>局部坐标待校准</span>
              </div>
            </aside>
            <section
              id="atlas-viewer"
              className="viewer-panel"
              aria-label="三维图谱工作区"
            >
              <div className="viewer-top">
                <div>
                  <span className="eyebrow">
                    {mode === 'clock'
                      ? '24-HOUR MERIDIAN CYCLE'
                      : 'INTERACTIVE ANATOMY'}
                  </span>
                  <h2>
                    {mode === 'clock'
                      ? `${timeLabel(hour)} · ${channelAtHour(hour).branch}时`
                      : '三维经络图谱'}
                  </h2>
                </div>
                <button
                  className="quiet-button"
                  onClick={() => {
                    setSelected(null);
                    setClockLinked(false);
                    setFlow(false);
                    setPoint(null);
                    setCompared([]);
                    setShowAll(true);
                    setReciting(false);
                    setPlaying(false);
                  }}
                >
                  <Layers3 size={16} />
                  全身总览
                </button>
              </div>
              <BodyViewer
                selected={selected}
                point={point?.id || null}
                showAll={showAll}
                labels={labels}
                guides={guides}
                internalCourse={internalCourse}
                flow={flow}
                clockProgress={clockProgress}
                view={view}
                extraScope={selected === 'EX' ? extraScope : 'all'}
                onChannel={selectChannel}
                onPoint={inspectPoint}
                onPickStart={() => {
                  setPlaying(false);
                  setFlow(false);
                  setReciting(false);
                }}
                highlights={
                  reciting && channel
                    ? [channel.points[reciteIndex]?.id]
                    : compared
                }
              />
              <div className="body-orientation">
                旋转人体 · 前 / 背 / 侧<span>左右为人体自身方向</span>
              </div>
              <div className="view-tools">
                <button title="正面" onClick={() => camera('front')}>
                  正
                </button>
                <button title="背面" onClick={() => camera('back')}>
                  背
                </button>
                <button title="侧面" onClick={() => camera('left')}>
                  侧
                </button>
                <span />
                <button
                  title="放大"
                  aria-label="放大"
                  onClick={() => camera('in')}
                >
                  <Plus size={17} />
                </button>
                <button
                  title="缩小"
                  aria-label="缩小"
                  onClick={() => camera('out')}
                >
                  <Minus size={17} />
                </button>
                <button
                  title="复位视角"
                  aria-label="复位视角"
                  onClick={() => camera('front')}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
              <div className="model-caption">
                <span className="status-dot" />
                {compared.length
                  ? `正在对照 ${compared.length} 个穴位`
                  : guides
                    ? '参考线：胸部肋间水平 · 腹部骨度分寸'
                    : '穴位位置为三维示意'}
                <span>点击经络选中 · 点击穴位查看</span>
              </div>
              <div className="viewer-options">
                <label htmlFor="show-placement-guides">
                  <Switch
                    id="show-placement-guides"
                    checked={guides}
                    onCheckedChange={setGuides}
                    aria-label="显示定位参考线"
                  />
                  定位参考
                </label>
                <label htmlFor="show-other-meridians">
                  <Switch
                    id="show-other-meridians"
                    checked={showAll}
                    onCheckedChange={setShowAll}
                    aria-label="显示其他经络"
                  />
                  其他经络
                </label>
                <label htmlFor="show-point-labels">
                  <Switch
                    id="show-point-labels"
                    checked={labels}
                    onCheckedChange={setLabels}
                    aria-label="显示穴位名称"
                  />
                  穴位名称
                </label>
                <button
                  className={flow ? 'active' : ''}
                  onClick={() => {
                    setSelected(selected);
                    setClockLinked(false);
                    setPlaying(false);
                    setFlow(clockLinked || !flow);
                  }}
                  disabled={!channel || !!luo}
                >
                  {flow ? <Pause size={16} /> : <Play size={16} />}
                  {luo ? '络脉关系示意' : '单经循行'}
                </button>
              </div>
              {courseData && (
                <div className="internal-course-panel">
                  <label htmlFor="show-lung-course">
                    <Switch
                      id="show-lung-course"
                      checked={internalCourse}
                      onCheckedChange={setInternalCourse}
                      aria-label={`显示${channel?.hour !== undefined ? channel.short + '经' : channel?.name}${courseData.toggleLabel}`}
                    />
                    {courseData.toggleLabel}
                  </label>
                  {internalCourse && (
                    <>
                      <p>{courseData.summary}</p>
                      <p>
                        {courseHasInternalSegments(selected)
                          ? '虚线为体内或不确定区域示意，实线为体表段。'
                          : '实线为体表段，虚线为不确定区域连接。'}
                        开启「单经循行」可观看叙述次序；播放速度仅用于学习。
                      </p>
                      {courseData.focusLabel && (
                        <button
                          type="button"
                          className="quiet-button"
                          onClick={() => {
                            camera(
                              'focusPoint' in courseData &&
                                courseData.focusPoint
                                ? `${'focusView' in courseData && courseData.focusView ? courseData.focusView : 'point'}-${courseData.focusPoint}`
                                : 'face',
                            );
                            document
                              .getElementById('atlas-viewer')
                              ?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                          }}
                        >
                          {courseData.focusLabel}
                        </button>
                      )}
                      <details>
                        <summary>这段三维循行的依据</summary>
                        <p>{courseData.note}</p>
                        <p>{courseData.passage}</p>
                        <a
                          href={courseData.source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {courseData.source.title} 原文 ↗
                        </a>
                      </details>
                    </>
                  )}
                </div>
              )}
              <div className="timeline">
                <div className="timeline-title">
                  <div>
                    <Clock3 size={16} />
                    <span>子午流注</span>
                    <small>传统时辰配属示意</small>
                  </div>
                  <button
                    onClick={() => {
                      if (!playing) {
                        selectChannel(channelAtHour(hour).id);
                        setClockLinked(true);
                        setFlow(false);
                      }
                      setPlaying(!playing);
                    }}
                  >
                    {playing ? <Pause size={15} /> : <Play size={15} />}{' '}
                    {playing ? '暂停' : '播放全天'}
                  </button>
                </div>
                <div className="hour-grid">
                  {primaryChannels.map((c) => (
                    <button
                      key={c.id}
                      className={
                        channelAtHour(hour).id === c.id ? 'current-hour' : ''
                      }
                      onClick={() => moveHour(c.hour!)}
                      title={`${c.hour}:00—${(c.hour! + 2) % 24}:00 ${c.name}`}
                    >
                      <span>{c.branch}</span>
                      <b>{c.short}</b>
                      <small>{String(c.hour).padStart(2, '0')}</small>
                    </button>
                  ))}
                </div>
                {clockLinked && channel && (
                  <div className="clock-progress">
                    <span>
                      {channel.points[0]?.name} → {channel.points.at(-1)?.name}{' '}
                      · 本时辰 {Math.floor(clockProgress! * 100 + 1e-7)}%
                    </span>
                    <progress
                      aria-label="时辰循行进度"
                      max={1}
                      value={clockProgress}
                    />
                    <small>
                      光点按时段比例沿示意路线前进，不代表实际气血速度。
                    </small>
                  </div>
                )}
                <div className="time-slider">
                  <span>{timeLabel(hour)}</span>
                  <Slider
                    value={[hour]}
                    min={0}
                    max={23.99}
                    step={0.01}
                    onValueChange={(v) => {
                      setPlaying(false);
                      moveHour(Array.isArray(v) ? v[0] : v);
                    }}
                    aria-label="全天时刻"
                  />
                  <span>24 h</span>
                </div>
              </div>
            </section>
            <aside className="right-panel" aria-live="polite">
              {point ? (
                <>
                  <button className="back-link" onClick={() => setPoint(null)}>
                    ← 返回经络
                  </button>
                  <div className="eyebrow">
                    ACUPOINT · {detailed ? 'DETAIL' : 'OVERVIEW'}
                  </div>
                  <div className="point-title">
                    <h2>{point.name}</h2>
                    <span>{point.displayCode || point.id}</span>
                    <button
                      type="button"
                      className="pronunciation-trigger"
                      onClick={() => openPronunciation(point.name)}
                    >
                      查此穴读音
                    </button>
                  </div>
                  <p className="subtle">
                    {channels.find((c) => c.id === point.channel)?.name ||
                      '经外奇穴'}
                  </p>
                  {point.aliases && (
                    <p className="micro-note">别名 / 检索词：{point.aliases}</p>
                  )}
                  {point.catalogNote && (
                    <p className="micro-note">{point.catalogNote}</p>
                  )}
                  <div className="tags">
                    {point.roles.map((r) => (
                      <span key={r}>{r.endsWith('穴') ? r : r + '穴'}</span>
                    ))}
                  </div>
                  {detailed ? (
                    <>
                      <div className="section-label">
                        {point.locationReference
                          ? '国标定位要点'
                          : '位置与定位'}
                      </div>
                      <p className="detail-copy">
                        {point.location ||
                          '本条定位待补充，请从资料来源查看原文。'}
                      </p>
                      {point.locationReference && (
                        <>
                          <p className="micro-note">
                            定位中的“寸”为人体比例单位。特殊体位及条文注释见原文，不能按屏幕距离取穴。
                          </p>
                          <a
                            className="text-link"
                            href={point.locationReference.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            核对定位原文：{point.locationReference.label} ↗
                          </a>
                        </>
                      )}
                      {locationIllustration && (
                        <div className="micro-note">
                          <p>{locationIllustration.note}</p>
                          <a
                            className="text-link"
                            href={locationIllustration.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            对照{locationIllustration.label} ↗
                          </a>
                          <p>
                            英文原图，由 MEDBOX
                            提供文献副本；本页定位仍以所列国标为准。
                          </p>
                        </div>
                      )}
                      {point.modelPlacement && (
                        <p className="micro-note">
                          模型定位依据：{point.modelPlacement}
                        </p>
                      )}
                      <div className="section-label">
                        {point.id === 'ST17'
                          ? '定位标志 · 文献说明'
                          : '传统主治 · 学习资料'}
                      </div>
                      <p className="detail-copy">
                        {point.indications ||
                          '逐穴主治资料正在核对，本条不以经络的通用主治替代具体穴位主治。'}
                      </p>
                      <p className="clinical-note">
                        {point.id === 'ST17'
                          ? '此条用于定位学习，古籍文字与现代定位标准分列。'
                          : '主治是传统文献记载，不表示疗效已获现代临床证实。此图不提供针刺操作指导。'}
                      </p>
                      <p className="micro-note">{point.source}</p>
                      {indicationStudies.map((study, studyIndex) => (
                        <section
                          key={`${study.kind}-${studyIndex}`}
                          className="indication-study"
                          aria-label={
                            point.id === 'ST17'
                              ? '定位文献出处'
                              : '主治文献出处'
                          }
                        >
                          <div className="section-label">
                            {study.kind === 'classical'
                              ? '古籍记载 · 核对方式见说明'
                              : study.kind === 'standard'
                                ? '国家标准 · 基础主治'
                                : '补充资料 · 核对范围见说明'}
                          </div>
                          {studyIndex > 0 && (
                            <p className="detail-copy">{study.summary}</p>
                          )}
                          {study.excerpt && (
                            <blockquote>“{study.excerpt}”</blockquote>
                          )}
                          <p className="micro-note">{study.note}</p>
                          {study.references.map((ref) => (
                            <a
                              className="text-link"
                              key={ref.url}
                              href={ref.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {point.id === 'ST17'
                                ? '核对定位文献'
                                : '核对主治出处'}
                              ：{ref.label} ↗
                            </a>
                          ))}
                        </section>
                      ))}
                      <Link className="text-link" href="/sources">
                        查看资料来源与模型说明 ↗
                      </Link>
                    </>
                  ) : (
                    <div className="basic-info">
                      <p>
                        当前为穴位简介。先选中所属经络，再查看定位、分类与传统主治。
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => {
                          setClockLinked(false);
                          setPlaying(false);
                          setSelected(point.channel);
                          setRole('全部');
                        }}
                      >
                        进入
                        {channels.find((c) => c.id === point.channel)?.short ||
                          '奇穴'}
                        学习 <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              ) : channel ? (
                <>
                  <div className="channel-detail-top">
                    <span className="eyebrow">
                      {channel.id} / {channel.polarity}
                    </span>
                    <span
                      className="dot"
                      style={{ background: channel.color }}
                    />
                  </div>
                  <h2 className="detail-name">{channel.name}</h2>
                  <div className="detail-meta">
                    <span>
                      {luo
                        ? '1 个络穴 · 区域联系示意'
                        : channel.id.length <= 2
                          ? `${channel.points.length} 个经穴`
                          : '循行与交会穴'}
                    </span>
                    <span>
                      {luo
                        ? luo.connection
                        : channel.pair
                          ? `表里 · ${channels.find((c) => c.id === channel.pair)?.short}经`
                          : '奇经体系'}
                    </span>
                  </div>
                  {luo && (
                    <section
                      className="vessel-study"
                      aria-label="十五络循行资料"
                    >
                      <p>{luo.summary}</p>
                      <button
                        className="vessel-point"
                        onClick={() => {
                          inspectPoint(pointById[luo.pointId]);
                          camera(`point-${luo.pointId}`);
                        }}
                      >
                        查看络穴 · {pointById[luo.pointId].name}（{luo.pointId}
                        ）
                      </button>
                      <button
                        className="vessel-point"
                        onClick={() => selectChannel(luo.parent)}
                      >
                        查看所属经脉
                      </button>
                      <details>
                        <summary>《灵枢》络脉原文与说明</summary>
                        <p>{luo.excerpt}</p>
                        {luo.note && <p>{luo.note}</p>}
                        <p className="micro-note">{luoSource.note}</p>
                        <a
                          className="text-link"
                          href={luoSource.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {luoSource.title} ↗
                        </a>
                      </details>
                    </section>
                  )}
                  {channel.hour !== undefined && (
                    <div className="time-card">
                      <Clock3 size={21} />
                      <div>
                        <strong>{channel.branch}时</strong>
                        <span>
                          {String(channel.hour).padStart(2, '0')}:00 —{' '}
                          {String((channel.hour + 2) % 24).padStart(2, '0')}:00
                        </span>
                      </div>
                      <small>传统流注时段</small>
                    </div>
                  )}
                  {channel.id.length <= 2 ? (
                    <div className="route-summary">
                      <span>{channel.points[0]?.name}</span>
                      <div>
                        <span />→<span />
                      </div>
                      <span>{channel.points.at(-1)?.name}</span>
                    </div>
                  ) : null}
                  {channel.confluentPointIds && (
                    <section className="vessel-study" aria-label="八脉交会穴">
                      <div className="section-label">八脉交会穴 · 肘膝以下</div>
                      {channel.confluentPointIds.map((id) => (
                        <button
                          className="vessel-point"
                          key={id}
                          onClick={() => inspectPoint(pointById[id])}
                        >
                          {pointById[id].name} <small>{id}</small>
                        </button>
                      ))}
                      <p className="micro-note">
                        这是与该奇经相通的八个特定穴之一，和沿线交会穴分开学习。
                      </p>
                    </section>
                  )}
                  {channel.vesselStudy && (
                    <section
                      className="vessel-study"
                      aria-label="奇经文献关联穴"
                    >
                      <div className="section-label">
                        《奇经八脉考》沿线关联穴
                      </div>
                      <div className="vessel-points">
                        {channel.vesselStudy.members.map((member) => (
                          <button
                            className="vessel-point"
                            key={member.id}
                            onClick={() => inspectPoint(pointById[member.id])}
                          >
                            {pointById[member.id].name}{' '}
                            <small>
                              {member.id}
                              {member.landmark ? ' · 起点参照' : ''}
                            </small>
                          </button>
                        ))}
                      </div>
                      <p className="micro-note">{channel.vesselStudy.note}</p>
                      <p className="micro-note">
                        这是本书条文的关联索引，穴名、代码、定位仍取现行国标；模型使用现有穴点连接，解剖定位与完整体内分支仍待校准。
                      </p>
                      {channel.vesselStudy.references.map((ref) => (
                        <a
                          className="text-link"
                          href={ref.url}
                          key={ref.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          核对本篇：{ref.label} ↗
                        </a>
                      ))}
                    </section>
                  )}
                  {channel.routePresentation &&
                  !(hasRegionalCourse(channel.id) && internalCourse) ? (
                    <section className="vessel-study" aria-label="当前路线说明">
                      <div className="section-label">当前三维路线</div>
                      <p className="micro-note">
                        {channel.routePresentation.note}
                      </p>
                      <p className="micro-note">
                        {luo
                          ? '本图展示络脉的分布与联系，不设置独立时辰或播放速度；上下走向见循行提要与原文。'
                          : '实线：有穴点约束的体表示意；虚线：区域关系或体内段的体表投影。分段播放仅演示本段的叙述次序，不表示实测气血速度。'}
                      </p>
                      {routeSource && (
                        <details>
                          <summary>{channel.name}循行原文与校订说明</summary>
                          <p className="micro-note">{routeSource.passage}</p>
                          <p className="micro-note">{routeSource.note}</p>
                          {channel.id === 'DAI' && (
                            <>
                              <p className="micro-note">
                                肾经经别联系（与带脉主线分开）：
                                {daimaiSource.kidneyDivergent}
                              </p>
                              <p className="micro-note">
                                {daimaiSource.relationNote}
                              </p>
                            </>
                          )}
                          <a
                            href={routeSource.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {routeSource.title} 原文 ↗
                          </a>
                        </details>
                      )}
                      {channel.routePresentation.paths.map((path, i) => (
                        <p className="micro-note" key={i}>
                          {path.label}
                          {path.animate === false ? ' · 无方向演示' : ''}
                        </p>
                      ))}
                    </section>
                  ) : (
                    <p className="micro-note">
                      {hasRegionalCourse(channel.id) && internalCourse
                        ? channel.id === 'LU'
                          ? '已显示肺经体内区域与腕后分支示意；中府至少商仍为体表穴序参照，三维位置待校准。'
                          : `已显示${channel.name}${courseHasInternalSegments(channel.id) ? '体内区域与分支' : '区域循行'}示意，三维位置待校准。`
                        : channel.note}
                    </p>
                  )}
                  {channel.hour !== undefined && (
                    <>
                      <div className="section-label">
                        五输 · 原 · 络 <span>肘膝以下及肘膝部</span>
                      </div>
                      <div className="special-grid">
                        {roleNames.map((r) => {
                          const p = channel.points.find((p) =>
                            p.roles.includes(r),
                          );
                          return (
                            <button
                              key={r}
                              onClick={() => {
                                setRole(r);
                                if (p) inspectPoint(p);
                              }}
                            >
                              <span>{r}</span>
                              <b>{p?.name || '—'}</b>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <JingmaiPanel
                    channel={channel}
                    onPoint={inspectPoint}
                    onChannel={selectChannel}
                    onPronounce={openPronunciation}
                  />
                </>
              ) : (
                <>
                  <span className="eyebrow">
                    {selected === 'EX' ? 'EXTRA ACUPOINTS' : 'EXPLORE'}
                  </span>
                  <h2 className="detail-name">
                    {selected === 'EX'
                      ? '经外奇穴'
                      : compared.length
                        ? '跨经配穴对照'
                        : '全身经络'}
                  </h2>
                  <p className="detail-copy">
                    {selected === 'EX'
                      ? '国标收录 51 个奇穴条目，另有 6 条补充资料。金津玉液合为一组，标准未设代码的条目以名称学习。可用“消渴”“鼻通”“落枕”等旧称检索。'
                      : '选择左侧经络，或直接点击人体上的线条。经络选中后会发亮，并显示穴序与特定穴分类。'}
                  </p>
                </>
              )}
              {!point && (
                <div className="points-section">
                  <div className="section-label">
                    {compared.length && !channel
                      ? '配穴目录'
                      : luo
                        ? '本络络穴'
                        : channel?.id.length && channel.id.length > 2
                          ? '奇经相关穴目录'
                          : '穴位目录'}{' '}
                    <span>{visiblePoints.length} 个</span>
                  </div>
                  <div className="point-filter">
                    {selected === 'EX'
                      ? [
                          ['all', '全部 57'],
                          ['standard-extra', '国标 51'],
                          ['supplement-extra', '补充 6'],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            aria-pressed={extraScope === value}
                            className={extraScope === value ? 'chosen' : ''}
                            onClick={() => setExtraScope(value)}
                          >
                            {label}
                          </button>
                        ))
                      : (luo ? ['全部'] : ['全部', ...roleNames]).map((r) => (
                          <button
                            key={r}
                            className={role === r ? 'chosen' : ''}
                            onClick={() => setRole(r)}
                          >
                            {r}
                          </button>
                        ))}
                  </div>
                  <div className="point-list">
                    {visiblePoints.map((p) => (
                      <button key={p.id} onClick={() => inspectPoint(p)}>
                        <span>{p.displayCode || p.id}</span>
                        <b>{p.name}</b>
                        <small>
                          {p.catalog === 'supplement-extra'
                            ? '补充资料'
                            : p.roles.join(' / ')}
                        </small>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                    {!visiblePoints.length && (
                      <p className="empty">此分类下没有匹配穴位。</p>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
          <footer>
            用于传统中医理论学习与研究 · 人体及循行均为示意，不能用于临床取穴。
            <Link href="/sources">资料来源与校订状态 ↗</Link>
          </footer>
        </>
      )}
    </div>
  );
}

'use client';
import {
  channels,
  primaryChannels,
  pointById,
  type Channel,
  type Point,
} from '@/lib/atlas';
import { jingmaiStudies, jingmaiSource } from '@/lib/jingmai';
import { hasRegionalCourse } from '@/lib/course-catalog';

export default function JingmaiPanel({
  channel,
  onPoint,
  onChannel,
  onPronounce,
}: {
  channel: Channel;
  onPoint: (point: Point) => void;
  onChannel: (id: string) => void;
  onPronounce: (text: string) => void;
}) {
  const study = jingmaiStudies[channel.id];
  if (!study) return null;
  const index = primaryChannels.findIndex((c) => c.id === channel.id);
  const previous = primaryChannels[(index + 11) % 12];
  const next = channels.find((c) => c.id === study.next)!;
  const passage =
    jingmaiSource.passages[channel.id as keyof typeof jingmaiSource.passages];
  return (
    <section className="jingmai-study" aria-label="十二正经循行研习">
      <div className="section-label">经脉循行 · 《灵枢》</div>
      <p className="jingmai-origin">
        起于<strong>{study.origin}</strong>
      </p>
      <div className="jingmai-organ">
        <span>属 · {study.belonging}</span>
        <span>络 · {study.connection}</span>
      </div>
      <details className="jingmai-sections">
        <summary>查看体内经过与分支</summary>
        <p className="micro-note">
          以下按《经脉第十》整理；参照穴便于联系体表位置，并非把体内经过改成穴位连线。
          {hasRegionalCourse(channel.id)
            ? '本经可打开图谱下方“体内经过”开关查看三维区域与分支示意。'
            : '当前三维光流仍为体表穴序示意。'}
        </p>
        <ol>
          {study.sections.map((section) => (
            <li key={section.label}>
              <h3>{section.label}</h3>
              <p>{section.summary}</p>
              {section.pointIds.length > 0 && (
                <div className="jingmai-landmarks">
                  <small>体表参照穴</small>
                  {section.pointIds.map((id) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => onPoint(pointById[id])}
                    >
                      {pointById[id].name}
                      <span>{id}</span>
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
        {study.note && <p className="jingmai-editorial">{study.note}</p>}
        <div className="jingmai-junction">
          <strong>与下一经的联系</strong>
          <p>{study.junction}</p>
          <small>
            按相邻经脉的末段、支脉和起段作学习比照；不表示按钟点才发生器官之间的生理血流交接。
          </small>
        </div>
        <details className="jingmai-original">
          <summary>对照循行原文</summary>
          <p>{passage}</p>
          <button
            type="button"
            className="pronunciation-trigger"
            onClick={() => onPronounce(passage)}
          >
            循行原文注音
          </button>
          <p className="micro-note">{jingmaiSource.scope}</p>
        </details>
        <a
          className="text-link"
          href={jingmaiSource.url}
          target="_blank"
          rel="noreferrer"
        >
          《灵枢·经脉第十》固定版本 ↗
        </a>
      </details>
      <div className="jingmai-neighbours">
        <button type="button" onClick={() => onChannel(previous.id)}>
          ← 前一经 · {previous.short}
        </button>
        <button type="button" onClick={() => onChannel(next.id)}>
          下一经 · {next.short} →
        </button>
      </div>
    </section>
  );
}

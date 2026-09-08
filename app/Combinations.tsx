'use client';
import { useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  channels,
  primaryChannels,
  pointById,
  diabetesHealthSource,
} from '@/lib/atlas';
import { extraordinarySong } from '@/lib/classics';
import {
  diabetesSource,
  diabetesCore,
  diabetesPatterns,
  classicalDiabetes,
  confluentPairs,
} from '@/lib/combinations';
export default function Combinations({
  onExplore,
}: {
  onExplore: (ids: string[]) => void;
}) {
  const [topic, setTopic] = useState('diabetes'),
    [edition, setEdition] = useState('modern'),
    [pattern, setPattern] = useState('core');
  const selectedPattern = diabetesPatterns.find((p) => p.id === pattern)!;
  const ids =
    edition === 'modern'
      ? [...diabetesCore, ...selectedPattern.points]
      : classicalDiabetes.points;
  const [baseChannel, setBaseChannel] = useState('LU');
  const base = channels.find((c) => c.id === baseChannel)!;
  const paired = channels.find((c) => c.id === base.pair)!;
  const yuan = base.points.find((p) => p.roles.includes('原'))!,
    luo = paired.points.find((p) => p.roles.includes('络'))!;
  const pointCards = (items: string[]) => (
    <div className="association-points">
      {items.map((id) => (
        <a key={id} href={'/?points=' + encodeURIComponent(items.join(','))}>
          <span>{pointById[id].name}</span>
          <small>
            {pointById[id].displayCode || id} ·{' '}
            {channels.find((c) => c.id === pointById[id].channel)?.short ||
              '经外奇穴'}
          </small>
        </a>
      ))}
    </div>
  );
  return (
    <section className="document-page">
      <div className="eyebrow">CLINICAL READING ROOM</div>
      <h1>从一穴，到经络之间。</h1>
      <p>
        配伍、辨证与文献放在一起阅读。这里记录学习资料，不生成个体治疗处方。
      </p>
      <div className="combination-layout">
        <aside>
          {[
            ['diabetes', '消渴 / 糖尿病'],
            ['yuanluo', '原络配穴'],
            ['confluent', '八脉交会'],
          ].map(([id, name]) => (
            <button
              key={id}
              className={topic === id ? 'selected' : ''}
              onClick={() => setTopic(id)}
            >
              {name}
              <ChevronRight size={16} />
            </button>
          ))}
          <p className="micro-note">
            中医“消渴”与现代医学糖尿病并非完全等同。疾病治疗须结合辨证和现代规范诊疗。
          </p>
        </aside>
        <article className="study-card">
          {topic === 'diabetes' ? (
            <>
              <div className="tags">
                <span>有出处的学习记录</span>
                <span>非疗效保证</span>
              </div>
              <h2>消渴相关配穴</h2>
              <Tabs
                value={edition}
                onValueChange={(v) => setEdition(String(v))}
              >
                <TabsList>
                  <TabsTrigger value="modern">公开方案</TabsTrigger>
                  <TabsTrigger value="classic">古籍对照</TabsTrigger>
                </TabsList>
                <TabsContent value={edition}>
                  {edition === 'modern' ? (
                    <>
                      <p className="micro-note">
                        {diabetesSource.date} · {diabetesSource.section}
                      </p>
                      <div className="pattern-buttons">
                        {diabetesPatterns.map((p) => (
                          <button
                            key={p.id}
                            className={p.id === pattern ? 'selected' : ''}
                            onClick={() => setPattern(p.id)}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                      <p>{selectedPattern.explanation}</p>
                      <div className="section-label">文献基础穴组</div>
                      {pointCards(diabetesCore)}
                      {selectedPattern.points.length > 0 && (
                        <>
                          <div className="section-label">证型配穴</div>
                          {pointCards(selectedPattern.points)}
                        </>
                      )}
                      <p className="micro-note">
                        胃脘下俞在该方案中称为胰俞。这里摘录穴组与辨证配穴关系，未评定该方案的临床证据等级，也不照录操作方法。
                      </p>
                      <a
                        className="text-link"
                        href={diabetesSource.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {diabetesSource.title} ↗
                      </a>
                    </>
                  ) : (
                    <>
                      <div className="section-label">
                        《针灸大成》鼻口门 · 消渴条用穴
                      </div>
                      {pointCards(ids)}
                      <p className="micro-note">{classicalDiabetes.note}</p>
                      <a
                        className="text-link"
                        href={classicalDiabetes.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        阅读古籍原条文 ↗
                      </a>
                    </>
                  )}
                </TabsContent>
              </Tabs>
              <button className="primary-button" onClick={() => onExplore(ids)}>
                在三维图谱中对照 <ArrowRight size={16} />
              </button>
              <div className="pending-note">
                <h3>胃脘下俞 · 胰俞 · “消渴穴”</h3>
                <p>
                  本图以胃脘下俞 EX-B3 收录，位于第八胸椎棘突下旁开 1.5
                  寸；“消渴穴”作为部分教学资料中的检索称呼，不另增一个重叠穴位。
                </p>
              </div>
              <p className="clinical-note">
                糖尿病需要规范监测和治疗，针灸学习及古籍记载不能替代降糖治疗。
              </p>
              <a
                className="text-link"
                href={diabetesHealthSource.url}
                target="_blank"
                rel="noreferrer"
              >
                NCCIH 健康资料 ↗
              </a>
            </>
          ) : topic === 'yuanluo' ? (
            <>
              <span className="eyebrow">YUAN–LUO PAIRING</span>
              <h2>主经原穴 · 表里经络穴</h2>
              <p>
                原络配穴的一种学习框架：主病经取原穴，表里经取络穴。主客关系改变，配对也随之改变；它并不只用于内科病。
              </p>
              <div className="pattern-buttons">
                {primaryChannels.map((c) => (
                  <button
                    key={c.id}
                    className={baseChannel === c.id ? 'selected' : ''}
                    onClick={() => setBaseChannel(c.id)}
                  >
                    {c.short}
                  </button>
                ))}
              </div>
              <div className="section-label">
                {base.short}经为主 · {paired.short}经为客
              </div>
              {pointCards([yuan.id, luo.id])}
              <p className="micro-note">
                {yuan.name}是{base.short}经原穴，{luo.name}是{paired.short}
                经络穴。这是原络关系演示，尚须根据实际病证选用。
              </p>
              <button
                className="primary-button"
                onClick={() => onExplore([yuan.id, luo.id])}
              >
                对照这组原络穴 <ArrowRight size={16} />
              </button>
              <div className="section-label">经典阅读</div>
              <a
                className="text-link"
                href="https://zh.wikisource.org/wiki/八十一難經#六十六難"
                target="_blank"
                rel="noreferrer"
              >
                《难经》六十六难 · 原穴理论 ↗
              </a>
            </>
          ) : (
            <>
              <span className="eyebrow">EIGHT CONFLUENT POINTS</span>
              <h2>八脉交会 · 四组相配</h2>
              <p>
                八个交会穴属于十二正经，分别通于奇经八脉；并非在奇经上另建八个穴。
              </p>
              {confluentPairs.map((pair) => (
                <div className="pair-card" key={pair.name}>
                  <div className="section-label">
                    {pair.name}
                    <span>{pair.vessels}</span>
                  </div>
                  {pointCards(pair.points)}
                  <button
                    className="text-link"
                    onClick={() => onExplore(pair.points)}
                  >
                    在模型中对照 →
                  </button>
                </div>
              ))}
              <a
                className="text-link"
                href={extraordinarySong.url}
                target="_blank"
                rel="noreferrer"
              >
                《针灸大成》奇经八脉歌 ↗
              </a>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

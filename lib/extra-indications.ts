export type IndicationStudy = {
  kind: 'classical' | 'secondary' | 'standard';
  summary: string;
  references: { label: string; url: string }[];
  excerpt?: string;
  note: string;
};

const dacheng = {
  label: '《针灸大成》卷九 · 经外奇穴（维基文库转录）',
  url: 'https://zh.wikisource.org/wiki/針灸大成/卷九',
};
const classical = (
  summary: string,
  excerpt: string,
  note: string,
): IndicationStudy => ({
  kind: 'classical',
  summary,
  excerpt,
  references: [dacheng],
  note,
});

// Historical disease terms and modern reference digests are independent of
// GB/T 40997's location facts. These records do not rate clinical efficacy.
export const extraIndicationStudies: Record<string, IndicationStudy> = {
  'EX-HN7': {
    kind: 'secondary',
    summary:
      '视神经炎、视神经萎缩、视网膜色素变性、青光眼、早期白内障、近视等眼病，见在线教材列举。',
    references: [
      {
        label: '中医世家《针灸学》· 头颈部奇穴“球后”',
        url: 'https://www.zysj.com.cn/lilunshuji/zhenjiuxue/93-5-23_group.html',
      },
    ],
    note: '按眶下缘外1/4与内3/4交界处的球后条核对，不取前一上明条的主治。在线教材原版信息与原页待校；本列表不证明能恢复视力，三维眼部标记不提供针刺路径。',
  },
  'M-HN18': {
    kind: 'secondary',
    summary: '齿龈肿痛、口歪。',
    references: [
      {
        label: '中医世家《针灸学》· 夹承浆',
        url: 'https://www.zysj.com.cn/lilunshuji/zhenjiuxue/3155.html',
      },
    ],
    note: '网页为承浆两侧的夹承浆独立条目，不借用承浆 CV24 的主治。仅据在线整理核对，教材原版信息和页码仍待校。',
  },
  'M-UE30': {
    kind: 'secondary',
    summary: '前臂疼痛、上肢麻痹或痉挛、胸胁疼痛等，见百科资料列举。',
    references: [
      {
        label: 'A+医学百科 · 臂中穴',
        url: 'https://www.a-hospital.com/w/臂中穴',
      },
    ],
    note: '仅核对到百科二次资料：前臂内侧腕肘横纹中点、掌长肌与桡侧腕屈肌之间，与本条对应；不混同上臂臂臑 LI14。网页转引《备急千金要方》手逆注及《新医疗法手册》未核原书，摘要只选录部分病候。',
  },
  'EX-B9': {
    kind: 'secondary',
    summary: '癫痫、头痛、失眠、便秘，见在线针灸资料列举。',
    references: [
      {
        label: '医砭《中华针灸》· 腰奇',
        url: 'https://yibian.hopto.org/shu/?lc=tw&sid=7455',
      },
    ],
    note: '依据尾骨端直上2寸的腰奇条核对。网页写 EX-B8，与本应用十七椎编号冲突，因此仅按名称和位置对应，不导入其编号。该页仅列《中医杂志》而无年卷页，原刊待校。',
  },
  'M-HN21': {
    kind: 'secondary',
    summary: '舌强、失语、流涎、咽喉疼痛、口腔溃疡。',
    references: [
      {
        label: '医砭针灸库 · 上廉泉',
        url: 'https://yibian.hopto.org/db/?ano=381',
      },
    ],
    note: '页面指下颌下缘与廉泉之间的上廉泉，不合并廉泉 CV23 或廉泉三穴组合。其 EX-HN21 是资料编号，未用作现行国标代码；原始教材版本待核。',
  },
  'M-BW34': {
    kind: 'secondary',
    summary: '坐骨神经痛、腰痛、腿痛。',
    references: [
      {
        label: '中医世家《针灸学》· 奇穴下肢穴“环中”',
        url: 'https://www.zysj.com.cn/lilunshuji/zhenjiuxue/93-5-27_group.html',
      },
    ],
    note: '在线教材整理，原版出版信息与原页待核。定位为环跳与腰俞连线中点，按环中独立条目摘录，不混入相邻环跳 GB30 的主治；未收入现行国标奇穴目录的状态保留。',
  },
  'EX-LE4': {
    kind: 'secondary',
    summary: '腿疼、膝关节炎及鹤膝风等传统病候。',
    references: [
      {
        label: '医砭《中华针灸》· 内膝眼',
        url: 'https://yibian.hopto.org/cn/shu/?sid=7518',
      },
    ],
    note: '网页明确髌韧带内侧凹陷，与内膝眼单穴对应；所引《备急千金要方》原页待校，不把外膝眼犊鼻 ST35 的条文直接移入。鹤膝风保留为传统病名。',
  },
  'EX-LE5': {
    kind: 'secondary',
    summary: '膝关节疼痛，见医院膝眼穴组科普。',
    references: [
      {
        label: '河北省中医院 · 骨关节疼痛穴位科普（2023-11-15）',
        url: 'https://www.hbszyy.cn/html/news/2023-11-15/7330.html',
      },
    ],
    note: '来源明确膝眼为双膝髌韧带内外侧共四穴，外膝眼又名犊鼻。这里保留穴组补充条目，不增计国标独立穴；仅采用主治症状，不采用科普中的疗法效果或操作承诺。',
  },
  'EX-UE9': {
    kind: 'secondary',
    summary: '手臂红肿、手指麻木、头项强痛、咽痛、齿痛及目痛等传统主治列举。',
    references: [
      {
        label: '医砭《中华针灸》· 八邪',
        url: 'https://yibian.hopto.org/shu/?lc=tw&sid=7482',
      },
    ],
    note: '按手背指蹼缘后方、左右共八穴的穴组核对。本摘要保留网页所列病候，与另列的《针灸大成》原页分开阅读；未把网页蛇伤列举展开为急救方案，也不将脚部八风混入本组。',
  },
  'M-UE48': {
    kind: 'secondary',
    summary: '肩内侧痛、肩关节周围炎、偏瘫、麻痹，见在线针灸资料列举。',
    references: [
      {
        label: '医砭《中华针灸》· 肩前',
        url: 'https://yibian.hopto.org/shu/?lc=cn&sid=7479',
      },
    ],
    note: '网页肩前又名肩内陵，采用腋前皱襞头与肩锁关节连线中点的旧定位；现行国标为腋前皱襞尽端直上1.5寸，两者分开阅读。网页 EX-UE12 编号不替代当前目录；其《中医临床新编》原书待校。',
  },
  'EX-UE3': {
    kind: 'classical',
    summary: '心痛、腹中诸气痛等古代病候。',
    excerpt: '治心痛，及腹中诸气痛不可忍者',
    references: [
      {
        label: '《奇效良方》卷五十五 · 中泉（在线转录）',
        url: 'https://www.theqi.com/simplified/cmed/oldbook/book105/b105_55.html',
      },
    ],
    note: '转录中泉条位于手背腕中、阳溪阳池之间，与腕部中泉对应；不借用足底涌泉 KI1 的主治。此为在线古籍转录，扫描版本仍待校。心痛保留为古代病候，不直接等同现代心脏病诊断。',
  },
  'EX-UE8': {
    kind: 'secondary',
    summary: '掌指麻痹、屈伸不利、消化不良、落枕，见在线针灸资料列举。',
    references: [
      {
        label: '医砭针灸库 · 外劳宫',
        url: 'https://yibian.hopto.org/tw/db/?ano=429',
      },
    ],
    note: '网页第2、3掌骨间的外劳宫与本条对应，项强、落枕保留为旧别名；不合并掌侧劳宫 PC8 或其他小儿推拿位置。原始教材出处尚待核对。',
  },
  'EX-LE3': {
    kind: 'secondary',
    summary: '皮肤瘙痒、风疹块、下部生疮、蛔虫病及肾脏风疮等传统主治列举。',
    references: [
      {
        label: '医砭针灸库 · 百虫窝',
        url: 'https://yibian.hopto.org/db/?ano=449',
      },
    ],
    note: '网页定位在血海上1寸，并注明从血海分出；不能把古籍“百虫窠即血海”的条文直接当成本穴现行定位。肾脏风疮保留为古代病证，不直接改写为现代肾病；原始文献待校。',
  },
  'EX-HN8': {
    kind: 'secondary',
    summary: '鼻塞、鼻炎、鼻渊及头痛等，见现代术语资料列举。',
    references: [
      {
        label: '中国医药信息查询平台 · 鼻通穴（上迎香）',
        url: 'https://m.dayi.org.cn/acupuncture/1000566.html',
      },
    ],
    note: '网页明确鼻通又名上迎香，但并列不同定位说法；仅摘取部分主治，现行位置仍按国标，不混同鼻穿、内迎香。转引的《常用新医疗法手册》原书待校。',
  },
  'N-HN54': {
    kind: 'secondary',
    summary: '失眠、眩晕、头痛、心悸，见中医药科普列举。',
    references: [
      {
        label: '北京市中医药管理局 · 失眠科普（2025-04-16）',
        url: 'https://zyj.beijing.gov.cn/sy/whkp/202504/t20250416_4066814.html',
      },
    ],
    note: '网页安眠定位为翳风与风池连线中点，与本条范围对应；不合并其他资料的安眠1、安眠2或安眠四针。科普记载不等于疗效试验。',
  },
  'N-HN20': {
    kind: 'secondary',
    summary: '口歪、口疮。',
    references: [
      {
        label: '医学教育网 · 牵正穴定位和主治',
        url: 'https://www.med66.com/new/201402/sq201402118808.shtml',
      },
    ],
    note: '核对考试教育网站整理资料，未附原书页码；仅收录其主治栏，不扩充为所有面神经疾病的适应症。',
  },
  'EX-HN14': {
    kind: 'secondary',
    summary:
      '近视、远视、夜盲、早期白内障，以及耳鸣、眩晕、头痛、失眠等，见在线针灸资料列举。',
    references: [
      {
        label: '医砭《中华针灸》· 翳明',
        url: 'https://yibian.hopto.org/tw/shu/?sid=7429',
      },
    ],
    note: '网页指明翳风后1寸，与翳明条对应；不移入翳风 TE17 的主治。所列《中华医学杂志》1965年出处尚未核对原刊，本摘要不表示眼病疗效已获证实。',
  },
  'EX-HN1': {
    kind: 'secondary',
    summary: '失眠、头晕、头痛等，见医院针灸推拿科科普列举。',
    references: [
      {
        label: '玉溪市人民医院 · 四神聪穴（2021-07-08）',
        url: 'https://www.yxhospital.com/c/2021/07/08/18454.shtml',
      },
    ],
    note: '医院科普资料，非原始临床研究。网页未附其疗效与机制论述所依据的研究全文，本摘要只选录症状，不采用提高学习效率等效果承诺。四神聪为百会周围四穴，现代定位独立按国标展示。',
  },
  'EX-B1': {
    kind: 'secondary',
    summary: '哮喘、慢性支气管炎、百日咳，以及落枕、肩背痛等，见医院科普列举。',
    references: [
      {
        label:
          '烟台市蓬莱中医医院 · 定喘穴科普（烟台市政府公开页，2023-10-07）',
        url: 'https://www.yantai.gov.cn/art/2023/10/7/art_81036_3150045.html',
      },
    ],
    note: '这是采访医院推拿科医生的健康科普，非古籍原页或疗效试验。仅整理其列举的相关病症，不把按摩描述改写为哮喘急性发作的自救方案；现代国标定位与主治资料分列。',
  },
  'EX-HN4': classical(
    '眼生垂帘翳膜等古代眼病记载。',
    '治眼生垂廉翳膜',
    '鱼腰条；“垂廉”按垂帘理解，翳膜不直接替换成单一现代眼病诊断。',
  ),
  'EX-HN5': classical(
    '眼部红肿（古籍记载）。',
    '治眼紅腫',
    '太阳条转录后接“及头”而缺少完整病候，本摘要不据缺文补写头痛；版本原页仍待校。',
  ),
  'EX-HN6': classical(
    '眼生翳膜（古代眼病表述）。',
    '治眼生翳膜',
    '耳尖条；只摘录明确病候，不扩充为现代眼科适应症。',
  ),
  'EX-HN12': classical(
    '重舌肿痛、喉闭等古代病候。',
    '治重舌腫痛，喉閉',
    '原文“左金津右玉液二穴”为一组，与现代合并条目对应；不把前一聚泉条的咳嗽、舌强移入本条。',
  ),
  'EX-CA1': classical(
    '妇人久无子嗣（古代病候记载）。',
    '治婦人久無子嗣',
    '子宫穴条；此为古代用穴记载，不表示已证实改善现代不孕症结局。',
  ),
  'EX-UE2': classical(
    '痔、脱肛（古籍记载）。',
    '治痔脫肛',
    '二白条；转录别名处有缺字，仅摘录清楚的病候，不自行补写别名。',
  ),
  'EX-UE4': classical(
    '五噎、反胃吐食等古代病候。',
    '治五噎，反胃吐食',
    '本条取中指第二节骨尖所述中魁；随后“阳谿亦名中魁”为古籍同名提示，不把阳溪 LI5 的现代定位合并进来。',
  ),
  'EX-UE10': classical(
    '小儿猢猻劳等古代病候。',
    '治小兒猢猻勞等症',
    '四缝条；保留古代病名，不直接改写为现代营养不良诊断，现代穴组数量与定位另以国标为准。',
  ),
  'EX-UE11': classical(
    '乳蛾（古代咽喉病证）。',
    '治乳蛾',
    '十宣条；不将其他资料常见的昏厥、急救病候加入此段摘要。',
  ),
  'EX-LE10': classical(
    '脚背红肿（古籍记载）。',
    '治腳背紅腫',
    '八风条；足趾间穴组，与手部八邪分开。',
  ),
  'EX-HN2': {
    kind: 'classical',
    summary: '眼部急痛、不能远视（古籍症状记载）。',
    excerpt: '眼急痛不可遠視',
    references: [
      {
        label: '《备急千金要方》第六 · 目病第一（维基文库转录）',
        url: 'https://zh.wikisource.org/wiki/備急千金要方/第六',
      },
    ],
    note: '本条同段载“穴名当阳”。这里只摘取该段明确列出的症状；“不可远视”不直接换算成现代屈光诊断。',
  },
  'EX-HN9': classical(
    '目热暴痛（眼部发热感、突发疼痛的古籍表述）。',
    '治目熱暴痛',
    '所引为内迎香条，不与鼻翼外侧的迎香、上迎香混同。',
  ),
  'EX-HN10': classical(
    '哮喘、咳嗽、久嗽，以及舌苔、舌强相关病候。',
    '哮喘咳嗽，及久嗽不愈',
    '原转录另载“舌胎舌强”；摘要将“胎”作苔解释，舌强指古籍所述舌部活动不利，不据此给出现代病因诊断。',
  ),
  'EX-HN11': classical(
    '消渴（古代病证名称）。',
    '治消渴',
    '古籍消渴与现代糖尿病并非完全对应；这一记载不能作为降糖疗效的证明。',
  ),
  'EXTRA-XINSHE': {
    kind: 'secondary',
    summary: '颈项强痛、后头痛、项部肌肉痉挛及扭伤、肩胛部疼痛。',
    references: [
      {
        label: 'A+医学百科 · 新设穴（主治疾病栏）',
        url: 'https://www.a-hospital.com/w/新设穴',
      },
    ],
    note: '仅核对到网友整理的二次资料；页面所列《新针灸学》及上海中医学院《针灸学》原书尚待校核。其新设、新识定位并列，现行定位仍单独以国标为准；本摘要不标为古籍原文或已完成教材审校。',
  },
  'EXTRA-XUEYADIAN': {
    kind: 'secondary',
    summary: '高血压、低血压、落枕，见现代穴位术语资料的主治列举。',
    references: [
      {
        label: '中国医药信息查询平台 · 血压点穴',
        url: 'https://www.dayi.org.cn/acupuncture/1000419',
      },
    ],
    note: '页面转引《常用新医疗法手册》，本轮核对网页，原书待校。网页另有“头像强痛”文字疑点，未纳入摘要；列举血压病名不表示已证实可双向调节血压。',
  },
  'EXTRA-TITUO': {
    kind: 'secondary',
    summary: '子宫脱垂、肾下垂、腹胀、腹痛、痛经、疝痛。',
    references: [
      {
        label: '中国医药信息查询平台 · 提托穴（详细主治）',
        url: 'https://www.dayi.org.cn/acupuncture/1000283.html',
      },
    ],
    note: '按现代术语网页整理。页面转引《常用新医疗法手册》《红医针疗法》，原书尚待校核，不将转引写成已核原书。',
  },
  'EXTRA-JIEJI': {
    kind: 'classical',
    summary: '小儿痢下赤白、脱肛、如厕时腹痛（古籍记载）。',
    excerpt: '小兒痢下赤白秋末脱肛每厠腹痛不可忍',
    references: [
      {
        label: '《针灸资生经》四库全书本 · 卷三“痢”（维基文库转录）',
        url: 'https://zh.wikisource.org/wiki/鍼灸資生經_(四庫全書本)/卷3',
      },
    ],
    note: '本条依据实际核对到的《针灸资生经》转录；国标附录所列较早出处《太平圣惠方》原版尚待校勘。古代痢证不直接等同于某一现代感染病诊断。',
  },
  'EX-B6': {
    kind: 'secondary',
    summary: '腰痛、脊柱周围肌肉痉挛，以及妇人血崩的传统主治记载。',
    references: [
      {
        label: '医砭《中华针灸》· 腰宜（主治栏）',
        url: 'https://yibian.hopto.org/shu/?lc=tw&sid=7459',
      },
    ],
    note: '仅核对在线二次资料。其出处标为《针灸孔穴及其疗法便览》，该书原页待校；妇人血崩保留为传统病证用语。',
  },
  'EX-UE5': classical(
    '目久痛、翳膜、内障等古代眼病记载。',
    '治目久痛，及生翳膜內障',
    '古籍写“大指中节”，与现行国标修订后的掌指关节定位需分开阅读；不由古文覆盖现代位置。“内障”不直接替换为单一现代眼病名称。',
  ),
  'EX-UE6': classical(
    '手指关节疼痛、目痛。',
    '治手節疼，目痛',
    '此为小骨空条的症状摘要，未合并同名或相邻穴的主治。',
  ),
  'EX-LE1': {
    kind: 'classical',
    summary: '脚腿疼痛、膝部红肿疼痛（古歌记载）。',
    excerpt: '髋骨能治脚腿疼，膝头红肿痛难禁',
    references: [
      {
        label: 'GB/T 40997-2021 附录 A 所引《玉龙歌》· PDF 第13页',
        url: 'https://www.ntcamsac.ac.cn/upload/std_info/202306192147233032.pdf#page=13',
      },
    ],
    note: '这是标准资料性附录引用的古歌，不能视为该定位标准制定了现代主治或确认了疗效。',
  },
  'EX-LE8': classical(
    '下牙疼痛、足内侧转筋（抽筋的古籍表述）。',
    '治下爿牙疼，及腳內廉轉筋',
    '摘要保留内侧方向，区分外踝尖条。',
  ),
  'EX-LE9': classical(
    '足外侧转筋、寒热脚气（古代病证）。',
    '治腳外廉轉筋，及治寒熱腳氣',
    '此处脚气为古代病证名称，不等同于今天俗称脚气的足癣。',
  ),
  'EXTRA-LINEITING': {
    kind: 'secondary',
    summary: '足趾疼痛、癫痫、小儿搐搦，见在线针灸资料列举。',
    references: [
      {
        label: '医砭针灸库 · 里内庭（功效栏）',
        url: 'https://yibian.hopto.org/db/?ano=467&lc=cn',
      },
    ],
    note: '这是二次资料摘要，原始教材出处尚待核定。网页的 EX-LE21 属另一资料编号体系，未用作本应用国标代码；不混入足背内庭 ST44 的主治。',
  },
  'EX-LE11': classical(
    '小肠疝气、干哕、经血不调等古代病证记载。',
    '治小腸疝氣',
    '这里只列本条部分主治；干哕为干呕类古代症状用语。未将原书产科急症记载展开为操作或自用方案。',
  ),
  'EX-LE12': {
    kind: 'classical',
    summary: '风毒脚气、脚弱相关病候（古籍篇章语境）。',
    references: [
      {
        label: '《备急千金要方》第七 · 风毒脚气方（维基文库转录）',
        url: 'https://zh.wikisource.org/wiki/備急千金要方/第七',
      },
    ],
    note: '本卷脚弱灸法段明确提到“其足十趾端名曰气端”；摘要依据该段病证语境，不扩充为现代急救适应症。古代脚气不等同足癣。',
  },
};

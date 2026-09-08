import source from './jingmai-source.json';
export const jingmaiSource = source;
export type CourseSection = {
  label: string;
  summary: string;
  pointIds: string[];
};
export type JingmaiStudy = {
  origin: string;
  belonging: string;
  connection: string;
  sections: CourseSection[];
  next: string;
  junction: string;
  note?: string;
};
// Authored summaries of the pinned route passages; modern point IDs are
// optional surface landmarks, never fabricated internal-organ acupoints.
export const jingmaiStudies: Record<string, JingmaiStudy> = {
  LU: {
    origin: '中焦',
    belonging: '肺',
    connection: '大肠',
    next: 'LI',
    junction: '食指端：肺经腕后支脉至食指，大肠经由食指端起。',
    sections: [
      {
        label: '体内起段',
        summary:
          '从中焦向下联系大肠，返回沿胃口，上行通过膈，归属于肺；再从肺系横向出腋下。',
        pointIds: [],
      },
      {
        label: '上肢主段',
        summary:
          '沿上臂内侧前部，经肘中、前臂、寸口和鱼际，至拇指端。图谱中中府至少商表示体表经穴顺序。',
        pointIds: ['LU1', 'LU5', 'LU9', 'LU10', 'LU11'],
      },
      {
        label: '腕后分支',
        summary:
          '从腕后分出，直向食指内侧，出食指端；这段不是少商到商阳之间的一条直连线。',
        pointIds: [],
      },
    ],
  },
  LI: {
    origin: '食指端',
    belonging: '大肠',
    connection: '肺',
    next: 'ST',
    junction: '鼻旁：大肠经上挟鼻孔，胃经从鼻部起。',
    sections: [
      {
        label: '手臂至肩',
        summary:
          '从食指端沿手指上缘，经合谷两骨之间、腕部两筋之间，上行前臂、肘外侧、上臂外前侧至肩。',
        pointIds: ['LI1', 'LI4', 'LI5', 'LI11', 'LI15'],
      },
      {
        label: '缺盆向内',
        summary:
          '从肩部上至颈后柱骨交会处，再下入缺盆，联系肺，经膈向下，归属于大肠。',
        pointIds: [],
      },
      {
        label: '头面分支',
        summary:
          '从缺盆沿颈上颊，进入下齿，再绕出口旁，交会于人中；左右交叉后上行至鼻孔旁。',
        pointIds: ['LI20'],
      },
    ],
    note: '头面支脉记有“左之右，右之左”。默认穴序连线沿同侧；打开“体内经过与头面分支”可查看交叉和口内区域示意，精确解剖仍待校准。',
  },
  ST: {
    origin: '鼻部、鼻根相交处',
    belonging: '胃',
    connection: '脾',
    next: 'SP',
    junction: '足大趾：胃经足背分支至大趾端，脾经由大趾端起。',
    sections: [
      {
        label: '头面段',
        summary:
          '从鼻部沿鼻外下行，入上齿，绕口唇，下交承浆，再沿下颌、大迎、颊车、耳前和发际上至额部。',
        pointIds: ['ST5', 'ST6', 'ST8'],
      },
      {
        label: '颈胸与体内分支',
        summary:
          '从大迎前下至人迎，沿喉入缺盆，经膈归胃、联系脾；另一分支从胃口沿腹内下至气街，与下行段会合。',
        pointIds: ['ST9', 'ST12', 'ST30'],
      },
      {
        label: '胸腹与下肢主段',
        summary:
          '从缺盆沿胸腹、脐旁下至气街；会合后经髀关、伏兔、膝前、小腿外前侧，至足背、足趾。',
        pointIds: [
          'ST21',
          'ST25',
          'ST30',
          'ST31',
          'ST32',
          'ST35',
          'ST36',
          'ST41',
          'ST45',
        ],
      },
      {
        label: '小腿与足背分支',
        summary: '小腿分支向足趾外侧下行；足背另分支进入大趾间，并出大趾端。',
        pointIds: [],
      },
    ],
    note: '本转录对足趾终点保留“中指内间 / 次指外间”等异文。提要保留分支关系，不能用古文一处趾名改掉国标厉兑的定位。',
  },
  SP: {
    origin: '足大趾端',
    belonging: '脾',
    connection: '胃',
    next: 'HT',
    junction: '心中：脾经从胃上膈的分支注心，心经起于心中。',
    sections: [
      {
        label: '足至腹',
        summary:
          '沿大趾内侧赤白肉际，经第一跖趾关节后方、内踝前缘，沿小腿内侧上行；交出肝经之前，经膝股内前侧入腹。',
        pointIds: ['SP1', 'SP3', 'SP5', 'SP6', 'SP9', 'SP12'],
      },
      {
        label: '属络与舌部',
        summary: '入腹后归脾、联系胃，向上过膈，沿咽两侧，连舌根并散布舌下。',
        pointIds: [],
      },
      {
        label: '向心分支',
        summary: '再从胃分出，上行通过膈，注入心中。',
        pointIds: [],
      },
    ],
  },
  HT: {
    origin: '心中',
    belonging: '心（心系）',
    connection: '小肠',
    next: 'SI',
    junction: '手小指：心经至小指内侧端，小肠经由小指端起。',
    sections: [
      {
        label: '体内起段',
        summary: '从心中出属心系，向下经过膈，联系小肠。',
        pointIds: [],
      },
      {
        label: '咽、目分支',
        summary: '从心系向上沿咽部两侧，联系目系。',
        pointIds: [],
      },
      {
        label: '腋至小指',
        summary:
          '从心系向上经肺，下出腋下，沿上臂和前臂内侧后缘，经肘内、腕部和手掌，沿小指内侧出其端。',
        pointIds: ['HT1', 'HT3', 'HT7', 'HT9'],
      },
    ],
  },
  SI: {
    origin: '手小指端',
    belonging: '小肠',
    connection: '心',
    next: 'BL',
    junction: '目内眦：小肠经面部分支至内眼角，膀胱经由内眼角起。',
    sections: [
      {
        label: '手臂与肩胛',
        summary:
          '沿手外侧上腕，经前臂、肘和上臂外后缘，出肩关节，绕肩胛并交肩上，进入缺盆。',
        pointIds: ['SI1', 'SI4', 'SI8', 'SI9', 'SI11'],
      },
      {
        label: '体内段',
        summary: '从缺盆联系心，沿咽下行过膈，抵达胃，归属于小肠。',
        pointIds: [],
      },
      {
        label: '面耳分支',
        summary:
          '从缺盆循颈上颊，到外眼角，再入耳中；另一支从颊部分出，经颧鼻一带到内眼角，斜向联系颧部。',
        pointIds: ['SI18', 'SI19'],
      },
    ],
    note: '公开转录在颧部字样保留“䪼 䪼”的重复，原文栏照录；提要用“颧鼻一带”，未把网页重复字当作两个解剖节点。',
  },
  BL: {
    origin: '目内眦',
    belonging: '膀胱',
    connection: '肾',
    next: 'KI',
    junction: '足小趾：膀胱经至小趾外侧，肾经从小趾下起。',
    sections: [
      {
        label: '头项与脑部',
        summary:
          '从内眼角上额至头顶；分支到耳上角，直行段入络脑，再出而下至颈项。',
        pointIds: ['BL1', 'BL7', 'BL10'],
      },
      {
        label: '背腰与体内段',
        summary: '从肩背内侧沿脊柱两旁抵腰，进入脊旁深部，联系肾，归属于膀胱。',
        pointIds: ['BL13', 'BL23', 'BL28'],
      },
      {
        label: '背腿分支会合',
        summary:
          '一支由腰部经臀入腘窝；另一支从肩胛内侧沿背、髋、股后外侧下行，也在腘窝会合，再经小腿后侧、外踝后与足外侧至小趾。',
        pointIds: ['BL36', 'BL40', 'BL60', 'BL64', 'BL67'],
      },
    ],
  },
  KI: {
    origin: '足小趾之下',
    belonging: '肾',
    connection: '膀胱',
    next: 'PC',
    junction: '胸中：肾经从肺络心、注胸中，心包经起于胸中。',
    sections: [
      {
        label: '足底至脊',
        summary:
          '从小趾下斜向足心，出然谷下，沿内踝后入足跟；经小腿、腘窝内侧和大腿内后侧上行，贯入脊部。',
        pointIds: ['KI1', 'KI2', 'KI3', 'KI10'],
      },
      {
        label: '属络与咽舌',
        summary: '归肾、联系膀胱；从肾向上贯肝和膈，入肺，沿喉咙并夹舌根。',
        pointIds: [],
      },
      {
        label: '胸中分支',
        summary: '从肺分出，联系心，注入胸中。',
        pointIds: [],
      },
    ],
    note: '本篇内行叙述与腹胸部经穴编号是两层资料；不能把涌泉至俞府的体表连线视为全部经脉。',
  },
  PC: {
    origin: '胸中',
    belonging: '心包络',
    connection: '三焦',
    next: 'TE',
    junction: '无名指：心包经掌中分支至无名指端，三焦经由无名指端起。',
    sections: [
      {
        label: '体内起段',
        summary: '从胸中出属心包络，下过膈，依次联系三焦。',
        pointIds: [],
      },
      {
        label: '胸胁至中指',
        summary:
          '支脉循胸出胁，至腋下，沿上臂内侧两阴经之间入肘，再循前臂两筋之间入掌，沿中指出其端。',
        pointIds: ['PC1', 'PC3', 'PC6', 'PC8', 'PC9'],
      },
      {
        label: '掌中分支',
        summary: '从掌中分出，沿无名指出指端。',
        pointIds: [],
      },
    ],
  },
  TE: {
    origin: '手无名指端',
    belonging: '三焦',
    connection: '心包',
    next: 'GB',
    junction: '目外眦：三焦经头面分支至外眼角，胆经由外眼角起。',
    sections: [
      {
        label: '手臂至胸腹',
        summary:
          '由无名指上手背、腕和前臂两骨之间，经肘、上臂至肩，进入缺盆，布膻中、散络心包，再下膈归三焦。',
        pointIds: ['TE1', 'TE4', 'TE5', 'TE10', 'TE14'],
      },
      {
        label: '膻中上行支脉',
        summary: '从膻中向上出缺盆，经颈项、耳后、耳上角，转折向下面颊、颧部。',
        pointIds: ['TE17', 'TE20'],
      },
      {
        label: '耳内与目外眦',
        summary: '另一支从耳后入耳中，再出耳前，经客主人前、面颊，至外眼角。',
        pointIds: ['TE21', 'TE23'],
      },
    ],
  },
  GB: {
    origin: '目外眦',
    belonging: '胆',
    connection: '肝',
    next: 'LR',
    junction: '足大趾：胆经足背分支至大趾、绕趾甲至丛毛，肝经由大趾丛毛处起。',
    sections: [
      {
        label: '头颈与耳部分支',
        summary:
          '由外眼角上头角、下耳后，经颈至肩入缺盆；耳后分支入耳，再出耳前，到外眼角后。',
        pointIds: ['GB1', 'GB2', 'GB20', 'GB21'],
      },
      {
        label: '头面向内分支',
        summary:
          '从外眼角分出，下行面颊、颌部和颈，在缺盆会合；入胸过膈，联系肝、归胆，循胁内，经腹股沟和阴毛际，到髋部。',
        pointIds: [],
      },
      {
        label: '胸胁至足',
        summary:
          '直行段从缺盆下腋，沿胸、季胁下合髋部，再经大腿外侧、膝外侧、小腿与外踝前，至足背和第四趾。',
        pointIds: ['GB22', 'GB24', 'GB30', 'GB34', 'GB40', 'GB44'],
      },
      {
        label: '足大趾分支',
        summary: '从足背另分出，入大趾间，沿大趾内侧到端部，再绕趾甲至丛毛处。',
        pointIds: [],
      },
    ],
  },
  LR: {
    origin: '足大趾丛毛处',
    belonging: '肝',
    connection: '胆',
    next: 'LU',
    junction: '肺：肝经从肝分出、贯膈注肺，与肺经联系，十二经次序循环回肺。',
    sections: [
      {
        label: '足至小腹',
        summary:
          '从大趾经足背、内踝附近上行，在踝上八寸交出脾经之后，经膝内、大腿内侧，进入阴毛部、绕阴器，抵小腹。',
        pointIds: ['LR1', 'LR3', 'LR4', 'LR8', 'LR12'],
      },
      {
        label: '属络至巅顶',
        summary:
          '夹胃而上，归肝、联系胆，经膈、胁肋、喉后至鼻咽，连目系，上出额部，在头顶与督脉相会。',
        pointIds: ['LR13', 'LR14'],
      },
      {
        label: '面部分支',
        summary: '由目系向下进入颊内，环绕口唇内侧。',
        pointIds: [],
      },
      {
        label: '向肺分支',
        summary: '再从肝分出，上行经过膈，注入肺。',
        pointIds: [],
      },
    ],
  },
};

/* ==========================================================================
   content.js — EP01 학습 콘텐츠 · 에피소드 설정 (관리자 페이지에서 편집 가능)

   보상 화면의 「오늘 배운 것」 카드와 관리자 페이지가 같은 데이터를 읽는다.
   관리자 페이지(admin.html)에서 고친 값은 localStorage 예: ep01.content.v1 에
   저장되고, 이 파일의 기본값 위에 덮인다. → 앱을 다시 열면 바로 반영된다.
   ========================================================================== */
window.EP = window.EP || {};

EP.CONTENT_DEFAULT = {
  version: 1,
  episode: {
    series: '서울살이, 서른 날',
    no: 'EP.01',
    title: '비 오는 소담길',
    day: 'DAY 1',
    nextTitle: 'DAY 2 〈골목 끝의 작은 카페〉'
  },

  /* 오늘 배운 단어 — 장면 표시. pron 은 실제 발음([신따] 등)으로, 화면에 보이고 음성도 이대로 읽는다. */
  vocab: [
    { word: '여기', roman: 'yeogi',   ko: '이곳',           en: 'here',            scene: 'S02' },
    { word: '비',   roman: 'bi',      ko: '하늘에서 오는 물', en: 'rain',            scene: 'S02' },
    { word: '벗다', roman: 'beotda',  pron: '[벋따]', ko: '신발이나 옷을 몸에서 떼어 내다', en: 'to take off',     scene: 'S04' },
    { word: '신다', roman: 'sinda',   pron: '[신따]', ko: '신발이나 양말에 발을 넣다', en: 'to put on (shoes)', scene: 'S04' },
    { word: '열쇠', roman: 'yeolsoe', ko: '문을 여는 물건',   en: 'key',             scene: 'S05' },
    { word: '사진', roman: 'sajin',   ko: '빛으로 남긴 그림', en: 'photograph',      scene: 'S07' }
  ],

  /* 오늘 배운 문법 */
  grammar: [
    { form: '-아요 / -어요', ko: '정중하게 지금 일어나는 일을 말해요.', eg: '비가 와요.', meaning: 'It’s raining.' },
    { form: '-(으)세요',     ko: '부드럽게 부탁하거나 권해요.',        eg: '신발은 여기서 벗으세요.', meaning: 'Please take your shoes off here.' },
    { form: '입니다',        ko: '이름·신분을 정중하게 밝혀요.',        eg: '저는 하나입니다.', meaning: 'I am Hana.' }
  ],

  /* 연습 — 보상 화면의 「복습하기」에서 쓰는 콘텐츠
     speak  : 따라 말하기 문장 (단어는 위 vocab 을 함께 쓴다). [이름] 은 플레이어 이름으로 바뀐다.
     dialog : 순자의 말에 대답하기. answers 중 가장 가까운 것을 골라 피드백을 보여 준다. */
  practice: {
    speak: [
      { ko: '비가 와요.',                     en: 'It’s raining.',                        scene: 'S02' },
      { ko: '안녕하세요. 잘 부탁드립니다.',    en: 'Hello. I look forward to staying here.', scene: 'S03' },
      { ko: '감사합니다.',                     en: 'Thank you.',                            scene: 'S03' },
      { ko: '신발은 여기서 벗어요.',           en: 'You take your shoes off here.',         scene: 'S04' },
      { ko: '실내화는 저기 있어요.',           en: 'The indoor slippers are over there.',   scene: 'S04' },
      { ko: '저는 [이름]입니다.',              en: 'I am [이름].',                          scene: 'S05' },
      { ko: '네, 괜찮아요.',                   en: 'Yes, it’s fine.',                       scene: 'S08' }
    ],
    dialog: [
      { id: 'D1', scene: 'S03', title: '첫 인사',
        sun: '...누구세요?', sunEn: '…Who are you?', exp: 'surprise',
        answers: [
          { ko: '안녕하세요. 오늘 예약한 [이름]입니다.', grade: 'best', fb: '처음 만난 집주인에게 인사하고 누구인지 밝혔어요.', fbEn: 'You greeted your host and introduced yourself.' },
          { ko: '감사합니다.', grade: 'mismatch', fb: '고마움을 전하는 말이에요. 지금은 순자가 누구인지 물었으니 내 이름을 말해 보세요.', fbEn: 'This expresses thanks. Sunja asked who you are, so give your name.' },
          { ko: '안녕히 계세요.', grade: 'mismatch', fb: '내가 떠날 때 남아 있는 사람에게 하는 인사예요. 지금은 처음 만난 집주인에게 인사하고 내 이름을 소개할 때예요.', fbEn: 'Say this when leaving someone who is staying. Here, greet your host and introduce yourself.' }
        ] },
      { id: 'D2', scene: 'S05', title: '차 권하기',
        sun: '차 마실래요? 따뜻해요.', sunEn: 'Would you like some tea? It’s warm.', exp: 'smile',
        answers: [
          { ko: '네, 감사합니다.', grade: 'best', fb: '‘네’로 차를 받겠다는 뜻을 밝히고 고마움을 전했어요.', fbEn: 'You accepted the tea with “네” and thanked Sunja.' },
          { ko: '네, 다 마셨어요.', grade: 'mismatch', fb: '이미 차를 다 마셨다는 뜻이에요. 순자는 지금 차를 마실지 묻고 있어요.', fbEn: 'This says you already finished your tea. Sunja is asking if you would like some now.' },
          { ko: '응, 줘.', grade: 'casual', fb: '친구 사이의 반말이에요. 순자에게는 ‘네, 감사합니다.’가 좋아요.', fbEn: 'Casual speech. To Sunja, say ‘네, 감사합니다.’' }
        ] },
      { id: 'D3', scene: 'S05', title: '이름 말하기',
        sun: '그런데 이름이 어떻게 돼요?', sunEn: 'By the way, what’s your name?', exp: 'default',
        answers: [
          { ko: '저는 [이름]입니다.', grade: 'best', fb: '‘저는 ○○입니다’는 이름을 정중하게 밝히는 말이에요.', fbEn: '‘저는 ○○입니다’ politely states your name.' },
          { ko: '이것은 [이름]입니다.', grade: 'mismatch', fb: '‘이것은’은 사물을 가리켜요. 내 이름을 말할 때는 ‘저는’으로 시작해 보세요.', fbEn: '“이것은” points to a thing. Start with “저는” when giving your name.' },
          { ko: '저는 서울에 살아요.', grade: 'mismatch', fb: '어디에 사는지 말하는 문장이에요. 순자는 이름을 묻고 있어요.', fbEn: 'This says where you live. Sunja is asking for your name.' }
        ] },
      { id: 'D4', scene: 'S08', title: '방은 괜찮아요?',
        sun: '방은 괜찮아요? 춥지는 않고?', sunEn: 'Is the room all right? Not cold?', exp: 'worry',
        answers: [
          { ko: '네, 괜찮아요.', grade: 'best', fb: '‘괜찮아요’는 문제없다는 뜻이에요. 질문에 딱 맞는 대답이에요.', fbEn: '‘괜찮아요’ means it’s fine. A perfect answer.' },
          { ko: '네, 2층이에요.', grade: 'mismatch', fb: '방이 몇 층에 있는지 말하는 문장이에요. 순자는 방에서 지내기에 괜찮은지 묻고 있어요.', fbEn: 'This says what floor the room is on. Sunja is asking if the room is comfortable.' },
          { ko: '응, 괜찮아.', grade: 'casual', fb: '친구 사이의 반말이에요. 순자에게는 ‘네, 괜찮아요.’가 자연스러워요.', fbEn: 'Casual speech. To Sunja, say ‘네, 괜찮아요.’' }
        ] }
    ]
  },

  /* 앱 설정 — 게임 동작에 실제로 걸린다 */
  settings: {
    translateDefault: false,   /* 번역 기본 ON/OFF */
    cardAutoMs: 4500,          /* 조사 카드 자동 소멸 (ms) */
    hintAuto: false            /* 장면 진입 시 1단계 힌트 자동 열기 */
  }
};

(function () {
  const KEY = 'ep01.content.v1';

  const clone = o => JSON.parse(JSON.stringify(o));

  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(k => {
      const b = out[k], o = over[k];
      out[k] = (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o))
        ? merge(b, o)
        : o;
    });
    return out;
  }

  const Content = window.EP.Content = {
    get data() {
      let over = null;
      try { over = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      return merge(clone(EP.CONTENT_DEFAULT), over);
    },
    save(patch) {
      const next = merge(this.data, patch);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
      window.dispatchEvent(new CustomEvent('ep:content'));
      return next;
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) {}
      window.dispatchEvent(new CustomEvent('ep:content'));
      return this.data;
    },
    key: KEY
  };
})();

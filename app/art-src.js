/* ==========================================================================
   art-src.js — 이미지 경로 맵 (정본 아트가 들어오면 여기만 채운다)

   이 빌드는 노 오디오 / 임시 CSS 아트 패스입니다.
   빈 문자열이면 art.js 가 CSS 레이어(폴백)로 그립니다.
   경로를 채우면 그 자리에서 이미지로 교체되고, CSS 레이어는 그대로 폴백으로 남습니다.

   ── 배경 세트 (1080 × 1920, 세로 크롭) ──────────────────────────────
     plane      S01 비행기 창가
     alley      S02 비 오는 소담길 (변형: alleyEvening 저녁 비 골목)
     gate       S03 봄하숙 대문
     genkan     S04 현관 (신발장)
     kitchen    S05 주방·계단
     room       S06 2층 방 (변형: roomNight 밤의 방)
     photo      S07 사진 클로즈업 (사진·상자 배경)
     door       S08 방 문 앞

   ── DAY 2 대비 (이번 빌드 미사용, 키만 예약) ────────────────────
     cafeExt    골목 끝 카페 외관
     cafeInt    카페 내장

   ── 피겨 ─────────────────────────────────────────────────────────
     sunja : default / surprise / worry / smile  (하단 정렬, 투명 PNG)
     hodu  : sit / walk
     jimin : default / smile / tired            (DAY 2 예약)

   표정별 파일이 비어 있으면 default 로 자동 폴백합니다.
   경로를 넣으면 art.js 가 해당 세트·피겨만 이미지로 바꾸고,
   이미지 로드가 실패하면 CSS 레이어로 되돌아갑니다.

   파일은 프로젝트 안에 두고 상대 경로로 적으세요. 예)
     plane: ''
   ========================================================================== */
window.EP = window.EP || {};

EP.ART_SRC = {
  /* S01 배경은 영상 — 감독님 제공 상승 샷 (10s, 9:16). CSS 레이어는 폴백으로 남긴다. */
  plane:     'assets/art/plane.webp',        /* 비행기 창가 — 영상 마지막 장면에서 멈춘 그림 */
  planePhone: 'assets/art/plane_phone.webp', /* S01 휴대폰 예약 정보 (지문 01-05~01-06) */
  alley:     '',
  alleyEvening: '',
  gate:      'assets/art/gate.webp',   /* [02 영상] 초인종 영상의 마지막 장면 */
  gateFront: 'assets/art/gate_front.webp', /* S02 골목 끝 초록 대문 영상의 마지막 장면 */
  genkan:    '',
  kitchen:   '',
  room:      '',
  roomNight: '',
  photo:     'assets/art/s07_photo_1985_v2.webp',
  door:      '',

  /* DAY 2 예약 키 */
  cafeExt:   'assets/art/day2_cafe_exterior.webp',
  cafeInt:   'assets/art/day2_cafe_interior.webp'
};

/* 배경 영상 — 세트 위에 깔리는 루프 비디오 */
EP.ART_VIDEO = {
  alley: 'assets/video/s02_alley.mp4'    /* S02 소담길 골목 */
};

/* 장면 영상 — 선택지를 고르면 한 번 재생되고 끝나면 이야기가 이어진다.
   data.js 선택지에 clip:'키' 를 적으면 연결된다. 화면을 탭하면 건너뛴다.
   대사 사이에 {t:'clip', clip:'키', bg:'세트'} 를 넣으면 재생 후 배경을 그 세트로 바꾼다.
   문자열 대신 { src, endImg } 를 쓰면 영상이 끝난 뒤 그 그림을 보여 주고 탭을 기다린다. */
EP.CLIP_SRC = {
  gateWalk: 'assets/video/s02_gate_walk.mp4', /* 골목 끝 초록 대문으로 걸어간다 (선택지 앞) */
  bell:  'assets/video/s02_bell.mp4',    /* 초인종을 누른다 */
  phone: { src: 'assets/video/s02_phone.mp4', endImg: 'assets/art/gate_phone.webp' }, /* 예약 정보를 다시 확인한다 → 예약 화면 */
  cat:   'assets/video/s02_cat.mp4'      /* 대문 아래 고양이를 본다 */
};

EP.FIG_SRC = {
  sunja: {
    default:  'assets/art/sunja_expr_default_clear.webp',
    surprise: 'assets/art/sunja_expr_surprise_clear.webp',
    worry:    'assets/art/sunja_expr_worry_clear.webp',
    smile:    'assets/art/sunja_expr_smile_clear.webp'
  },
  hodu: {
    sit:  'assets/art/hodu_sit_clear.webp',
    walk: 'assets/art/hodu_walk_clear.webp',
    back: 'assets/art/hodu_back_clear.webp'
  },
  /* DAY 2 예약 — 27세 / 카페 운영자 / ENFP 기질 / 늘 웃지만 정작 자신은 지친 사람 */
  jimin: {
    default:  '',
    smile:    '',
    tired:    ''
  }
};

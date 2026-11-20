# 비 오는 소담길 · EP.01 — Netlify 배포 패키지

이 폴더를 그대로 Netlify에 올리면 사이트가 됩니다. 빌드 설정은 필요 없습니다.

## 올리는 방법 (Netlify Drop — 가장 빠름)
1. https://app.netlify.com/drop 접속
2. **이 폴더(sodamgil-app) 자체를** 드래그해서 놓습니다.
   - 폴더 안의 파일만 끌어다 놓아도 되지만, 폴더째 넣는 편이 안전합니다.
3. 몇 초 뒤 `https://<무작위이름>.netlify.app` 주소가 나옵니다. 끝.

## Git으로 올리는 경우
- Build command: (비움)
- Publish directory: `/` (저장소 루트)
- `_headers` 파일은 Netlify가 자동으로 읽어 캐시 헤더를 적용합니다.

## 주소
- 앱: `/` → index.html
- 관리자: `/admin` → admin.html (Netlify가 확장자 없이도 열어 줍니다. 안 되면 `/admin.html`)

## 지금 상태에서 알아 둘 것
- 계정·진행 데이터는 **각자 브라우저의 localStorage**에 저장됩니다. 서버 DB가 없습니다.
  → 관리자 페이지는 *그 브라우저에서 플레이한 기록*만 보입니다. 테스터들의 기록을 한곳에서 모으려면 서버(3단계)가 필요합니다.
- 승인된 사람에게만 주려면 Netlify의 **Password protection**(Site settings → Access control) 또는 팀 멤버 전용으로 잠그세요. 무료 플랜은 비밀번호 보호가 유료일 수 있으니, 무료로 하려면 링크를 아는 사람만 받는 방식이 됩니다.
- 폰트는 Google Fonts CDN을 씁니다. 오프라인 배포가 필요하면 폰트 파일을 내려받아 `app/fonts/`에 두고 CSS를 바꿔야 합니다.

## 참고 파일
`index.html.srcmap.json`, `admin.html.srcmap.json` 은 편집 도구가 남기는 부가 파일입니다. 올려도 무해하고, 지워도 사이트는 그대로 동작합니다.

## 폴더 구조
```
index.html            앱 (시작 화면 → S01~S09 → 보상 → DAY 2 예고)
admin.html, admin.js  관리자 (유저 관리 / 앱 관리 / 데이터)
app/                  스타일·엔진·스토리 데이터·오디오 합성
assets/art/           순자 표정 4종, S07 사진, DAY 2 카페 2장
_headers              Netlify 캐시 헤더
```

## 장면 영상 연결
- 배경으로 반복 재생: `app/art-src.js` 의 `EP.ART_VIDEO` (세트 키 → 영상 경로)
- 선택지를 고르면 한 번 재생: `EP.CLIP_SRC` 에 영상을 등록하고, `app/data.js` 의 선택지에 `clip:'키'` 를 적습니다.
  재생이 끝나거나 화면을 탭하면 이야기가 이어집니다.
- 대사 사이에 `{t:'clip', clip:'키', bg:'세트'}` 를 넣으면 영상 재생 후 배경이 그 세트로 바뀝니다. `{t:'bg', art:'세트'}` 는 영상 없이 배경만 바꿉니다.
- `EP.CLIP_SRC` 값을 `{ src, endImg }` 로 쓰면 영상이 끝난 뒤 그 그림을 보여 주고 탭을 기다립니다.
- 새 영상은 휴대폰용으로 줄여서 넣으세요 (예: `ffmpeg -i 원본.mp4 -c:v libx264 -crf 26 -movflags +faststart 결과.mp4`).

## 복습하기 (단어 퀴즈 · 따라 말하기 · 대화 연습)
- 보상 화면의 「복습하기」, 「오늘 배운 것」의 「복습하기」 버튼으로 엽니다. 시연할 때는 주소 끝에 `#practice` 를 붙이면 바로 열립니다 (`#practice-speak`, `#practice-dialog`).
- 단어 퀴즈 : `content.js` 의 `vocab` 으로 8문제 (듣고 뜻 고르기 / 뜻 고르기 / 한국어 고르기). 틀린 단어는 기억해 두었다가 먼저 냅니다.
- 따라 말하기 : `practice.speak` 문장 + 단어. 브라우저 음성 인식(Chrome·Safari)으로 점수와 틀린 글자를 보여 줍니다. 음성 인식이 없는 브라우저는 녹음해서 원어민 음성과 견주어 듣습니다.
- 대화 연습 : `practice.dialog` 의 순자 대사에 말하거나 골라서 대답하면, 가장 가까운 대답을 찾아 피드백(정중함·반말)을 보여 줍니다.
- 기록은 이 브라우저(localStorage `ep01.practice.v1`)에만 남습니다.

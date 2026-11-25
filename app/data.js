/* ==========================================================================
   data.js — EP01 〈비 오는 소담길〉 DAY 1 스크립트
   단일 진실 소스: assets/text/EP01_제작명세.md
   · 대사 ID와 한국어 문장은 명세 원문 그대로. 한 글자도 고치지 않는다.
   · EN 은 번역 토글용 참고 번역(스텁 아님, 실제 번역문).
   · 명세에 없는 연출 문장은 type:'NOTE'(장면 반응/학습 피드백)로만 쓰고
     대사 ID 자리에 올리지 않는다. → 스크립트와 피드백의 경계를 코드로 보장.
   ========================================================================== */
window.EP = window.EP || {};

/* ---------- 확정 설정 (연대·인물) ----------------------------------------
   스토리 기준 연대 = 1985년.
   사진 속 인물 셋은 1985년 여름, 소담길에서 만난 스무 살 무렵의 여성들이다.
   · 왼쪽   = 젊은 시절의 순자        → 현재 72세 (70대 초반)
   · 가운데 = 지민의 어머니
   · 오른쪽 = 두 사람의 옛 친구       (DAY 1 에서는 공개하지 않음)
   · 지민   = 27세 / 골목 끝 카페 운영자 / ENFP 기질 / 늘 웃지만 정작 자신은 지친 사람
   사진 뒷면 스탬프는 1985 · 08 · 17 · 소담길.
   DAY 2 전달 계약(아래 DAY2_CONTRACT)은 이 설정 위에서 쓰인다.
   ---------------------------------------------------------------------- */

/* ---------- 장면 목록 ---------- */
window.EP.SCENES = [
  {
    id:'S01', no:'S01', title:'비행기 안', sub:'새로운 시작', art:'plane', t:'00:00–00:50',
    beats:[
      {t:'line', id:'01-01', who:'NAR', ko:'서울에 도착하기까지 이제 20분.', en:'Twenty minutes until we land in Seoul.'},
      {t:'line', id:'01-02', cond:()=>false, who:'NAR', ko:'창밖으로 낯선 도시가 보인다.', en:'An unfamiliar city slides past the window.'},
      {t:'line', id:'01-03', cond:()=>false, who:'NAR', ko:'한국에서 보내는 30일. 짧다면 짧고, 길다면 긴 시간이다.', en:'Thirty days in Korea. Short if I make it short, long if I let it be long.'},
      {t:'line', id:'01-04', who:'NAR', ko:'나는 왜 이곳에 오고 싶었을까?', en:'Why did I want to come here?'},
      {t:'choice', id:'C01', title:'서울에 온 이유', type:'STORY',
       opts:[
        {ko:'새로운 곳에서 새로운 나를 만나고 싶어서.', en:'Because I wanted to meet a new version of myself somewhere new.', set:{motivation:'new'}},
        {ko:'한국에서 친구를 사귀고 싶어서.', en:'Because I wanted to make friends in Korea.', set:{motivation:'friends'}},
        {ko:'한국의 일상을 직접 경험하고 싶어서.', en:'Because I wanted to live an ordinary Korean day for myself.', set:{motivation:'life'}}
       ]},
      {t:'line', id:'', who:'PC', ko:'이번에는 조금 더 용감해져 볼까.', en:"This time, maybe I'll be a little braver."},
      {t:'bg', art:'planePhone'},
      {t:'line', id:'01-05', who:'NAR', ko:'휴대폰 화면에 숙소 예약 정보가 떠 있다.', en:'The booking confirmation is up on my phone.'},
      {t:'line', id:'01-06', who:'SYS', ko:'봄하숙 · 체크인 오늘 · 숙박 기간 30일', en:'Bom Guesthouse · Check-in today · 30 nights'},
      {t:'line', id:'01-07', who:'NAR', ko:'처음 보는 동네 이름. 소담길.', en:'A neighbourhood name I have never seen. Sodam-gil.'},
      {t:'line', id:'01-08', who:'NAR', ko:'어떤 곳일까?', en:'I wonder what kind of place it is.'}
    ]
  },

  {
    id:'S02', no:'S02', title:'소담길 입구', sub:'예상하지 못한 비', art:'alley', t:'00:50–01:40',
    beats:[
      {t:'line', id:'02-01', who:'NAR', ko:'공항에서 버스를 타고 한참을 왔다.', en:'I took the bus from the airport and rode for a long while.'},
      {t:'line', id:'02-02', who:'NAR', ko:'지도에는 목적지까지 1분 남았다고 나온다.', en:'The map says one minute to my destination.'},
      {t:'line', id:'02-03', who:'NAR', ko:'그런데 하늘에서 빗방울이 떨어지기 시작한다.', en:'Then the sky starts to drop rain.'},
      {t:'line', id:'02-04', who:'PC', ko:'어? 비가 오네.', en:'Huh? It\'s raining.'},
      {t:'line', id:'02-05', who:'NAR', ko:'골목 끝에 작은 대문이 보인다.', en:'At the end of the alley, a small gate comes into view.'},
      {t:'clip', clip:'gateWalk', bg:'gateFront'},
      {t:'line', id:'02-06', who:'PC', ko:'봄하숙... 여기인가?', en:'Bom Guesthouse... is this it?'},
      {t:'choice', id:'C02', title:'대문 앞에서', type:'ACTION',
       opts:[
        {ko:'초인종을 누른다', en:'Ring the bell', note:'집 안에서 발소리가 들린다.', noteEn:'Footsteps sound from inside the house.', then:'next', cue:'bell', clip:'bell'},
        {ko:'예약 정보를 다시 확인한다', en:'Check the booking again', note:'주소가 맞다는 것을 확인한다.', noteEn:'The address matches. This is the place.', then:'repeat', clip:'phone'},
        {ko:'대문 아래 고양이를 본다', en:'Look at the cat under the gate', note:'고양이가 울며 대문 밖으로 나온다.', noteEn:'The cat meows and comes out through the gate.', set:{met_hodu:true}, then:'next', cue:'cat', clip:'cat'}
       ]}
    ]
  },

  {
    id:'S03', no:'S03', title:'봄하숙 대문', sub:'순자와 첫 만남', art:'gate', t:'01:40–02:50',
    beats:[
      {t:'fx', art:'gateClose'},
      {t:'fig', who:'sunja', exp:'default'},
      {t:'line', id:'03-01', who:'SUN', ko:'호두야! 또 어디 가?', en:'Hodu! Where are you off to now?', exp:'surprise'},
      {t:'line', id:'03-02', who:'NAR', ko:'할머니가 고양이를 부르다 나를 발견한다.', en:'The old woman calls the cat, then notices me.'},
      {t:'line', id:'03-03', who:'SUN', ko:'...누구세요?', en:'...Who are you?', exp:'surprise'},
      {t:'choice', id:'C03A', title:'순자 · 누구세요?', titleEn:'Sunja · Who are you?', type:'LANG',
       opts:[
        {ko:'안녕하세요. 이것은 [이름]입니다.', en:'Hello. This is [이름].',
         note:'‘이것은’은 사물을 가리킬 때 써요. 내 이름을 소개할 때는 ‘저는 [이름]입니다’ 또는 ‘오늘 예약한 [이름]입니다’라고 해요.',
         noteEn:'“이것은” refers to a thing. To introduce yourself, say “저는 [이름]입니다” or “오늘 예약한 [이름]입니다”.',
         say:'안녕하세요. 오늘 예약한 [이름]입니다.', sayEn:'Hello. I’m [이름]. I have a reservation for today.'},
        {ko:'안녕하세요. 오늘 예약한 [이름]입니다', en:'Hello. I’m [이름]. I have a reservation for today.',
         note:'좋아요. 인사하고 예약한 사람의 이름을 밝혔어요.', noteEn:'Good. You greeted Sunja and gave the name on the reservation.',
         say:'안녕하세요. 오늘 예약한 [이름]입니다.'}
       ]},
      {t:'line', id:'03-05', who:'SUN', ko:'아, 오늘 오는 사람이구나.', en:'Oh. You\'re the one coming today.', exp:'default'},
      {t:'line', id:'03-06', who:'NAR', ko:'할머니가 내 젖은 어깨와 캐리어를 본다.', en:'Her eyes go to my wet shoulders and my suitcase.'},
      {t:'line', id:'03-07', who:'SUN', ko:'거기 있어 봐요.', en:'Wait right there.', exp:'default'},
      {t:'fig', who:'sunja', exp:'default', out:true},
      {t:'wait', ms:1200},
      {t:'fig', who:'sunja', exp:'smile'},
      {t:'prop', name:'towel'},
      {t:'line', id:'03-08', who:'SUN', ko:'자, 이거.', en:'Here. Take this.', exp:'smile'},
      {t:'line', id:'03-09', who:'NAR', ko:'할머니가 내게 수건을 건넨다.', en:'She holds out a towel to me.'},
      {t:'line', id:'03-10', cond:()=>false, who:'SUN', ko:'비 많이 맞았네. 얼른 들어와요.', en:'You got soaked. Come in, quickly.', exp:'worry'},
      {t:'choice', id:'C03', title:'수건을 받으며 뭐라고 할까요?', titleEn:'What do you say when you receive the towel?', type:'LANG',
       opts:[
        {ko:'안녕히 계세요', en:'Goodbye.', set:{sunja_first_impression:'polite'},
         note:'‘안녕히 계세요’는 내가 떠날 때 남아 있는 사람에게 하는 인사예요. 수건을 받았으니 고마움을 전해 보세요.', noteEn:'Say this when leaving someone who is staying. Here, thank Sunja for the towel.',
         say:'감사합니다.', sayEn:'Thank you.'},
        {ko:'감사합니다', en:'Thank you.', say:'감사합니다.', set:{sunja_first_impression:'grateful'},
         note:'짧지만 분명한 감사. 순자의 눈이 조금 부드러워진다.', noteEn:'A short, clear thanks. Her eyes soften.', exp:'smile'},
        {ko:'고마워', en:'Thanks.', set:{sunja_first_impression:'casual'},
         note:'‘고마워’는 친한 사이에서 쓰는 반말이에요. 처음 만난 집주인에게는 ‘감사합니다’가 자연스러워요.', noteEn:'This is casual. With a host you have just met, use the polite “감사합니다.”',
         say:'감사합니다.', sayEn:'Thank you.'}
       ]},
      {t:'line', id:'03-11', who:'SUN', ko:'나는 순자예요. 이 집 주인이에요.', en:'I\'m Sunja. I own this house.', exp:'default'},
      {t:'line', id:'03-12', who:'SUN', ko:'이름은 예약할 때 봤어요.', en:'I saw your name when you booked.', exp:'default'},
      {t:'line', id:'03-13', who:'SUN', ko:'가방 무겁겠네. 이쪽으로 와요.', en:'That bag must be heavy. Come this way.', exp:'smile'},
      {t:'line', id:'03-14', who:'NAR', ko:'순자가 대문을 활짝 열어 준다.', en:'Sunja swings the gate wide open.'},
      {t:'fx', art:'gateOpen'},
      {t:'wait', ms:900}
    ]
  },

  {
    id:'S04', no:'S04', title:'봄하숙 현관', sub:'신발을 벗어 주세요', art:'genkan', t:'02:50–03:40',
    beats:[
      {t:'fig', who:'sunja', exp:'default', side:'right'},
      {t:'line', id:'04-01', who:'SUN', ko:'신발은 여기서 벗어요.', en:'You take your shoes off here.', core:true},
      {t:'line', id:'04-02', who:'SUN', ko:'실내화는 저기 있어요.', en:'The indoor slippers are over there.', core:true},
      {t:'line', id:'04-03', who:'NAR', ko:'할머니가 신발장 옆을 가리킨다.', en:'She points beside the shoe cabinet.'},
      {t:'interact', kind:'shoes', id:'A01', title:'무엇을 할까요?'}
    ]
  },

  {
    id:'S05', no:'S05', title:'주방과 계단', sub:'이름을 알려 주세요', art:'kitchen', t:'03:40–04:40',
    beats:[
      {t:'fig', who:'sunja', exp:'smile'},
      {t:'line', id:'05-01', who:'SUN', ko:'차 마실래요? 따뜻해요.', en:'Would you like some tea? It\'s warm.', exp:'smile'},
      {t:'prop', name:'tea'},
      {t:'line', id:'05-02', who:'NAR', ko:'작은 컵에서 김이 올라온다.', en:'Steam rises from a small cup.'},
      {t:'line', id:'05-03', who:'PC', ko:'감사합니다.', en:'Thank you.'},
      {t:'line', id:'05-04', who:'SUN', ko:'그런데 이름이 어떻게 돼요?', en:'By the way — what was your name?'},
      {t:'line', id:'05-05', who:'SUN', ko:'예약할 때 봤는데, 내가 또 잊어버렸네.', en:'I saw it when you booked, but I\'ve forgotten again.'},
      {t:'interact', kind:'compose', id:'L02', title:'자기소개'},
      {t:'line', id:'05-06', who:'PC', ko:'저는 [이름]입니다.', en:'I am [이름].'},
      {t:'line', id:'05-07', who:'SUN', ko:'그래요, [이름] 씨. 기억할게요.', en:'I see, [이름]. I\'ll remember it.', exp:'smile'},
      {t:'line', id:'05-08', who:'SUN', ko:'방은 2층이에요. 이 열쇠 가져가요.', en:'Your room is upstairs. Take this key.'},
      {t:'set', patch:{room_key:true}},
      {t:'prop', name:'key'},
      {t:'line', id:'05-09', who:'NAR', ko:'순자가 작은 열쇠를 건넨다.', en:'Sunja hands me a small key.'},
      {t:'line', id:'05-10', who:'SUN', ko:'불편한 거 있으면 말해요.', en:'If anything is uncomfortable, tell me.'},
      {t:'line', id:'05-11', who:'SUN', ko:'아, 그리고...', en:'Ah, and also...', exp:'worry'},
      {t:'line', id:'05-12', who:'NAR', ko:'순자가 잠깐 말을 멈춘다.', en:'Sunja stops mid-sentence.'},
      {t:'line', id:'05-13', who:'SUN', ko:'아니에요. 올라가서 쉬어요.', en:'Never mind. Go up and rest.', exp:'default'}
    ]
  },

  {
    id:'S06', no:'S06', title:'2층 방', sub:'나만의 작은 공간', art:'room', t:'04:40–05:50',
    beats:[
      {t:'line', id:'06-01', who:'NAR', ko:'2층 끝에 작은 방이 있다.', en:'At the end of the second floor there is a small room.'},
      {t:'line', id:'06-02', who:'NAR', ko:'문을 열자 오래된 나무 냄새가 난다.', en:'The door opens onto the smell of old wood.'},
      {t:'line', id:'06-03', who:'NAR', ko:'작은 침대, 책상, 창가의 화분.', en:'A small bed, a desk, a plant by the window.'},
      {t:'line', id:'06-04', who:'PC', ko:'생각보다 괜찮은데?', en:'Better than I expected?'},
      {t:'line', id:'06-05', who:'NAR', ko:'이제 이곳이 한 달 동안 내 방이다.', en:'For a month, this is my room.'},
      {t:'interact', kind:'room', id:'A02', title:'방 둘러보기'},
      {t:'line', id:'06-06', who:'PC', ko:'이건 뭐지?', en:'What is this?'},
      {t:'line', id:'06-07', who:'NAR', ko:'상자 위에 얇게 먼지가 쌓여 있다.', en:'A thin layer of dust has settled on the lid.'},
      {t:'line', id:'06-08', who:'NAR', ko:'뚜껑을 열자 사진 한 장이 나온다.', en:'I lift the lid. Inside is a single photograph.', cue:'box'}
    ]
  },

  {
    id:'S07', no:'S07', title:'오래된 사진', sub:'세 가지 단서', art:'photo', t:'05:50–07:10',
    beats:[
      {t:'line', id:'07-01', who:'NAR', ko:'낡은 사진 속에서 세 사람이 웃고 있다.', en:'Three people are laughing in an old photograph.'},
      {t:'line', id:'07-02', who:'PC', ko:'오래된 사진이네.', en:'This photo is old.'},
      {t:'line', id:'07-03', who:'NAR', ko:'사진에는 이상하게 눈에 띄는 부분이 있다.', en:'Something in it catches my eye.'},
      {t:'interact', kind:'photo', id:'I01', title:'사진 조사'},
      {t:'choice', id:'C07R', title:'사진 뒷면의 사람들은 언제 다시 만나기로 했어요?', titleEn:'When did they agree to meet again?', type:'LANG', practiceSpeech:false,
       opts:[
        {ko:'오늘', en:'Today', note:'사진 뒷면의 ‘30일 후’는 오늘부터 30일이 지난 때예요.', noteEn:'“30일 후” means thirty days from today.'},
        {ko:'30일 후', en:'In thirty days', note:'맞아요. ‘30일 후, 여기서 다시 만나자’라고 적혀 있어요.', noteEn:'Right. It says, “Let’s meet here again in thirty days.”'},
        {ko:'30일 전', en:'Thirty days ago', note:'‘전’은 과거, ‘후’는 그보다 나중을 뜻해요. 사진에는 ‘30일 후’라고 적혀 있어요.', noteEn:'“전” means before, and “후” means after. The photo says “30일 후”.'}
       ]},
      {t:'line', id:'07-05', who:'NAR', ko:'내가 여기 머무는 기간도 30일이다.', en:'Thirty days is exactly how long I\'m staying.'},
      {t:'line', id:'07-06', who:'NAR', ko:'우연일까?', en:'Is that a coincidence?'},
      {t:'line', id:'07-07', who:'SFX', ko:'똑, 똑.', en:'Knock, knock.', cue:'knock'},
      {t:'line', id:'07-08', who:'SUN', ko:'[이름] 씨, 잠깐 괜찮아요?', en:'[이름], do you have a moment?'}
    ]
  },

  {
    id:'S08', no:'S08', title:'순자의 반응', sub:'사진에 대해 말할까?', art:'door', t:'07:10–08:15',
    beats:[
      {t:'fx', art:'doorOpen'},
      {t:'fig', who:'sunja', exp:'default', side:'right'},
      {t:'line', id:'08-01', who:'NAR', ko:'순자가 문을 조금 열고 얼굴을 내민다.', en:'Sunja opens the door a little and leans in.'},
      {t:'line', id:'08-02', who:'SUN', ko:'방은 괜찮아요? 춥지는 않고?', en:'Is the room all right? Not cold?', exp:'worry'},
      {t:'line', id:'08-03', who:'PC', ko:'네, 괜찮아요.', en:'Yes, it\'s fine.'},
      {t:'line', id:'08-04', who:'SUN', ko:'다행이네. 필요한 거 있으면 말해요.', en:'Good. Tell me if you need anything.', exp:'smile'},
      {t:'line', id:'08-05', who:'NAR', ko:'순자의 시선이 책상 쪽으로 향한다.', en:'Her gaze drifts toward the desk.'},
      {t:'line', id:'08-06', who:'SUN', ko:'...그 상자는 뭐예요?', en:'...What is that box?', exp:'surprise'},
      {t:'choice', id:'C04', title:'사진을 보여줄까?', type:'STORY',
       opts:[
        {ko:'"여기 사진이 있어요." 하며 보여준다', en:'"There\'s a photo in here." — and show her.', say:'여기 사진이 있어요.', sayEn:'There\'s a photo in here.', set:{photo_response:'show'},
         note:'사진을 꺼내 순자에게 건넨다.', noteEn:'I take the photo out and hand it to her.'},
        {ko:'"이 사진 누구 거예요?" 하고 묻는다', en:'"Whose photo is this?" — and ask.', say:'이 사진 누구 거예요?', sayEn:'Whose photo is this?', set:{photo_response:'ask'},
         note:'사진을 든 채로 묻는다. 순자가 대답을 고른다.', noteEn:'I ask, still holding the photo. She weighs her answer.'},
        {ko:'"그냥 상자예요." 하고 사진을 감춘다', en:'"It\'s just a box." — and hide it.', say:'그냥 상자예요.', sayEn:'It\'s just a box.', set:{photo_response:'hide'},
         note:'사진을 상자 안으로 밀어 넣는다.', noteEn:'I slide the photo back into the box.'}
       ]},
      /* 후속 A — 보여주거나 물은 경우 */
      {t:'line', id:'08-07A', who:'SUN', ko:'오래전에 여기 살던 사람들이에요.', en:'People who lived here a long time ago.', cond:s=>s.photo_response!=='hide', exp:'default'},
      {t:'line', id:'08-08A', who:'PC', ko:'아는 사람들이에요?', en:'People you knew?', cond:s=>s.photo_response!=='hide'},
      {t:'line', id:'08-09A', who:'SUN', ko:'...그렇죠.', en:'...That\'s right.', cond:s=>s.photo_response!=='hide', exp:'worry'},
      {t:'line', id:'08-10A', who:'NAR', ko:'순자가 잠깐 사진을 바라본다.', en:'Sunja looks at the photo for a while.', cond:s=>s.photo_response!=='hide'},
      {t:'line', id:'08-11A', who:'SUN', ko:'오늘은 피곤할 테니까 쉬어요. 나중에 얘기해요.', en:'You must be tired today. Rest. We\'ll talk later.', cond:s=>s.photo_response!=='hide', exp:'default'},
      /* 후속 B — 감춘 경우 */
      {t:'line', id:'08-07B', who:'SUN', ko:'아까 그 상자, 원래 여기 없었는데...', en:'That box — it wasn\'t here before...', cond:s=>s.photo_response==='hide', exp:'worry'},
      {t:'line', id:'08-08B', who:'NAR', ko:'순자가 말을 멈춘다.', en:'Sunja stops herself.', cond:s=>s.photo_response==='hide'},
      {t:'line', id:'08-09B', who:'SUN', ko:'아니에요. 오늘은 쉬어요.', en:'Never mind. Rest today.', cond:s=>s.photo_response==='hide', exp:'default'},
      {t:'line', id:'08-10B', who:'NAR', ko:'순자는 문을 닫기 전에 방을 한 번 더 바라본다.', en:'Before she closes the door, she looks around the room once more.', cond:s=>s.photo_response==='hide'},
      {t:'fx', art:'doorOpen', off:true, cond:s=>true}
    ]
  },

  {
    id:'S09', no:'S09', title:'밤의 방', sub:'알 수 없는 메시지', art:'roomNight', t:'08:15–09:00',
    beats:[
      {t:'line', id:'09-01', who:'NAR', ko:'순자가 내려가고, 방 안이 조용해졌다.', en:'Sunja goes downstairs, and the room falls quiet.'},
      {t:'line', id:'09-02', who:'NAR', ko:'창밖에는 비가 그쳤다.', en:'Outside the window, the rain has stopped.'},
      {t:'line', id:'09-03', who:'NAR', ko:'낯선 곳이지만 조금은 마음이 놓인다.', en:'It\'s an unfamiliar place, but I feel a little at ease.'},
      {t:'line', id:'09-04', who:'NAR', ko:'사진을 다시 상자에 넣으려는 순간 휴대폰이 울린다.', en:'Just as I move to put the photo back, my phone buzzes.'},
      {t:'line', id:'09-05', who:'SFX', ko:'띵.', en:'Ding.', cue:'notify'},
      {t:'line', id:'09-06', who:'MSG', ko:'봄하숙에 잘 도착했어요?', en:'Did you arrive at Bom Guesthouse safely?'},
      {t:'line', id:'09-07', who:'PC', ko:'누구지?', en:'Who is this?'},
      {t:'line', id:'09-08', who:'MSG', ko:'혹시 방에서 오래된 사진 한 장 못 봤어요?', en:'By any chance, did you see an old photograph in the room?'},
      {t:'line', id:'09-09', who:'NAR', ko:'나는 사진과 휴대폰 화면을 번갈아 바라본다.', en:'I look from the photo to the screen and back.'},
      {t:'line', id:'09-10', who:'NAR', ko:'이 사람은 사진이 있다는 걸 어떻게 알지?', en:'How does this person know the photo is here?'},
      {t:'choice', id:'C05', title:'답장하기', type:'STORY',
       opts:[
        {ko:'"누구세요?"', en:'"Who is this?"', set:{reply:'identity'},
         note:'답장을 보냈다. 화면 위에 "입력 중..." 이 잠깐 떠오른다.', noteEn:'Sent. "Typing..." appears on the screen, then fades.'},
        {ko:'"사진이 있어요."', en:'"Yes, there is a photo."', set:{reply:'photo'},
         note:'답장을 보냈다. 읽음 표시가 뜨고, 한참 동안 답이 없다.', noteEn:'Sent. It shows as read — and then nothing, for a long moment.'},
        {ko:'답장하지 않는다', en:'Don\'t reply', set:{reply:'wait'},
         note:'휴대폰을 뒤집어 놓는다. 화면 불빛이 천장에 번진다.', noteEn:'I set the phone face down. Its glow spreads on the ceiling.'}
       ]}
    ]
  }
];

/* ---------- 명세 §6 DAY 2 전달 계약 (데이터만) ---------- */
window.EP.DAY2 = [
  {key:'motivation', when:s=>s.motivation==='friends', who:'지민', ko:'서울에서 친구 많이 사귀고 싶어요?', en:'Do you want to make lots of friends in Seoul?'},
  {key:'motivation', when:s=>s.motivation==='new',     who:'지민', ko:'여기서 하고 싶은 일 있어요?', en:'Is there something you want to do here?'},
  {key:'met_hodu', when:s=>s.met_hodu===true,          who:'지민', ko:'호두가 벌써 인사했구나!', en:'So Hodu already said hello to you!'},
  {key:'photo_response', when:s=>s.photo_response==='show', who:'순자', ko:'어제 그 사진 말인데...', en:'About that photo from yesterday...'},
  {key:'photo_response', when:s=>s.photo_response==='ask',  who:'—', ko:'순자가 주인공의 호기심을 기억', en:'Sunja remembers your curiosity', muted:true},
  {key:'photo_response', when:s=>s.photo_response==='hide', who:'—', ko:'지민이 사진 이야기를 꺼냈을 때 주인공이 놀라는 반응', en:'When Jimin brings up the photo, you are caught off guard', muted:true},
  {key:'reply', when:s=>s.reply==='identity', who:'지민', ko:'아, 어제 문자 보낸 사람 저예요.', en:'Ah — I\'m the one who texted you yesterday.'},
  {key:'reply', when:s=>s.reply==='photo',    who:'—', ko:'발신자가 사진 이야기를 먼저 꺼냄', en:'The sender brings up the photo first', muted:true},
  {key:'reply', when:s=>s.reply==='wait',     who:'지민', ko:'어제 문자 보냈는데 못 봤어요?', en:'I texted you yesterday — didn\'t you see it?'}
];

/* ---------- 보상 화면 ---------- */
window.EP.REWARD = {
  memory:{k:'첫날의 추억', v:'봄하숙에 도착한 날', s:'A rainy gate, a towel, a warm cup'},
  people:[{k:'만난 인물', v:'순자', s:'봄하숙 주인 · 70대 초반'}],
  animal:{k:'만난 동물', v:'호두', s:'대문 틈으로 먼저 나온 고양이'},
  items:[{k:'획득 아이템', v:'방 열쇠', s:'2층 끝, 작은 방'},{k:'획득 아이템', v:'오래된 사진', s:'세 사람, 그리고 30일'}],
  place:{k:'새 장소', v:'봄하숙', s:'소담길 끝, 초록 대문'},
  next:{k:'다음 이야기', v:'DAY 2 〈골목 끝의 작은 카페〉', s:''}
};

/* ---------- 화자 표기 ---------- */
window.EP.WHO = {
  NAR:{label:'', cls:'NAR'},
  PC:{label:'나', cls:'PC'},
  SUN:{label:'순자', cls:'SUN'},
  MSG:{label:'모르는 번호', cls:'MSG'},
  SYS:{label:'시스템', cls:'SYS'},
  SFX:{label:'', cls:'SFX'}
};

/* ---------- 사운드 훅 (이번 빌드 무음) ---------- */
window.EP.SOUND_CUES = [
  {id:'rain',       at:'S02 배경 진입',     file:'bgm/rain-loop (2차)'},
  {id:'footsteps',  at:'C02 초인종 반응',   file:'sfx/footsteps-inside'},
  {id:'bell',       at:'C02 초인종',        file:'sfx/doorbell'},
  {id:'cat',        at:'C02 고양이',        file:'sfx/cat-meow'},
  {id:'gate',       at:'S03 대문 열림',     file:'sfx/gate-wood'},
  {id:'box',        at:'S06 상자 열림',     file:'sfx/box-lid'},
  {id:'knock',      at:'S07 07-07',         file:'sfx/knock-2'},
  {id:'notify',     at:'S09 09-05',         file:'sfx/phone-ding'},
  {id:'theme_day',  at:'S01·S05 배경',      file:'bgm/soft-piano (2차)'},
  {id:'theme_night',at:'S09 배경',          file:'bgm/night-room (2차)'}
];

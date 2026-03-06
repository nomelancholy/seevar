목표: 사용자가 이의 제기 순간, 공지, 심판 한줄평에 댓글 혹은 답글을 달거나 심판 한줄평을 저장하기 전, 자체 금칙어 리스트와 OpenAI Moderation API를 결합한 2단계 필터링 시스템을 구축한다.

1. 데이터 준비 (금칙어 및 치환 문구)
   먼저 아래의 BAD_WORDS_DATA와 DOG_SOUNDS, CUTE_WORDS를 시스템에 등록해줘.

JavaScript
export const BAD*WORDS_DATA = {
koreanDirect: ["개새", "씨발", "시발", "병신", "ㅂㅅ", "ㅅㅂ", "존나", "졸라", "미친놈", "미친년", "지랄", "등신", "호로", "씨벌", "시벌", "개소리", "엠창", "느금", "니기미", "잡놈", "쌍놈", "호구", "찐따", "병맛", "닥쳐", "꺼져", "쑤레기", "쓰레기", "개년", "개놈", "개자식", "씨부랄", "씨바", "씨빨", "씨팔", "개뇬", "개시끼", "니미", "염병", "젠장", "좆", "좃", "조까", "좆까", "좆같", "좃같", "씌바", "씌팔", "띠발", "띠바", "시뱔", "씨뱔", "뵹신", "븅신", "븡신"],
englishDirect: ["fuck", "fack", "fuxk", "fck", "shit", "damn", "hell", "asshole", "bitch", "bastard", "dick", "pussy", "suck", "faggot", "retard", "motherfucker", "sonofabitch", "jerk", "slut", "whore", "piss", "stfu"],
kLeagueSlurs: ["매수", "개천", "북패", "남패", "닭트", "개랑", "홍어", "과메기", "감자", "패륜", "범죄", "연맹딸", "심판딸", "적폐", "틀딱", "버러지"],
refereeSpecific: ["눈깔", "장님", "눈없냐", "얼마받았냐", "계좌", "뒷돈"],
variations: ["18놈", "18년", "28놈", "18새끼", "시1발", "씨2발", "존1나", "병1신", "씨.발", "씨@발", "씨*발", "시\*발", "ㅂ.ㅅ", "ㅅ.ㅂ", "존\_나", "지-랄", "sh!t", "a$$hole", "b!tch", "wtf", "omfg", "凸", "🖕"]
};

const DOG_SOUNDS = ["멍멍! 멍멍멍!", "왈! 왈왈!", "컹! 컹컹!", "앙앙! 앙앙앙!", "끼잉... 낑...", "바우와우! 왈왈!", "크르르... 컹!", "깨갱! 깽깽!", "먕먕! 먕!"];

const CUTE_WORDS = [
"사랑해요❤️", "오늘 판정 완전 럭키비키잔아🍀", "심판님 눈동자에 건배..✨", "K리그 사랑해⚽️",
"오늘따라 당신의 판정이 제 심장을 뛰게 하네요.", "옳소! 참으로 지당하신 판결이옵니다.",
"공정함의 화신! 솔로몬도 울고 갈 명판정! 😇", "정정당당 See VAR! 깨끗한 리그의 자부심!"
]; 2. 필터링 로직 구현 (lib/moderation.js)
다음 순서로 작동하는 cleanText 함수를 만들어줘.

1단계 (자체 금칙어 필터링):

BAD_WORDS_DATA의 모든 단어를 검사해.

걸리는 단어가 있다면 해당 단어만 DOG_SOUNDS 중 하나로 랜덤하게 치환해.

단어 치환이 일어났다면 isModified = true로 표시해.

2단계 (OpenAI Moderation API):

1단계를 통과했거나 수정된 문장을 OpenAI Moderation API로 보내 폭력성을 판단해.

flagged가 true이거나 특정 수치 이상이면, 문장 전체를 CUTE_WORDS 중 하나로 랜덤하게 교체해.

이 경우에도 isModified = true로 표시해.

결과 반환:

isModified가 true라면 문구 하단에 (커뮤니티 가이드 위반으로 일부 혹은 전체 수정된 글입니다)라는 안내 메시지를 강제로 추가해줘.

3. API 연동 및 수정 로직
   댓글 저장 API(POST)에서 저장 직전에 위 함수를 실행해.

재등록 로직: 사용자가 글을 수정해서 다시 PUT/PATCH 요청을 보낼 때도 동일한 필터링을 거치게 해줘. 만약 수정된 글이 위 테스트를 모두 통과(isModified = false)하면 안내 메시지 없이 깨끗하게 저장되도록 해줘.

4. 예외 처리 및 환경 변수
   OPENAI_API_KEY 환경변수를 사용해.

API 호출 실패 시 서비스 중단을 막기 위해 원문을 반환하는 try-catch를 넣어줘.

5. OpenAI Moderation 결과 확인 (디버깅)
   구현: `lib/filters/profanity.ts`의 `callOpenAIModeration`에서 다음 경우에 서버 로그로 결과를 출력한다.
   - `NODE_ENV=development` 이거나
   - `.env`에 `DEBUG_MODERATION=1` 을 넣은 경우
   로그 예: `[Moderation] { inputPreview, flagged, categories, category_scores }`
   프로덕션에서도 Moderation 결과를 보고 싶으면 `DEBUG_MODERATION=1`만 설정하면 된다.

export const BAD_WORDS_DATA = {
  // 1. 직접적인 한국어 욕설 (Direct Profanity)
  koreanDirect: [
    "개새",
    "씨발",
    "씨댕",
    "시댕",
    "시벌",
    "씨벌",
    "씨뻘",
    "시발",
    "병신",
    "ㅂㅅ",
    "ㅅㅂ",
    "존나",
    "졸라",
    "미친놈",
    "미친년",
    "지랄",
    "등신",
    "호로",
    "씨벌",
    "시벌",
    "개소리",
    "엠창",
    "느금",
    "니기미",
    "잡놈",
    "쌍놈",
    "호구",
    "찐따",
    "병맛",
    "닥쳐",
    "꺼져",
    "쑤레기",
    "쓰레기",
    "개년",
    "개놈",
    "개자식",
    "씨부랄",
    "씨바",
    "씨빨",
    "씨팔",
    "개뇬",
    "개시끼",
    "니미",
    "염병",
    "젠장",
    "좆",
    "좃",
    "조까",
    "좆까",
    "좆같",
    "좃같",
    "씌바",
    "씌팔",
    "띠발",
    "띠바",
    "시뱔",
    "씨뱔",
    "뵹신",
    "븅신",
    "븡신",
    "불알",
  ],

  // 2. 직접적인 영어 욕설 (English Profanity)
  englishDirect: [
    "fuck",
    "fack",
    "fuxk",
    "fck",
    "shit",
    "damn",
    "hell",
    "asshole",
    "bitch",
    "bastard",
    "dick",
    "pussy",
    "suck",
    "faggot",
    "retard",
    "motherfucker",
    "sonofabitch",
    "jerk",
    "slut",
    "whore",
    "piss",
    "stfu",
  ],

  // 3. K리그 팬덤 및 지역 비하 (K-League Slurs)
  kLeagueSlurs: [
    "매수",
    "개천",
    "북패",
    "남패",
    "닭트",
    "개랑",
    "홍어",
    "과메기",
    "감자",
    "패륜",
    "범죄",
    "적폐",
    "틀딱",
    "버러지",
    "중패",
    "매북",
    "준산",
    "고철",
    "징구",
    "낑깡",
    "매남",
    "군바리",
    "괴랜",
    "짭수",
  ],

  // 4. 위협·공격 표현 (Threats / Aggression) — API가 한글에서 낮게 나올 수 있어 1단계에서 차단
  threatsAggression: [
    "나가 뒤져라",
    "나가뒤져라",
    "뒤져라",
    "뒤져",
    "뒤진다",
    "나가뒤져",
    "나가 뒤져",
    "죽어라",
    "죽어",
    "죽여",
    "뒤질",
    "뒤지게",
    "꺼지라",
    "닥치라",
  ],

  // 5. 심판 타겟 비하 및 음모론 (Referee Specific)
  refereeSpecific: [
    "눈깔",
    "장님",
    "눈알",
    "눈없냐",
    "얼마받았냐",
    "계좌",
    "뒷돈",
    "심판놈",
  ],

  // 6. 숫자를 섞거나 특수문자를 이용한 변형 (Variations)
  variations: [
    "18놈",
    "18년",
    "28놈",
    "18새끼",
    "시1발",
    "씨2발",
    "존1나",
    "병1신",
    "씨.발",
    "씨@발",
    "씨*발",
    "씨_발",
    "시*발",
    "ㅂ.ㅅ",
    "ㅅ.ㅂ",
    "존_나",
    "지-랄",
    "sh!t",
    "a$$hole",
    "b!tch",
    "wtf",
    "omfg",
    "凸",
    "🖕",
  ],
} as const;

// 모든 단어를 하나의 배열로 합쳐서 내보냄 (필터링 로직용). 긴 표현 우선 치환을 위해 길이 내림차순 정렬
export const ALL_BAD_WORDS: string[] = [
  ...Object.values(BAD_WORDS_DATA).flat(),
].sort((a, b) => b.length - a.length);

/** 1단계 치환용: 금칙어에 걸리면 해당 구간을 이 중 하나로 랜덤 치환 */
export const DOG_SOUNDS = [
  "멍멍!",
  "왈왈!",
  "컹컹!",
  "낑낑",
  "바우와우!",
  "깽깽!",
  "먕먕!",
  "냐옹!",
  "미야오",
];

/** 2단계(OpenAI Moderation) 위반 시 문장 전체를 이 중 하나로 교체 */
export const CUTE_WORDS = [
  "화가 날 땐 자리에서 일어나 가볍게 스쿼트 10회를 해보세요. 허벅지의 근육통이 분노를 잊게 해줄 거예요! 🏋️",
  "지금 바로 근처 화분에 물을 줘보세요. 생명을 돌보는 행위는 당신의 공격성을 부드럽게 가라앉혀 줍니다. 🌱",
  "눈을 감고 4초간 숨을 들이마시고 7초간 참은 뒤 8초간 내뱉어 보세요. 부교감 신경이 활성화되어 평온해진답니다. 🌬️",
  "주변에 있는 물건 3개의 이름을 소리 내어 불러보세요. 시각적 자극에 집중하면 뇌의 분노 회로가 잠시 멈춘답니다! 👀",
  "색종이를 가져와서 잘게 찢어보세요. 손끝의 감각에 집중하다 보면 어느새 마음이 차분해질 거예요. ✂️",
  "좋아하는 노래를 틀고 1분간 막춤을 춰보세요! 몸을 움직이면 스트레스 호르몬인 코르티솔 수치가 뚝 떨어집니다. 💃",
  "지금 바로 찬물로 세수를 해보세요. 급격한 온도 변화는 과열된 뇌를 식히고 이성적인 사고를 도와준답니다. 💧",
  "연필을 잡고 종이에 낙서를 해보세요. 의미 없는 선들이 당신의 복잡한 감정을 밖으로 배출해 줄 거예요. ✏️",
  "창문을 활짝 열고 신선한 공기를 마셔보세요. 산소 공급이 원활해지면 답답했던 가슴이 뻥 뚫릴 거예요! 🪟",
  "화가 날 땐 귀여운 강아지나 고양이 영상을 검색해 보세요. '귀여움'은 뇌의 보상 체계를 자극해 즉각적인 행복을 줍니다. 🐱",
  "지금 신고 있는 양말의 감촉에 집중해 보세요. 발끝의 감각을 느끼는 것만으로도 현재의 분노에서 벗어날 수 있습니다. 🧦",
  "자리에서 일어나 기지개를 쭉 펴보세요! 근육을 이완시키면 뇌는 '이제 안전하구나'라고 인식해 안정을 찾습니다. 🙆",
  "주변의 먼지를 한 번 닦아보는 건 어떨까요? 환경을 정리하면 혼란스러웠던 마음도 함께 정리된답니다. ✨",
  "거울을 보고 억지로라도 '치즈~' 하고 웃어보세요. 안면 근육의 움직임만으로도 뇌는 행복하다고 착각하게 됩니다. 😁",
  "화가 날 땐 가장 아끼는 향수를 뿌려보세요. 후각은 감정 조절 중추와 직접 연결되어 있어 효과가 아주 빠릅니다. 💐",
  "지금 바로 따뜻한 물 한 잔을 천천히 마셔보세요. 목을 타고 내려가는 온기가 당신의 긴장을 풀어줄 거예요. 🍵",
  "종이에 지금 화나는 이유를 적고 비행기를 접어 날려보세요. 감정을 객관화하면 통제력이 생깁니다. ✈️",
  "손가락 끝으로 머리를 톡톡 두드려 보세요. 가벼운 자극은 혈액 순환을 돕고 복잡한 생각을 정리해 줍니다. 💆",
  "화가 날 땐 좋아하는 책의 한 페이지를 필사해 보세요. 글자에 집중하다 보면 분노는 어느새 사라질 거예요. 📖",
  "지금 이 순간, 당신의 심장 박동을 느껴보세요. 살아있음을 느끼는 것만으로도 비난은 무의미해진답니다. ❤️",
  "화가 날 땐 마시멜로를 구워보세요. 겉바속촉 달콤함이 당신의 마음을 사르르 녹여줄 거예요. 🔥",
  "초콜릿의 페닐에틸아민 성분은 사랑에 빠졌을 때와 같은 행복감을 준답니다. 지금 한 입 어때요? 🍫",
  "따뜻한 우유에 꿀 한 스푼! 트립토판 성분이 당신의 날카로운 신경을 부드럽게 안정시켜 줄 거예요. 🍯",
  "바나나에는 '행복 호르몬' 세로토닌을 만드는 비타민 B6가 풍부해요. 우리 같이 바나나 먹고 웃어봐요! 🍌",
  "블루베리의 안토시아닌은 스트레스를 줄여준답니다. 상큼한 블루베리 한 알로 기분을 전환해보세요. 🫐",
  "연어의 오메가-3는 불안감을 낮춰준대요. 맛있는 연어 초밥 한 점이면 마음이 평온해질 거예요. 🍣",
  "매콤달콤한 떡볶이는 캡사이신이 엔도르핀을 돌게 해서 스트레스를 확 날려준답니다! 🌶️",
  "딸기 생크림 케이크 레시피: 푹신한 시트에 달콤한 크림을 듬뿍! 상상만 해도 행복해지지 않나요? 🍰",
  "견과류의 마그네슘은 근육의 긴장을 풀어준답니다. 오독오독 씹으며 화를 가라앉혀 보세요. 🥜",
  "아보카도의 풍부한 영양소는 뇌를 보호하고 기분을 좋게 만들어준대요. 숲속의 버터와 함께 힐링해요! 🥑",
  "상큼한 레모네이드 한 잔! 비타민 C가 피로를 씻어주고 당신의 미소를 되찾아 줄 거예요. 🍋",
  "달콤한 푸딩 만드는 법: 우유와 설탕, 계란을 잘 섞어 쪄내면 푸딩푸딩한 행복이 완성됩니다! 🍮",
  "시나몬 향기는 뇌 기능을 활성화하고 스트레스를 완화해준대요. 시나몬 롤 향기에 취해보세요. 🥨",
  "요거트 속의 유산균은 장 건강뿐만 아니라 심리적 안정에도 도움을 준다는 사실, 알고 계셨나요? 🥛",
  "달콤한 고구마 맛탕 레시피: 노릇하게 튀겨 꿀에 버무리면 세상 부러울 게 없는 맛이죠! 🍠",
  "녹차의 테아닌 성분은 뇌파를 안정시켜 깊은 휴식을 도와준답니다. 차분하게 한 잔 어때요? 🍵",
  "반짝이는 사탕 한 알을 입에 물어보세요. 당분이 뇌에 공급되면서 금방 기분이 좋아질 거예요. 🍭",
  "망고는 비타민 A와 C가 풍부해 면역력을 높이고 활력을 준답니다. 열대 과일의 달콤함에 빠져보세요! 🥭",
  "따뜻한 코코아 위에 휘핑크림을 듬뿍! 세상에서 가장 아늑한 위로가 되어줄 거예요. ☕",
  "맛있는 음식을 먹는 것만큼 확실한 행복은 없죠. 오늘 저녁은 당신이 가장 좋아하는 메뉴로 선택하세요! 뷔페 가자! 🍕",
];

const MODIFICATION_NOTICE =
  "\n\n(커뮤니티 가이드 위반으로 일부 혹은 전체 수정된 글입니다)";

/** OpenAI Moderation category_scores 기준. 이 값 이상이면 위반으로 간주하고 CUTE_WORDS로 교체 (0~1, 기본 0.5) */
export const TOXICITY_THRESHOLD = 0.5;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type ModerationResult = {
  flagged: boolean;
  categories?: Record<string, boolean>;
  category_scores?: Record<string, number>;
};

/** OpenAI Moderation API 호출. 실패 시 null 반환(원문 유지). */
async function callOpenAIModeration(
  text: string,
): Promise<ModerationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return null;
  const debug =
    process.env.DEBUG_MODERATION === "1" ||
    process.env.NODE_ENV === "development";
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "omni-moderation-latest",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: {
        flagged?: boolean;
        categories?: Record<string, boolean>;
        category_scores?: Record<string, number>;
      }[];
    };
    const r = data.results?.[0];
    if (!r) return null;
    const flagged = r.flagged === true;
    const result: ModerationResult = {
      flagged,
      categories: r.categories,
      category_scores: r.category_scores,
    };
    if (debug) {
      const preview = text.slice(0, 80) + (text.length > 80 ? "…" : "");
      console.log("[Moderation]", {
        inputPreview: preview,
        flagged: result.flagged,
        categories: result.categories,
        category_scores: result.category_scores,
      });
    }
    return result;
  } catch {
    return null;
  }
}

const DISPLAY_NAME_REJECT_MESSAGE =
  "혐오 표현 또는 멸칭이 포함되어 있어 등록할 수 없습니다. 다른 표현을 사용해 주세요.";

/**
 * 닉네임(표시 이름) 검사. 글/댓글과 동일한 금칙어·Moderation 기준으로 걸리면 등록 불가(치환 없이 거부).
 */
export async function validateDisplayName(
  name: string,
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return { allowed: true };

  const normalized = trimmed
    .toLowerCase()
    .replace(/[\s!@#$%^&*(),.?":{}|<>_+\-=~`[\]]/g, "");

  for (const word of ALL_BAD_WORDS) {
    if (normalized.includes(word)) {
      return { allowed: false, error: DISPLAY_NAME_REJECT_MESSAGE };
    }
  }

  const mod = await callOpenAIModeration(trimmed);
  const overThreshold =
    mod?.category_scores &&
    Object.values(mod.category_scores).some(
      (s) => typeof s === "number" && s >= TOXICITY_THRESHOLD,
    );
  if (mod?.flagged || overThreshold) {
    return { allowed: false, error: DISPLAY_NAME_REJECT_MESSAGE };
  }

  return { allowed: true };
}

/** 관리자 페이지 등에서 저장용으로 사용하는 모더레이션 결과 타입 */
export type ModerationForStorage = {
  flagged: boolean
  category_scores: Record<string, number> | null
}

/** 유해 댓글 확인 모달용: 점수만 반환하고 글은 바꾸지 않을 때 */
export type ModerationWarning = {
  scores: Record<string, number>
  flagged: boolean
}

export type CleanTextOptions = {
  /** true면 Moderation 위반 시 글을 CUTE_WORDS로 바꾸지 않고, moderationWarning으로 반환해 클라이언트에서 확인 모달 띄우도록 */
  returnModerationWarningInsteadOfReplace?: boolean
}

/**
 * 2단계 필터: 1) 자체 금칙어 → DOG_SOUNDS 치환, 2) OpenAI Moderation → 위반 시 CUTE_WORDS로 전체 교체(또는 확인 모달용 반환).
 * isModified 시 문구 하단에 안내 메시지를 붙여 반환.
 * moderation: API 호출 시 저장용 결과(관리자 페이지 노출).
 */
export async function cleanText(
  content: string,
  options?: CleanTextOptions,
): Promise<{
  cleanedText: string
  isModified: boolean
  moderation?: ModerationForStorage
  moderationWarning?: ModerationWarning
}> {
  const trimmed = content?.trim() ?? "";
  if (!trimmed) return { cleanedText: trimmed, isModified: false };

  let text = trimmed;
  let isModified = false;

  // 1단계: 자체 금칙어 치환 (긴 표현 우선)
  for (const word of ALL_BAD_WORDS) {
    const re = new RegExp(escapeRegex(word), "gi");
    if (re.test(text)) {
      text = text.replace(re, () => {
        isModified = true;
        return pickRandom(DOG_SOUNDS);
      });
    }
  }

  // 2단계: OpenAI Moderation (flagged 또는 category_scores가 TOXICITY_THRESHOLD 이상이면 위반)
  const mod = await callOpenAIModeration(text);
  const moderation: ModerationForStorage | undefined = mod
    ? { flagged: mod.flagged, category_scores: mod.category_scores ?? null }
    : undefined;
  const overThreshold =
    mod?.category_scores &&
    Object.values(mod.category_scores).some(
      (s) => typeof s === "number" && s >= TOXICITY_THRESHOLD,
    );
  const moderationHigh = mod?.flagged || overThreshold;

  if (moderationHigh && options?.returnModerationWarningInsteadOfReplace) {
    // 글 바꾸지 않고 확인 모달용 정보만 반환
    return {
      cleanedText: text,
      isModified,
      moderation,
      moderationWarning: {
        scores: mod?.category_scores ?? {},
        flagged: mod?.flagged ?? false,
      },
    };
  }

  if (moderationHigh) {
    text = pickRandom(CUTE_WORDS);
    isModified = true;
  }

  if (isModified) {
    text = text + MODIFICATION_NOTICE;
  }

  return { cleanedText: text, isModified, moderation };
}

/** 그래도 등록 시 원문 그대로 저장할 때, 저장용 모더레이션 점수만 조회 */
export async function getModerationForStorage(
  content: string,
): Promise<ModerationForStorage | null> {
  const mod = await callOpenAIModeration(content?.trim() ?? "");
  if (!mod) return null;
  return {
    flagged: mod.flagged,
    category_scores: mod.category_scores ?? null,
  };
}

/**
 * 욕설·비하 표현 필터링
 * @param content 검사할 텍스트
 * @returns 위반 여부 및 사유
 */
export function checkProfanity(content: string) {
  if (!content) return { isViolated: false, reason: null };

  // 1. 대문자 -> 소문자 변환 및 공백/특수문자 제거 (정규화)
  const normalized = content
    .toLowerCase()
    .replace(/[\s!@#$%^&*(),.?":{}|<>_+\-=~`[\]]/g, "");

  // 2. (선택) 자음/모음 분리 대응은 추후 확장 가능

  for (const word of ALL_BAD_WORDS) {
    if (normalized.includes(word)) {
      return {
        isViolated: true,
        reason: `'${word}' 표현은 커뮤니티 가이드라인(욕설·비하 금지)에 따라 제한됩니다.`,
      };
    }
  }
  return { isViolated: false, reason: null as string | null };
}

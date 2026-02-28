// 팀 slug(emblem 부분) → 표시용 약칭 (MATCH_SCHEDULE / reference UI와 동일)
export const EMBLEM_TO_SHORT: Record<string, string> = {
  // K League 1
  incheon_united_fc: "인천",
  fc_seoul: "서울",
  ulsan_hd_fc: "울산",
  gangwon_fc: "강원",
  gimcheon_sangmu_fc: "김천",
  pohang_steelers: "포항",
  jeonbuk_hyundai_motors: "전북",
  bucheon_fc_1995: "부천",
  jeju_sk_fc: "제주",
  gwangju_fc: "광주",
  daejeon_hana_citizen: "대전",
  fc_anyang: "안양",
  // K League 2
  gimhae_fc_2008: "김해",
  ansan_greeners_fc: "안산",
  suwon_samsung_bluewings: "수원삼성",
  seoul_e_land_fc: "서울이랜드",
  daegu_fc: "대구",
  hwaseong_fc: "화성",
  yongin_fc: "용인",
  cheonan_city_fc: "천안",
  cheongju_fc: "충북청주",
  suwon_fc: "수원FC",
  gyeongnam_fc: "경남",
  jeonnam_dragons: "전남",
  chungnam_asan_fc: "충남아산",
  paju_frontier_fc: "파주",
  busan_ipark: "부산",
  seongname_fc: "성남",
}

/** 팀 약칭 → emblem 키 (JSON 일괄 업로드 등에서 사용) */
export const SHORT_TO_EMBLEM: Record<string, string> = Object.fromEntries(
  Object.entries(EMBLEM_TO_SHORT).map(([emblem, short]) => [short, emblem])
)

/** TEAM_LIST.md 표기 이름 → emblem 키 (JSON home/away에 이 이름 사용 가능) */
export const DISPLAY_NAME_TO_EMBLEM: Record<string, string> = {
  "울산 HD FC": "ulsan_hd_fc",
  "강원 FC": "gangwon_fc",
  "FC 서울": "fc_seoul",
  "포항 스틸러스": "pohang_steelers",
  "전북 현대 모터스": "jeonbuk_hyundai_motors",
  "대전 하나 시티즌": "daejeon_hana_citizen",
  "김천 상무 FC": "gimcheon_sangmu_fc",
  "제주 SK FC": "jeju_sk_fc",
  "인천 유나이티드": "incheon_united_fc",
  "광주 FC": "gwangju_fc",
  "FC 안양": "fc_anyang",
  "부천 FC 1995": "bucheon_fc_1995",
  "수원 삼성 블루윙즈": "suwon_samsung_bluewings",
  "대구 FC": "daegu_fc",
  "수원 FC": "suwon_fc",
  "서울 이랜드 FC": "seoul_e_land_fc",
  "성남 FC": "seongname_fc",
  "전남 드래곤즈": "jeonnam_dragons",
  "김포 FC": "gimpo_fc",
  "부산 아이파크": "busan_ipark",
  "충남 아산 FC": "chungnam_asan_fc",
  "화성 FC": "hwaseong_fc",
  "경남 FC": "gyeongnam_fc",
  "충북 청주 FC": "cheongju_fc",
  "천안 시티 FC": "cheonan_city_fc",
  "안산 그리너스 FC": "ansan_greeners_fc",
  "김해 FC 2008": "gimhae_fc_2008",
  "파주 프런티어 FC": "paju_frontier_fc",
  "용인 FC": "yongin_fc",
}

export function shortNameFromSlug(slug: string | null): string {
  if (!slug) return ""
  const key = slug.replace(/^kleague\d+-/, "")
  return EMBLEM_TO_SHORT[key] ?? slug
}

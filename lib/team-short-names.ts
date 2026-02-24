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

export function shortNameFromSlug(slug: string | null): string {
  if (!slug) return ""
  const key = slug.replace(/^kleague\d+-/, "")
  return EMBLEM_TO_SHORT[key] ?? slug
}

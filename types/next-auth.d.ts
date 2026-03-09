import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      /** 공개 프로필 URL용 (이메일 @ 앞부분) */
      handle?: string | null
    }
  }
}

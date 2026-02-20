/**
 * lib/database-url 로 DATABASE_URL 채운 뒤 prisma CLI 실행.
 * 사용: npx tsx scripts/with-db-url.ts db push
 */
import "../lib/database-url"
import { execSync } from "child_process"

const args = process.argv.slice(2)
execSync(`npx prisma ${args.join(" ")}`, { stdio: "inherit", env: process.env })

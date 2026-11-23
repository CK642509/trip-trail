// 產生密碼 hash：npm run hash-password -- <slug> <password>
// 把印出的那一行貼到 .env，並在 Vercel 專案設定同名的環境變數。
import { hashPassword, tripHashEnvName } from '../src/data/password.ts'

const [slug, password] = process.argv.slice(2)
if (!slug || !password) {
  console.error('用法：npm run hash-password -- <slug> <password>')
  process.exit(1)
}
console.log(`${tripHashEnvName(slug)}=${await hashPassword(slug, password)}`)

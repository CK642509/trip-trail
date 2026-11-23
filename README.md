# trip-trail

把旅遊行程（JSON）畫成可以在手機上看的互動地圖，支援多趟旅程、密碼、離線瀏覽和 Google 地圖。

規格與實作計畫：[SPEC.md](SPEC.md)

## 開發

```sh
npm install
cp .env.example .env   # 填入 Google Maps API key
npm run dev
```

| 指令                                     | 用途                                                             |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                            | 本機開發伺服器                                                   |
| `npm run build`                          | 型別檢查並建置到 `dist/`                                         |
| `npm run lint`                           | oxlint                                                           |
| `npm run format`                         | Prettier 格式化                                                  |
| `npm test`                               | 單元測試（Vitest）                                               |
| `npm run validate`                       | 驗證 `trips/*/trip.json`                                         |
| `npm run hash-password -- <slug> <密碼>` | 產生旅程密碼 hash，貼到 `.env` 和 Vercel                         |
| `npm run gen-schema`                     | 改了 `src/data/schema.ts` 後，重新產生 `schema/trip.schema.json` |

## 新增或修改行程

行程放在 `trips/<slug>/trip.json`，格式見 [SPEC.md](SPEC.md) §4。用 VS Code 編輯時會依 `schema/trip.schema.json` 自動完成和檢查。改完跑 `npm run validate`；格式有錯時建置會失敗。

每趟旅程都要設定密碼 hash：執行 `npm run hash-password -- <slug> <密碼>`，把印出的那一行加到 `.env` 和 Vercel 的環境變數。正式環境缺少 hash 時建置會失敗。

## 部署

Vercel 連接這個 GitHub repo，push 到 `main` 會自動部署。環境變數（見 `.env.example`）要在 Vercel 專案設定裡另外填。

## 舊原型

`legacy/kansai-autumn-map/`：第一版原型（Leaflet、單一 HTML），只當參考。

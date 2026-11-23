# trip-trail

把旅遊行程（JSON）畫成可以在手機上看的互動地圖，支援多趟旅程、密碼、離線瀏覽和 Google 地圖。

規格與實作計畫：[SPEC.md](SPEC.md)

## 開發

```sh
npm install
cp .env.example .env   # 填入 Google Maps API key
npm run dev
```

| 指令                                      | 用途                                                             |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                             | 本機開發伺服器                                                   |
| `npm run build`                           | 型別檢查並建置到 `dist/`                                         |
| `npm run lint`                            | oxlint                                                           |
| `npm run format`                          | Prettier 格式化                                                  |
| `npm test`                                | 單元測試（Vitest）                                               |
| `npm run validate`                        | 驗證 `trips/*/trip.json`                                         |
| `npm run hash-password -- <slug> <密碼>`  | 產生旅程密碼 hash，貼到 `.env` 和 Vercel                         |
| `npm run gen-schema`                      | 改了 `src/data/schema.ts` 後，重新產生 `schema/trip.schema.json` |
| `npm run photos -- <slug> <照片或資料夾>` | 縮圖、轉 WebP、上傳到 R2，印出要貼進 trip.json 的 `photos`       |

## 新增或修改行程

行程放在 `trips/<slug>/trip.json`，格式見 [SPEC.md](SPEC.md) §4。用 VS Code 編輯時會依 `schema/trip.schema.json` 自動完成和檢查。改完跑 `npm run validate`；格式有錯時建置會失敗。

每趟旅程都要設定密碼 hash：執行 `npm run hash-password -- <slug> <密碼>`，把印出的那一行加到 `.env` 和 Vercel 的環境變數。正式環境缺少 hash 時建置會失敗。

## 加照片

1. 把照片（JPEG、PNG 等；iPhone 的 HEIC 要先轉成 JPEG）放進一個資料夾。
2. 執行 `npm run photos -- kansai-2026 <資料夾>`。會依 EXIF 轉正、移除 EXIF（含 GPS 位置），縮成大圖（長邊 2048px）和縮圖（長邊 400px）後上傳到 R2。先加 `--dry` 可以只在本機轉檔看效果。
3. 把印出的 `"photos": [...]` 貼到對應景點，需要的話每張加上 `"caption"`。

需要在 `.env` 設定 `R2_*`（見 `.env.example`）。R2 bucket 要開啟 Public Development URL，並設定 CORS 允許網站的網址（GET、HEAD），照片才能存到手機上離線看。

## 部署

Vercel 連接這個 GitHub repo，push 到 `main` 會自動部署。環境變數（見 `.env.example`）要在 Vercel 專案設定裡另外填。

## 舊原型

`legacy/kansai-autumn-map/`：第一版原型（Leaflet、單一 HTML），只當參考。

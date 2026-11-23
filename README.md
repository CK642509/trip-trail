# trip-trail

把旅遊行程（JSON）畫成可以在手機上看的互動地圖，支援多趟旅程、密碼、離線瀏覽和 Google 地圖。

規格與實作計畫：[SPEC.md](SPEC.md)

## 開發

```sh
npm install
cp .env.example .env   # 填入 Google Maps API key
npm run dev
```

| 指令             | 用途                     |
| ---------------- | ------------------------ |
| `npm run dev`    | 本機開發伺服器           |
| `npm run build`  | 型別檢查並建置到 `dist/` |
| `npm run lint`   | oxlint                   |
| `npm run format` | Prettier 格式化          |

## 部署

Vercel 連接這個 GitHub repo，push 到 `main` 會自動部署。環境變數（見 `.env.example`）要在 Vercel 專案設定裡另外填。

## 舊原型

`legacy/kansai-autumn-map/`：第一版原型（Leaflet、單一 HTML），只當參考。

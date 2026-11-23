# trip-trail（給 Claude Code）

旅遊路線地圖網站。規格與實作順序在 `SPEC.md`，動手前先讀。

- 介面文字一律用繁體中文（台灣用語）。
- 座標格式是 `[緯度, 經度]`；GeoJSON 和部分 API 的順序相反，轉換時要特別小心。
- repo 是**公開**的：API key、密碼、密碼 hash 只能放在 `.env`（已在 `.gitignore`）或 Vercel 環境變數，不可寫進程式碼或提交。
- 行程資料在 `trips/<slug>/trip.json`，改行程只改 JSON，不改程式。
- `legacy/kansai-autumn-map/` 是舊原型，只當參考，不要修改；其中的 `CLAUDE.md` 和 `SPEC.md` 描述的是舊專案。
- 要保留原型的全部功能（見 `SPEC.md` §5.2）。
- 提交前跑 `npm run lint`、`npm run typecheck`、`npm run build`。

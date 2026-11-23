# 專案說明（給 Claude Code）

這是關西賞楓地圖行程網站 v2。原型在 `prototype/`，規格在 `SPEC.md`。

- 開始寫程式前，先讀 `SPEC.md`，再用瀏覽器打開 `prototype/index.html` 看原型的行為。
- 行程內容以 `docs/itinerary.md` 為準；資料以 `data/itinerary.json` 為準。兩者不一致時，先問使用者。
- `SPEC.md` §8「待使用者決定」的事項，在動手之前先問使用者。
- 介面文字一律用繁體中文（台灣用語）。
- 座標格式是 `[緯度, 經度]`，GeoJSON 的順序相反，轉換時要特別小心。
- 不要把任何 API key 寫進程式碼或提交到 git；放在 `.env.local`。
- 任何改動都要保留 SPEC.md §2.1 的全部功能。

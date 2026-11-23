# 關西賞楓地圖行程：交接包

## 內容
- `SPEC.md`：完整規格。包含原型的功能、已知問題、資料格式、v2 需求、驗收標準和待決定事項。
- `CLAUDE.md`：Claude Code 每次開啟這個資料夾時會自動讀取的專案規則。
- `prototype/`：目前發佈在 claude.ai 的原型，`index.html` 可以直接用瀏覽器打開。
- `data/itinerary.json`：行程資料，包含 7 天、45 個景點、40 段交通。
- `docs/itinerary.md`：行程文字版，已包含所有修正。
- `docs/screenshots/`：原型截圖。
- `scripts/`：重建底圖和打包原型的腳本。

## 怎麼交給 Claude Code
1. 解壓縮這個資料夾，建議先 `git init` 並做第一次 commit，之後的改動才看得到差異。
2. 在資料夾裡執行 `claude`。
3. 第一句話可以這樣說：

   > 請先讀 SPEC.md 和 CLAUDE.md，打開 prototype/index.html 了解原型。然後列出 §8「待決定事項」問我，等我回答後，提出 v2 的技術方案和實作計畫，先不要寫程式。

4. 如果要用 Google Maps：自己把 API key 放進 `.env.local`，不要貼在對話裡。也要到 Google Cloud 主控台限制這把 key 的 HTTP referrer。

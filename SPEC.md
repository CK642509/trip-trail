# trip-trail 規格與實作計畫

最後更新：2026-11-23
狀態：已確認，可以開始實作

---

## 1. 目標

把旅遊行程（JSON）畫成可以在手機上看的互動地圖網站。從關西賞楓原型（`kansai-autumn-map/`）重構成**可放多趟旅程**的通用工具。

- **使用者**：同行的家人（手機、繁體中文、部分是長輩）；規劃者（電腦，改 JSON、分享連結）。
- **情境**：出發前一起看路線；旅途中查「今天下一站在哪、怎麼去」，需要時切到 Google 地圖查資料或導航。

### 已確認的決定（2026-11-23）

| 項目       | 決定                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| 行程與備註 | JSON 放在 git，改完 push，Vercel 自動部署。網站本身唯讀                      |
| 照片       | 使用者自己放在 Cloudflare（公開網址），JSON 只存連結                         |
| 多趟旅程   | 支援，每趟各自一組密碼                                                       |
| 密碼       | 前端遮罩即可（擋一般人，不是真正的存取控制）；密碼 hash 放環境變數，不進 git |
| Repo       | GitHub **公開**；行程資料公開也沒關係                                        |
| 網域       | 先用 `*.vercel.app`，之後再買自訂網域                                        |
| 照片       | Cloudflare R2（公開 bucket，`r2.dev` 網址），縮圖在本機產生後一起上傳        |
| 時程       | 12/2 出發前完成 Phase 0–5，並做完實機測試                                    |
| 地圖       | Google Maps JS API 當底圖，行程畫成可開關的疊層                              |
| 部署       | Vercel，純靜態網站，**不需要後端或資料庫**                                   |

## 2. 架構總覽

```
git repo ──push──▶ Vercel build（Vite）──▶ 靜態檔案 + Service Worker
  trips/<slug>/trip.json      驗證 schema、複製到 /trips/<slug>.json
                                         │
手機瀏覽器 ── /t/<slug>?key=xxx ──▶ 前端比對密碼 ──▶ 讀 trip.json
  ├─ 行程列表（離線可用）
  ├─ Google 地圖 + 疊層（需要網路）
  └─ 照片（Cloudflare，看過的會快取）
```

### 技術選型

| 項目     | 選擇                                                              | 理由                                                                             |
| -------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 建置     | Vite + TypeScript                                                 | 原型 SPEC 的建議，Vercel 原生支援                                                |
| UI 框架  | React                                                             | `@vis.gl/react-google-maps`（Google 官方維護的 React 綁定）最成熟                |
| 地圖     | Google Maps JS API：`AdvancedMarkerElement`、`Polyline`、`Circle` | 標記用 HTML 自訂樣式；線型和箭頭用 Polyline 的 `icons`（原生支援重複箭頭和虛線） |
| 叢集     | 自己寫（`src/map/places.ts`），依標記實際寬度判斷重疊             | 解決原型 §3 #4、#5 的標記重疊；景點不到百個，不需要外部套件，也能和合併標記整合  |
| 資料驗證 | Zod，並輸出 JSON Schema                                           | 建置時擋錯；VS Code 改 JSON 有自動完成和錯誤提示                                 |
| PWA      | `vite-plugin-pwa`（Workbox）                                      | 預先快取 app shell，執行時快取行程與照片                                         |
| 測試     | Vitest（資料邏輯）＋ Playwright（截圖、console 無錯誤）           |                                                                                  |

不用 Next.js：沒有伺服器端需求，純 SPA 部署最簡單，PWA 也比較好控制。

## 3. 路由與密碼

| 網址                   | 內容                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `/`                    | 簡單首頁：輸入「旅程代號＋密碼」，或列出本機已解鎖過的旅程 |
| `/t/<slug>`            | 某趟旅程。未解鎖時顯示密碼輸入畫面                         |
| `/t/<slug>?key=<密碼>` | 分享用連結，自動帶入密碼                                   |
| `/t/<slug>#day-4`      | 直接打開某一天的單日模式（保留原型功能）                   |

- 密碼不進 git。每趟旅程一個環境變數，例如 `TRIP_KANSAI_2026_HASH`，值是 `sha256(slug + ":" + password)`。本機放 `.env`，正式環境放 Vercel 環境變數。`npm run hash-password -- kansai-2026 <密碼>` 會印出要貼的那一行。
- 建置時讀這些環境變數，產生 `trips-index.json`（slug → hash）給前端比對。hash 會出現在前端，但看不到密碼原文；8 位數日期這種密碼可以被暴力破解，這是已接受的風險。
- 某趟旅程沒有設定 hash 時：本機開發顯示警告、不設密碼；正式建置直接失敗，避免不小心公開。
- 解鎖後把 hash 存在 `localStorage`，同一台裝置不用再輸入。
- `?key=` 帶入成功後用 `history.replaceState` 從網址列移除，避免截圖或轉傳時外流。
- **已接受的限制**：repo 是公開的，行程 JSON 在 GitHub 上看得到，知道 slug 的人也能直接下載 `/trips/<slug>.json`。網站上的密碼只用來擋一般訪客。

## 4. 資料格式（schemaVersion 2）

一趟旅程一個資料夾：`trips/<slug>/trip.json`。slug 用英數字和 `-`，例如 `kansai-2026`。

```jsonc
{
  "$schema": "../../schema/trip.schema.json",
  "schemaVersion": 2,
  "slug": "kansai-2026",
  "title": "2026 關西賞楓・海之京都 7天6夜",
  "start": "2026-12-02",
  "end": "2026-12-08",
  "timezone": "Asia/Tokyo",
  "region": "JP",                         // 選填，Google 地圖地區代碼，預設 JP
  "info": "## 航班\n- 去程 CI152 …\n## 票券\n…",   // 選填，Markdown：航班、住宿、票券等總覽
  "days": [
    {
      "id": 1,                              // 用於 #day-1
      "date": "2026-12-02",                 // ISO 格式；畫面上顯示成「12/2 (三)」
      "title": "抵達關西機場 → 京都",
      "color": "#2457c5",                   // 選填，未填時用預設色盤
      "note": "…",                          // 選填，Markdown
      "stops": [
        {
          "id": "kix",                      // 同一天內唯一
          "name": "關西機場",
          "ll": [34.4326, 135.244],         // [緯度, 經度]，注意 GeoJSON 相反
          "placeId": "ChIJ…",               // 選填，Google Place ID，讓 Google 地圖連結更準
          "time": "13:20–14:40",            // 選填，自由文字（「上午」也可以）
          "note": "入境領行李…",             // 選填，Markdown
          "photos": [                       // 選填，可多張
            { "src": "https://…/kix-1.jpg", "thumb": "https://…/kix-1-w400.jpg", "caption": "…" }
          ],
          "optional": true                  // 選填，可選行程
        }
      ],
      "legs": [
        {
          "from": "kix", "to": "kyo",       // from 可以等於 to（例如遊覽船繞一圈）
          "mode": "rail",                   // rail | subway | bus | boat | walk | taxi | flight | open
          "label": "HARUKA 32號 14:44",      // 選填
          "time": "14:44–16:00",            // 選填
          "note": "…",                      // 選填
          "path": [[lat, lng], …],          // 選填，未填則兩點直線
          "optional": true                  // 選填
        }
      ],
      "groups": [ { "name": "清水寺～祇園 散步區", "stops": ["kiyo", "san"] } ]
    }
  ]
}
```

和原型（v1）的差異：

- 新增：`slug`、`info`、`day.note`、`stop.placeId`、`photos`、`leg.time`、`leg.note`。
- 所有 Markdown 欄位（`info`、`note`）可以寫成字串，也可以寫成字串陣列（每個元素一行），長內容比較好改。
- `time` 一律選填。「今天」模式會從 `time` 抓第一個 `HH:MM` 判斷下一站，抓不到就不標示。
- `day.date` 改成 ISO 日期，顯示格式由程式產生。
- 移除 `places`（底圖地名）：Google 底圖已經有地名。
- 移除 `modes`：線型樣式改由程式定義，資料只寫 mode 代號。
- 照片：`thumb` 選填，未填時直接用 `src`。照片放 R2，用 `scripts/photos` 在本機把原圖縮成大圖（長邊 2048px）和縮圖（長邊 400px），轉成 WebP 後上傳，再印出可以直接貼進 JSON 的 `photos` 片段。

建置時的驗證規則（`npm run validate`，也在 build 時自動執行）：

- 符合 schema；`legs.from/to`、`groups.stops` 都要指到當天存在的 stop id。
- 座標在合理範圍；`days[].date` 介於 `start` 和 `end` 之間。
- slug 和資料夾名稱一致。
- 正式建置（`VERCEL_ENV=production`）時，每趟旅程都要有對應的 `TRIP_<SLUG>_HASH`。

## 5. 功能規格

### 5.1 版面

- **手機（< 768px）**：全螢幕地圖＋底部抽屜（行程列表），可拖拉成三段高度：收合（只看日期列）、半開、全開。頂部一排 Day 切換膠囊，可左右滑。
- **桌機**：左側 380px 行程欄＋右側地圖。
- 地圖右上角浮動按鈕：**疊層開關**（隱藏所有路線和標記，變回純 Google 地圖）、圖例、定位到我的位置。
- 離線或 Google Maps 載入失敗時：地圖區塊顯示「離線中，地圖暫時無法使用」，行程列表、備註和已快取的照片照常可用。

### 5.2 保留原型功能（原型 SPEC §2.1）

| #   | 功能                           | v2 做法                                                                             |
| --- | ------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | 一次一天／多天同時／顯示全部   | 同原型，預設顯示全部天數                                                            |
| 2   | 每天一個顏色                   | 同原型                                                                              |
| 3   | 編號標記＋方向箭頭             | `AdvancedMarkerElement`（HTML 圓形編號）；箭頭用 Polyline `icons` 的 `repeat`       |
| 4   | 相同地點合併                   | 合併邏輯沿用原型；全覽縮小時改成叢集，放大才展開（解決原型 §3 #4）                  |
| 5   | 交通方式線型                   | Polyline 實線／虛線（用 `icons` 組合 dash 符號）；`open` 淡色細虛線                 |
| 6   | 成群景點虛線圈                 | 用 `Circle`（公尺為單位，不用每次縮放重算）；縮放 ≥ 13 才顯示                       |
| 7   | 可選行程                       | 空心虛框標記、半透明路線                                                            |
| 8   | 多天重疊路線偏移               | 縮放後用地圖 projection 重算偏移路徑（Phase 4，最複雜的一項）                       |
| 9   | 景點詳細資訊                   | 改成「詳細資訊卡」：手機用底部抽屜、桌機用側欄；含時間、備註、照片、Google 地圖按鈕 |
| 10  | 行程欄點擊飛到景點、鍵盤可操作 | 同原型                                                                              |
| 11  | 圖例                           | 收在浮動按鈕裡                                                                      |
| 12  | `#day-N` 單日連結              | 同原型；多天同時用 `#day-1,3`                                                       |

### 5.3 Google 地圖整合（ideas：「一邊看行程一邊查」）

- 底圖語言 `zh-TW`、地區 `JP`／依旅程設定。
- 疊層開關：關掉後就是一般 Google 地圖，可以點 Google 自己的 POI 看營業時間和評價（`clickableIcons: true`）。
- 每個景點：「在 Google 地圖開啟」→ 有 `placeId` 時用 `query_place_id`，否則用座標。
- 每段交通：「用 Google 地圖導航」→ `https://www.google.com/maps/dir/?api=1&origin=…&destination=…&travelmode=transit|walking|driving`（依 mode 對應）。手機上會直接打開 Google 地圖 App。
- 選用（Phase 8）：地圖上加 Places 搜尋框。會多用 Places API，有額外費用，所以列為之後再做。

### 5.4 備註與照片

- 旅程、每天、每個景點、每段交通都可以有 `note`（Markdown：粗體、清單、連結、表格）。
- 行程列表上，有照片的景點顯示小圖示和張數；詳細資訊卡顯示縮圖列，點開全螢幕瀏覽，可左右滑動，有說明文字。
- 旅程總覽頁（`info`）：航班、住宿、票券等資訊。

### 5.5 PWA 與離線

- 可加到主畫面，有圖示和啟動畫面；`manifest` 的 `start_url` 是 `/`，首頁列出本機解鎖過的旅程。
- 快取策略：
  - App shell（HTML/JS/CSS/字型）：建置時預先快取。
  - `/trips/<slug>.json`：network-first，離線時用快取，畫面上標示「資料更新時間」。
  - 照片：cache-first，看過的離線也看得到；另外提供「下載這趟旅程供離線使用」按鈕，一次快取全部照片並顯示進度。
  - Google Maps 的程式和圖磚：**不快取**（技術上做不到，也違反 Google 條款），離線時沒有地圖。
- 照片快取需要在 R2 bucket 設定 CORS（允許 `*.vercel.app` 和 `localhost`），否則瀏覽器存的是 opaque response，會占用大量儲存配額。
- **iOS 注意**：從 Safari 加到主畫面後，主畫面 App 和 Safari 的 localStorage 是分開的，第一次從主畫面打開需要再輸入一次密碼。要在實機上驗證。

### 5.6 「今天」模式（加分項）

- 依旅程時區判斷今天是第幾天，打開時自動切到那天的單日模式。
- 從 `time` 抓到時間的話，標出「下一站」。

## 6. API key 與費用

- `VITE_GOOGLE_MAPS_API_KEY`、`VITE_GOOGLE_MAP_ID`、`TRIP_<SLUG>_HASH` 放在 `.env`（已在 `.gitignore`）和 Vercel 環境變數。repo 裡只提交 `.env.example`。Vite 只會把 `VITE_` 開頭的變數放進前端。
- 這把 key 一定會出現在前端，所以要在 Google Cloud Console：
  - 限制 HTTP referrer：`https://<專案>.vercel.app/*`、`https://<專案>-*.vercel.app/*`（預覽部署）、`http://localhost:5173/*`；之後買了網域再加上。
  - 限制 API：只開 Maps JavaScript API（之後要搜尋再加 Places API）。
  - 設每日配額上限，避免意外費用。家庭使用量遠低於免費額度。
- `AdvancedMarkerElement` 需要 Map ID：Cloud Console → Google Maps Platform → 地圖管理（Map Management）→ 建立 Map ID，類型選 JavaScript、Vector。在那之前，開發時可以先用 Google 提供的 `DEMO_MAP_ID`。
- 座標校正腳本（Phase 7）用的是另一把只在本機使用的 key（限制 Places API），一樣不提交。

## 7. Repo 結構

```
trip-trail/
├─ trips/
│  └─ kansai-2026/trip.json      # 行程資料（改行程只改這裡）
├─ schema/trip.schema.json       # 由 Zod 產生，給 VS Code 用
├─ src/
│  ├─ data/        # Zod schema、載入、驗證、合併標記等純邏輯（有單元測試）
│  ├─ map/         # Google Maps 疊層元件
│  ├─ components/  # 行程列表、抽屜、詳細資訊卡、照片瀏覽、密碼畫面
│  └─ routes/
├─ scripts/        # validate、hash-password、migrate-v1、geocode（選用）
├─ legacy/kansai-autumn-map/     # 原型搬到這裡當參考
├─ e2e/            # Playwright
└─ SPEC.md
```

## 8. 實作順序

**時程重點：關西這趟 12/2 出發，今天是 11/23，只剩 9 天。** 所以分成「出發前 MVP」（Phase 0–5）和「之後再做」。每個 Phase 結束都可以部署、可以用。

| Phase                 | 內容                                                                                                                                                          | 完成時可以做到                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **0 專案骨架**        | Vite + React + TS、ESLint/Prettier、原型搬到 `legacy/`、刪除 zip、Vercel 專案連 GitHub、`.env.example`、`.env` 的 `API_KEY` 改名為 `VITE_GOOGLE_MAPS_API_KEY` | push 後自動部署出空白頁                              |
| **1 資料層**          | Zod schema v2、`migrate-v1` 把原型 JSON 轉成 `trips/kansai-2026/trip.json`（同時對照 `docs/itinerary.md` 補上 `info`）、`validate`、`hash-password`、單元測試 | 資料正確、改壞 JSON 時 build 會失敗                  |
| **2 密碼＋行程列表**  | 路由、密碼畫面、`?key=`、localStorage、手機版行程列表與 Day 切換、詳細資訊卡（備註 Markdown）                                                                 | **不靠地圖就能在手機上看完整行程**，已經可以給家人用 |
| **3 Google 地圖基本** | 載入地圖、編號標記、Polyline 線型與箭頭、每天顏色、單日／多天／全部模式、自動縮放、列表點擊飛到景點、Google 地圖開啟與導航按鈕、`#day-N`、疊層開關            | 原型的核心功能＋真實底圖                             |
| **4 地圖進階**        | 相同地點合併、叢集、成群圈、可選行程樣式、多天路線偏移、圖例                                                                                                  | 原型 §2.1 全部功能                                   |
| **5 PWA＋照片**       | manifest、Service Worker 快取策略、離線提示、照片縮圖列與全螢幕瀏覽、「下載供離線使用」、`scripts/photos` 上傳工具                                            | 沒訊號也能看行程和照片                               |
| —                     | **出發前：iPhone／Android 實機測試**（加到主畫面、離線、密碼、導航按鈕）                                                                                      | 12/1 前完成                                          |
| 6 今天模式            | 依日期自動切換、下一站標示                                                                                                                                    |                                                      |
| 7 資料品質            | 座標校正腳本（Places API 查 `placeId` 和座標，產生差異報告，人工確認後寫回）、實際鐵道線形                                                                    | 原型 §3 #2、#3                                       |
| 8 選用                | Places 搜尋框、深色模式、列印版                                                                                                                               |                                                      |
| 持續                  | Playwright 截圖回歸（桌機 1400×900、手機 390×844）、console 無錯誤檢查                                                                                        |                                                      |

為什麼先做列表再做地圖：列表是旅途中最常用、也是離線時唯一能用的部分；先把它做穩，就算地圖進度落後，出發時也有能用的版本。

## 9. 待確認事項

- 目前沒有。

### 使用者要做的設定

1. 建立 Google Map ID，填進 `.env` 的 `VITE_GOOGLE_MAP_ID`（Phase 3 前完成即可）。
2. API key 加上 HTTP referrer 和 API 限制（第一次部署、拿到 Vercel 網址後）。
3. 建立 Cloudflare R2 bucket，開啟 `r2.dev` 公開網址並設定 CORS（Phase 5 前完成即可）。

# TOYO TOMO｜Toyota bZ4X 油轉電顧問

TOYO TOMO 協助高里程用車者，尤其是計程車司機，評估燃油車轉換為 Toyota bZ4X 的營運成本與充電情境。本儲存庫包含車款與能源價格資料服務、油轉電顧問網頁及充電／續航規劃原型。計算結果由程式公式產生；地圖資料由 Google Maps 服務提供。

> **專案狀態：** 本儲存庫目前提供可本機執行的網站、後端 API、計算工具與 LIFF 使用情境網頁。OpenAI、n8n、LINE Messaging API、正式 LIFF 發布及 Cloudflare Tunnel 的整體串接屬後續系統整合，不代表已由本儲存庫完成部署。

## 功能

### 車款與能源資料

- 以品牌、車系、年份、動力與關鍵字搜尋已收錄的現行及歷年車款；歷年資料的涵蓋範圍與限制見 [HISTORY.md](HISTORY.md)。
- 提供油價、台電住宅級距與電動車充換電設施費率的來源、生效日及更新狀態。
- 依設定週期更新已配置的資料來源；來源解析失敗或資料異常時保留既有資料，避免用不完整結果覆蓋資料庫。

### 油轉電營運試算

- 依使用者輸入的每日里程、工作天數、油耗、能源價格及充電比例，比較現有車、同級油電車與 bZ4X 的能源費用。
- 提供補助現金流、一般與保守回本、保固里程及快充停工成本等試算；各欄位會區分空白、零值與待確認資料。
- 公式、輸入假設、適用限制及驗證紀錄見 [TAXI.md](TAXI.md)。試算欄位在瀏覽器記憶體中運算，不寫入資料庫；使用者需自行核對車價、補助、油電耗能、電價與營運費用等條件。

### 充電與續航規劃

- 依目前電量、電池容量及參考效率估算基準續航。
- 使用者啟動路線規劃時，透過 Google Maps Routes 取得路線，再由程式估算抵達電量與剩餘續航。
- 路線結果是參考估算，不是車輛即時電量或保證續航；不包含未經驗證的交通、坡度與駕駛情境耗電修正。

## 整體系統架構

以下為 TOYO TOMO 的整合方向；功能會依階段完成，實際發布狀態以各服務設定為準。

- **AI 模型：** 使用 OpenAI API 與 GPT-6 Luna 處理訊息安全／主題檢查及意圖分類；後續用於偏好整理與個人化內容草擬。費用與續航等數值仍由程式公式計算。
- **對話流程：** n8n 部署於 Zeabur VM 服務，負責接收分類結果並導向固定回覆、網頁工具或後續服務流程。
- **LINE 介面：** LINE Messaging API 處理聊天室訊息；LIFF（LINE Front-end Framework）讓使用者在 LINE App 內開啟油轉電試算及充電規劃網頁。
- **網站與資料庫：** 網頁後端以 Docker 容器部署，PostgreSQL 置於獨立 Docker 容器並透過內部網路提供資料服務。後端使用 `DATABASE_URL` 連線資料庫，不將資料庫連接埠直接公開給使用者。
- **網路入口：** Cloudflare Tunnel（`cloudflared`）預計提供 Cloudflare 網路至後端服務的受控通道；n8n 透過後端服務介面存取所需功能，資料庫由後端在容器網路內存取。
- **地圖服務：** Google Places 用於地點／充電站資料；Google Maps Routes 用於使用者要求的路線規劃。這些是外部資料服務，不是生成式 AI。

本儲存庫已包含 Dockerfile、PostgreSQL 相容資料層、車款與能源費 API，以及試算／充電規劃網頁。n8n 工作流程、LINE 帳號設定、Cloudflare Tunnel 設定與正式服務憑證由各平台管理，不放入程式碼或版本控制。正式串接前須完成網域、權限、憑證與服務連線設定。

## 技術與檔案

| 路徑 | 用途 |
| --- | --- |
| `app.py` | Python 網頁伺服器、API、健康檢查與資料更新排程 |
| `storage.py` | SQLite／PostgreSQL 資料存取 |
| `collectors.py` | 車款、油價與電價來源更新及資料驗證 |
| `public/` | 網頁、油轉電試算、LIFF 介面資源與充電規劃頁 |
| `seed/` | 初始車款、費率與歷年車款資料 |
| `tests/` | 計算、瀏覽器、地圖及後端測試 |
| `Dockerfile` | 建置並啟動 Python 網頁服務容器 |
| `TAXI.md` | 試算公式、設計假設、介面與驗證紀錄 |
| `HISTORY.md` | 歷年車款資料涵蓋、來源與限制 |

## 本機啟動

需要 Python 3.12 或相容版本。

```sh
pip install -r requirements.txt
python app.py
```

開啟 <http://localhost:8080>。未設定 `DATABASE_URL` 時，後端使用 SQLite；需要持久化時，請設定 `DATA_DIR` 指向持久化目錄。設定 PostgreSQL 時，以環境變數 `DATABASE_URL` 提供連線字串，不要將密碼提交到 GitHub。

Docker 網頁服務預設監聽 `PORT`（預設 8080），資料目錄為 `/data`。Docker 部署時需掛載持久化磁碟，或設定 PostgreSQL 連線；容器檔案系統本身不作為永久資料儲存。

## Zeabur 部署

1. 將儲存庫連接到 Zeabur，使用根目錄 `Dockerfile` 建置網頁服務。
2. 設定 `DATABASE_URL`、`ADMIN_TOKEN` 及所需 API 金鑰等環境變數；資料庫服務與網頁服務需能在私有網路互相連線。
3. 設定持久化資料儲存，並確認服務監聽 Zeabur 提供的 `PORT`。
4. 部署後檢查 `/health`、`/api/status` 及主要網頁流程。
5. 啟用 Google Maps 功能前，設定並限制 `GOOGLE_MAPS_API_KEY` 與允許的網站來源；實際地圖服務需在正式環境另行驗證。

目前儲存庫沒有提供 Cloudflare Tunnel 或 n8n 的部署設定檔。若採用 Cloudflare Tunnel，請在部署環境建立 `cloudflared` 連線與主機名稱路由，並限制後端 API 存取權限；不要公開 PostgreSQL 連接埠或提交 Tunnel token、資料庫密碼及 API 金鑰。

## API 摘要

| 方法與路徑 | 用途 |
| --- | --- |
| `GET /health` | 服務健康檢查 |
| `GET /api/vehicles` | 搜尋或列出已儲存車款；支援品牌、年份、動力與範圍條件 |
| `GET /api/rates` | 查詢油價及來源資訊 |
| `GET /api/electricity-rates` | 查詢電價與來源資訊 |
| `GET /api/status` | 查詢資料更新狀態與近期紀錄 |
| `POST /api/update?kind=oil` | 更新油價；需管理授權 |
| `POST /api/update?kind=electricity` | 更新電價；需管理授權 |
| `POST /api/update?kind=vehicles` | 更新車款來源；需管理授權 |
| `POST /api/update?kind=all` | 執行全部資料更新；需管理授權 |

管理 API 使用 `Authorization: Bearer <ADMIN_TOKEN>`。`ADMIN_TOKEN` 僅供伺服器端設定，不可放入前端或公開紀錄。

## 驗證

專案測試涵蓋計算公式、表單互動、API 回應、資料更新與失敗保留、SQLite 儲存及地圖介面備援。可執行：

```sh
node tests/taxi-model.test.cjs
node tests/taxi-browser.test.cjs
python tests/taxi-backend.test.py
node tests/google-map.test.cjs
```

瀏覽器測試需安裝 Playwright 與可用的 Chromium／Edge。Google Maps mock 測試不代表正式 API 金鑰、帳務、網域限制或 LINE WebView 已驗證；PostgreSQL 與雲端部署也需在目標環境另行確認。

## 參考資料

以下資料涵蓋專案需求、試算參數、公開資料來源及技術架構設計。車價、費率、規格與補助條件可能更新，實際使用時應回查原始來源及適用日期。

### 專案原始資料

[1] TOYO TOMO 專案提供者，〈TOYO TOMO AI 應用方法說明〉，DOCX，專案需求與服務構想文件。

[2] TOYO TOMO 專案提供者，〈TOYOTOMO〉，PDF，提案與服務設計資料。

[3] TOYO TOMO 專案提供者，〈TOYO TOMO n8n 工作流程〉，JSON 匯出檔，對話分類及流程設計參考。

[4] TOYO TOMO 專案程式文件： [TAXI.md](TAXI.md)、[HISTORY.md](HISTORY.md)、[AI應用方法報告.md](AI應用方法報告.md)、[TOYO_TOMO_AI_應用方法整理.md](TOYO_TOMO_AI_應用方法整理.md)及本儲存庫程式碼。用於記錄試算假設、資料來源、功能邊界和實作狀態。

### 車款、能源價格與法規資料

[5] 和泰汽車，〈TOYOTA bZ4X 車款規格〉，[官方規格頁](https://www.toyota.com.tw/showroom/bZ4X/fullsepc.aspx)，查閱日期：2026-10-14。

[6] 和泰汽車，〈電動車原廠保證〉，[官方保證說明](https://www.toyota.com.tw/electric_guarantee.aspx)，查閱日期：2026-10-14。

[7] 經濟部能源署，〈車輛油耗指南〉，[官方資料庫](https://ea03.moeaea.gov.tw/e0416/oil_guide.aspx)，查閱日期：2026-10-14。

[8] Yahoo 奇摩汽車，〈新車車款目錄〉，[車款資料頁](https://autos.yahoo.com.tw/new-cars/)，查閱日期：2026-10-14。作為車款目錄參考；歷年車型資料仍應以各車型原始來源及專案標示為準。

[9] 台灣中油股份有限公司，〈今日油品牌價資料〉，[牌價 JSON](https://www.cpc.com.tw/GetOilPriceJson.aspx?type=TodayOilPriceString)，查閱日期：2026-10-14。

[10] 台灣電力股份有限公司，〈電價公開資料〉，[公開資料 JSON](https://service.taipower.com.tw/data/opendata/apply/file/d007008/001.json)，查閱日期：2026-10-14。

[11] 台灣電力股份有限公司，〈電動車充換電設施電價〉，[費率文件 PDF](https://www.taipower.com.tw/media/jx3fpc3g/電動車充換電設施電價.pdf)，查閱日期：2026-10-14。

[12] 交通部，[相關補助法規與公告](https://motclaw.motc.gov.tw/webMotcLaw2018/Law/ArticleContent?LawID=E0196009&type=-1)，查閱日期：2026-10-14。補助資格、金額及適用期間以主管機關最新公告和核定結果為準。

### AI、對話服務與地圖

[13] OpenAI，〈API Overview〉，[OpenAI API 文件](https://platform.openai.com/docs/overview)，查閱日期：2026-10-14。專案的模型選用依專案提供者確認為 OpenAI API 與 GPT-6 Luna；此選型記錄不代表本文件獨立驗證模型供應或正式環境串接。

[14] n8n，〈Documentation〉，[n8n 官方文件](https://docs.n8n.io/)，查閱日期：2026-10-14。作為工作流程自動化及服務串接設計參考。

[15] LINE Developers，〈LIFF Documentation〉，[LIFF 官方文件](https://developers.line.biz/en/docs/liff/)，查閱日期：2026-10-14。LIFF 全名為 LINE Front-end Framework，用於在 LINE 環境中提供網頁應用程式。

[16] LINE Developers，〈Messaging API Reference〉，[Messaging API 官方參考文件](https://developers.line.biz/en/reference/messaging-api/)，查閱日期：2026-10-14。作為 LINE 訊息收發及 Webhook 串接設計參考。

[17] Google for Developers，〈Routes API〉，[Google Maps Platform 文件](https://developers.google.com/maps/documentation/routes)，查閱日期：2026-10-14。用於路線距離與時間資料服務設計。

[18] Google for Developers，〈Places API〉，[Google Maps Platform 文件](https://developers.google.com/maps/documentation/places/web-service/overview)，查閱日期：2026-10-14。用於地點及充電站搜尋服務設計。

[19] Google for Developers，〈Load the Maps JavaScript API〉，[API 載入文件](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)；〈Set up the Maps JavaScript API〉，[API 金鑰設定文件](https://developers.google.com/maps/documentation/javascript/get-api-key)，查閱日期：2026-10-14。

[20] Google for Developers，〈Markers overview〉，[Advanced Markers 文件](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)，查閱日期：2026-10-14。

### 部署、資料庫與前端技術

[21] Zeabur，〈Private Networking〉，[服務私有網路文件](https://zeabur.com/docs/zh-TW/deploy/networking/private-networking)；〈Custom Docker Image〉，[Docker 部署文件](https://zeabur.com/docs/en-US/deploy/methods/custom-docker-image)，查閱日期：2026-10-14。n8n 部署於 Zeabur VM 服務是本專案的架構規劃。

[22] Docker，〈Run containers〉，[Docker Engine 文件](https://docs.docker.com/engine/containers/run/)；〈Port publishing〉，[網路連接埠文件](https://docs.docker.com/engine/network/port-publishing)，查閱日期：2026-10-14。作為網站與 PostgreSQL 容器化、網路隔離及持久化設計參考。

[23] PostgreSQL Global Development Group，〈PostgreSQL Documentation〉，[官方文件](https://www.postgresql.org/docs/current/)，查閱日期：2026-10-14。作為關聯式資料儲存設計參考。

[24] Cloudflare，〈Cloudflare Tunnel〉，[建立 Tunnel 文件](https://developers.cloudflare.com/tunnel/get-started/)；〈Routing〉，[主機名稱路由文件](https://developers.cloudflare.com/tunnel/concepts/routing/)，查閱日期：2026-10-14。作為透過 Cloudflare Tunnel 將受控網域流量路由至後端服務的架構參考。

[25] MathJax，〈Combined Components〉，[元件文件](https://docs.mathjax.org/en/v3.2/web/components/combined.html)；〈Typesetting and Converting Mathematics〉，[動態排版文件](https://docs.mathjax.org/en/v3.2/web/typeset.html)，查閱日期：2026-10-14。用於網頁試算公式的數學式顯示。

## 安全與資料使用

- 不要提交 `.env`、資料庫檔、Token、API 金鑰或服務憑證。
- 後端管理 API 必須設定高強度 `ADMIN_TOKEN`；Google Maps API key 應限制 API 與網站來源。
- 油轉電表單資料在瀏覽器中運算，不會由本專案後端保存；使用 Google Maps 路線功能時，路線端點會傳送給 Google Maps 服務處理。
- 資料來源可能變更；頁面估算不構成車價、補助資格、營運收入、即時充電狀態或實際續航承諾。

## 授權與聲明

本專案為 Toyota bZ4X 油轉電評估工具與技術原型，並非 Toyota 官方網站或購車報價。車款、油價及電價資料均應依來源與查核時間判讀；使用者應確認適用年式、費率、補助條件及營運用途。


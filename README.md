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

## 主要資料來源

- [Toyota bZ4X 規格](https://www.toyota.com.tw/showroom/bZ4X/fullsepc.aspx)與[原廠保證](https://www.toyota.com.tw/electric_guarantee.aspx)
- [能源署車輛油耗指南](https://ea03.moeaea.gov.tw/e0416/oil_guide.aspx)
- [Yahoo 汽車台灣車款目錄](https://autos.yahoo.com.tw/new-cars/)；歷年項目保留原始來源並標示非原廠資料
- [中油牌價資料](https://www.cpc.com.tw/GetOilPriceJson.aspx?type=TodayOilPriceString)
- [台電公開電價資料](https://service.taipower.com.tw/data/opendata/apply/file/d007008/001.json)
- [Google Maps Routes 文件](https://developers.google.com/maps/documentation/routes)
- [主管機關補助規定](https://motclaw.motc.gov.tw/webMotcLaw2018/Law/ArticleContent?LawID=E0196009&type=-1)；適用資格與年度金額仍以公告及核定結果為準

## 安全與資料使用

- 不要提交 `.env`、資料庫檔、Token、API 金鑰或服務憑證。
- 後端管理 API 必須設定高強度 `ADMIN_TOKEN`；Google Maps API key 應限制 API 與網站來源。
- 油轉電表單資料在瀏覽器中運算，不會由本專案後端保存；使用 Google Maps 路線功能時，路線端點會傳送給 Google Maps 服務處理。
- 資料來源可能變更；頁面估算不構成車價、補助資格、營運收入、即時充電狀態或實際續航承諾。

## 授權與聲明

本專案為 Toyota bZ4X 油轉電評估工具與技術原型，並非 Toyota 官方網站或購車報價。車款、油價及電價資料均應依來源與查核時間判讀；使用者應確認適用年式、費率、補助條件及營運用途。


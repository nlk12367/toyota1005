# bZ4X 換車比較｜Zeabur 部署專案

保留單頁車款搜尋、規格帶入、能源費與馬力比較。前端不需要 React、Vite、npm 或 CDN。此版本新增 Python 後端、資料儲存與排程，適合上傳 GitHub 後由 Zeabur 部署。

## 已包含的功能

- 158 筆現行初始車款／等級資料、9 個品牌，另加入歷年車款資料庫；收錄數量與年份見 [HISTORY.md](HISTORY.md)。首次啟動写入資料庫，既有資料庫也會加入歷年資料。
- 支援歷年／較早經典車、年份、動力及英文車系／中文別名篩選。指南年度與車款目錄年式分開標記；未收錄年份可手動計算。
- 歷年來源包括能源署官方油耗指南及 Yahoo 汽車台灣目錄，逐筆保留來源。媒體資料不標為原廠資料；未知值不猜測。
- 馬力支援 PS、英制 hp、kW；原表只標 hp 且定義未確認時，需確認單位再比較。油電引擎馬力不代替系統綜效輸出。
- 網頁每次載入都使用資料庫最新車款和油價；不是從網頁直接跨站抓官網。
- 中油官方牌價每 6 小時取得一次，保留官方生效日和取得時間。
- 已收錄車款的官方來源每 7 天檢查一次。Toyota、三菱、Hyundai 的規格頁，以及 Honda CR-V／FIT、Nissan SENTRA／KICKS 支援結構化更新。
- 型錄 PDF（Ford、Mazda、Kia）與 Tesla 頁面目前監測來源變動。首次成功取得建立指紋；後續內容有變更則標為 `review_required`，保留原規格。這些來源尚未支援全自動規格解析。
- 原廠未明示的綜效 PS 不自行相加。解析失敗、規格缺漏或大量版本消失時保留前一筆資料。
- `/status` 可查看公開更新紀錄；受管理金鑰保護的 API 可手動觸發更新。

**自動更新範圍是已收錄的來源。** 同一規格頁新增等級可以被收錄；品牌推出全新車系或更換規格頁網址，需要新增來源與適配解析器。電價目前仍採既有固定資料，沒有自動更新。文件的原始年式不能由查核日期推定。

## 放到 GitHub

1. 指定儲存庫為 https://github.com/nlk12367/toyota1005 ，本專案檔案放在 repository 根目錄。
2. 根目錄應包含 `Dockerfile`、`app.py`、`storage.py`、`collectors.py`、`requirements.txt`、`public/` 和 `seed/`。
3. 不要上傳實際 `.env`、資料庫檔、PDF 研究檔、舊專案 ZIP 或 API 金鑰。`.gitignore` 已排除常見本機資料與金鑰檔。

## 部署到 Zeabur（建議 PostgreSQL）

1. 在 Zeabur 建立專案，加入 GitHub 服務，選擇 repository。Zeabur 會依根目錄 Dockerfile 建置。
2. 在同一專案加入 PostgreSQL 服務。
3. 在網頁服務設定環境變數 `DATABASE_URL`，使用 PostgreSQL 服務提供的連線字串／變數參照。不要把實際字串放到 GitHub。
4. 設定 `ADMIN_TOKEN` 為至少 32 個隨機字元。未設定時，手動更新 API 會拒絕存取；自動排程仍可運作。
5. 預設 `PORT=8080`、`AUTO_UPDATE=true`、`OIL_INTERVAL_HOURS=6`、`VEHICLE_INTERVAL_HOURS=168`；可於服務設定修改。
6. 加入網頁網域後，打開首頁確認可選車、帶入規格與試算，再開 `/status` 看更新紀錄。首次來源檢查在背景進行，可能需要數分鐘，期間首頁照常使用種子資料。

資料庫由 PostgreSQL 服務保管。重新部署時保留既有現行車款與牌價；只有空資料庫才初始化現行種子。`seed/history.json` 為版本管理的歷年快照，每次啟動依固定 ID 匯入並替換上一版內建歷年資料，避免重複收錄。它不會覆蓋現行車款的官網更新結果。

### 不使用 PostgreSQL 的替代方式

不設定 `DATABASE_URL` 時使用 SQLite。**必須在 Zeabur 為網頁服務掛載 Volume 到 `/data`**，並設 `DATA_DIR=/data`，才可保留重啟後的更新資料。此模式只適合單一服務實例。不要只把資料存進容器檔案系統並假設它會永久保留。

## API

| 路徑 | 用途 |
| --- | --- |
| `GET /health` | 健康檢查 |
| `GET /api/vehicles` | 全部已存車款 |
| `GET /api/vehicles?brand=Honda&q=CR-V` | 品牌與關鍵字檢索 |
| `GET /api/vehicles?brand=Honda&year=2008&q=Accord` | 歷年 Accord 年份檢索 |
| `GET /api/vehicles?scope=classic` | 較早車款；也支援 current、history |
| `GET /api/vehicles?year_kind=model` | 車款目錄年式；guide 表示官方指南年度 |
| `GET /api/rates` | 油價、生效日、來源與取得時間 |
| `GET /api/status` | 更新狀態与最近 100 筆紀錄 |
| `POST /api/update?kind=oil` | 更新油價；需 `Authorization: Bearer <ADMIN_TOKEN>` |
| `POST /api/update?kind=vehicles` | 檢查車款來源；需管理金鑰 |
| `POST /api/update?kind=all` | 更新油價與車款來源；需管理金鑰 |

金鑰只供管理端使用，不要放入網頁程式。更新請求成功接收後回傳 202；查看 `/status` 確認完成情況。

## 本機啟動與離線版

```sh
pip install -r requirements.txt
python app.py
```

本機預設網址是 `http://localhost:8080`。未設定資料庫時使用 `data/vehicles.sqlite3`。要暫停連外更新，設定 `AUTO_UPDATE=false`。

直接雙擊 `public/index.html` 仍可離線搜尋與計算，但使用固定內嵌資料，沒有後端更新功能。部署版請以服務根目錄的 Dockerfile 啟動，不要只部署 `public/` 靜態檔。

## 官方文件

- Zeabur Dockerfile：https://zeabur.com/docs/en-US/deploy/methods/dockerfile
- Zeabur Volumes：https://zeabur.com/docs/en-US/data-management/volumes
- Zeabur GitHub／資料庫服務：https://zeabur.com/docs/en-US/deploy/create/create-service
- 中油資料來源：https://www.cpc.com.tw/GetOilPriceJson.aspx?type=TodayOilPriceString

PDF 型錄保留官方連結與指紋，不把大型 PDF 打包進 repository。建議定期備份資料庫。GitHub 儲存庫： https://github.com/nlk12367/toyota1005 。Zeabur 實際服務狀態請於部署後檢查 `/health` 及 `/status`。

## 驗證範圍

已比對 34 份官方 HTML 規格頁、158 筆初始資料，並檢查 SQLite 持久儲存、搜尋 API、油價取得、更新失敗保留原資料與管理權限。PostgreSQL 實際連線及 Zeabur 雲端建置仍待部署後確認。

歷年版本另驗證固定 ID 不重複、重複啟動匯入不增加紀錄、保留現行更新資料與牌價、歷年來源不進入現行官網更新排程、年式／經典車檢索，以及查無結果清空舊車資訊。Accord 可依年份搜尋並帶入計算；手機版亦保留手動輸入入口。

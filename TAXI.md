# 計程車營運版比較系統：改版交付

保留現有 Python／SQLite／PostgreSQL 後端、單頁原生 JavaScript、車款資料庫、油價快照、車款帶入、官方車圖及深色樣式。沿用年能源費公式，以新增模組逐步擴充，沒有更換框架或重寫資料服務。

## 檔案

- `public/index.html`：改版文案、手機樣式、將車款搜尋折疊為選填入口、載入營運比較模組。
- `public/taxi.js`（新增）：純函式計算模型、八題表單、三車結果、補助現金流、保證與停工推估。既有欄位以 DOM 移動方式重用，原搜尋與帶入事件仍有效。
- `app.py`：只允許新增 `/taxi.js` 靜態路徑；保留原有 API、排程與來源檔案存取限制。
- `tests/taxi-model.test.cjs`、`tests/taxi-browser.test.cjs`、`tests/taxi-backend.test.py`：計算、瀏覽器與後端回歸驗證。

## 新增欄位

主要八題：目前車款／動力、日里程與工作天數、原車實際油耗／油種／實付油價、同級油電油耗／車價、三種充電比例、各充電電價、每小時收入、選填舊車殘值／兩方案貸款本金。

進階設定：補助資格與適用金額、燃油／油電／電動三級距、第一階段比例與預估入帳月、第二期最早申請月、貸款利率／期數、bZ4X 車價／容量／PS、一般／保守效率、充電損耗、油電車獨立油價、快充平均速度／實測分鐘／該次電表輸入度數／每日排隊時間、三車年度營業保險與保養、基本／容量保證年限里程／容量門檻、牌照稅免徵截止年。

結果依序呈現能源費、補助現金流、兩種回本、保證、快充停工及用途風險；每段顯示公式。零代表使用者明確決定不計，空白與不合法數值不會轉成零。

## 假設與限制

1. 每年營運月份固定 12，日里程與每月天數維持相同；年里程 = 日里程 × 月工作天數 × 12。零里程時保證依年限到期。
2. 200 km、26 天、14 km/L、95 無鉛為示例；原有油價 32.7 元/L（2026/10/05 快照）、家充 2.95 元/度、快充 10 元/度、家充 80%、快充 20%、損耗 0% 僅為可修改預設。並非即時營運報價；部署後原後端仍可更新油價。
3. 油電耗能／車價由使用者填寫，油價初始採原車 95 無鉛示例；可在進階設定改為另一實付油價。PHEV 無法用單一加權油耗作純燃油試算，原車能源費及相對回本顯示待確認。
4. 充電占比採電表輸入電量占比，需合計 100%；占比零的費率不用填。家充及車隊慢充假設在非營運時間進行；公共充電和排隊繞路視為停工。輸入完整實測充電時間及電量時，優先換算平均速度，不採峰值速度。每小時收入為營業收入，非淨利。
5. 補助 15／25／35 萬、70%／30%、6 個月採任務指定情境。bZ4X 適用資格與金額均留白待確認；必須由使用者確認，才能納入一般回本。另顯示「若核定 35 萬」的 245,000／105,000 情境，不能視為已核定。
6. 一般回本 =（新車價 − 可變現舊車殘值 − 已確認補助）÷ 年能源費節省。繼續開現有車為零新增投入基準。保守不計補助，增加自填保險／保養差額與快充收入損失，bZ4X 使用自填保守效率。節省額非正值時顯示無法回本；投入非正值時顯示無需回本。
7. 回本是簡化經濟比較，未計折舊、融資利息、充電設備、其他稅費及大修；貸款本金不減少經濟投入。現金流另扣貸款本金，補助入帳前不扣除補助。空白貸款／殘值需明確填 0 才表示不計。現金流估計不含分期開辦費；第一期入帳時間由使用者填寫，第二期滿 6 個月後可申請，實際核撥時間待確認。
8. 保證由新車零里程起算，按里程與年限先到者；營業用途是否適用仍須原廠確認。牌照稅免徵截止 2030 年底按需求參數列示，不推估後續稅額。
9. 不收集姓名、電話、車牌或精確路線。營運輸入只在瀏覽器記憶體運算，不存 localStorage、不上傳。原後端更新的是公開車款／油價，不接收試算輸入。
10. 計算結果包含 `schemaVersion` 與空 `extensions`，預留資料契約擴充；未實作 AI、充電站即時資訊、個人化或 LINE。

## 待確認

- bZ4X 計程車補助適用資格、核定級距、當年度受理期間與撥款日期。
- 三車營業車保險與保養費用，均不猜測。
- 公共快充實際時間、平均速度與排隊／繞路時間，均不猜測。
- 營業車掛牌、接單平台／車隊車型資格及營業用途原廠保證。
- 同級油電實際油耗／成交價，保守效率、實際電價、貸款與殘值由司機填寫。

頁面明示「補助以主管機關公告與核定結果為準；車商有名額不等於取得補助資格」、掛牌後 2 年不得過戶或轉自用、獨立試算非 Toyota 官方網站。

## 驗證結果（2026/10/11）

- Node 計算與語法檢查：通過。涵蓋未知補助、缺值、零值、不合法占比、PHEV、貸款零利率、保證年限及快充成本。
- Edge headless／Playwright：通過。390px 及 1280px，進階設定與資料庫展開後無橫向捲動；八題、未知欄位、三車結果、重設、搜尋帶入與無 JavaScript 錯誤。
- Python 語法及 SQLite／HTTP：通過。首頁、`taxi.js`、`health` 回傳正常；`app.py` 存取仍為 404。未啟動外部資料更新。
- 示例測試額外填入油電 22 km/L、車價 100 萬、舊車殘值 20 萬、油電已確認補助 25 萬、bZ4X 已確認補助 35 萬：年能源費現有車 145,749、油電 92,749、bZ4X 40,607 元；一般回本油電 10.38 年、bZ4X 6.94 年。這些額外數值只在測試使用，不是產品預設。
- 35 萬情境第一階段 245,000 元（24.5 萬）、滿 6 個月後 105,000 元（10.5 萬）。200 × 26 條件下基本保證里程約 23.1 個月、容量保證里程約 30.8 個月用完。
- PostgreSQL 與外部部署未驗證；未 commit、push 或部署。

## 執行

直接開啟 `public/index.html` 可離線試算；同目錄 `taxi.js` 必須一併保留。後端仍依原 README 啟動：`pip install -r requirements.txt`、`python app.py`。

計算測試：`node tests/taxi-model.test.cjs`。後端測試：`python tests/taxi-backend.test.py`。瀏覽器測試需 Playwright 與 Edge；檔案目前指向本次工作環境的 Playwright 套件，其他環境請修改 import／executablePath。

實際採用 ECC：`frontend-patterns`（增量組合、純函式模型與本機狀態）、`frontend-a11y`（label、fieldset、legend、即時結果、輸入驗證及鍵盤操作）。

參考連結：[Toyota 規配](https://www.toyota.com.tw/showroom/bZ4X/fullsepc.aspx)、[原廠保證](https://www.toyota.com.tw/electric_guarantee.aspx)、[主管機關補助規定](https://motclaw.motc.gov.tw/webMotcLaw2018/Law/ArticleContent?LawID=E0196009&type=-1)。補助規定須核對適用年度，連結不構成 bZ4X 適用資格認定。


## 單趟比較與文字精簡（2026/10/11）

- 在第二題新增折疊式「這一趟省多少」：起點／終點名称選填、單趟實際公里數自填。三台車共用原有效率與價格，不新增第九題。
- 結果最上方顯示單趟三車能源費及 bZ4X 節省金額；較貴時顯示「多花」。距離空白顯示待確認，不猜測政大至台科大距離。
- 公式、說明、假設與頁尾資料來源預設折疊；縮短首頁介紹及部分結果文案，保留補助、用途與非官方聲明。
- 單趟費用 = 公里數 ÷ 效率 × 單價；電動車沿用損耗與加權電價。這是條件估算，沒有即時路况、導航、地圖或路線 API。地點名稱只在瀏覽器暫存作顯示標籤，以 textContent 呈現，不上傳或保存。原隱私範圍調整為允許選填地點標籤，仍不蒐集精確路線。
- 本次修改：`public/index.html`、`public/taxi.js`、兩份 Node／瀏覽器測試與本說明；Python 後端未再修改。
- 本次驗證：JavaScript 語法、計算模型、單趟空白／負值／零值／較貴情境及 40 元對 10 元節省 30 元示例、390px／1280px、地點標籤安全呈現、折疊狀態與原有重設／車款帶入皆通過。40／10 為測試條件，非政大至台科大的實際報價。
- ECC 沿用 `frontend-patterns` 與 `frontend-a11y`。未 push 或部署。

## LIFF 四步介面與 LaTeX（2026/10/11）

依 App Design 參考圖改為黑底、深紅卡片、紅色操作及橘色財務重點。介面採四步：

1. 基本資料：原車／動力、日里程、月工作天数；原車搜尋、油耗油價與油電比較可展開；每日工時、營業開始結束時間選填。
2. 營運模式：中南部營運區域、巡迴／機場／跨縣市／包車、休息時段、收入、最長單趟距離。
3. 地點選擇：設備可用性、充電地點、可接受停留時間；单趟起終點與公里數；實際比例電價、貸款與完整進階參數可展開。
4. 結果與建議：上方年度節省大字、原車能源費、bZ4X 電費、保養保險費差；下方保留油電比較、單趟、補助、回本、保證、快充成本、用途限制與營運提醒。

新增營運區域／工時／用途／停留選項只保留在本機，作為條件展示與固定規則提醒；不推定實際電耗、充電速度，不改寫數值計算。充電地點按鈕表示可用條件，實际計算占比仍以自填百分比為準。未填費用一律待確認；沒有套用參考圖示意的保養省費。

LaTeX 使用本地固定版本 MathJax 3.2.2 `tex-svg`，含 Apache 2.0 授權檔；無 CDN 執行期請求。展開公式可看分式、上下標與對齊數學式，另保留代入值與符號定義。貸款公式明確將百分比年利率除以1200換算月利率。既有模型函式與補助／保證邏輯不變。

新增 `public/liff-ui.js`、`public/liff-ui.css`、`public/formulas.js`、`public/vendor/tex-svg.js` 與授權檔；修改 `public/index.html`、`public/taxi.js`、`app.py`（仅新增静态資源白名單）。新增 `tests/liff-browser.test.cjs`，旧瀏覽器測試入口轉入新流程；後端測試增加資源路徑。

已執行：原有模型與單趟測試、JavaScript 語法、390x844與1280x900 Edge瀏覽器、四步前後導航、鍵盤Enter、標籤、觸控尺寸、負值／錯誤占比、缺值、車款帶入、重設、LaTeX SVG無merror、離線無外部請求、Python SQLite／HTTP與來源存取限制。全部通過。使用 ECC `frontend-design-direction` 的本地 evidence checker，並沿用 `frontend-patterns`／`frontend-a11y`。

此次交付是 LIFF 使用情境的網頁介面。未加入 Agent、n8n、Messaging API 或 LINE 身分功能，也未部署。正式啟用仍需 HTTPS 部署位址、LINE Developers 的 LIFF ID／Endpoint 設定及必要 SDK 初始化；目前可直接離線開啟測試。LINE 實機 WebView 尚未驗證。

參考：[MathJax combined components](https://docs.mathjax.org/en/v3.2/web/components/combined.html)、[公式動態排版](https://docs.mathjax.org/en/v3.2/web/typeset.html)。

## 最新調整：三步流程與 Google Maps（取代上方四步描述）

依詳細參考圖，現在是「基本資料 → 常跑路線 → 充電條件」，接著獨立顯示結果頁。新增品牌、動力按鈕、每日工時與營業時間；次要資料收進展開區。保留原有計算與 LaTeX。

第二步整合 Google Maps：可縮放、查看全部縣市、點標記同步選取營運區域。標記是縣市概略位置，不是導航路線，也不會推定公里數。未設定 key、斷線或驗證失敗時，使用本地 Leaflet 與 Natural Earth 臺灣輪廓；這個備援不是 Google 街道地圖。

啟用方式：

1. 在 Google Cloud 啟用 Maps JavaScript API 與必要帳務設定。
2. 在 Zeabur 環境變數填入 `GOOGLE_MAPS_API_KEY`；後端 `/google-map-config.js` 動態提供設定，不把 key 提交 Git。設定網站 HTTP referrer 與 API 限制，例如 `https://eyw1999.zeabur.app/*`。瀏覽器 key 本來就可見，不能當作後端密鑰。
3. 正式環境用 `GOOGLE_MAPS_MAP_ID` 填入自己的 map ID。空白時使用 Google 官方測試用 `DEMO_MAP_ID`。
4. 用本機 HTTP 或正式 HTTPS 網址開啟；`file://` 保留離線地圖。進入第二步才載入 Google SDK。

未提供 API key，因此目前 Google 服務尚未啟用，沒有驗證真實街道底圖、帳務、網域限制或 LINE WebView。Google 地圖連網會向 Google 傳送一般網路／地圖請求；試算欄位、收入、地點標籤不會送出。沒有定位權限、地址搜尋、自動路線或 Agent／n8n 功能。單趟距離仍由使用者自填。

新增：`public/google-map-config.js`、`public/google-region-map.js`、`public/region-map.js`、本地 Leaflet／臺灣輪廓與授權資料、`tests/google-map.test.cjs`。調整：`public/liff-ui.js`、`public/liff-ui.css`、`public/index.html`、`app.py` 靜態白名單、瀏覽器與後端測試。

驗證結果：計算模型與單趟案例、三步導航／返回／重設／車款帶入／缺值／LaTeX、390px 與 1280px 無橫向捲動、本地 SQLite／HTTP 與資源白名單均通過。Google adapter 使用 mock SDK 驗證延遲載入、標記同步、查看全部、地圖切換及網路／驗證失敗備援；這不是 Google 真實服務測試。未設定 key 時無外部請求。使用 ECC `frontend-patterns`、`frontend-a11y`、`frontend-design-direction`。未 commit、push 或部署。

參考：[Google Maps 載入方式](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)、[API key 設定](https://developers.google.com/maps/documentation/javascript/get-api-key)、[Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)。

### Zeabur 部署設定

GitHub 主分支包含新版介面，但正式服務需在 Zeabur 設定上述 Google 環境變數並重新部署。本機曾以使用者提供的 key 測試，回傳 `RefererNotAllowedMapError`；此前另有 `ApiNotActivatedMapError`。真實 Google 底圖尚未驗證成功。原本填有 key 的本地設定已保留於專案外的 `work/google-map-config.private.js`，不會推送或包含於交付 ZIP。LINE LIFF 設定仍由 LINE Developers 管理，本次不加入 Agent。

### 美學微調（2026/10/12，本地版本）

保留黑紅橘風格與三步流程，紅色集中於主要操作，選取項目改為琥珀色描邊並保留勾選。提高選項／說明字級，統一表單間距，清除原有 summary 下邊距造成的多餘留白。年度節省保留主卡，三個費用區塊合併為一組；待確認採中性琥珀灰，另集中列出尚需補齊的資料。手機三車費用改成直向排列。

補助情境改成兩階段時間軸；實際油電與 bZ4X 墊款金額在可展開列顯示，分期／貸款／公式保留於內。保證改成兩張月份摘要，完整條件、先到者為準及 LaTeX 仍保留。未知資料不補零、不猜測，計算函式未修改。

修改檔案：`public/liff-ui.css`、`public/liff-ui.js`、`public/taxi.js`、本說明。已通過計算模型與單趟案例、390px／1280px UI 回歸與 Google mock adapter 測試，並人工檢視三步、結果、補助與保證截圖。使用 ECC `frontend-design-direction` 與 `frontend-a11y`；本輪尚未提交、推送或部署，Google 真實底圖與 LINE WebView 美學仍未驗證。

### 最新介面規格：油轉電顧問（取代上方配色與預設描述）

頂部改為「油轉電顧問」，三頁依序是基本資料、營運模式、地點選擇，接著結果與建議。使用 Toyota 紅 `#E60012`、紅框與紅圈白勾、虛線進度、橘黃結果數字、底部資料用途小字，以及自製紅色 SVG 提示角色。

最新預設：Toyota／Corolla Altis、汽油、250 公里／10 小時、每月26天、08:00–18:00（允許跨日）、最長單趟60公里；台北市／新北市、市區短程／機場接送、午餐時段；家充條件還不確定、公共充電站、可停留30–60分鐘。全部可更改。保留中南部選項與原車款搜尋，自填車型可展開。下拉選車不改寫使用者實際油耗，只有原有「帶入車款」功能會依資料庫帶入規格；油耗仍須按實際營運修正。

新增 `public/taxi-config.js` 作可設定常數檔：`parameters` 集中數值預設（`null` 代表待確認），`ui` 集中車款與時段，`choices` 集中預選，`projectionYears` 預設5。油價原本仍取選定油種與後端牌價；可用 `oilPrices` 個別覆寫，`null` 表示沿用原來源。介面填值優先，沒有將示例費用寫死。新增原車／bZ4X 年稅費與累積年數；未知保養、保險、補助、實際快充速度仍不填猜測值。充電地點選項記錄可用性，實际電量占比維持自填，不自動推論。

年里程固定沿用「日里程 × 月工作天數 ×12」；新預設為78,000公里。新增 `annualReport`（能源差、保養稅費差、年度總節省、能源降低比例與累積）作原模型的增量輸出；保養與稅費填齊後才顯示總節省，否則先顯示能源節省，總節省為待確認。五年累積以顯示年度金額四捨五入至元再乘年數，避免與畫面金額相乘產生兩元差異；原能源／回本計算仍用完整精度。新增 LaTeX 總節省公式，數字代入保留。累積假設條件固定，不含保險差、停工、補助、折舊或融資，也未推估稅制變更。保險差與停工仍納入原有保守回本。

結果主視覺沿用既有 bZ4X 官圖，搭配自製夜色山景 SVG 插畫，並非山間實拍照片。使用者資料先由三頁填寫，再在結果提供修改入口；未增加另一套RAV4預設或露營／操控推薦，以免與營運用途及資料規則矛盾。沒有導入React／Tailwind重寫；用 `TaxiUI.getState()` 提供規格所需的統一狀態快照，包含 `schemaVersion`／`extensions`，沒有保存或上傳。

本輪修改：原 UI／樣式／模型／LaTeX、兩個地圖 adapter、`public/index.html`、`app.py` 資源白名單、相關測試；新增常數檔、吉祥物與山景SVG。地圖新增台北／中和概略標記，仍不是路線計算。

驗證：原200公里／26天／14km/L案例、單趟40元／10元、補助24.5／10.5萬元、指定新預設、車款下拉、返回／重設／缺值、390／1280px、Google mock、後端資源測試均通過。新增可設定示例驗證36,600／16,598／8,500／28,502／142,510，未知與負值費用不推定為零；人工檢查四頁與LaTeX，並修正 MathJax 無障礙 MathML 重複顯示。採用 ECC `frontend-design-direction`／`frontend-a11y`。尚未提交、推送或部署；Google 真實底圖及 LINE WebView 仍待驗證。

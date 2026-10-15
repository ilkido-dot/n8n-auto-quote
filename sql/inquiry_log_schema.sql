-- inquiry_log：n8n「FernzLand Inquiry Assistant」每封來信的處理紀錄
-- n8n 先存進內建資料表，再匯出到 MySQL（fernzland 資料庫）做分析。
-- 這個檔案只有表結構，不含資料。

CREATE TABLE inquiry_log (
  id           INT PRIMARY KEY,        -- n8n 資料表的列編號
  received_at  DATETIME NOT NULL,      -- 收到信的時間（台北時間）
  day          DATE NOT NULL,          -- 日期
  source       VARCHAR(10) NOT NULL,   -- gmail = Gmail 收到的信，form = 表單送來的信，test = 測試信
  category     VARCHAR(20) NOT NULL,   -- 詢價／物流追蹤／客訴退貨／報關稅務／其他／無法判斷
  route        VARCHAR(20) NOT NULL,   -- auto_quote／human_review／escalate
  customer     VARCHAR(200),           -- 署名
  summary      TEXT,                   -- AI 寫的一句話摘要
  items        TEXT,                   -- 品項，例如 OMG M x20; Nano M x15
  units        INT NOT NULL DEFAULT 0, -- 總棵數
  total_usd    DECIMAL(10,2) NOT NULL DEFAULT 0, -- 自動報價總金額（美元）
  reasons      TEXT,                   -- 轉人工的原因，用分號隔開
  draft_check  TEXT                    -- 回信草稿的安全檢查結果
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

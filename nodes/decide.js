// Code node: "Decide"
// 決定每封信走哪條路線，並計算報價。
// 原則：AI 只負責讀信；價格、折扣、要不要轉人工，全部由這段程式決定。
// 價目表：示意價格（結構同 FernzLand 美國價目表，58 筆，價格已調整）。Key = "品種|尺寸"，單位 USD。
const 價目表 = {
  "bacteria|S": 24.00,
  "bacteria|M": 30.00,
  "bacteria|L": 60.00,
  "nano|S": 30.00,
  "nano|M": 42.00,
  "nano|L": 66.00,
  "jenny #2|S": 30.00,
  "jenny #2|M": 42.00,
  "jenny #2|L": 66.00,
  "omg|S": 30.00,
  "omg|M": 42.00,
  "omg|L": 66.00,
  "jade girl|S": 24.00,
  "jade girl|M": 30.00,
  "jade girl|L": 60.00,
  "spur|S": 48.00,
  "spur|L": 72.00,
  "celso tatsuta|M": 30.00,
  "pedro tatsuta|M": 30.00,
  "ginka|M": 30.00,
  "stella aetemi|M": 36.00,
  "northmonkey|M": 30.00,
  "pearl queen|M": 36.00,
  "bambi|M": 36.00,
  "hakunamatata|M": 30.00,
  "rydeen|M": 36.00,
  "foong si qi|M": 30.00,
  "ss foong|M": 30.00,
  "ridleyi dwarf silver|M": 30.00,
  "ridleyi dwarf silver|L": 60.00,
  "ridleyi monkeyking|M": 30.00,
  "ridleyi monkeyking|L": 60.00,
  "ridleyi nano|M": 30.00,
  "ridleyi nano|L": 60.00,
  "ridleyi parkarang|M": 30.00,
  "ridleyi parkarang|L": 60.00,
  "ridleyi saman|M": 30.00,
  "ridleyi saman|L": 48.00,
  "elsa|M": 30.00,
  "konayuki|M": 30.00,
  "wings of angle|M": 48.00,
  "white gizmo|M": 30.00,
  "banna a|M": 30.00,
  "cupid's wings|M": 36.00,
  "white hawk|M": 30.00,
  "madagascariense|M": 30.00,
  "veitchii auburn river (no face)|S": 24.00,
  "veitchii auburn river (perfect)|S": 108.00,
  "veitchii auburn river chief|S": 108.00,
  "veitchii auburn river flame|S": 108.00,
  "yellow moon dwarf x totoro|S": 48.00,
  "yellow moon dwarf x totoro|M": 120.00,
  "yellow moon dwarf x totoro|L": 264.00,
  "yellow moon dwarf|M": 36.00,
  "wandae var.dwarf&curling|M": 30.00,
  "griffin|M": 30.00,
  "yellow moon|M": 36.00,
  "bogor suddan|M": 30.00
};

// 客人自己寫的金額（貨幣符號＋數字）。只看這封信新寫的部分，不看「>」開頭的引用舊信
const 金額樣式 = /(US\$|NT\$|\$|€|£|USD|EUR|美金|美元|台幣|歐元)\s?\d[\d,]*(\.\d+)?|\d[\d,]*(\.\d+)?\s?(USD|EUR|美金|美元|元|歐元)/i;

// 每個品種有哪些尺寸（用來在「只有一種尺寸」時由程式補上）
const 尺寸表 = {};
for (const key of Object.keys(價目表)) {
  const [品種, 尺寸] = key.split('|');
  (尺寸表[品種] ??= []).push(尺寸);
}

// 折扣依「整張訂單總棵數」計算
function 折扣率(總數) {
  if (總數 > 100) return null;   // 價目表沒有定義 → 轉人工
  if (總數 >= 51) return 0.25;
  if (總數 >= 21) return 0.15;
  return 0;
}

// 名稱正規化：小寫、去掉 P. / Platycerium 前綴、壓縮空白
const 正規化 = s => String(s ?? '').toLowerCase()
  .replace(/^(platycerium\s+|p\.\s*)/, '').replace(/\s+/g, ' ').trim();

// 讀 AI 的回答：拿掉 ```json 標記，取出 JSON。AI 偶爾會在外面多包一層 {"output": …}，程式會拆開。
// 每個欄位都由程式檢查格式；不合格就不用這次的結果，整封轉人工。
function 讀AI回答(json) {
  if (json.error) return { 錯誤: 'AI 呼叫失敗' };
  const 文字 = String(json.text ?? '');
  const 開始 = 文字.indexOf('{'), 結束 = 文字.lastIndexOf('}');
  if (開始 < 0 || 結束 < 開始) return { 錯誤: '沒有回傳 JSON' };
  let d;
  try { d = JSON.parse(文字.slice(開始, 結束 + 1)); } catch (e) { return { 錯誤: 'JSON 無法解析' }; }
  while (d && typeof d === 'object' && !('類型' in d) && d.output && typeof d.output === 'object') d = d.output;
  const 問題 = 檢查格式(d);
  return 問題 ? { 錯誤: 問題 } : { 資料: d };
}

function 檢查格式(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return '不是 JSON 物件';
  if (!['詢價', '物流追蹤', '客訴退貨', '報關稅務', '其他'].includes(d.類型)) return `類型不對：${d.類型}`;
  if (typeof d.語言 !== 'string' || !/^[a-z]{2}$/.test(d.語言)) return `語言不對：${d.語言}`;
  if (typeof d.摘要 !== 'string') return '缺少摘要';
  if (typeof d.是新詢價 !== 'boolean') return '是新詢價不是 true/false';
  if (typeof d.議價 !== 'boolean') return '議價不是 true/false';
  for (const k of ['客戶', '目的地', '其他問題']) {
    d[k] ??= null;
    if (d[k] !== null && typeof d[k] !== 'string') return `${k}格式不對`;
  }
  if (!Array.isArray(d.品項)) return '品項不是清單';
  for (const x of d.品項) {
    if (!x || typeof x.名稱 !== 'string' || !x.名稱.trim()) return '品項缺少名稱';
    x.尺寸 ??= null;
    x.數量 ??= null;
    if (!['S', 'M', 'L', null].includes(x.尺寸)) return `尺寸不對：${x.尺寸}`;
    if (x.數量 !== null && !(Number.isInteger(x.數量) && x.數量 > 0)) return `數量不對：${x.數量}`;
  }
  return null;
}

// 原始來信（來源、測試資訊、原信）。AI 讀信的節點不會標記「這筆結果是哪一封信」，
// 所以用順序配對：第 i 筆 AI 結果 = 第 i 封信。數量對不上就整批停止，不猜、不把回信配錯人。
const 原始來信 = $('Prepare').all().map(x => x.json);
const 輸入 = $input.all();
if (輸入.length !== 原始來信.length) {
  throw new Error(`AI 讀信結果 ${輸入.length} 筆、原始來信 ${原始來信.length} 封，數量對不上。為了避免回信配錯人，整批停止。`);
}

return 輸入.map((item, i) => {
  const 原始 = 原始來信[i];
  const { 資料, 錯誤 } = 讀AI回答(item.json);

  // AI 讀信失敗（呼叫失敗、格式不對）→ 不報價，直接轉人工
  if (錯誤) {
    return { json: {
      來源: 原始.來源 ?? 'form', 測試: 原始.測試 ?? null, 原信: 原始.email ?? '', 郵件: 原始.郵件 ?? null,
      類型: '無法判斷', 語言: /[\u4e00-\u9fff]/.test(原始.email ?? '') ? 'zh' : 'en',
      客戶: null, 摘要: 'AI 讀信失敗', 目的地: null, 其他問題: null,
      路線: 'human_review', 原因: [`AI 讀信結果不能用（${錯誤}）：需要人工處理`],
      報價: [], 總棵數: null, 折扣: null, 總計: null,
    } };
  }

  const 基本 = {
    來源: 原始.來源 ?? 'form', 測試: 原始.測試 ?? null, 原信: 原始.email ?? '', 郵件: 原始.郵件 ?? null,
    類型: 資料.類型, 語言: 資料.語言, 客戶: 資料.客戶, 摘要: 資料.摘要,
    目的地: 資料.目的地, 其他問題: 資料.其他問題,
  };
  const 不報價 = (路線, 原因) =>
    ({ json: { ...基本, 路線, 原因, 報價: [], 總棵數: null, 折扣: null, 總計: null } });

  // 不是詢價的信：不報價，依類型分流
  if (資料.類型 === '客訴退貨') return 不報價('escalate', ['客訴／退貨：請負責人優先處理']);
  // 報關、稅務：答錯的代價是客人多付錢或貨卡在海關，一律由人回覆，系統不回答
  if (資料.類型 === '報關稅務') return 不報價('human_review', ['報關／稅務問題：由熟悉進出口文件的人回覆，系統不回答']);
  if (資料.類型 === '物流追蹤') return 不報價('human_review', ['詢問物流：需要人工查詢追蹤碼']);
  if (資料.類型 === '其他') return 不報價('human_review', ['不是詢價：需要人工回覆']);

  // 詢價：任何不確定的地方都轉人工，絕不送出猜出來的報價
  const 原因 = [];
  if (!資料.是新詢價) 原因.push('不是新的詢價');
  if (資料.品項.length === 0 && 資料.是新詢價) 原因.push('抽不到任何品項');

  // 議價：AI 判斷語意（例如「能不能便宜一點」這種沒有數字的說法），程式再檢查信裡有沒有客人自己寫的金額
  // 兩邊任一個成立就轉人工：價格要由人來談，不由系統自動回覆
  const 新寫的內容 = String(原始.email ?? '').split('\n').filter(l => !l.trim().startsWith('>')).join('\n');
  const 客人寫的金額 = 新寫的內容.match(金額樣式);
  if (資料.議價) 原因.push('客人在議價或要求特別價格：需要人工確認');
  if (客人寫的金額) 原因.push(`客人信中提到金額（${客人寫的金額[0].trim()}）：需要人工確認價格`);

  const 品項 = 資料.品項.map(x => {
    const 品種 = 正規化(x.名稱);
    let 尺寸 = x.尺寸;
    // 信中沒寫尺寸、但這個品種只有一種尺寸 → 由程式補上（不交給 AI 猜）
    if (尺寸 === null && 尺寸表[品種]?.length === 1) 尺寸 = 尺寸表[品種][0];
    const 原價 = 價目表[`${品種}|${尺寸}`] ?? null;
    if (x.數量 === null) 原因.push(`${x.名稱}：沒有明確數量`);
    if (原價 === null) {
      if (!尺寸表[品種]) 原因.push(`${x.名稱}：價目表沒有這個品種`);
      else if (尺寸 === null) 原因.push(`${x.名稱}：沒寫尺寸（可選 ${尺寸表[品種].join('/')}）`);
      else 原因.push(`${x.名稱}：沒有 ${尺寸} 尺寸`);
    }
    return { 名稱: x.名稱, 尺寸, 數量: x.數量, 原價 };
  });

  const 總數 = 品項.reduce((s, x) => s + (x.數量 || 0), 0);
  const 折扣 = 折扣率(總數);
  if (折扣 === null) 原因.push(`總數 ${總數} 棵超過價目表範圍（>100）`);

  if (原因.length > 0) {
    return { json: { ...基本, 路線: 'human_review', 原因,
      報價: 品項.map(({ 原價, ...x }) => x), 總棵數: 總數, 折扣: null, 總計: null } };
  }

  const 報價 = 品項.map(x => {
    const 單價 = Math.round(x.原價 * (1 - 折扣) * 100) / 100;
    return { 名稱: x.名稱, 尺寸: x.尺寸, 數量: x.數量, 單價, 小計: Math.round(單價 * x.數量 * 100) / 100 };
  });
  const 總計 = Math.round(報價.reduce((s, x) => s + x.小計, 0) * 100) / 100;
  return { json: { ...基本, 路線: 'auto_quote', 原因: [], 報價, 總棵數: 總數, 折扣, 總計 } };
});

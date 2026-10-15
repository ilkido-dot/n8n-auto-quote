// 今天的數字全部由程式統計（AI 只負責把數字寫成一段話）
const rows = $input.all().map(i => i.json).filter(r => r && r.day);
const 計數 = f => rows.filter(f).length;

const 品項次數 = {};
for (const r of rows.filter(r => r.route === 'auto_quote')) {
  for (const s of String(r.items ?? '').split('; ').filter(Boolean)) {
    const 名稱 = s.replace(/ x\S*$/, '');
    品項次數[名稱] = (品項次數[名稱] ?? 0) + 1;
  }
}
const 熱門品項 = Object.entries(品項次數).sort((a, b) => b[1] - a[1]).slice(0, 3)
  .map(([名稱, 次數]) => `${名稱}（${次數} 封）`);

// 需求訊號：客人問了、但價目表上沒有的品種（或沒有那個尺寸），由程式從轉人工原因裡統計。
// 可能是值得進貨的新需求，也可能是拼錯的品名（可以補進別名，減少轉人工）。
const 缺項次數 = {};
for (const r of rows) {
  for (const 原因 of String(r.reasons ?? '').split('; ')) {
    const m = 原因.match(/^(.+)：(價目表沒有這個品種|沒有 ([SML]) 尺寸)$/);
    if (!m) continue;
    const 名稱 = m[3] ? `${m[1]} 的 ${m[3]} 尺寸` : m[1];
    缺項次數[名稱] = (缺項次數[名稱] ?? 0) + 1;
  }
}
const 價目表沒有的品項 = Object.entries(缺項次數).sort((a, b) => b[1] - a[1]).slice(0, 5)
  .map(([名稱, 次數]) => `${名稱}（${次數} 封）`);

return [{ json: {
  day: $now.toISODate(),
  emails: rows.length,
  auto_quotes: 計數(r => r.route === 'auto_quote'),
  human_reviews: 計數(r => r.route === 'human_review'),
  escalations: 計數(r => r.route === 'escalate'),
  quoted_usd: Math.round(rows.filter(r => r.route === 'auto_quote')
    .reduce((s, r) => s + (Number(r.total_usd) || 0), 0) * 100) / 100,
  test_emails: 計數(r => r.source === 'test'),
  by_category: {
    詢價: 計數(r => r.category === '詢價'),
    物流追蹤: 計數(r => r.category === '物流追蹤'),
    客訴退貨: 計數(r => r.category === '客訴退貨'),
    報關稅務: 計數(r => r.category === '報關稅務'),
    其他: 計數(r => r.category === '其他'),
  },
  top_items: 熱門品項,
  not_in_price_list: 價目表沒有的品項,
  drafts_rejected: 計數(r => String(r.draft_check).startsWith('退回')),
} }];

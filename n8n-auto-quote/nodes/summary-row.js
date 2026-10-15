// 把摘要整理成「每日摘要」資料表的一列，並檢查 AI 有沒有寫出程式沒算過的數字
const s = $('Daily Stats').first().json;
const 文字 = String($input.first().json.text ?? '').trim();

const 允許 = new Set();
const 收集 = v => {
  if (typeof v === 'number') 允許.add(String(v));
  else if (typeof v === 'string') (v.match(/\d+(\.\d+)?/g) ?? []).forEach(n => 允許.add(String(Number(n))));
  else if (Array.isArray(v)) v.forEach(收集);
  else if (v && typeof v === 'object') Object.values(v).forEach(收集);
};
收集(s);
const 出現 = (文字.replace(/(\d),(\d)/g, '$1$2').match(/\d+(\.\d+)?/g) ?? []).map(n => String(Number(n)));
const 可疑 = [...new Set(出現.filter(n => !允許.has(n)))];
const 摘要 = 可疑.length
  ? `⚠️ 摘要裡有程式沒算過的數字（${可疑.join('、')}），請人工確認。\n${文字}`
  : 文字;

return [{ json: {
  day: s.day, generated_at: $now.toISO(),
  emails: s.emails, auto_quotes: s.auto_quotes, human_reviews: s.human_reviews,
  escalations: s.escalations, quoted_usd: s.quoted_usd,
  summary_text: 摘要, stats_json: JSON.stringify(s),
} }];

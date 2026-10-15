// Code node: "Grade" (Mode: Run Once for All Items)
// Pairs each result with its test case by index and checks it against `expected`.
const 正規化 = s => String(s ?? '').toLowerCase()
  .replace(/^(platycerium\s+|p\.\s*)/, '').replace(/\s+/g, ' ').trim();
const 簽名 = 品項 => 品項.map(x => `${正規化(x.名稱)}|${x.尺寸}|${x.數量}`).sort().join(' ; ');

const tests = $('Test Emails').all();
const results = $input.all().map((r, i) => {
  const t = tests[i].json, e = t.expected, out = r.json;
  // v1 沒有轉人工機制：只要有品項就會送出報價
  const 實際路線 = out.路線 ?? (out.報價.length ? 'auto_quote' : 'human_review');
  const 路線OK = 實際路線 === e.route ||
    (e.acceptable_alternative && 實際路線 === 'human_review');
  const 金額OK = e.route !== 'auto_quote' || 實際路線 !== 'auto_quote' || out.總計 === e['總計_USD'];
  return { json: {
    id: t.id, category: t.category,
    結果: (路線OK && 金額OK) ? 'PASS' : 'FAIL',
    預期路線: e.route, 實際路線,
    預期總計: e['總計_USD'] ?? null, 實際總計: out.總計,
    抽取正確: 簽名(out.報價) === 簽名(e.品項),
    預期抽取: 簽名(e.品項), 實際抽取: 簽名(out.報價),
  }};
});
const pass = results.filter(r => r.json.結果 === 'PASS').length;
return [{ json: { 總結: `${pass} / ${results.length} PASS` } }, ...results];

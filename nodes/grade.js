// 把每封測試信的結果和預期答案比對
const 金額樣式 = /(US\$|NT\$|\$|€|USD|EUR|美金|美元|台幣|歐元)\s?\d|\d[\d,]*(\.\d+)?\s?(USD|EUR|€|美金|美元|元|歐元)/i;
// 退款、補償、免運費的說法（英、中、德、荷、法）。系統會寫這幾種語言的回信，所以每種都要擋
const 退款樣式 = /refund|reimburs|compensat|free shipping|waive|cover (the |your )?(shipping|freight)|退款|退費|退運費|運費退|免運|負擔運費|賠償|補償|erstatt|entschädig|gutschrift|kostenlose[nr]? versand|terugbetal|vergoed|gratis verzending|rembours|dédommag|livraison gratuite/i;

const results = $input.all().map(r => {
  const d = r.json, t = d.測試, e = t.expected;
  const 類型OK = !e.類型 || d.類型 === e.類型;
  const 語言OK = !e.語言 || d.語言 === e.語言;
  const 路線OK = d.路線 === e.route || (Boolean(e.acceptable_alternative) && d.路線 === 'human_review');
  const 金額OK = e.route !== 'auto_quote' || d.路線 !== 'auto_quote' || d.總計 === e['總計_USD'];
  // 回信安全：拿掉程式產生的報價表之後，信裡不能有金額；三條路線都不能提到退款、補償或免運費
  const 信 = String(d.最終回信 ?? '');
  const 去掉報價表 = 信.split('\n')
    .filter(l => !/^- .+ @ US\$/.test(l) && !/^(Total|總計)\s?[:：]/.test(l))
    .join('\n');
  const 安全OK = !金額樣式.test(去掉報價表) && !退款樣式.test(信);
  const 全部OK = 類型OK && 語言OK && 路線OK && 金額OK && 安全OK;
  return { json: {
    id: t.id, category: t.category, 結果: 全部OK ? 'PASS' : 'FAIL',
    預期類型: e.類型 ?? null, 實際類型: d.類型,
    預期路線: e.route, 實際路線: d.路線,
    預期總計: e['總計_USD'] ?? null, 實際總計: d.總計,
    回信安全: 安全OK, 草稿檢查: d.草稿檢查,
  } };
});
const pass = results.filter(r => r.json.結果 === 'PASS').length;
const 退回 = results.filter(r => String(r.json.草稿檢查).startsWith('退回')).length;
return [{ json: { 總結: `${pass} / ${results.length} PASS`, 草稿被退回次數: 退回 } }, ...results];

// 把 AI 寫的回信草稿和程式算的報價表組在一起，並做安全檢查。
// 檢查不過就退回、改用固定範本：寄出去的金額一定是程式算的，AI 也不會自己答應退款。
const 金額樣式 = /(US\$|NT\$|\$|€|USD|EUR|美金|美元|台幣|歐元)\s?\d|\d[\d,]*(\.\d+)?\s?(USD|EUR|€|美金|美元|元|歐元)/i;
const 折扣樣式 = /\d+\s?%|\d+\s?折/;
const 退款樣式 = /refund|reimburs|compensat|退款|退費|賠償|補償/i;

function 報價表(d) {
  const 行 = d.報價.map(x =>
    `- ${x.名稱} (${x.尺寸}) × ${x.數量} @ US$${x.單價.toFixed(2)} = US$${x.小計.toFixed(2)}`);
  const 百分比 = Math.round(d.折扣 * 100);
  if (d.語言 === 'zh') {
    const 說明 = d.折扣 > 0 ? `（共 ${d.總棵數} 棵，享 ${百分比}% 數量折扣）` : '';
    return [...行, `總計：US$${d.總計.toFixed(2)} ${說明}`.trim()].join('\n');
  }
  const 說明 = d.折扣 > 0 ? `(${d.總棵數} units in total, ${百分比}% volume discount applied)` : '';
  return [...行, `Total: US$${d.總計.toFixed(2)} ${說明}`.trim()].join('\n');
}

function 範本(d) {
  if (d.語言 === 'zh') {
    const 開頭 = d.客戶 ? `${d.客戶} 您好，` : '您好，';
    if (d.路線 === 'auto_quote')
      return `${開頭}\n\n謝謝您的詢價，報價如下：\n\n${報價表(d)}\n\n如需調整品項或數量，請直接回覆這封信。\n\nFernzLand Team`;
    return `${開頭}\n\n謝謝您的來信，我們已經收到，負責的同事會在一個工作天內回覆您。\n\nFernzLand Team`;
  }
  const 開頭 = `Hi ${d.客戶 || 'there'},`;
  if (d.路線 === 'auto_quote')
    return `${開頭}\n\nThank you for your inquiry. Here is our quote:\n\n${報價表(d)}\n\nPlease reply to this email if you would like to adjust any items or quantities.\n\nBest regards,\nFernzLand Team`;
  return `${開頭}\n\nThank you for your email. We have received it, and a colleague will get back to you within one business day.\n\nBest regards,\nFernzLand Team`;
}

// 草稿要對回 Decide 的資料（路線、報價）。AI 寫回信的節點不會標記「這是哪一封信的草稿」，
// 所以用順序配對：第 i 份草稿 = 第 i 封信。數量對不上就整批停止，不猜、不把回信配錯人。
const 信件 = $('Decide').all().map(x => x.json);
const 草稿們 = $input.all();
if (草稿們.length !== 信件.length) {
  throw new Error(`回信草稿 ${草稿們.length} 份、信件 ${信件.length} 封，數量對不上。為了避免回信配錯人，整批停止。`);
}

return 草稿們.map((item, i) => {
  const d = 信件[i];
  const 草稿 = String(item.json.text ?? '').trim();
  const 問題 = [];
  if (!草稿) 問題.push('AI 沒有產生草稿');
  if (d.路線 === 'auto_quote') {
    const 次數 = 草稿.split('[QUOTE_TABLE]').length - 1;
    if (次數 !== 1) 問題.push(`報價表位置標記出現 ${次數} 次（應為 1 次）`);
  }
  // 檢查的是 AI 自己寫的文字（報價表還沒放進去之前）
  if (金額樣式.test(草稿)) 問題.push('AI 自己寫了金額');
  if (折扣樣式.test(草稿)) 問題.push('AI 自己寫了折扣');
  if (d.路線 !== 'auto_quote' && 退款樣式.test(草稿)) 問題.push('AI 提到退款或補償');

  const 通過 = 問題.length === 0;
  const 最終回信 = 通過
    ? (d.路線 === 'auto_quote' ? 草稿.replace('[QUOTE_TABLE]', 報價表(d)) : 草稿)
    : 範本(d);
  return { json: { ...d, AI草稿: 草稿,
    草稿檢查: 通過 ? '通過' : '退回，改用範本：' + 問題.join('；'), 最終回信 } };
});

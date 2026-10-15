// 表單、Gmail、測試信共用同一條流程：先把三種輸入整理成一樣的格式
// HTML 信件沒有純文字版本時，去掉標籤只留文字
const 純文字 = html => String(html ?? '')
  .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();

return $input.all().map(item => {
  const j = item.json;
  if (j.來源 === 'test') {
    return { json: { email: String(j.email ?? ''), 來源: 'test', 測試: j.測試, 郵件: null } };
  }
  // Gmail 收到的信（Gmail Inbox 節點，Simplify 關閉）。留下回信需要的 threadId、寄件人、主旨
  if (j.threadId) {
    // 電子報、廣告、自動回覆（休假通知等）不處理：不花 AI 費用，也避免和對方的自動回覆互相回信
    const h = j.headers ?? {};
    const 值 = k => String(h[k] ?? '').replace(/^[^:]*:\s*/, '').toLowerCase();
    if (h['list-unsubscribe'] || h['list-id'] || /bulk|list|junk/.test(值('precedence'))
      || (h['auto-submitted'] && 值('auto-submitted') !== 'no')) return null;
    const 寄件人 = j.from?.value?.[0]?.address
      ?? String(j.From ?? '').match(/<([^>]+)>/)?.[1] ?? String(j.From ?? '').trim();
    const 主旨 = String(j.subject ?? j.Subject ?? '');
    const 內文 = String(j.text || 純文字(j.html) || j.snippet || '');
    return { json: {
      email: `Subject: ${主旨}\n\n${內文}`.slice(0, 3000),
      來源: 'gmail', 測試: null,
      郵件: { id: j.id, threadId: j.threadId, 寄件人, 主旨 },
    } };
  }
  // 表單送出的內容；限制長度，避免公開表單被貼入超長文字
  const text = String(j['客戶來信'] ?? '').slice(0, 3000);
  return { json: { email: text, 來源: 'form', 測試: null, 郵件: null } };
}).filter(Boolean);

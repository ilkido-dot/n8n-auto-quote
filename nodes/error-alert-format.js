// 把錯誤內容整理成一則 LINE 訊息。錯誤可能發生在一般節點（execution），也可能發生在觸發節點（trigger）
const e = $input.first().json;
const 名稱 = e.workflow?.name ?? '（不明）';
const 節點 = e.execution?.lastNodeExecuted ?? e.trigger?.error?.node?.name ?? '（不明）';
const 訊息 = e.execution?.error?.message ?? e.trigger?.error?.message ?? '（沒有錯誤訊息）';
const 時間 = $now.setZone('Asia/Taipei').toFormat('MM/dd HH:mm');
const 連結 = e.execution?.url ? '\n' + e.execution.url : '';
return [{ json: { text: `⚠️ n8n 出錯 ${時間}\nWorkflow：${名稱}\n節點：${節點}\n訊息：${String(訊息).slice(0, 300)}${連結}` } }];

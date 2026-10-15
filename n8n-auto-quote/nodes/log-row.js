// 整理成「詢價紀錄」資料表的一列（欄位名稱要和資料表一致）
return $input.all().map(item => {
  const d = item.json;
  return { json: {
    received_at: $now.toISO(),
    day: $now.toISODate(),
    source: d.來源,
    category: d.類型,
    route: d.路線,
    customer: d.客戶 ?? '',
    summary: d.摘要 ?? '',
    items: (d.報價 ?? []).map(x => `${x.名稱} ${x.尺寸 ?? '?'} x${x.數量 ?? '?'}`).join('; '),
    units: d.總棵數 ?? 0,
    total_usd: d.總計 ?? 0,
    reasons: (d.原因 ?? []).join('; '),
    draft_check: d.草稿檢查 ?? '',
  } };
});

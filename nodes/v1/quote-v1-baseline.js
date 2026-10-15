// Code node: "Quote" (Mode: Run Once for All Items)
// v1 = baseline: real price list + volume tiers, but NO failure handling yet.
// Price list: demo prices (FernzLand US list structure, 58 rows, prices adjusted). Key = "variety|size", base price in USD.
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

// 折扣依「整張訂單總棵數」計算（價目表註記：any mix of varieties & sizes）
function 折扣率(總數) {
  if (總數 >= 51) return 0.25;
  if (總數 >= 21) return 0.15;
  return 0;
}

// 名稱正規化：小寫、去掉 P. / Platycerium 前綴、壓縮空白
const 正規化 = s => String(s ?? '').toLowerCase()
  .replace(/^(platycerium\s+|p\.\s*)/, '').replace(/\s+/g, ' ').trim();

return $input.all().map(item => {
  const 資料 = item.json.output;
  const 總數 = 資料.品項.reduce((s, x) => s + (x.數量 || 0), 0);
  const 折扣 = 折扣率(總數);

  const 報價 = 資料.品項.map(x => {
    const 原價 = 價目表[`${正規化(x.名稱)}|${x.尺寸}`] ?? null;
    const 單價 = 原價 === null ? null : Math.round(原價 * (1 - 折扣) * 100) / 100;
    return {
      名稱: x.名稱, 尺寸: x.尺寸, 數量: x.數量, 單價,
      小計: (單價 !== null && x.數量) ? Math.round(單價 * x.數量 * 100) / 100 : null,
    };
  });

  const 總計 = Math.round(報價.reduce((s, x) => s + (x.小計 || 0), 0) * 100) / 100;
  return { json: { 報價, 總棵數: 總數, 折扣, 總計, 目的地: 資料.目的地, 是新詢價: 資料.是新詢價 } };
});

# 売上・在庫紐付けバグ修正 仕様書（A案：最小侵襲）

このドキュメントは新セッションでそのまま実行可能な、自己完結した修正指示です。

---

## 0. ゴール

`/Users/yoshidanoboru/nobushop-pwa/public/js/app.js`（React 18 UMD + Tailwind の単一ファイル PWA、約 12,000 行）に対して、以下の不具合を**既存データを壊さずに**修正してください。

### 修正したい不具合
1. 売上更新後に在庫タブが「未出品」に勝手に戻る
2. 在庫タブと売上タブが正しく紐づかない（在庫が `listed` のまま売上だけ存在する等）
3. 同一商品が売上タブで重複表示される
4. 売上更新時に在庫ステータスが自動同期されない

### 絶対条件
- **既存データを壊さない**（最優先）
- データ構造は変更しない（`inventory` + `sales` の2配列構造のまま）
- マイグレーションはしない（自然整合）
- バックアップを **必ず** コード変更の前に取得する

---

## 1. 既存データ構造（前提知識）

### Inventory アイテム
```
{
  id, userId, brand, productName, category, color, condition, memo,
  photos, seoCategories, mgmtNo,
  purchasePrice, purchaseDate, purchaseStore, paymentMethod,
  purchaseCost: { totalTaxIn, totalTaxEx },
  listPrice, listDate, platform,
  status: 'unlisted' | 'listed' | 'sold',
  bundleGroup,  // まとめ仕入れ時
  createdAt, updatedAt
}
```

### Sale レコード
```
{
  id,                  // 形式が混在: "Date.now().toString()" や "sale_{ts}_{idx}"
  inventoryId,         // 在庫への外部キー
  platform, salePrice, feeRate, shipping, profit,
  saleDate, listDate, turnoverDays, platformId,
  purchasePrice,       // 非正規化コピー
  bundleGroup, bundleLabel,  // まとめ販売時
  userId, createdAt, updatedAt
}
```

### グローバルstate
- `App` コンポーネント（line 11603〜）
- `data.inventory` と `data.sales` を `AppContext` で配布
- `setData`（line 11634）で全データマージ + 孤立売上の自動クリーンアップ
- localStorage と Supabase の双方に保存

---

## 2. 事前準備（必須・実装前に実行）

### Step 1: ファイルバックアップ
```bash
cp /Users/yoshidanoboru/nobushop-pwa/public/js/app.js \
   /Users/yoshidanoboru/nobushop-pwa/public/js/app.js.backup_$(date +%Y%m%d_%H%M%S)
```

### Step 2: Git コミット
```bash
cd /Users/yoshidanoboru/nobushop-pwa
git status
git add -A
git commit -m "backup: before sales/inventory integrity fix"
```

両方できて初めて実装に進む。失敗時はその場で停止しユーザーに報告。

---

## 3. 修正内容

各修正は行番号で対象を特定しています。`app.js` のバージョンによりズレることがあるので、必ず周辺コードを Read で確認してから Edit してください。

---

### 修正1: 売上保存 = 在庫 status を必ず `'sold'` に同期

#### 1-A. 通常保存（新規）
**対象**: `SalesTab.handleSave` 内の `doSave` 関数 (line 6193-6242 付近)

**現状** (line 6201-6208):
```js
const invPatch = selectedItem ? {
  ...(form.purchasePrice !== '' ? { purchasePrice: Number(form.purchasePrice) } : {}),
  ...(form.purchaseDate  ? { purchaseDate:  form.purchaseDate  } : {}),
  ...(form.purchaseStore ? { purchaseStore: form.purchaseStore } : {}),
} : null;
```

**修正後**:
```js
const invPatch = selectedItem ? {
  ...(form.purchasePrice !== '' ? { purchasePrice: Number(form.purchasePrice) } : {}),
  ...(form.purchaseDate  ? { purchaseDate:  form.purchaseDate  } : {}),
  ...(form.purchaseStore ? { purchaseStore: form.purchaseStore } : {}),
  status: 'sold',                          // ★追加
  soldAt: new Date().toISOString(),        // ★追加
} : null;
```

#### 1-B. 編集保存
**対象**: line 6210-6220 の `if (editingSale)` ブロック

`editingSale.inventoryId` と `form.inventoryId` が違うとき、旧在庫の status を戻し、新在庫を sold にする。

**追加するロジック**（`if (editingSale)` の中、`setData` 直前）:
```js
const oldInvId = editingSale.inventoryId;
const newInvId = form.inventoryId;
let invList = updatedInventory;
if (oldInvId && oldInvId !== newInvId) {
  const stillHasOtherSale = data.sales.some(
    s => s.id !== editingSale.id && s.inventoryId === oldInvId
  );
  if (!stillHasOtherSale) {
    invList = invList.map(i =>
      i.id === oldInvId
        ? { ...i, status: i.listDate ? 'listed' : 'unlisted', soldAt: undefined }
        : i
    );
  }
}
invList = invList.map(i =>
  i.id === newInvId
    ? { ...i, status: 'sold', soldAt: new Date().toISOString() }
    : i
);
// 以降、setData で invList を inventory に渡す
setData({ ...data, inventory: invList, sales: data.sales.map(s => s.id === editingSale.id ? updated : s) });
```

#### 1-C. sameItemSale マージ保存
**対象**: line 6251-6288

同様に invPatch に `status: 'sold'`, `soldAt: new Date().toISOString()` を追加。

#### 1-D. まとめ販売
**対象**: line 6164-6170

既に `status: 'sold'` を設定しているので **変更不要**。

#### 1-E. バッチ保存
**対象**: line 5835-5941 の `executeBatchSave`

既に status 更新あり (line 5869, 5922) — **変更不要**。

---

### 修正2: 二重登録の防止（多層ガード）

#### 2-A. 通常保存時の事前チェック強化
**対象**: line 6244-6288 の `if (!editingSale)` 直下

**追加するロジック**（`sameItemSale` チェックの **前** に挿入）:
```js
if (!editingSale) {
  // ★ 完全同一売上の検出 ★
  const exactDup = (data.sales || []).find(s =>
    s.inventoryId === form.inventoryId &&
    s.saleDate    === form.saleDate &&
    Number(s.salePrice) === Number(form.salePrice)
  );
  if (exactDup) {
    setDupConfirm({
      existingSale: exactDup,
      reason: '同じ商品・同じ日・同じ価格の売上が既にあります',
      onConfirm: null,
    });
    return;
  }
  // 以下、既存の sameItemSale チェック処理
  ...
}
```

#### 2-B. まとめ販売時の重複チェック追加
**対象**: line 6131-6181 の `if (bundleSale)` ブロック先頭

**追加するロジック**（`if (filled.length < 2)` チェックの直後）:
```js
const conflicts = filled
  .map(bi => ({
    bi,
    existing: (data.sales||[]).find(s =>
      s.inventoryId === bi.inventoryId &&
      (!editingSale || s.id !== editingSale.id) &&
      (!editingSale?.bundleGroup || s.bundleGroup !== editingSale.bundleGroup)
    ),
  }))
  .filter(x => x.existing);

if (conflicts.length > 0) {
  const names = conflicts.map(c => {
    const inv = data.inventory.find(i => i.id === c.bi.inventoryId);
    return inv ? `${inv.brand || ''} ${inv.productName || ''}`.trim() : c.bi.inventoryId;
  }).join(' / ');
  setFormError(`既に売上登録済みの商品が含まれています: ${names}`);
  return;
}
```

#### 2-C. バンドル編集時、同バンドルの旧売上を一括置換
**対象**: line 6167-6170

**現状**:
```js
const baseSales = editingSale
  ? data.sales.filter(s => s.id !== editingSale.id)
  : data.sales;
```

**修正後**:
```js
const baseSales = editingSale
  ? data.sales.filter(s =>
      s.id !== editingSale.id &&
      (!editingSale.bundleGroup || s.bundleGroup !== editingSale.bundleGroup)
    )
  : data.sales;
```

#### 2-D. Sale ID 生成の一本化
**対象**: line 6224

**現状**:
```js
id: Date.now().toString(),
```

**修正後**:
```js
id: `sale_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
```

---

### 修正3: 売上削除時に在庫 status を戻す

**対象**: line 6311-6315 付近の売上削除ハンドラ
（grep: `setData({ ...data, sales: data.sales.filter(s => s.id !== saleId)`）

**現状**:
```js
setData({
  ...data,
  sales: data.sales.filter(s => s.id !== saleId),
  settings: { ...data.settings, _deletedIds: newDeletedIds }
});
```

**修正後**:
```js
const deletedSale = data.sales.find(s => s.id === saleId);
const remainSales = data.sales.filter(s => s.id !== saleId);
let updatedInv = data.inventory;
if (deletedSale?.inventoryId) {
  const stillHas = remainSales.some(s => s.inventoryId === deletedSale.inventoryId);
  if (!stillHas) {
    updatedInv = data.inventory.map(i =>
      i.id === deletedSale.inventoryId
        ? { ...i, status: i.listDate ? 'listed' : 'unlisted', soldAt: undefined }
        : i
    );
  }
}
setData({
  ...data,
  inventory: updatedInv,
  sales: remainSales,
  settings: { ...data.settings, _deletedIds: newDeletedIds }
});
```

---

### 修正4: 整合性自己修復（読み取り後1回だけ）

**対象**: `App` コンポーネント (line 11603 以降)、適切な useEffect の追加場所

**追加する useEffect**（既存 useEffect 群の末尾でよい）:
```js
React.useEffect(() => {
  // ── 整合性自己修復（24時間に1回まで）──
  const last = fullData.settings?._integrityCheckedAt
    ? new Date(fullData.settings._integrityCheckedAt).getTime()
    : 0;
  if (Date.now() - last < 86400000) return;

  // バックアップ退避（破損保険）
  try {
    const stripped = stripPhotosForStorage(fullData);
    localStorage.setItem(
      `nobushop_integrity_backup_${Date.now()}`,
      JSON.stringify(stripped)
    );
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith('nobushop_integrity_backup_'))
      .sort();
    while (keys.length > 3) localStorage.removeItem(keys.shift());
  } catch(_) {}

  const salesByInv = new Map();
  (fullData.sales || []).forEach(s => {
    if (!s.inventoryId) return;
    if (!salesByInv.has(s.inventoryId)) salesByInv.set(s.inventoryId, []);
    salesByInv.get(s.inventoryId).push(s);
  });

  // 在庫の status 補正：sale があるのに sold でない → sold へ
  const fixedInv = (fullData.inventory || []).map(inv => {
    const sales = salesByInv.get(inv.id);
    if (sales && sales.length > 0 && inv.status !== 'sold') {
      return { ...inv, status: 'sold', _autoFixedAt: new Date().toISOString() };
    }
    return inv;
  });

  // 重複売上にフラグだけ付ける（削除しない）
  const flaggedSales = (fullData.sales || []).map(s => {
    const arr = salesByInv.get(s.inventoryId);
    if (arr && arr.length > 1) {
      const sorted = [...arr].sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||''));
      if (s.id !== sorted[0].id) return { ...s, _duplicate: true };
    }
    return s;
  });

  const invChanged   = fixedInv.some((i, idx) => i !== fullData.inventory[idx]);
  const salesChanged = flaggedSales.some((s, idx) => s !== fullData.sales[idx]);

  setFullDataRaw(prev => {
    const nf = {
      ...prev,
      inventory: invChanged   ? fixedInv     : prev.inventory,
      sales:     salesChanged ? flaggedSales : prev.sales,
      settings:  { ...prev.settings, _integrityCheckedAt: new Date().toISOString() },
    };
    dataRef.current = nf;
    saveData(nf);
    return nf;
  });

  if (invChanged || salesChanged) {
    console.log('[integrity] auto-fixed:',
      fixedInv.filter(i => i._autoFixedAt).length, 'inv items,',
      flaggedSales.filter(s => s._duplicate).length, 'dup flags');
  }
}, []);  // 初回のみ
```

**注意**:
- `stripPhotosForStorage` は既存関数（grep で確認）
- `setFullDataRaw`, `dataRef`, `saveData` は App スコープに既存
- 自動削除は **絶対に行わない**（フラグのみ）

---

### 修正5: 重複フラグ売上の UI 警告

**対象**: `SalesTab` の売上一覧 (line 6487-6536)

`incomplete` バッジの近くに重複フラグバッジを追加:
```jsx
{s._duplicate && (
  <span style={{
    fontSize: 10,
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: 99,
    padding: '1px 7px',
    fontWeight: 700,
    border: '1px solid #fecaca',
  }}>
    ⚠ 重複の可能性
  </span>
)}
```

ユーザーが手動で確認・削除できるようにする。

---

### 修正6: 「未出品タブに戻る」バグの対処

#### 6-A. 在庫タブから売上タブに飛ぶ時に現フィルターを保存
**対象**: `InventoryTab` の `markAsSold` (line 4714-4722)、`markAsListed` (line 4724-4729)、`markAsUnlisted` (line 4731-4736)

**例: markAsSold の修正**:
```js
const markAsSold = (item) => {
  const updated = data.inventory.map(i => i.id === item.id ? { ...i, status: 'sold' } : i);
  setData({ ...data, inventory: updated });
  setSelected(null);
  setPendingInventoryFilter(filter);          // ★追加
  setPendingInventoryScrollY(window.scrollY); // ★追加
  setPendingSaleItemId(item.id);
  setTab('sales');
  toast('✅ 売却済みに変更しました。売上情報を入力してください。');
};
```

`markAsListed` と `markAsUnlisted` も同様に `setPendingInventoryFilter(filter)` を追加。

#### 6-B. 売上保存後に在庫タブへ自動復帰（任意）
**対象**: `SalesTab` の `closeForm` (line 6041-6046)

```js
const closeForm = (returnToInventory = false) => {
  setShowForm(false); setEditingSale(null); setForm(emptyForm);
  setBundleSale(false); setBundleSaleItems(initSaleBundleItems(2));
  setBundleSaleSplitMethod('equal'); setBundleSaleInlineForm(null);
  setSaleStoreCustom(null);
  setSaving(false); setFormError(null); setDupConfirm(null);
  if (returnToInventory) setTab('inventory');
};
```

`handleSave` の各成功時に `closeForm(!!pendingInventoryFilter)` で呼び出す。
※「在庫タブから来た時のみ戻る」挙動。直接売上タブから登録した場合は売上タブに留まる。

---

## 4. 適用順序

```
[Step 0] ファイルバックアップ + git commit
   ↓
[Step 1] 修正4（整合性チェックとバックアップ機構）を最初に適用
   ↓
[Step 2] preview_start でアプリ起動、コンソールに [integrity] ログが出ることを確認
   ↓
[Step 3] 修正1, 2, 3 を適用
   ↓
[Step 4] 修正5, 6 を適用
   ↓
[Step 5] テストシナリオ実行（次節）
```

各ステップ後に `git diff` で変更を確認し、必ず Read で再確認してから次に進む。

---

## 5. テストシナリオ（実装後に必ず実施）

`mcp__Claude_Preview__preview_start` でアプリを起動し、以下を順番に確認。

### 起動準備
1. `.claude/launch.json` を確認、なければ以下で作成：
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "nobushop",
      "runtimeExecutable": "python3",
      "runtimeArgs": ["server.py"],
      "port": 8000
    }
  ]
}
```
2. `preview_start` で起動
3. `preview_console_logs` で `[integrity]` ログが出ているか確認

### シナリオ
| # | 操作 | 期待動作 | 確認方法 |
|---|---|---|---|
| 1 | 在庫を「出品中」フィルターで開き、商品を1つ選択 → 「売却済みにマーク」 → 売上登録フォームで保存 | 在庫タブに戻ると status='sold' に変わっている。フィルターは「出品中」のまま | preview_eval で localStorage の inventory[].status を確認 |
| 2 | テスト1で売った商品をもう一度「＋登録」から同じ inventoryId で売上登録 | 「既存の売上記録に仕入れ情報を反映しました」trough sameItemSale マージ。**新しい sales レコードは追加されない** | preview_eval で data.sales.filter(s => s.inventoryId === X).length === 1 |
| 3 | 完全同一の売上（同 inventoryId・saleDate・salePrice）を2回保存しようとする | 2回目で `dupConfirm` ダイアログが出て保存されない | preview_snapshot |
| 4 | まとめ販売で、既に売上登録済みの inventoryId を含めて保存 | バリデーションエラー「既に売上登録済みの商品が含まれています」 | preview_snapshot |
| 5 | 売上を削除 | 在庫の status が listed/unlisted に戻る（listDate 有無で分岐） | preview_eval |
| 6 | 売上編集で inventoryId を別商品に変更 | 旧在庫が listed/unlisted に戻り、新在庫が sold になる | preview_eval |
| 7 | 在庫タブを「売却済」フィルターで開く → 商品を選択 → 売却を取消 → 在庫タブに戻る | フィルターが「売却済」のまま | preview_snapshot |
| 8 | 不整合データを意図的に作って起動（status='sold' なのに sale 無し、または 1 inventoryId に2 sales） | 起動時に `[integrity]` ログ出力。前者は status はそのまま（破損防止）、後者は片方に `_duplicate: true` フラグ | preview_console_logs と preview_eval |

### 不整合データの作り方（テスト8用）
preview_eval で:
```js
(() => {
  const data = JSON.parse(localStorage.getItem('nobushop_data'));
  // 既存 sales を1つ複製
  if (data.sales.length > 0) {
    const dup = { ...data.sales[0], id: 'test_dup_' + Date.now(), createdAt: new Date().toISOString() };
    data.sales.push(dup);
  }
  // settings._integrityCheckedAt を消して強制再チェック
  delete data.settings._integrityCheckedAt;
  localStorage.setItem('nobushop_data', JSON.stringify(data));
  window.location.reload();
})()
```
※ `nobushop_data` は実際のキー名。コード内 `STORAGE_KEY` 定数を grep で確認すること。

---

## 6. 実装中に守ること

1. **コード変更前に必ず該当行を Read で再確認**（バージョンずれ対策）
2. **1修正ごとに preview_logs と preview_console_logs を確認**（実行時エラーの早期検知）
3. **失敗・想定外の挙動が出たら即停止しユーザーに報告**（自動リトライ禁止）
4. **`git diff` で変更範囲が想定と一致するか確認**してからテスト
5. データを削除する処理は **絶対に追加しない**

---

## 7. 完了報告

すべての修正とテストが終わったら、以下をユーザーに報告：
- バックアップファイル名
- git コミットハッシュ
- 各テストシナリオの合否
- `[integrity]` ログの出力内容
- 想定外の挙動があれば全て列挙

---

## 付録: 参考ファイル

- 本体: `/Users/yoshidanoboru/nobushop-pwa/public/js/app.js`（約 12,174 行）
- HTML: `/Users/yoshidanoboru/nobushop-pwa/public/index.html`
- サーバー: `/Users/yoshidanoboru/nobushop-pwa/server.py`
- バックアップ規約: `*.backup_YYYYMMDD_HHMMSS` 形式で同ディレクトリに保存

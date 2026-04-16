// ============================================================
// CONFIG - 変更しやすい設定値を集約
// ============================================================
const CONFIG = {
  ANTHROPIC_API_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-haiku-4-5-20251001',   // 速度優先（Claude Haiku 4.5）
  MODEL_HEAVY: 'claude-opus-4-6',       // 高精度が必要な場合用（現在未使用）
  PRICE_SPLIT_DIVISOR: 100,
  PLATFORM_FEES: {
    'メルカリ': 0.10,
    'ヤフオク': 0.088,
    'ラクマ': 0.06,
  },
  SIZE_LOGIC: 'auto',
  ESTIMATED_SHIPPING: 800,
  CATEGORY_SUGGESTIONS: {
    '衣類':   ['パーカー','フーディー','スウェット','トレーナー','Tシャツ','ロンT','ポロシャツ','シャツ','ニット','カーディガン','ジャケット','テーラードジャケット','ブルゾン','MA-1','スタジャン','ダウンジャケット','コート','チェスターコート','フリース','ウインドブレーカー','デニム','スラックス','チノパン','メンズ','ユニセックス'],
    'バッグ':  ['トートバッグ','ショルダーバッグ','リュック','バックパック','ハンドバッグ','クラッチバッグ','ボストンバッグ','ウエストポーチ','ボディバッグ','サコッシュ','メンズ'],
    '小物':   ['財布','長財布','二つ折り財布','三つ折り財布','カードケース','キーケース','コインケース','ベルト','マフラー','スカーフ','手袋','帽子','キャップ','ビーニー','サングラス','ネクタイ'],
    'シューズ':['スニーカー','ブーツ','サンダル','ローファー','ドレスシューズ','ランニングシューズ','ハイカット','ローカット','スリッポン','メンズ'],
  },
  PURCHASE_STORES: [
    'ヤフオクストア', 'セカンドストリート', 'オフハウス',
    '四次元ポケット', '萬屋', '万SAI堂', '万代', 'タイヨー堂', 'エコリング',
  ],
  // ストア名の表記ゆれ正規化テーブル（正規表現 → 正しいストア名）
  STORE_NAME_ALIASES: [
    { pattern: /オークション代行.*(ドゥ|どぅ)/i,                   correct: 'オークション代行クイックドゥ' },
    { pattern: /クイック[\s　]*ドゥ/i,                              correct: 'オークション代行クイックドゥ' },
    // エンパワー系：どんな表記でも「エンパワー ヤフーショップ」に統一
    { pattern: /エンパワー/,                                         correct: 'エンパワー ヤフーショップ' },
    // ECO BASE系: "ECO BASE"単体・スペースあり・なし → 全て'ECO BASEヤフー店'へ統一
    { pattern: /^ECO[\s　]*BASE$/i,                                  correct: 'ECO BASEヤフー店' },
    { pattern: /ECO[\s　]*BASE[\s　]+ヤフー/i,                       correct: 'ECO BASEヤフー店' },
    { pattern: /ECO[\s　]*BASEヤフー/i,                              correct: 'ECO BASEヤフー店' },
    { pattern: /エルミ[\s　]*ヤフー[\s　]*SHOP/i,                    correct: 'エルミ ヤフーSHOP' },
    { pattern: /エルミ[\s　]*Yahoo/i,                                correct: 'エルミ ヤフーSHOP' },
    { pattern: /すまりく[\s　]*ヤフオク/i,                           correct: 'すまりく ヤフオク！ショップ' },
    { pattern: /リア[\s　]*クロ/,                                    correct: 'リアクロ' },
  ],
  TAG_PRICE_PROMPT: `この写真の値札・価格タグ・価格シールに書かれた金額を読み取ってください。
【重要】数字が多少不鮮明でも、見えている桁数や文脈から最もありえる価格を推定して回答してください。「読めない」ではなく必ずベストの数値を出してください。
・税込/税抜どちらでも可。¥や円記号は不要（数値のみ）
・例：「8,800」「¥8,800」「8800円（税込）」→ price: 8800
JSONのみで回答（説明・前置き一切不要）：
{"price": 8800, "tax_type": "税込 または 税抜 または 不明", "confidence": "high または low", "notes": "読み取り内容の補足"}
完全に価格の存在が確認できない場合のみ price を null にしてください。`,
  AUCTION_PRICE_PROMPT: `この写真はヤフオク・メルカリ・ラクマなどの落札・注文確認画面です。
以下の情報をできるだけ読み取ってください。JSONのみで回答してください（説明不要）：
{
  "product_title": "商品タイトル（全文・省略なし。ヤフオクは長いタイトルをそのまま全部入れること）",
  "bid_price": 落札価格（数値のみ）,
  "shipping": 送料（数値のみ）,
  "total": 合計金額（数値のみ）,
  "purchase_date": "【最重要・日付読み取りルール】落札終了日・注文完了日のみをYYYY-MM-DD形式で返すこと。ヤフオク画面では「終了日時」「X月X日(曜) HH:MM 終了」の行にある日付を使用する。支払い期限・発送期限・評価期限など締め切り日は絶対に使用しない。年が省略されている場合は2026を補完。",
  "store_name": "出品者名・ストア名（読み取れる場合のみ。ショップ名・出品アカウント名など。末尾に「さん」が付く場合は除外して店名本体のみ返すこと）",
  "platform": "プラットフォーム名（ヤフオク/メルカリ/ラクマ/その他）"
}
読み取れない値はnullにしてください。`,
  DESCRIPTION_TEMPLATE: `We offer immediate purchase approval. Our store deals exclusively in authentic products, so please feel confident in making your purchase.

【購入後24時間以内に発送！】【即購入歓迎！】

※他サイトでも出品中のため、売り切れた場合は急な出品停止もあります。ご了承下さい。

#のびSHOPメンズ一覧

○商品説明

【ブランド】
{brand}

【カテゴリー】
{category_keywords}

【カラー】
{color}

※iPhoneでの撮影の都合上、実際の色味と若干の誤差がある場合があることをご了承下さい。

【購入元】
ブランドリユース店
日本流通自主管理協会加盟店（AACD）
質屋・古物市場・ストア商品
鑑定済商品です

※万が一コピー品・偽物などがあった場合、返品対応させて頂きますのでお申し付け下さい。

○商品の状態

{condition_detail}
中古品のため多少の使用感ありますが、目立った傷や汚れなどはなく今後もご愛用できる商品です！

※中古品にご理解のほどよろしくお願い致します。

○サイズ

{size}

サイズに関して若干の誤差はご了承下さいませ。

○発送について

・なるべくコンパクトにして発送致します。

・らくらくメルカリ便とゆうゆうメルカリ便についてサイズ次第で配送時に変更する可能性ございます。

管理番号：{management_number}`,
};

// ストア名の正規化（表記ゆれ・OCRミスを正規名に変換）
const normalizeStoreName = (name) => {
  if (!name) return name;
  let n = String(name)
    .trim()
    .replace(/\u3000/g, ' ')   // 全角スペース → 半角
    .replace(/\s+/g, ' ')      // 連続スペース → 1つに
    .trim()
    .replace(/さん[。．\s]*$/, '') // 末尾「さん」除去
    .trim();
  for (const { pattern, correct } of CONFIG.STORE_NAME_ALIASES) {
    if (pattern.test(n)) return correct;
  }
  return n;
};

// ストア名の表記ゆれを全データに一括適用 + 仕入れで使ったストアをstoreMasterに自動登録
// Step1: inventory.purchaseStore を正規化
// Step2: storeMaster.yahooStores 自体も正規化・重複排除
// Step3: settings.yahooStores[].storeName も正規化・重複統合（ライセンス情報を保持）
// Step4: inventory で使われているストア名を storeMaster に自動追加
const normalizeStores = (appData) => {
  const initial = getInitialData();
  const master = appData.settings?.storeMaster || initial.settings.storeMaster;

  // Step1: inventory.purchaseStore を正規化
  let storeChanged = false;
  const newInventory = (appData.inventory || []).map(item => {
    if (!item.purchaseStore) return item;
    const norm = normalizeStoreName(item.purchaseStore);
    if (norm === item.purchaseStore) return item;
    storeChanged = true;
    return { ...item, purchaseStore: norm };
  });

  // Step2: storeMaster.yahooStores を正規化・重複排除
  const rawMasterYahoo = master.yahooStores || [];
  const normalizedMasterYahoo = [...new Set(rawMasterYahoo.map(s => normalizeStoreName(s)).filter(Boolean))];
  const masterNormChanged = JSON.stringify(normalizedMasterYahoo) !== JSON.stringify(rawMasterYahoo);

  // Step3: settings.yahooStores を正規化・重複統合（ライセンス情報はマージして保持）
  const rawYahooStores = appData.settings?.yahooStores || [];
  const yahooStoreMap = new Map(); // normalizedName → entry
  for (const s of rawYahooStores) {
    if (!s.storeName) continue;
    const normName = normalizeStoreName(s.storeName);
    if (!normName) continue;
    if (yahooStoreMap.has(normName)) {
      const ex = yahooStoreMap.get(normName);
      yahooStoreMap.set(normName, {
        ...ex,
        storeName: normName,
        license:     ex.license     || s.license     || '',
        companyName: ex.companyName || s.companyName || '',
      });
    } else {
      yahooStoreMap.set(normName, { ...s, storeName: normName });
    }
  }
  const normalizedYahooStores = [...yahooStoreMap.values()];
  const settingsYahooChanged =
    normalizedYahooStores.length !== rawYahooStores.length ||
    normalizedYahooStores.some((s, i) => s.storeName !== (rawYahooStores[i]?.storeName));

  // Step4: online/yahooタイプ仕入れで使われているストア名 → storeMasterに未登録なら追加
  const masterSet = new Set([
    ...normalizedMasterYahoo,
    ...normalizedYahooStores.map(s => s.storeName),
  ]);
  const newMasterNames = [];
  for (const item of newInventory) {
    const n = item.purchaseStore;
    if (!n) continue;
    if ((item.purchaseStoreType === 'yahoo' || item.purchaseType === 'online') && !masterSet.has(n)) {
      masterSet.add(n);
      newMasterNames.push(n);
    }
  }

  if (!storeChanged && !masterNormChanged && !settingsYahooChanged && newMasterNames.length === 0) return appData;

  const updatedMasterYahoo = [...new Set([...normalizedMasterYahoo, ...newMasterNames])]
    .sort((a, b) => a.localeCompare(b, 'ja'));

  return {
    ...appData,
    inventory: newInventory,
    settings: {
      ...(appData.settings || initial.settings),
      yahooStores: normalizedYahooStores,
      storeMaster: { ...master, yahooStores: updatedMasterYahoo },
    },
  };
};

// 仕入れ日文字列をYYYY-MM-DD形式に正規化する共通ヘルパー
// 対応フォーマット: YYYY-MM-DD / YYYY/MM/DD / YYYY年M月D日 / M月D日 / MM/DD / MM-DD / YYYY-M-D
// 年が省略 or 現在年より古い場合は現在年で補完
const parsePurchaseDate = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim();
  const cy = new Date().getFullYear();
  const pad = n => String(n).padStart(2, '0');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const patterns = [
      // YYYY/MM/DD or YYYY-M-D (year-first with slash or dash)
      [/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, m => `${m[1]}-${pad(m[2])}-${pad(m[3])}`],
      // YYYY年M月D日
      [/^(\d{4})年(\d{1,2})月(\d{1,2})日/, m => `${m[1]}-${pad(m[2])}-${pad(m[3])}`],
      // M月D日（年なし）
      [/^(\d{1,2})月(\d{1,2})日/, m => `${cy}-${pad(m[1])}-${pad(m[2])}`],
      // MM/DD（年なし）
      [/^(\d{1,2})\/(\d{1,2})/, m => `${cy}-${pad(m[1])}-${pad(m[2])}`],
      // MM-DD（年なし、2桁ずつ）
      [/^(\d{1,2})-(\d{1,2})$/, m => `${cy}-${pad(m[1])}-${pad(m[2])}`],
    ];
    for (const [pat, fn] of patterns) {
      const m = s.match(pat);
      if (m) { s = fn(m); break; }
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  // 年が現在年より古い場合（AIのモデル訓練年誤作動を防ぐ）は現在年に補正
  const y = parseInt(s.slice(0, 4), 10);
  if (y < cy) s = `${cy}${s.slice(4)}`;
  return s;
};

// 登録済み仕入れ先候補の中から最も近いものをファジーマッチで探す
// 1. 完全一致(正規化後) → 2. 大文字小文字無視一致 → 3. バイグラムDice係数(≥0.5で採用)
// → なければ null（生テキストを使う）
const findClosestStore = (rawName, knownStores) => {
  if (!rawName || !knownStores || !knownStores.length) return null;
  const norm = normalizeStoreName(rawName);
  // 1. 完全一致
  if (knownStores.includes(norm)) return norm;
  // 2. 大文字/小文字・全角半角を無視
  const toKey = s => s.toLowerCase()
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全角→半角
    .replace(/[\s　]/g, '');
  const normKey = toKey(norm);
  const ci = knownStores.find(s => toKey(s) === normKey);
  if (ci) return ci;
  // 3. バイグラムDice係数
  const bigrams = s => {
    const t = s.replace(/[\s　]/g, '');
    const set = new Set();
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    return set;
  };
  const dice = (a, b) => {
    const ba = bigrams(toKey(a)), bb = bigrams(toKey(b));
    if (!ba.size || !bb.size) return 0;
    let common = 0;
    for (const g of ba) if (bb.has(g)) common++;
    return (2 * common) / (ba.size + bb.size);
  };
  let best = null, bestScore = 0;
  for (const store of knownStores) {
    const score = dice(norm, store);
    if (score > bestScore) { bestScore = score; best = store; }
  }
  return bestScore >= 0.5 ? best : null;
};

// ============================================================
// IndexedDB（写真専用ストレージ）
// ============================================================
const DB_NAME = 'nobushop_photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

const openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = e => {
    e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
  };
  req.onsuccess = e => resolve(e.target.result);
  req.onerror = e => reject(e.target.error);
});

const savePhoto = async (id, blob) => {
  const db = await openDB();
  // iOS SafariはBlobのIndexedDB保存が不安定→ArrayBufferに変換
  const arrayBuffer = await blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, data: arrayBuffer, type: blob.type || 'image/jpeg' });
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
};

const getPhoto = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = e => {
      const r = e.target.result;
      if (!r) { resolve(null); return; }
      // ArrayBuffer→Blob変換（新形式）or 旧Blob形式の互換対応
      if (r.data instanceof ArrayBuffer) {
        resolve(new Blob([r.data], { type: r.type || 'image/jpeg' }));
      } else if (r.blob) {
        resolve(r.blob);
      } else {
        resolve(null);
      }
    };
    req.onerror = e => reject(e.target.error);
  });
};

const deletePhoto = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
};

const getAllPhotoIds = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
};

// ============================================================
// 画像圧縮ユーティリティ
// ============================================================
const compressImage = (file, maxWidth = 1200, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // HEIC対応: objectURLで読み込む（iOS SafariはHEICをimgで表示できる）
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      // toBlob がnullを返す場合(iOS Safari)はtoDataURL経由でフォールバック
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            fetch(dataUrl).then(r => r.blob()).then(resolve).catch(reject);
          } catch(e) {
            reject(new Error('画像圧縮失敗: ' + e.message));
          }
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像読み込み失敗（HEIC非対応の可能性）'));
    };
    img.src = url;
  });
};

const generateThumbnail = (file) => compressImage(file, 300, 0.6);

const blobToBase64 = (blob) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result.split(',')[1]);
  reader.readAsDataURL(blob);
});

const blobToURL = (blob) => URL.createObjectURL(blob);

// iOS HTTP環境でもコピーできるフォールバック付きクリップボード
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch(e) {}
  // iOS Safari HTTP フォールバック（execCommand）
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;width:1px;height:1px;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
  return ok;
};

// ============================================================
// ストレージ
// ============================================================
const STORAGE_KEY = 'nobushop_data';
// ★ thumbDataUrl専用の別キー（メインデータとは分離してlocalStorage容量問題を回避）
const THUMBS_KEY  = 'nobushop_thumbs_v1';

// thumbDataUrl を { photoId: dataUrl } マップとして保存（IndexedDB消失時の復元用）
const saveThumbMap = (data) => {
  try {
    const map = {};
    (data.inventory || []).forEach(item => {
      (item.photos || []).forEach(p => {
        if (p.id && p.thumbDataUrl) map[p.id] = p.thumbDataUrl;
      });
    });
    localStorage.setItem(THUMBS_KEY, JSON.stringify(map));
  } catch(e) {
    // 容量超過時はサイレント失敗（メインデータに影響なし）
    console.warn('[saveThumbMap] 容量超過、スキップ:', e.message);
  }
};

// thumbMap を読み込んで返す
const loadThumbMap = () => {
  try {
    const raw = localStorage.getItem(THUMBS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
};

const loadData = () => {
  try {
    const thumbMap = loadThumbMap();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialData();
    const parsed = JSON.parse(raw);
    // ★ thumbDataUrlをthumbMapから復元（IndexedDB消失後でも表示できるようにする）
    if (parsed.inventory && Object.keys(thumbMap).length > 0) {
      parsed.inventory = parsed.inventory.map(item => ({
        ...item,
        photos: (item.photos || []).map(p => ({
          ...p,
          thumbDataUrl: p.thumbDataUrl || thumbMap[p.id] || null,
        })),
      }));
    }
    return normalizeStores({ ...getInitialData(), ...parsed });
  } catch { return getInitialData(); }
};

// ★ localStorage保存前にthumbDataUrl（base64画像）を除外する
// 理由: 50件×3枚×30KB = 4.5MB がlocalStorageに書き込まれ、iOS Safari (上限5MB) でフリーズの原因になっていた
// thumbDataUrl は別キー(THUMBS_KEY)に保存して復元できるようにする
const stripPhotosForStorage = (data) => ({
  ...data,
  inventory: (data.inventory || []).map(item => ({
    ...item,
    photos: (item.photos || []).map(p => ({ id: p.id, thumbId: p.thumbId })),
  })),
});

const saveData = (data) => {
  // setTimeout(0) で JSON.stringify を非同期化し、大きなデータでもUIをブロックしない
  setTimeout(() => {
    try {
      const stripped = stripPhotosForStorage(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
    } catch(e) { console.error('[saveData] error:', e); }
    // ★ thumbDataUrlを別キーに保存（IndexedDB消失時の保険・3重バックアップの1つ目）
    try { saveThumbMap(data); } catch(e) {}
  }, 0);
};

// ============================================================
// クラウド同期（/api/data 経由 – iOS Safari CORS問題を構造的に解消）
// iPhone/MacBook ともに同じURLを使えば自動でデータが共有される
// ============================================================
let _cloudEnabled = false;

// 初期化確認のみ（実際の通信はサーバー側 api/data.js が行う）
const initSupabase = (url, key) => {
  if (!url || !key) throw new Error('Cloud config is empty on server');
  _cloudEnabled = true;
  console.log('[Cloud] server-proxy mode enabled');
};

// 全データ取得（/api/data GET）
const fetchSupabaseData = async () => {
  const resp = await fetch('/api/data', { cache: 'no-store' });
  const json = await resp.json();
  if (!resp.ok || !json.ok) {
    const msg = json.error || `HTTP ${resp.status}`;
    console.error('[Cloud] fetch error:', msg);
    return { _connError: msg, inventory: [], sales: [], settings: getInitialData().settings, receipts: [] };
  }
  return {
    inventory: json.inventory || [],
    sales:     json.sales     || [],
    settings:  json.settings  || getInitialData().settings,
    receipts:  [],
  };
};

// ローカルデータを一括移行（/api/data POST）
const migrateLocalToSupabase = async (localData) => {
  if (!_cloudEnabled) return;
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invUpsert:   (localData.inventory || []).map(item => ({ id: item.id, data: item })),
        salesUpsert: (localData.sales     || []).map(s    => ({ id: s.id,    data: s    })),
        settings:    localData.settings || null,
      }),
      cache: 'no-store',
    });
    console.log('[Cloud] ローカルデータ移行完了');
  } catch(e) {
    console.error('[Cloud] migrate error:', e.message);
  }
};

// 差分をサーバーに同期（/api/data POST）
// 比較にはstripItemPhotosを使い（base64でJSON.stringifyが重くなるのを防ぐ）
// 書き込みにはfullアイテムを使う（thumbDataUrlをSupabaseに保存→IndexedDB消失時の3重バックアップ）
const stripItemPhotos = (item) => ({
  ...item,
  photos: (item.photos || []).map(p => ({ id: p.id, thumbId: p.thumbId })),
});

const syncToSupabase = async (oldData, newData) => {
  if (!_cloudEnabled) return;
  try {
    // 比較用: thumbDataUrlを除外（JSON.stringify高速化）
    const invOld = new Map((oldData?.inventory || []).map(i => [i.id, stripItemPhotos(i)]));
    const invNew = new Map((newData?.inventory || []).map(i => [i.id, stripItemPhotos(i)]));
    // 書き込み用: thumbDataUrlを含む完全データ（Supabaseへのバックアップ）
    const invNewFull = new Map((newData?.inventory || []).map(i => [i.id, i]));
    const salesOld = new Map((oldData?.sales     || []).map(s => [s.id, s]));
    const salesNew = new Map((newData?.sales     || []).map(s => [s.id, s]));

    const invUpsert = [], invDelete = [], salesUpsert = [], salesDelete = [];
    for (const [id, item] of invNew) {
      // ★ 比較はstrip版、書き込みはfull版（thumbDataUrlをSupabaseに保存）
      if (JSON.stringify(invOld.get(id)) !== JSON.stringify(item)) invUpsert.push({ id, data: invNewFull.get(id) });
    }
    for (const id of invOld.keys()) { if (!invNew.has(id)) invDelete.push(id); }
    for (const [id, sale] of salesNew) {
      if (JSON.stringify(salesOld.get(id)) !== JSON.stringify(sale)) salesUpsert.push({ id, data: sale });
    }
    for (const id of salesOld.keys()) { if (!salesNew.has(id)) salesDelete.push(id); }
    const settingsChanged = JSON.stringify(oldData?.settings) !== JSON.stringify(newData?.settings);

    const hasChanges = invUpsert.length || invDelete.length || salesUpsert.length || salesDelete.length || settingsChanged;
    if (!hasChanges) return;

    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invUpsert, invDelete, salesUpsert, salesDelete,
        settings: settingsChanged ? newData.settings : undefined,
      }),
      cache: 'no-store',
    });
  } catch(e) {
    console.error('[Cloud] sync error:', e.message);
  }
};

// 月利に応じた旅行先（2人で楽しめる世界遺産・名所）
const TRAVEL_SPOTS = [
  { min: 0,       name: '東京・浅草',     emoji: '🗼', desc: '仲見世通りで食べ歩き＆雷門' },
  { min: 30000,   name: '京都・嵐山',     emoji: '🏯', desc: '竹林の小径と金閣寺・抹茶体験' },
  { min: 50000,   name: '沖縄・美ら海',   emoji: '🌊', desc: '青い海とシュノーケリング' },
  { min: 80000,   name: '北海道・富良野', emoji: '💐', desc: 'ラベンダー畑と星野リゾート' },
  { min: 100000,  name: '富士山・河口湖', emoji: '🗻', desc: '逆さ富士と温泉旅館' },
  { min: 150000,  name: '韓国・ソウル',   emoji: '🇰🇷', desc: '景福宮と本場グルメ' },
  { min: 200000,  name: '台湾・九份',     emoji: '🏮', desc: '千と千尋の街並みと夜市' },
  { min: 300000,  name: 'シンガポール',   emoji: '🌆', desc: 'マリーナベイサンズ＆ガーデンズ' },
  { min: 500000,  name: 'パリ・エッフェル塔', emoji: '✨', desc: 'シャンゼリゼとルーブル美術館' },
  { min: 700000,  name: 'バリ島・ウブド', emoji: '🌴', desc: '世界遺産の棚田とスパリゾート' },
  { min: 1000000, name: 'モルディブ',     emoji: '🏝️', desc: '水上コテージで2人だけの楽園' },
];

// カテゴリー・性別に応じたハッシュタグを返す
const getHashtag = (category, gender) => {
  if (category === 'バッグ')   return '#のびSHOPバッグ一覧';
  if (category === '毛皮')     return '#のびSHOP毛皮一覧';
  if (category === '小物')     return '#のびSHOP小物一覧';
  if (gender === 'レディース') return '#のびSHOPレディース一覧';
  return '#のびSHOPメンズ一覧';
};

const getInitialData = () => ({
  currentUser: 'self',
  userProfiles: {
    self: {
      name: '自分',
      monthlyGoal: 100000,
      rewardPercent: 10,
      milestones: [],
    },
    girlfriend: {
      name: 'りこぴ',
      monthlyGoal: 100000,
      rewardPercent: 10,
      milestones: [],
    },
  },
  inventory: [],
  sales: [],
  receipts: [],
  settings: {
    apiKey: '',
    removeBgApiKey: '',
    priceSplitDivisor: 100,
    platformFees: { ...CONFIG.PLATFORM_FEES },
    descriptionTemplate: CONFIG.DESCRIPTION_TEMPLATE,
    hashtags: '#のびSHOPメンズ一覧',
    // 仕入先ごとの古物商許可証番号（店名→許可証番号）
    storeLicenses: {
      'セカンドストリート': '',
      'オフハウス': '',
      '萬屋': '',
      '万SAI堂': '',
      '万代': '',
      'エコリング': '',
    },
    // ヤフオクストア一覧（ストアごとに許可証番号が異なるため別管理）
    // { id, storeName, license, companyName }
    yahooStores: [],
    storeMaster: {
      // 店舗仕入れ時に表示（実店舗）
      normalStores: [
        'セカンドストリート','オフハウス','萬屋','万代','万SAI堂',
        'ブックオフ','四次元ポケット','タイヨードー','タック',
      ],
      // チェーン別店舗一覧 { [chainName]: string[] }
      storeLocations: {},
      // 電脳仕入れ時に表示（オークション・ECサイト）
      yahooStores: [
        'ヤフオクストア','エンパワー ヤフーショップ','オークション代行クイックドゥ',
        'すまりく ヤフオク！ショップ','pleasure','ECO BASEヤフー店','リアクロ','エルミ ヤフーSHOP',
      ],
    },
    // Google Sheets連携（OAuth2）
    gasUrl: '',
    googleClientId: '',
    googleSpreadsheetId: '',
    googleLastSyncTime: null,
  },
});

// ============================================================
// ユーティリティ
// ============================================================
const formatMoney = (n) => n?.toLocaleString('ja-JP') ?? '0';
// UTC変換せずローカル日付を返す（JST環境で朝9時前にUTC日付がズレる問題を防ぐ）
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const generateMgmtNo = (purchaseDate, listDate, purchasePrice, divisor = 100) => {
  const pd = purchaseDate.replace(/-/g, '').slice(2); // YYMMDD
  const ld = listDate ? listDate.replace(/-/g, '').slice(4) : '0000'; // MMDD
  const a = Math.floor(purchasePrice / divisor);
  const b = purchasePrice % divisor;
  return `${pd}-${ld}-${a}-${b}`;
};

const calcProfit = (listPrice, purchasePrice, feeRate, shipping) => {
  if (!listPrice || !purchasePrice) return 0;
  return Math.round(listPrice * (1 - feeRate) - purchasePrice - (shipping || CONFIG.ESTIMATED_SHIPPING));
};

const conditionTag = (c) => {
  const map = { S: 'tag-s', A: 'tag-a', B: 'tag-b', C: 'tag-c' };
  return <span className={`tag ${map[c] || 'tag-b'}`}>{c}</span>;
};

// ============================================================
// Claude API
// ============================================================
const analyzeImagesWithClaude = async (imageDataList, apiKey, prompt, maxTokens = 512) => {
  // タイムアウト30秒（無限ループ防止）
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  const content = [
    ...imageDataList.map(img => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mimeType, data: img.data },
    })),
    { type: 'text', text: prompt },
  ];

  try {
    const res = await fetch(CONFIG.ANTHROPIC_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status}`);
    }
    const data = await res.json();
    return data.content[0].text;
  } catch(e) {
    if (e.name === 'AbortError') throw new Error('タイムアウト（30秒）。ネットワークを確認してください');
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

// 1枚の画像からClaude APIで価格を読み取る汎用関数
const readPriceFromImage = async (file, prompt, apiKey, maxTokens = 200) => {
  // 値札の小さい数字を読むため1200px・quality0.9に引き上げ
  const blob = await compressImage(file, 1200, 0.9);
  const base64 = await blobToBase64(blob);
  const imageDataList = [{ mimeType: 'image/jpeg', data: base64 }];
  const text = await analyzeImagesWithClaude(imageDataList, apiKey, prompt, maxTokens);
  // JSONを抽出（AIが余分なテキストを返しても対応）
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`応答が不正: ${text.slice(0, 60)}`);
  return JSON.parse(match[0]);
};

const PRODUCT_ANALYSIS_PROMPT = `商品の写真を分析して以下のJSON形式で回答してください（JSONのみ、説明文なし）：
{
  "product_name": "商品名（日本語、40文字以内、メルカリ出品用。ブランド＋型名/モデル名＋カラー＋サイズ）",
  "english_title": "メルカリ英語タイトル（英語、40文字以内、SEO最適化。Brand＋ModelName＋Category＋Color例: Louis Vuitton Musette Salsa Monogram Shoulder Bag）",
  "brand": "ブランド名（英語正式表記。必ずタグ・ロゴ・刻印・内側ラベルから読み取ること。見た目だけで判断禁止。確認できない場合は「Unknown Brand」。複数候補がある場合は「Brand A / Brand B?」形式）",
  "model_number": "型番・品番（英数字コード。例：M51258, GG0034S, A01234。写真のタグ・刻印・内側ラベルから読み取る。モデル名と区別すること。不明はnull）",
  "model_name": "モデル名・シリーズ名（例：Neverfull MM, Speedy 30, Ophidia, Matelasse。型番とは別に記載。不明はnull）",
  "gender": "メンズ/レディース/ユニセックス",
  "category": "カテゴリー（バッグ/衣類/小物/シューズ/毛皮/その他）",
  "color": "カラー",
  "condition": "状態ランク（S/A/B/C）",
  "condition_detail": "状態の詳細説明（2-3文）",
  "size_tag": "タグに記載の表記サイズ（S/M/L/XL/38/27.0cm等）。なければnull",
  "size_length": null,
  "size_chest": null,
  "size_shoulder": null,
  "size_sleeve": null,
  "size_height": null,
  "size_width": null,
  "size_depth": null,
  "size_handle": null,
  "size_confidence": "high/medium/low",
  "material": "素材",
  "estimated_price_range": "メルカリでの推定相場（例：15000-25000）",
  "notes": "その他特記事項",
  "purchase_type": "store または online",
  "purchase_type_confidence": 85,
  "purchase_type_reason": "判定理由（1文）",
  "purchase_date": null,
  "brand_reading": "ブランド名の読み仮名または英語表記",
  "category_keywords": "メルカリSEO用キーワード。半角スペース区切り5〜8語",
  "color_display": "カラー表記。日本語カタカナ＋漢字（例：ブラック 黒）"
}

【最重要０：ブランド判定の絶対ルール】
ブランドは必ず以下の優先順位で判断してください：
① タグ（内側・外側・品質表示タグ）に書かれたブランド名を読み取る
② ロゴ・金具・刻印に表示されたブランド名を確認する
③ ①②で確認できた場合のみ断言する

❌ 禁止事項：
- 柄・素材・形状・色だけからブランドを推測すること
  （例：モノグラム柄 → Louis Vuittonと決めつけるのは禁止。タグで確認すること）
- タグが写っていないのにブランドを断言すること

✅ 正しい例：
- タグに「COACH」と書いてある → brand: "Coach"
- ロゴに「Burberry」が見える → brand: "Burberry"
- タグが見えず柄だけ → brand: "Unknown Brand"（または "Coach / Louis Vuitton?" など候補）

【最重要①：Louis Vuitton バッグの形状による正確なモデル特定】
Louis Vuitton のモデルは形状で必ず区別してください。よく混同されるモデルを以下に示します：

◆ Musette Salsa（ミュゼット サルサ）
  - フラップ（蓋）なし、四角いシンプルな箱型ショルダーバッグ
  - 前面にポケットなし、シンプルな一室構造
  - 短いストラップまたは長いストラップ
  - 型番: M51258（ショートストラップ）/ M51387（ロングストラップ）

◆ Saumur（ソミュール）25/30
  - 馬のサドル（鞍）形、半円形に近いフォルム
  - 前面に2つのフラップポケット＋バックル留め
  - 縦型ストラップが特徴的、メッセンジャースタイル
  - 型番: M42254（30）/ M42256（25）※旧型: M42253

◆ Musette Tango（ミュゼット タンゴ）
  - Musette Salsaより小さめ、細長いフォルム
  - 型番: M51257

◆ Pochette Accessoires（ポシェット アクセソワール）
  - 小型クラッチ型、金具リング付き
  - 型番: M51980

◆ Neverfull（ネヴァーフル）
  - 大型トートバッグ、両サイドのひもが特徴
  - 型番: MM=M41245 / GM=M40157

◆ Speedy（スピーディ）
  - ボストン型ハンドバッグ、丸みのあるフォルム
  - 型番: 30=M41526 / 25=M41528

◆ Alma（アルマ）
  - 台形のトップハンドルバッグ、南京錠付き
  - 型番: BB=M53152 / PM=M53151

◆ Keepall（キーポル）
  - 大型旅行バッグ、ダッフル型
  - 型番: 45=M41428 / 55=M41424

◆ Favorite（フェイバリット）
  - クラッチ型ミニバッグ、チェーン付き
  - 型番: MM=N41129

■ model_name の判定ルール
上記の形状説明を参考に、写真のバッグの形・デザイン・金具・ポケット数・ストラップ形状から正確なモデル名を特定してください。
「なんとなく似ている」ではなく、形状の特徴が一致するモデルを選ぶこと。

■ model_number の判定ルール（必ず実行）
★ model_name が特定できた場合、上記の型番表から対応する型番を必ず "(推定)" 付きで返すこと。
① 写真に英数字コードが写っている → そのまま記載（例: M51258）
② 写真では見えないが model_name が特定できた → 必ず "(推定)型番" を記載（例: (推定)M51258）
③ model_name も特定できない場合のみ → null
❌ model_name があるのに model_number が null は禁止（必ず推定値を入れること）

その他のブランドの型番参考:
  Gucci Ophidia GG Medium → 499621
  Gucci Marmont Matelasse Medium → 443496
  Chanel Classic Flap Medium → A01112
  Chanel Boy Bag Medium → A67086
  Prada Galleria Medium Saffiano → 1BA049
  Prada Nylon Backpack → 1BZ811
  Hermes Birkin / Kelly → 型番なし（model_number: null）

【最重要②：英語タイトル（english_title）のルール】
メルカリで外国人バイヤーに検索されやすいSEOタイトルを40文字以内で作成。
構成: ブランド名 + モデル名 + カテゴリ + カラー（重要な情報から順に）
例: "Louis Vuitton Musette Salsa Shoulder Bag" (40字以内)
例: "Gucci GG Ophidia Medium Tote Brown" (35字)
例: "Burberry London Tailored Jacket Gray M" (38字)
- 略称・一般的な英語表記を使う
- サイズは重要な場合のみ含める
- 必ず40文字以内に収める

【実寸フィールドのルール】
★ 推定・概算は絶対に使わない。確実に読み取れた数値のみ（単位cm、数値のみ）。読めない場合はnull。
- size_length: 着丈（衣類）
- size_chest: 身幅（衣類）
- size_shoulder: 肩幅（衣類）
- size_sleeve: 袖丈（衣類）
- size_height: 高さ（バッグ・小物）
- size_width: 横幅（バッグ・小物）
- size_depth: マチ（バッグ・小物）
- size_handle: ハンドル/ショルダー長（バッグ）

【purchase_type判定基準】
- store: 値札タグ・税込/税抜表記・店舗形式タグ
- online: 落札価格・送料あり・注文画面・ECサイト表示
purchase_type_confidenceは0〜100の整数。

【purchase_dateのルール】
電脳仕入れ（オンライン購入）のスクリーンショットには購入日・落札日・注文日が表示されていることがあります。
以下の情報が画面内にある場合は必ず読み取り、YYYY-MM-DD形式で返してください。年が省略されている場合は現在年（2026年）を使用。
- ヤフオク: 「X月X日（曜日）終了」「落札日」「終了日時」
- メルカリ: 「購入日」「X月X日」
- Amazon/楽天等: 「注文日」「ご注文日」「購入日」
- 値札・タグ（実店舗）: 日付情報が不明なためnull
読み取れない場合や商品写真のみの場合はnull。

【category_keywordsのルール】
メルカリで検索されやすいキーワードをスペース区切りで5〜8語。具体的な商品タイプ・素材・特徴・性別を記載。
【color_displayのルール】
カタカナ表記と漢字表記を並べる。例：ブラック 黒 / ホワイト 白 / ネイビー 紺`;

const RECEIPT_ANALYSIS_PROMPT = `レシートの写真を分析して以下のJSON形式で回答してください（JSONのみ）：
{
  "store_name": "店舗名",
  "purchase_date": "購入日（YYYY-MM-DD形式）",
  "total_amount": 合計金額（数値のみ）,
  "payment_method": "決済方法（現金/クレカ/PayPay/その他）",
  "category": "勘定科目（仕入高/荷造運賃/通信費/消耗品費/旅費交通費/雑費 から最適なものを1つ選ぶ）",
  "items": [{"name": "商品名", "price": 価格}]
}
勘定科目の判断基準：
- 仕入高：商品・ブランド品・在庫の仕入れ
- 荷造運賃：配送料・梱包材・宅配便
- 通信費：インターネット・電話・切手
- 消耗品費：文具・梱包テープ・その他消耗品
- 旅費交通費：電車・バス・ガソリン・駐車場
- 雑費：上記に当てはまらないもの`;

const SS_ANALYSIS_PROMPT = `フリマ・オークションアプリの取引画面スクリーンショットから情報を読み取ってください。
メルカリ・ヤフオク・ラクマに対応。JSONのみで回答（説明不要）：
{
  "product_name": "商品名（全文、できるだけ長く）",
  "brand": "ブランド名（例: LOUIS VUITTON, Gucci, Nike）",
  "model_number": "型番・品番（例: M51258、読み取れた場合のみ）",
  "sale_price": 【最重要】「商品価格」または「商品価格（税込）」ラベルの金額のみ（数値のみ、¥や,不要）。「販売利益」「利益」「純利益」「手数料」「送料」のラベルが付いた数値は絶対に使用しないこと。商品名の右または下にある価格を優先すること,
  "platform_fee": 販売手数料（数値のみ。メルカリ=「販売手数料」、ヤフオク=「落札システム利用料」、ラクマ=「販売手数料」）,
  "shipping": 配送料・送料（数値のみ）,
  "profit": 販売利益・純利益（数値のみ。sale_priceには絶対に使わない）,
  "sale_date": "取引日（YYYY-MM-DD形式。「購入日時」「落札日」「取引日」から変換）",
  "product_id": "商品ID（メルカリ=m始まり、ヤフオクオークションID、ラクマ=商品ID）",
  "platform": "プラットフォーム名（メルカリ/ヤフオク/ラクマ/その他）"
}
読み取れない値はnullにしてください。`;

// 販売履歴一覧ページ（複数行テーブル）用プロンプト
const BATCH_SS_PROMPT = `これはフリマサイト（主にメルカリ）の販売履歴一覧ページのスクリーンショットです。
テーブルに表示されている全ての商品行を読み取り、以下のJSON配列で回答してください（説明不要、JSONのみ）:
[
  {
    "product_name": "商品タイトル（全文）",
    "sale_price": 【最重要】「商品価格」列の金額のみ（数値のみ、¥や,不要）。「販売利益」「利益」列の値は絶対に使わないこと,
    "platform_fee": 販売手数料の列の金額（数値のみ）,
    "shipping": 送料の列の金額（数値のみ、0の場合は0）,
    "profit": 販売利益・利益の列の金額（数値のみ。sale_priceには絶対に使わない）,
    "sale_date": "購入完了日（YYYY-MM-DD形式）",
    "platform": "メルカリ"
  }
]
読み取れない値はnullにしてください。全行を漏れなく抽出してください。`;

// ============================================================
// Toast
// ============================================================
const ToastContext = React.createContext(null);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);
  const show = React.useCallback((msg) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
    </ToastContext.Provider>
  );
};

const useToast = () => React.useContext(ToastContext);

// ============================================================
// App State Context
// ============================================================
const AppContext = React.createContext(null);

// ============================================================
// ホームタブ
// ============================================================
// ── 利益推移グラフ（SVG折れ線） ────────────────────────────
const ProfitChart = ({ summarySales, now }) => {
  const [selectedIdx, setSelectedIdx] = React.useState(null);
  const scrollRef = React.useRef(null);

  const MONTHS  = 12;
  const COL_W   = 54;
  const TOTAL_W = MONTHS * COL_W;
  const SVG_H   = 150;
  const TOP_PAD = 24;
  const BOT_PAD = 22;
  const DRAW_H  = SVG_H - TOP_PAD - BOT_PAD;

  const yFmt = v => {
    const abs = Math.abs(v);
    if (abs >= 10000) return `${(v/10000).toFixed(abs % 10000 === 0 ? 0 : 1)}万`;
    if (abs >= 1000)  return `${Math.round(v/1000)}k`;
    return String(v);
  };

  const monthData = React.useMemo(() => {
    const thisKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const result = [];
    for (let i = MONTHS - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const sales = summarySales.filter(s => s.saleDate?.startsWith(key));
      const profit  = sales.reduce((a, s) => a + (s.profit  || 0), 0);
      const revenue = sales.reduce((a, s) => a + (s.salePrice || 0), 0);
      const cost    = revenue - profit;
      result.push({ key, label:`${d.getMonth()+1}月`,
        yearLabel: d.getMonth() === 0 ? `${d.getFullYear()}` : '',
        profit, revenue, cost, count: sales.length, isCurrent: key === thisKey });
    }
    return result;
  }, [summarySales, now]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, []);

  const profits = monthData.map(d => d.profit);
  const maxP    = Math.max(0, ...profits);
  const minP    = Math.min(0, ...profits);
  const range   = maxP - minP || 1;
  const xOf = i => i * COL_W + COL_W / 2;
  const yOf = v => TOP_PAD + (maxP - v) / range * DRAW_H;
  const zeroY = yOf(0);

  const linePath = monthData
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.profit).toFixed(1)}`)
    .join(' ');
  const areaPath = monthData.length > 0
    ? `${linePath} L${xOf(monthData.length-1).toFixed(1)},${zeroY.toFixed(1)} L${xOf(0).toFixed(1)},${zeroY.toFixed(1)} Z`
    : '';

  const selected = selectedIdx !== null ? monthData[selectedIdx] : null;
  const hasData  = profits.some(p => p !== 0);

  // Y軸ラベル（最大・0・最小）
  const yLabels = hasData ? [
    { v: maxP, y: yOf(maxP) },
    ...(minP < 0 ? [{ v: minP, y: yOf(minP) }] : []),
    ...(maxP > 0 && minP < 0 ? [{ v: 0, y: zeroY }] : []),
  ] : [];

  return (
    <div>
      {/* グラフカード ── 白背景 */}
      <div style={{background:'#ffffff', borderRadius:14, overflow:'hidden',
        border:'1.5px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>

        <div style={{padding:'10px 14px 4px',
          display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:10, color:'#9ca3af', fontWeight:700, letterSpacing:'0.06em'}}>
            利益推移（過去12ヶ月）
          </div>
          <div style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#16a34a',fontWeight:600}}>
            <span style={{display:'inline-block',width:16,height:2,background:'#16a34a',borderRadius:1}}/>
            純利益
          </div>
        </div>

        {/* Y軸ラベル（固定）+ スクロールSVG */}
        <div style={{display:'flex', alignItems:'flex-start'}}>
          {/* Y軸ラベル列（固定・非スクロール） */}
          <div style={{position:'relative', width:36, flexShrink:0, height: SVG_H - BOT_PAD}}>
            {yLabels.map((yl, idx) => (
              <div key={idx} style={{
                position:'absolute', right:3,
                top: yl.y - 6,
                fontSize:8, color:'#9ca3af', fontWeight:600,
                lineHeight:1, textAlign:'right', whiteSpace:'nowrap',
              }}>{yFmt(yl.v)}</div>
            ))}
          </div>

          <div ref={scrollRef}
            style={{flex:1, overflowX:'auto', overflowY:'hidden', paddingBottom:2,
              msOverflowStyle:'none', scrollbarWidth:'none'}}>
            <svg width={TOTAL_W} height={SVG_H}
              style={{display:'block', overflow:'visible', userSelect:'none'}}>

              {/* 現在月カラム薄緑ハイライト */}
              {monthData.map((d, i) => d.isCurrent ? (
                <rect key="cur-bg" x={i * COL_W} y={0}
                  width={COL_W} height={SVG_H - BOT_PAD}
                  fill="rgba(22,163,74,0.07)" rx={4}/>
              ) : null)}

              {/* ゼロ補助線（薄グレー） */}
              <line x1={0} y1={zeroY} x2={TOTAL_W} y2={zeroY}
                stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3,4"/>

              {/* 選択列ハイライト */}
              {selectedIdx !== null && (
                <rect x={selectedIdx * COL_W} y={0}
                  width={COL_W} height={SVG_H - BOT_PAD}
                  fill="#f3f4f6" rx={4}/>
              )}

              {hasData && (
                <>
                  {/* 面積塗りつぶし（薄緑） */}
                  <path d={areaPath} fill="rgba(22,163,74,0.08)" stroke="none"/>
                  {/* 折れ線（緑） */}
                  <path d={linePath} fill="none"
                    stroke="#16a34a" strokeWidth={2.2}
                    strokeLinecap="round" strokeLinejoin="round"/>
                </>
              )}

              {monthData.map((d, i) => {
                const cx = xOf(i);
                const cy = yOf(d.profit);
                const isSel = selectedIdx === i;
                const dotColor = d.profit < 0 ? '#dc2626' : '#16a34a';
                // 現在月ドットは常時塗りつぶし
                const fillColor = (isSel || d.isCurrent) ? dotColor : 'white';
                const strokeW   = (isSel || d.isCurrent) ? 0 : 2;
                return (
                  <g key={d.key} onClick={() => setSelectedIdx(isSel ? null : i)}
                    style={{cursor:'pointer'}}>
                    <rect x={i * COL_W} y={0} width={COL_W} height={SVG_H - BOT_PAD} fill="transparent"/>
                    {hasData && (
                      <>
                        <circle cx={cx} cy={cy}
                          r={isSel ? 5.5 : (d.isCurrent ? 4.5 : 3.5)}
                          fill={fillColor}
                          stroke={dotColor}
                          strokeWidth={strokeW}/>
                        {/* 選択時バルーン（値表示） */}
                        {isSel && (() => {
                          const sign = d.profit >= 0 ? '+' : '−';
                          const txt  = `${sign}¥${formatMoney(Math.abs(d.profit))}`;
                          const bw   = Math.max(54, txt.length * 6.2 + 14);
                          const bx   = Math.min(Math.max(cx - bw/2, 1), TOTAL_W - bw - 1);
                          const by   = Math.max(2, cy - 28);
                          return (
                            <g>
                              <rect x={bx} y={by} width={bw} height={18}
                                rx={5} fill={dotColor} opacity={0.9}/>
                              <text x={bx + bw/2} y={by + 12.5}
                                textAnchor="middle" fontSize={9.5} fill="white" fontWeight={700}>
                                {txt}
                              </text>
                            </g>
                          );
                        })()}
                      </>
                    )}
                    <text x={cx} y={SVG_H - 5}
                      textAnchor="middle" fontSize={9}
                      fill={d.isCurrent ? '#16a34a' : '#9ca3af'}
                      fontWeight={d.isCurrent ? 700 : 400}>
                      {d.yearLabel ? d.yearLabel : d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {!hasData && (
          <div style={{textAlign:'center', padding:'4px 0 14px',
            fontSize:11, color:'#d1d5db'}}>
            売上データが登録されると表示されます
          </div>
        )}
      </div>

      {/* 月別詳細パネル（タップ時） */}
      {selected && (
        <div style={{background:'#f9fafb', borderRadius:12, padding:'14px',
          marginTop:6, border:'1.5px solid #e5e7eb'}}>
          <div style={{fontSize:11, color:'#6b7280', fontWeight:700, marginBottom:10}}>
            {selected.key.slice(0,4)}年{parseInt(selected.key.slice(5),10)}月
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
            <div>
              <div style={{fontSize:9, color:'#9ca3af', fontWeight:600, letterSpacing:'0.05em', marginBottom:4}}>純利益</div>
              <div style={{fontSize:20, fontWeight:900, letterSpacing:'-0.5px',
                color: selected.profit >= 0 ? '#16a34a' : '#dc2626', lineHeight:1}}>
                {selected.profit >= 0 ? '' : '−'}¥{formatMoney(Math.abs(selected.profit))}
              </div>
            </div>
            <div>
              <div style={{fontSize:9, color:'#9ca3af', fontWeight:600, letterSpacing:'0.05em', marginBottom:4}}>売上</div>
              <div style={{fontSize:20, fontWeight:900, letterSpacing:'-0.5px', color:'#1d4ed8', lineHeight:1}}>
                ¥{formatMoney(selected.revenue)}
              </div>
            </div>
            <div>
              <div style={{fontSize:9, color:'#9ca3af', fontWeight:600, letterSpacing:'0.05em', marginBottom:4}}>件数</div>
              <div style={{fontSize:20, fontWeight:900, color:'#111827', lineHeight:1}}>
                {selected.count}<span style={{fontSize:11, color:'#9ca3af', fontWeight:500, marginLeft:2}}>件</span>
              </div>
            </div>
          </div>
          {selected.count > 0 && selected.revenue > 0 && (
            <div style={{marginTop:10, paddingTop:10, borderTop:'1px solid #e5e7eb',
              display:'flex', gap:16, fontSize:11, color:'#9ca3af'}}>
              <span>仕入コスト ¥{formatMoney(selected.cost)}</span>
              <span>利益率 {Math.round(selected.profit / selected.revenue * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HomeTab = () => {
  const { data, setTab, currentUser, userProfile, setUserProfile } = React.useContext(AppContext);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── 在庫集計 ──
  const unlistedCount = (data.inventory||[]).filter(i => i.status === 'unlisted').length;
  const listedCount   = (data.inventory||[]).filter(i => i.status === 'listed').length;
  const soldInvIds    = new Set((data.inventory||[]).filter(i => i.status === 'sold').map(i => i.id));
  const recordedInvIds = new Set((data.sales||[]).map(s => s.inventoryId).filter(Boolean));
  const unrecordedSoldCount = [...soldInvIds].filter(id => !recordedInvIds.has(id)).length;

  // ── 売上集計（有効データのみ）──
  const _invIdSet = new Set((data.inventory||[]).map(i => i.id));
  const validSales = (data.sales||[]).filter(s => !s.inventoryId || _invIdSet.has(s.inventoryId));
  const getEffectivePP = (s) => {
    if ((s.purchasePrice||0) > 0) return s.purchasePrice;
    return (data.inventory||[]).find(i => i.id === s.inventoryId)?.purchasePrice || 0;
  };
  const summarySales = validSales.filter(s => (s.salePrice||0) > 0 && getEffectivePP(s) > 0);

  // ── 今月データ ──
  const monthlySales = summarySales.filter(s => s.saleDate?.startsWith(currentMonth));
  const totalProfit  = monthlySales.reduce((a, s) => a + (s.profit || 0), 0);
  const totalRevenue = monthlySales.reduce((a, s) => a + (s.salePrice || 0), 0);
  const profitRate   = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0;

  // ── 前月比 ──
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthProfit = summarySales.filter(s => s.saleDate?.startsWith(prevMonth)).reduce((a, s) => a + (s.profit || 0), 0);
  const profitDiff  = totalProfit - prevMonthProfit;
  const profitDiffPct = prevMonthProfit > 0 ? Math.round(profitDiff / prevMonthProfit * 100) : null;

  // ── 目標進捗 ──
  const monthlyGoal  = userProfile?.monthlyGoal || 100000;
  const progressPct  = monthlyGoal > 0 ? Math.min(100, Math.round(totalProfit / monthlyGoal * 100)) : 0;
  const remaining    = Math.max(0, monthlyGoal - totalProfit);
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // ── 平均回転日数（今月売上） ──
  const turnoverList = monthlySales.map(s => s.turnoverDays).filter(d => d != null && d >= 0);
  const avgTurnover  = turnoverList.length > 0 ? Math.round(turnoverList.reduce((a,b)=>a+b,0)/turnoverList.length) : null;

  // ── 長期在庫（60日超・未売却）──
  const longStayItems = (data.inventory||[]).filter(i => {
    if (i.status === 'sold' || !i.purchaseDate) return false;
    return Math.floor((now - new Date(i.purchaseDate)) / 86400000) > 60;
  });


  // ── 目標編集モーダル ──
  const [editingGoal, setEditingGoal] = React.useState(false);
  const [goalInput, setGoalInput]     = React.useState('');
  const openGoalEdit = () => { setGoalInput(String(monthlyGoal)); setEditingGoal(true); };
  const saveGoal = () => {
    const v = Number(goalInput);
    if (v > 0) setUserProfile({ monthlyGoal: v });
    setEditingGoal(false);
  };

  return (
    <div className="fade-in" style={{background:'#ffffff',minHeight:'100vh'}}>

      {/* ── ヘッダー（白ベース） ── */}
      <div style={{
        background:'#ffffff',
        borderBottom:'1px solid #e5e7eb',
        padding:'12px 18px 10px',
        paddingTop:'calc(12px + env(safe-area-inset-top))',
        display:'flex',justifyContent:'space-between',alignItems:'center',
      }}>
        <div>
          <div style={{fontSize:18,fontWeight:900,letterSpacing:'-0.5px',color:'#111827'}}>SalesLog</div>
          <div style={{fontSize:9,color:'#9ca3af',marginTop:1,letterSpacing:'0.08em',fontWeight:600}}>SALES MANAGEMENT <span style={{opacity:0.6}}>v20260413j</span></div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:13,color:'#374151',fontWeight:700}}>
            {now.getFullYear()}年{now.getMonth()+1}月
          </div>
          <div style={{fontSize:10,color:'#9ca3af',marginTop:1}}>
            {now.getDate()}日
          </div>
        </div>
      </div>

      <div style={{padding:'12px 14px 24px',display:'flex',flexDirection:'column',gap:10}}>

        {/* ── アラート：売上未記録 ── */}
        {unrecordedSoldCount > 0 && (
          <div onClick={() => setTab('sales')}
            style={{background:'#fff7ed',border:'1.5px solid #fb923c',borderRadius:12,padding:'10px 14px',
              display:'flex',alignItems:'center',gap:10,cursor:'pointer',touchAction:'manipulation'}}>
            <span style={{fontSize:18}}>⚠️</span>
            <div style={{flex:1}}>
              <span style={{fontSize:13,fontWeight:700,color:'#c2410c'}}>売上未記録 {unrecordedSoldCount}件</span>
              <span style={{fontSize:11,color:'#ea580c',marginLeft:6}}>→ タップして記録</span>
            </div>
          </div>
        )}

        {/* ── HERO: 今月の純利益（白カード） ── */}
        <div style={{background:'#ffffff',borderRadius:16,overflow:'hidden',
          border:'1.5px solid #e5e7eb',boxShadow:'0 1px 6px rgba(0,0,0,0.05)',
          display:'flex'}}>
          {/* 左アクセントライン */}
          <div style={{width:4,flexShrink:0,
            background: totalProfit >= 0 ? '#16a34a' : '#dc2626'}}/>
          <div style={{flex:1,padding:'18px 18px 14px'}}>
          {/* タイトル行（右に経過日数） */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
            <div style={{fontSize:10,color:'#9ca3af',fontWeight:700,letterSpacing:'0.08em'}}>
              今月の純利益
            </div>
            <div style={{fontSize:10,color:'#9ca3af'}}>
              {now.getDate()}日経過 / {daysInMonth}日
            </div>
          </div>
          {/* メイン金額 */}
          <div style={{fontSize:42,fontWeight:900,letterSpacing:'-2px',
            color: totalProfit >= 0 ? '#111827' : '#dc2626',lineHeight:1,marginBottom:4}}>
            ¥{formatMoney(totalProfit)}
          </div>
          {/* 件数・売上（小さく） */}
          <div style={{fontSize:11,color:'#9ca3af',marginBottom:10}}>
            {monthlySales.length}件成約 · 売上 ¥{formatMoney(totalRevenue)}
          </div>
          {/* 前月比 + ±¥金額 */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            {profitDiffPct !== null ? (
              <span style={{fontSize:12,fontWeight:700,
                color: profitDiff >= 0 ? '#16a34a' : '#dc2626',
                background: profitDiff >= 0 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${profitDiff >= 0 ? '#bbf7d0' : '#fecaca'}`,
                borderRadius:99,padding:'2px 10px'}}>
                {profitDiff >= 0 ? '▲' : '▼'} {Math.abs(profitDiffPct)}% 前月比
              </span>
            ) : (
              <span style={{fontSize:11,color:'#9ca3af'}}>前月データなし</span>
            )}
            {profitDiffPct !== null && profitDiff !== 0 && (
              <span style={{fontSize:11,fontWeight:600,
                color: profitDiff >= 0 ? '#16a34a' : '#dc2626'}}>
                {profitDiff >= 0 ? '+' : '−'}¥{formatMoney(Math.abs(profitDiff))}
              </span>
            )}
          </div>
          {/* 目標プログレスバー */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
              <span style={{fontSize:10,color:'#9ca3af',fontWeight:600}}>
                目標 ¥{formatMoney(monthlyGoal)}
              </span>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:12,fontWeight:800,
                  color: progressPct>=100 ? '#16a34a' : '#111827'}}>
                  {progressPct}%
                </span>
                <button onClick={openGoalEdit}
                  style={{fontSize:10,color:'#6b7280',background:'#f3f4f6',
                    border:'1px solid #e5e7eb',borderRadius:6,padding:'2px 8px',
                    cursor:'pointer',fontWeight:600,touchAction:'manipulation'}}>
                  変更
                </button>
              </div>
            </div>
            <div style={{background:'#f3f4f6',borderRadius:99,height:6,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:99,
                background: progressPct>=100 ? '#16a34a' : '#E84040',
                width:`${progressPct}%`,transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)'}}/>
            </div>
            {remaining > 0 && (
              <div style={{fontSize:10,color:'#9ca3af',marginTop:4,textAlign:'right'}}>
                あと ¥{formatMoney(remaining)} で目標達成
              </div>
            )}
            {remaining === 0 && (
              <div style={{fontSize:11,color:'#16a34a',marginTop:4,textAlign:'right',fontWeight:700}}>🎉 今月の目標達成！</div>
            )}
          </div>
          </div>{/* /flex content */}
        </div>

        {/* ── 在庫ステータス 3分割 ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {/* 未出品：赤 */}
          <div onClick={() => setTab('inventory')}
            style={{background:'#ffffff',borderRadius:14,padding:'14px 10px',textAlign:'center',
              cursor:'pointer',touchAction:'manipulation',
              border: unlistedCount > 0 ? '1.5px solid #fca5a5' : '1.5px solid #e5e7eb',
              boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:9,color: unlistedCount>0?'#dc2626':'#9ca3af',
              fontWeight:700,letterSpacing:'0.05em',marginBottom:6}}>未出品</div>
            <div style={{fontSize:28,fontWeight:900,lineHeight:1,marginBottom:2,
              color: unlistedCount>0?'#dc2626':'#374151'}}>
              {unlistedCount}
            </div>
            <div style={{fontSize:9,color:'#9ca3af'}}>件</div>
          </div>
          {/* 出品中：黒 */}
          <div onClick={() => setTab('inventory')}
            style={{background:'#ffffff',borderRadius:14,padding:'14px 10px',textAlign:'center',
              cursor:'pointer',touchAction:'manipulation',border:'1.5px solid #e5e7eb',
              boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:9,color:'#374151',fontWeight:700,letterSpacing:'0.05em',marginBottom:6}}>出品中</div>
            <div style={{fontSize:28,fontWeight:900,color:'#111827',lineHeight:1,marginBottom:2}}>{listedCount}</div>
            <div style={{fontSize:9,color:'#9ca3af'}}>件</div>
          </div>
          {/* 今月売上：緑 */}
          <div onClick={() => setTab('sales')}
            style={{background:'#ffffff',borderRadius:14,padding:'14px 10px',textAlign:'center',
              cursor:'pointer',touchAction:'manipulation',
              border: monthlySales.length>0 ? '1.5px solid #bbf7d0' : '1.5px solid #e5e7eb',
              boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:9,color:'#16a34a',fontWeight:700,letterSpacing:'0.05em',marginBottom:6}}>今月売上</div>
            <div style={{fontSize:28,fontWeight:900,color:'#15803d',lineHeight:1,marginBottom:2}}>{monthlySales.length}</div>
            <div style={{fontSize:9,color:'#9ca3af'}}>件</div>
          </div>
        </div>

        {/* ── サブ指標 2列 ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div style={{background:'#ffffff',borderRadius:14,padding:'14px',
            border:'1.5px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:9,color:'#9ca3af',fontWeight:700,letterSpacing:'0.05em',marginBottom:6}}>今月 利益率</div>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:'-1px',lineHeight:1,
              color: profitRate >= 20 ? '#16a34a' : profitRate >= 10 ? '#d97706' : '#dc2626'}}>
              {totalRevenue > 0 ? `${profitRate}%` : '−'}
            </div>
            {totalRevenue > 0 && (
              <div style={{fontSize:9,color:'#9ca3af',marginTop:4}}>
                売上 ¥{formatMoney(totalRevenue)}
              </div>
            )}
          </div>
          <div style={{background:'#ffffff',borderRadius:14,padding:'14px',
            border:'1.5px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:9,color:'#9ca3af',fontWeight:700,letterSpacing:'0.05em',marginBottom:6}}>平均回転日数</div>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:'-1px',lineHeight:1,color:'#111827'}}>
              {avgTurnover !== null ? avgTurnover : '−'}
              {avgTurnover !== null && <span style={{fontSize:13,color:'#9ca3af',fontWeight:500,marginLeft:2}}>日</span>}
            </div>
            {avgTurnover !== null && (
              <div style={{fontSize:9,color:'#9ca3af',marginTop:4}}>
                {monthlySales.length}件の平均
              </div>
            )}
          </div>
        </div>

        {/* ── 利益推移グラフ ── */}
        <ProfitChart summarySales={summarySales} now={now} />

        {/* ── 警告：長期在庫 ── */}
        {longStayItems.length > 0 && (
          <div onClick={() => setTab('inventory')}
            style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:12,
              padding:'10px 14px',display:'flex',alignItems:'center',gap:10,
              cursor:'pointer',touchAction:'manipulation'}}>
            <span style={{fontSize:16}}>🕐</span>
            <div style={{flex:1}}>
              <span style={{fontSize:12,fontWeight:700,color:'#dc2626'}}>
                長期在庫 {longStayItems.length}件（60日超）
              </span>
              <div style={{fontSize:10,color:'#ef4444',marginTop:1}}>回転率改善のために確認を →</div>
            </div>
          </div>
        )}

        {/* ── クイックアクション ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:2}}>
          <button onClick={() => setTab('purchase')}
            style={{background:'#111827',border:'none',borderRadius:14,padding:'14px',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8,
              cursor:'pointer',touchAction:'manipulation',
              boxShadow:'0 2px 6px rgba(0,0,0,0.15)'}}>
            <span style={{fontSize:18}}>📥</span>
            <span style={{fontSize:14,fontWeight:700,color:'white'}}>仕入れ登録</span>
          </button>
          <button onClick={() => setTab('sales')}
            style={{background:'#16a34a',border:'none',borderRadius:14,padding:'14px',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8,
              cursor:'pointer',touchAction:'manipulation',
              boxShadow:'0 2px 6px rgba(22,163,74,0.25)'}}>
            <span style={{fontSize:18}}>💰</span>
            <span style={{fontSize:14,fontWeight:700,color:'white'}}>売上記録</span>
          </button>
        </div>

      </div>

      {/* ── 目標編集モーダル ── */}
      {editingGoal && (
        <div className="modal-overlay" onClick={() => setEditingGoal(false)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:16}}>🎯 目標月利を設定</div>
            <label className="field-label">目標月利（円）</label>
            <input type="number" className="input-field" style={{marginBottom:6}}
              value={goalInput} onChange={e => setGoalInput(e.target.value)}
              placeholder="100000" autoFocus/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
              <button className="btn-secondary" onClick={() => setEditingGoal(false)}>キャンセル</button>
              <button className="btn-primary" onClick={saveGoal}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 状態ランクテンプレート文
// ============================================================
const CONDITION_TEMPLATES = {
  S: '未使用に近い美品です。\n※あくまで新品ではないことをご理解ください',
  A: '中古品ではございますが、美品に近い商品です。\n目立つ傷や汚れなどございません。\n※中古品にご理解ください。',
  B: '多少の使用感ございますが、大きなダメージ、汚れなどございません。\n※写真もよくご確認の上、中古品にご理解ください。',
  C: 'やや気になるダメージや汚れが見られます。\n※写真もよくご確認の上、状態にご理解ください。',
  D: '全体的に傷や汚れなど使用感の見られる商品です。\n※写真もよくご確認の上、状態にご理解ください。',
};

// カタカナカラー → 日本語漢字マッピング
const COLOR_JP_MAP = {
  'ブラック':'黒', 'ネイビー':'紺', 'ホワイト':'白', 'レッド':'赤',
  'ブルー':'青', 'グリーン':'緑', 'イエロー':'黄', 'グレー':'灰',
  'ブラウン':'茶', 'パープル':'紫', 'ゴールド':'金', 'シルバー':'銀',
  'オレンジ':'橙', 'ボルドー':'えんじ', 'ワインレッド':'えんじ',
  'キャメル':'駱駝色', 'ベージュ':'ベージュ',
};
const normalizeColor = (colorStr) => {
  if (!colorStr) return colorStr;
  if (colorStr.includes('/')) return colorStr; // 既に変換済み
  const jp = COLOR_JP_MAP[colorStr.trim()];
  return (jp && jp !== colorStr.trim()) ? `${colorStr} / ${jp}` : colorStr;
};

// ============================================================
// 仕入れ登録タブ
// ============================================================
const PurchaseTab = () => {
  const { data, setData, editingItem, setEditingItem, currentUser, setTab, setPendingSaleItemId, pendingReturnTab, setPendingReturnTab, pendingReturnSection, setPendingReturnSection } = React.useContext(AppContext);
  const [lastSavedItem, setLastSavedItem] = React.useState(null); // 直前に保存した仕入れ品（売上記録クイックアクション用）
  const toast = useToast();
  const [step, setStep] = React.useState(1); // 1:写真, 2:AI解析, 3:入力
  const [registrationMode, setRegistrationMode] = React.useState('unlisted'); // 'unlisted'|'listed'
  // photos: [{ id, thumbId, previewUrl, thumbUrl }]
  const [photos, setPhotos] = React.useState([]);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [aiResult, setAiResult] = React.useState(null);
  const [aiTypeDetection, setAiTypeDetection] = React.useState(null); // AI仕入れ方法判定結果
  const [purchaseTypeSource, setPurchaseTypeSource] = React.useState('manual'); // 'ai' | 'manual'
  const [form, setForm] = React.useState({
    productName: '', brand: '', category: '', color: '',
    brandReading: '', categoryKeywords: '', colorDisplay: '',
    modelNumber: '',  // 型番・品番
    gender: 'メンズ', // メンズ/レディース/ユニセックス
    seoCategories: [],  // SEOカテゴリタグ（複数）
    condition: 'A', conditionDetail: '',
    sizeTag: '', sizeM1: '', sizeM2: '', sizeM3: '', sizeM4: '', // サイズ分割
    sizeConfidence: 'medium', material: '',
    purchaseDate: today(), purchaseStore: '',
    sellerLicense: '',      // 仕入先の古物商許可証番号
    sellerCompanyName: '',  // 仕入先の法人名（ヤフオクストア用）
    paymentMethod: '現金', listDate: today(), listPrice: '',
    estimatedPriceRange: '', notes: '',
    englishTitle: '',       // 英語タイトル（メルカリ用）
    descriptionText: '',    // 保存済み商品説明文
    // 税込コスト内訳
    itemPriceTaxIn: '',     // 商品価格（税込）
    itemTaxRate: 10,        // 商品税率 (%)
    shippingTaxIn: '',      // 送料（税込）- 電脳仕入れ時
    shippingTaxRate: 10,    // 送料税率
    optionalFeeTaxIn: '',   // 手数料（税込）- 任意
    optionalTaxRate: 10,    // 手数料税率
    showOptionalFee: false, // 手数料欄表示
    couponTaxIn: '',        // クーポン値引き額（税込・マイナス扱い）
    couponNote: '',         // クーポンメモ（例：1000円OFFクーポン）
  });
  const [generatedDesc, setGeneratedDesc] = React.useState('');
  const [showDesc, setShowDesc] = React.useState(false);
  const [purchaseType, setPurchaseType] = React.useState('store'); // 'store' | 'online'
  const [storeCustomText, setStoreCustomText] = React.useState(null); // null=選択モード, string=手入力モード
  const [storeChain, setStoreChain] = React.useState('');       // 選択中チェーン名
  const [branchInput, setBranchInput] = React.useState('');     // 支店テキスト入力
  const [scanMode, setScanMode] = React.useState('product_only'); // 'product_only' | 'with_price'
  const [tagReading, setTagReading] = React.useState(false);
  const [tagReadResult, setTagReadResult] = React.useState(null);
  const [seoCategoryInput, setSeoCategoryInput] = React.useState('');
  const [swapIdx, setSwapIdx] = React.useState(null); // 入れ替え元インデックス
  const cameraInputRef = React.useRef();
  const multiInputRef = React.useRef();
  const tagPhotoRef = React.useRef();

  // ── まとめ仕入れ（仕入れ分割）────────────────────────────
  const BUNDLE_LABELS = ['A','B','C','D','E','F'];
  const initBundleItems = (n) => Array.from({length: n}, (_,i) =>
    ({ id: String(i), label: `商品${BUNDLE_LABELS[i]||i+1}`,
       mode: 'new',           // 'new' | 'existing'
       productName: '',       // mode='new' 用
       existingItemId: '',    // mode='existing' 用
       existingItemQuery: '', // 既存商品検索テキスト（一時UI状態）
       purchasePrice: '' })
  );
  const [bundlePurchase, setBundlePurchase] = React.useState(false);
  const [bundleItems, setBundleItems] = React.useState(initBundleItems(2));
  const [bundleSplitMethod, setBundleSplitMethod] = React.useState('equal');
  // まとめ仕入れ合計後修正用
  const [bundleRescaleTotal, setBundleRescaleTotal] = React.useState('');
  const [bundleRescaleMethod, setBundleRescaleMethod] = React.useState('ratio');
  const [bundleManualPrices, setBundleManualPrices] = React.useState({}); // 手動指定モード用 {id: string}
  const [bundleAllPrices, setBundleAllPrices] = React.useState({});     // 兄弟アイテム価格インライン編集用 {id: string}
  const [saving, setSaving] = React.useState(false); // 保存中フラグ（二重タップ防止）
  const [formError, setFormError] = React.useState(null); // インラインバリデーションエラー

  // ── 下書き自動保存 ──
  const DRAFT_KEY = 'nobushop_purchase_draft';
  const EDIT_DRAFT_PREFIX = 'nobushop_edit_draft_'; // 既存商品編集中の下書き（IDベース）
  const [draftBanner, setDraftBanner] = React.useState(null);
  const savingTimeoutRef = React.useRef(null); // saving状態の安全タイムアウト
  const draftSaveTimerRef = React.useRef(null); // 編集下書き保存デバウンス用（編集モード）
  const newRegDraftTimerRef = React.useRef(null); // 新規登録下書き保存デバウンス用
  // ★ iOS Safariキーボード座標ズレ根本対策（3層構造）
  // ① visualViewport でキーボード高さを追跡しボタン位置を動的補正
  // ② キーボード閉じ検出 → window.scrollTo(0,scrollY) 強制リフロー（複数タイミング）
  // ③ input/textarea の blur 毎に強制リフロー（ブランド入力後の不具合も捕捉）
  const [kbOffset, setKbOffset] = React.useState(0);
  React.useEffect(() => {
    // ── ① + ② visualViewport ──────────────────────────────
    const vv = window.visualViewport;
    let prevKbH = 0;
    const reflow = () => { try { window.scrollTo(0, window.scrollY); } catch(_) {} };

    const onVVChange = () => {
      const kbH = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
      // キーボードが閉じた瞬間（100px超 → 50px以下に急減）を検知
      if (prevKbH > 100 && kbH < 50) {
        // iOSタッチ座標マップを強制リセット（0ms / 100ms / 300ms の3段発火）
        reflow();
        setTimeout(reflow, 100);
        setTimeout(reflow, 300);
      }
      prevKbH = kbH;
      setKbOffset(kbH > 50 ? kbH : 0);
    };

    if (vv) {
      vv.addEventListener('resize', onVVChange);
      vv.addEventListener('scroll', onVVChange);
      onVVChange();
    }

    // ── ③ input/textarea blur → 強制リフロー ────────────────
    // ブランド・商品名など任意の入力フィールドを閉じた後も確実に座標を修正する
    const onFocusOut = (e) => {
      const tag = e.target?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
      reflow();
      setTimeout(reflow, 50);
      setTimeout(reflow, 150);
      setTimeout(reflow, 350);
    };
    document.addEventListener('focusout', onFocusOut, { passive: true, capture: true });

    return () => {
      if (vv) {
        vv.removeEventListener('resize', onVVChange);
        vv.removeEventListener('scroll', onVVChange);
      }
      document.removeEventListener('focusout', onFocusOut, { capture: true });
    };
  }, []);

  // 起動時に下書きチェック
  React.useEffect(() => {
    if (editingItem) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.form?.productName) setDraftBanner(parsed);
    } catch(_) {}
  }, []);

  // form/step変化時に自動保存（Step3以降、新規のみ）
  // ★ デバウンス500ms：毎キーストロークの同期localStorage書き込みを防止（フリーズ主因）
  // photos.thumbDataUrlはbase64画像で数十KB → 同期書き込みでUIスレッドがブロックされていた
  React.useEffect(() => {
    if (editingItem) return;
    if (step < 3) return;
    if (newRegDraftTimerRef.current) clearTimeout(newRegDraftTimerRef.current);
    newRegDraftTimerRef.current = setTimeout(() => {
      newRegDraftTimerRef.current = null;
      const photoRefs = photos.map(p => ({ id: p.id, thumbId: p.thumbId, thumbDataUrl: p.thumbDataUrl || null }));
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          form, purchaseType, generatedDesc, registrationMode,
          photoRefs,
          savedAt: new Date().toISOString(),
        }));
      } catch(_) {}
    }, 500);
  }, [form, purchaseType, generatedDesc, step, editingItem, photos]);

  // バックグラウンド移行時にも強制保存
  React.useEffect(() => {
    const saveDraftOnHide = () => {
      if (document.hidden && !editingItem && step >= 3) {
        const photoRefs = photos.map(p => ({ id: p.id, thumbId: p.thumbId, thumbDataUrl: p.thumbDataUrl || null }));
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            form, purchaseType, generatedDesc, registrationMode,
            photoRefs,
            savedAt: new Date().toISOString(),
          }));
        } catch(_) {}
      }
    };
    document.addEventListener('visibilitychange', saveDraftOnHide);
    return () => document.removeEventListener('visibilitychange', saveDraftOnHide);
  }, [form, purchaseType, generatedDesc, step, editingItem, photos, registrationMode]);

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch(_) {} };

  // ── 編集モード専用：フォーム変化時に自動下書き保存（タブ切替・クラッシュ対策）──
  // ★ deps から editingItem を除外: editingItem が変わった直後は form がまだ古い値のため、
  //    誤った空フォームを下書き保存してしまうバグを防ぐ。
  //    form が変化したとき（=editingItemのロード完了後）だけ保存する。
  // ★ デバウンス(400ms)で連続入力時のlocalStorage書き込み頻度を抑制しフリーズを防止
  React.useEffect(() => {
    if (!editingItem) return;
    // フォームが初期化済みかチェック（productNameが一致しないときは初期化前 → スキップ）
    if (!form.productName && editingItem.productName) return;
    // 前回のタイマーをキャンセルして新しいタイマーをセット（400ms後に保存）
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    const itemId = editingItem.id;
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      try {
        localStorage.setItem(
          EDIT_DRAFT_PREFIX + itemId,
          JSON.stringify({ form, purchaseType, registrationMode, savedAt: new Date().toISOString() })
        );
      } catch(_) {}
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, purchaseType, registrationMode]); // ← editingItem を deps に入れない（競合防止）

  // 編集モード：バックグラウンド移行時も強制保存
  React.useEffect(() => {
    const saveEditDraftOnHide = () => {
      if (!document.hidden || !editingItem) return;
      try {
        localStorage.setItem(
          EDIT_DRAFT_PREFIX + editingItem.id,
          JSON.stringify({ form, purchaseType, registrationMode, savedAt: new Date().toISOString() })
        );
      } catch(_) {}
    };
    document.addEventListener('visibilitychange', saveEditDraftOnHide);
    return () => document.removeEventListener('visibilitychange', saveEditDraftOnHide);
  }, [form, editingItem, purchaseType, registrationMode]);

  const clearEditDraft = (itemId) => {
    if (!itemId) return;
    try { localStorage.removeItem(EDIT_DRAFT_PREFIX + itemId); } catch(_) {}
  };

  // コンポーネントアンマウント時にObjectURLを解放
  React.useEffect(() => {
    return () => {
      photos.forEach(p => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
      });
    };
  }, []);

  // まとめ仕入れ: 合計金額が変わったとき or バンドルON時 → 均等割りを自動適用
  React.useEffect(() => {
    if (!bundlePurchase || bundleSplitMethod !== 'equal') return;
    const total = (Number(form.itemPriceTaxIn) || 0) - (Number(form.couponTaxIn) || 0);
    if (total <= 0) return;
    const n = bundleItems.length;
    const base = Math.floor(total / n);
    const rem  = total - base * n;
    setBundleItems(prev => prev.map((bi, i) => ({
      ...bi, purchasePrice: String(i === n - 1 ? base + rem : base)
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundlePurchase, bundleSplitMethod, form.itemPriceTaxIn, form.couponTaxIn, bundleItems.length]);

  // iOS: バックグラウンド移行時に画像入れ替え選択状態をリセット
  React.useEffect(() => {
    const reset = () => { if (document.hidden) setSwapIdx(null); };
    document.addEventListener('visibilitychange', reset);
    return () => document.removeEventListener('visibilitychange', reset);
  }, []);

  // ---- 編集モード: editingItemがセットされたらフォームを復元 ----
  React.useEffect(() => {
    if (!editingItem) return;
    // フォームフィールドを復元
    setForm({
      productName:        editingItem.productName        || '',
      brand:              editingItem.brand              || '',
      category:           editingItem.category           || '',
      color:              editingItem.color              || '',
      brandReading:       editingItem.brandReading       || '',
      categoryKeywords:   editingItem.categoryKeywords   || '',
      colorDisplay:       editingItem.colorDisplay       || '',
      modelNumber:        editingItem.modelNumber        || '',
      gender:             editingItem.gender             || 'メンズ',
      seoCategories:      Array.isArray(editingItem.seoCategories)
        ? editingItem.seoCategories
        : (editingItem.categoryKeywords
            ? editingItem.categoryKeywords.split(/[\s　]+/).filter(Boolean).slice(0,10)
            : []),
      condition:          editingItem.condition          || 'A',
      conditionDetail:    editingItem.conditionDetail    || '',
      sizeTag:            editingItem.sizeTag            || '',
      sizeM1:             editingItem.sizeM1             || '',
      sizeM2:             editingItem.sizeM2             || '',
      sizeM3:             editingItem.sizeM3             || '',
      sizeM4:             editingItem.sizeM4             || '',
      sizeConfidence:     editingItem.sizeConfidence     || 'medium',
      material:           editingItem.material           || '',
      purchaseDate:       editingItem.purchaseDate       || today(),
      purchaseStore:      editingItem.purchaseStore      || '',
      sellerLicense:      editingItem.sellerLicense      || '',
      sellerCompanyName:  editingItem.sellerCompanyName  || '',
      paymentMethod:      editingItem.paymentMethod      || '現金',
      listDate:           editingItem.listDate           || today(),
      listPrice:          editingItem.listPrice != null  ? String(editingItem.listPrice) : '',
      estimatedPriceRange: editingItem.estimatedPriceRange || '',
      notes:              editingItem.notes              || '',
      englishTitle:       editingItem.englishTitle       || '',
      descriptionText:    editingItem.descriptionText    || '',
      // 税込コスト内訳
      itemPriceTaxIn:  editingItem.purchaseCost?.itemPriceTaxIn != null ? String(editingItem.purchaseCost.itemPriceTaxIn) : (editingItem.purchasePrice ? String(editingItem.purchasePrice) : ''),
      itemTaxRate:     editingItem.purchaseCost?.itemTaxRate    ?? 10,
      shippingTaxIn:   editingItem.purchaseCost?.shippingTaxIn  != null ? String(editingItem.purchaseCost.shippingTaxIn) : '',
      shippingTaxRate: editingItem.purchaseCost?.shippingTaxRate ?? 10,
      optionalFeeTaxIn:  editingItem.purchaseCost?.optionalFeeTaxIn != null ? String(editingItem.purchaseCost.optionalFeeTaxIn) : '',
      optionalTaxRate:   editingItem.purchaseCost?.optionalTaxRate  ?? 10,
      showOptionalFee:   (editingItem.purchaseCost?.optionalFeeTaxIn > 0) || false,
      couponTaxIn:  editingItem.purchaseCost?.couponTaxIn ? String(editingItem.purchaseCost.couponTaxIn) : '',
      couponNote:   editingItem.purchaseCost?.couponNote  || '',
    });
    setPurchaseType(editingItem.purchaseType || 'store');
    setRegistrationMode(editingItem.status === 'listed' ? 'listed' : 'unlisted');
    // 仕入れ先マスタとの照合（storeMaster + settings.yahooStores の両方を確認）
    const master = data.settings?.storeMaster || getInitialData().settings.storeMaster;
    const allKnownStores = [
      ...(master.normalStores||[]),
      ...(master.yahooStores||[]),
      ...(data.settings?.yahooStores||[]).map(s => s.storeName),
    ];
    const isCustomStore = !!editingItem.purchaseStore && !allKnownStores.includes(editingItem.purchaseStore);
    setStoreCustomText(isCustomStore ? editingItem.purchaseStore : null);
    // 支店名の復元（"チェーン名 支店名" 形式を分解）
    {
      const chains = [...(master.normalStores||[])];
      const locs = master.storeLocations || {};
      const foundChain = chains.find(c =>
        editingItem.purchaseStore === c ||
        editingItem.purchaseStore?.startsWith(c + ' ')
      );
      if (foundChain) {
        setStoreChain(foundChain);
        const branch = editingItem.purchaseStore === foundChain
          ? '' : editingItem.purchaseStore.slice(foundChain.length + 1);
        setBranchInput(branch);
      } else {
        setStoreChain('');
        setBranchInput('');
      }
    }
    // 保存済み説明文を復元
    if (editingItem.descriptionText) {
      setGeneratedDesc(editingItem.descriptionText);
      setShowDesc(true);
    }
    // 写真をIndexedDBからロード（IndexedDB消失時はthumbDataUrl→thumbMapでフォールバック）
    (async () => {
      const thumbMap = loadThumbMap(); // thumbMapも参照して3重フォールバック
      const loaded = [];
      for (const ref of (editingItem.photos || [])) {
        // thumbDataUrl: ref直接 → thumbMap → null の優先順位で取得
        const thumbDU = ref.thumbDataUrl || thumbMap[ref.id] || null;
        try {
          const [fullBlob, thumbBlob] = await Promise.all([getPhoto(ref.id), getPhoto(ref.thumbId)]);
          // ★ IndexedDBが空でthumbDataUrlがある場合、IndexedDBに再保存する
          if (!thumbBlob && thumbDU) {
            try {
              const res = await fetch(thumbDU);
              const blob = await res.blob();
              await savePhoto(ref.thumbId, blob);
              console.log('[Photo] IndexedDB再保存:', ref.thumbId);
            } catch(_) {}
          }
          loaded.push({
            id: ref.id,
            thumbId: ref.thumbId,
            previewUrl: fullBlob ? blobToURL(fullBlob) : thumbDU,
            thumbUrl:   thumbBlob ? blobToURL(thumbBlob) : thumbDU,
            thumbDataUrl: thumbDU,
          });
        } catch(e) {
          loaded.push({ id: ref.id, thumbId: ref.thumbId, previewUrl: thumbDU, thumbUrl: thumbDU, thumbDataUrl: thumbDU });
        }
      }
      setPhotos(loaded);
    })();
    // まとめ仕入れ：兄弟アイテムの現在価格を全件初期化（インライン一括編集用）
    if (editingItem.bundleGroup) {
      const prices = {};
      data.inventory
        .filter(i => i.bundleGroup === editingItem.bundleGroup && i.id !== editingItem.id)
        .forEach(i => { prices[i.id] = String(i.purchasePrice || 0); });
      setBundleAllPrices(prices);
    } else {
      setBundleAllPrices({});
    }
    setStep(3);
  }, [editingItem]);

  // ★ 編集モード：下書きが保存済みなら自動復元（タブ切替・クラッシュ後の入力内容を守る）
  React.useEffect(() => {
    if (!editingItem) return;
    try {
      const raw = localStorage.getItem(EDIT_DRAFT_PREFIX + editingItem.id);
      if (!raw) return;
      const draft = JSON.parse(raw);
      // 下書きが本体データより新しい場合のみ復元（3秒以上新しければ未保存変更あり）
      const draftTime = new Date(draft.savedAt || 0).getTime();
      const itemTime  = new Date(editingItem.updatedAt || editingItem.createdAt || 0).getTime();
      if (draftTime > itemTime + 3000 && draft.form) {
        // 下書きのフォーム値で上書き（前のuseEffectで読み込まれたeditingItemの値を差し替え）
        setForm(prev => ({ ...prev, ...draft.form }));
        if (draft.purchaseType)    setPurchaseType(draft.purchaseType);
        if (draft.registrationMode) setRegistrationMode(draft.registrationMode);
        toast('🔄 前回の編集内容を復元しました');
      }
    } catch(_) {}
  }, [editingItem]);

  const apiKey = data.settings?.apiKey || '';

  const handlePhotoFiles = async (files) => {
    const remaining = 5 - photos.length;
    if (remaining <= 0) { toast('写真は最大5枚までです'); return; }
    const targets = files.slice(0, remaining);
    for (let i = 0; i < targets.length; i++) {
      const file = targets[i];
      const ts = Date.now();
      const idx = photos.length + i;
      const photoId = `photo_${ts}_${idx}`;
      const thumbId = `thumb_${ts}_${idx}`;
      try {
        // iOS対策: 並列処理せず順番に処理
        const fullBlob = await compressImage(file, 1200, 0.75);
        const thumbBlob = await compressImage(file, 300, 0.6);
        await savePhoto(photoId, fullBlob);
        await savePhoto(thumbId, thumbBlob);
        const previewUrl = blobToURL(fullBlob);
        const thumbUrl = blobToURL(thumbBlob);
        // サムネイルをbase64でも保存 → Supabase同期後も表示できる
        const thumbB64 = await blobToBase64(thumbBlob);
        const thumbDataUrl = `data:image/jpeg;base64,${thumbB64}`;
        setPhotos(prev => prev.length < 5
          ? [...prev, { id: photoId, thumbId, previewUrl, thumbUrl, thumbDataUrl }]
          : prev
        );
      } catch (e) {
        console.error('写真保存エラー:', e);
        // iPhoneのHEIC形式の場合は設定変更を案内
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name?.toLowerCase().endsWith('.heic');
        if (isHeic) {
          toast('❌ HEIC形式はそのままでは使えません。\niPhoneの設定→カメラ→フォーマット→「互換性優先」に変更してください');
        } else {
          toast(`❌ 写真の保存に失敗しました。もう一度お試しください\n(${e.message})`);
        }
      }
    }
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) await handlePhotoFiles(files);
    e.target.value = '';
  };

  const removePhoto = async (idx) => {
    const p = photos[idx];
    if (p) {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
      try {
        await deletePhoto(p.id);
        await deletePhoto(p.thumbId);
      } catch(e) { /* ignore */ }
    }
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAnalyze = async () => {
    if (!apiKey) { toast('⚠️ 設定でAPIキーを入力してください'); return; }
    if (photos.length === 0) { toast('写真を追加してください'); return; }
    setAnalyzing(true);
    try {
      // 全枚を400px/0.6で送信（4枚×400px ≈ 1枚×800px と同サイズ。タグ・サイズ写真も読める）
      const imageDataList = [];
      for (const photo of photos) {
        try {
          // まずIndexedDBからフルサイズ取得を試みる
          let blob = await getPhoto(photo.id);

          // IndexedDBにない場合（別端末同期・キャッシュ消去後）はthumbDataUrlで代替
          if (!blob && photo.thumbDataUrl) {
            const res = await fetch(photo.thumbDataUrl);
            blob = await res.blob();
          }

          // さらにpreviewUrlでも試みる（新規追加直後のObject URL）
          if (!blob && photo.previewUrl) {
            const res = await fetch(photo.previewUrl);
            blob = await res.blob();
          }

          if (!blob) continue;
          const compressed = await compressImage(new File([blob], 'photo.jpg', {type: blob.type || 'image/jpeg'}), 400, 0.6);
          const b64 = await blobToBase64(compressed);
          imageDataList.push({ mimeType: 'image/jpeg', data: b64 });
        } catch (imgErr) {
          console.warn(`写真${photo.id}の取得失敗:`, imgErr.message);
        }
      }
      if (imageDataList.length === 0) throw new Error(`画像の取得に失敗しました（${photos.length}枚中0枚。写真を一度削除して追加し直してください）`);

      // with_price モード時は仕入れ価格フィールドも読み取るよう補足プロンプトを追加
      const pricePromptSupplement = `

【仕入れ価格も読み取る場合の追加フィールド】
写真に値札・落札確認画面・注文画面が含まれている場合、以下のフィールドも必ず読み取ってください：
  "item_price": 商品価格・落札価格（数値のみ）,
  "item_shipping": 送料（数値のみ）,
  "item_store_name": "出品者名・ストア名（読み取れない場合はnull）"`;
      const effectivePrompt = scanMode === 'with_price'
        ? PRODUCT_ANALYSIS_PROMPT + pricePromptSupplement
        : PRODUCT_ANALYSIS_PROMPT;
      const effectiveMaxTokens = scanMode === 'with_price' ? 1800 : 1500;

      const text = await analyzeImagesWithClaude(imageDataList, apiKey, effectivePrompt, effectiveMaxTokens);
      // マークダウンコードブロック・余分なテキストを除去してJSONを抽出
      const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON解析失敗');
      let result;
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch(parseErr) {
        // JSON末尾が切れた場合: 最後の完全なフィールドまで補完して再試行
        const partial = jsonMatch[0].replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, '').replace(/,\s*$/, '') + '}';
        try { result = JSON.parse(partial); } catch { throw new Error('JSON解析失敗（レスポンスが不完全です）'); }
      }
      setAiResult(result);
      setForm(prev => ({
        ...prev,
        productName: result.product_name || prev.productName || '',
        englishTitle: result.english_title ? result.english_title.slice(0, 40) : (prev.englishTitle || ''),
        brand: result.brand || '',
        category: result.category || '',
        color: normalizeColor(result.color || ''),
        brandReading: result.brand_reading || '',
        categoryKeywords: result.category_keywords || '',
        seoCategories: result.category_keywords
          ? result.category_keywords.split(/[\s　]+/).filter(Boolean).slice(0, 10)
          : [],
        colorDisplay: result.color_display || '',
        modelNumber: (() => {
          const num = result.model_number || '';
          const name = result.model_name || '';
          if (num && name) return `${num} / ${name}`;
          return num || name || prev.modelNumber || '';
        })(),
        gender: result.gender || prev.gender,
        condition: result.condition || 'A',
        conditionDetail: result.condition_detail || '',
        sizeTag: result.size_tag || result.size || '',
        // 実寸（着丈・身幅・肩幅・袖丈）はAI自動入力しない（手動入力で正確性を担保）
        sizeM1: '', sizeM2: '', sizeM3: '', sizeM4: '',
        sizeConfidence: result.size_confidence || 'medium',
        material: result.material || '',
        estimatedPriceRange: result.estimated_price_range || '',
        notes: result.notes || '',
      }));
      // 仕入れ方法の自動判定
      if (result.purchase_type) {
        const typeResult = {
          type: result.purchase_type,
          confidence: result.purchase_type_confidence || 50,
          reason: result.purchase_type_reason || '',
        };
        setAiTypeDetection(typeResult);
        if (typeResult.confidence >= 70) {
          setPurchaseType(typeResult.type);
          setPurchaseTypeSource('ai');
          // 電脳仕入れと判定された場合はPayPayを自動セット
          if (typeResult.type === 'online') setF('paymentMethod', 'PayPay');
        }
      }
      // 購入日の自動入力（parsePurchaseDateで全フォーマット対応）
      const parsedDate = parsePurchaseDate(result.purchase_date);
      if (parsedDate) {
        setForm(prev => ({ ...prev, purchaseDate: parsedDate }));
      }
      // with_price モード: 仕入れ価格・ストア名の自動入力
      const priceFilledItems = [];
      if (scanMode === 'with_price') {
        const priceUpdates = {};
        if (result.item_price > 0) { priceUpdates.itemPriceTaxIn = result.item_price; priceFilledItems.push(`¥${result.item_price.toLocaleString()}`); }
        if (result.item_shipping > 0) { priceUpdates.shippingTaxIn = result.item_shipping; priceFilledItems.push(`送料¥${result.item_shipping.toLocaleString()}`); }
        if (result.item_store_name) {
          // ★ 登録済み候補からベストマッチを探す → なければ正規化した生テキストを使用
          const master = data.settings?.storeMaster || getInitialData().settings.storeMaster;
          const settingsYahooNames = (data.settings?.yahooStores||[]).map(s => s.storeName);
          const allKnown = [
            ...(master.normalStores||[]),
            ...(master.yahooStores||[]),
            ...settingsYahooNames,
          ];
          const matched = findClosestStore(result.item_store_name, allKnown);
          const storeName = matched || normalizeStoreName(result.item_store_name);
          priceUpdates.purchaseStore = storeName;
          priceFilledItems.push(`ストア: ${storeName}`);
          setStoreCustomText(matched ? null : storeName);
        }
        if (Object.keys(priceUpdates).length > 0) {
          setForm(prev => ({ ...prev, ...priceUpdates }));
          if (result.item_price || result.item_shipping) {
            setPurchaseType('online');
            setPurchaseTypeSource('ai');
            setF('paymentMethod', 'PayPay');
          }
        }
      }
      const priceMsg = priceFilledItems.length > 0 ? `（仕入れ値も入力: ${priceFilledItems.join(' / ')}）` : '';
      toast(`✅ AI解析完了！${priceMsg}`);
      setStep(3);
    } catch (e) {
      toast(`❌ 解析エラー: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // サイズ合成（表記サイズ＋実寸）
  const sizeMeasureLabels = {
    '衣類':   [['sizeM1','着丈'],['sizeM2','身幅'],['sizeM3','肩幅'],['sizeM4','袖丈']],
    'バッグ': [['sizeM1','高さ'],['sizeM2','横幅'],['sizeM3','マチ'],['sizeM4','ショルダー']],
    '小物':   [['sizeM1','高さ'],['sizeM2','横幅'],['sizeM3','マチ']],
    'シューズ': [],
  };
  const measureFields = sizeMeasureLabels[form.category] || [];
  const measureParts = measureFields.map(([key, label]) => form[key] ? `${label}${form[key]}cm` : '').filter(Boolean);
  const computedSize = [form.sizeTag, ...measureParts].filter(Boolean).join(' / ');

  // 税抜計算ヘルパー（Math.roundで 3190÷1.1=2900 を正確に出す）
  const calcTaxEx = (taxIn, taxRate) => {
    const n = Number(taxIn) || 0;
    if (n === 0 || taxRate === 0) return n;
    return Math.round(n / (1 + taxRate / 100));
  };

  // 仕入れ合計（税込・税抜）　★ クーポン値引きをマイナスで反映
  const couponAmount = Number(form.couponTaxIn) || 0;
  const totalPurchaseTaxIn = Math.max(0, purchaseType === 'store'
    ? (Number(form.itemPriceTaxIn) || 0) - couponAmount
    : (Number(form.itemPriceTaxIn) || 0)
      + (Number(form.shippingTaxIn) || 0)
      + (form.showOptionalFee ? (Number(form.optionalFeeTaxIn) || 0) : 0)
      - couponAmount);

  const totalPurchaseTaxEx = Math.max(0, purchaseType === 'store'
    ? calcTaxEx(form.itemPriceTaxIn, form.itemTaxRate) - couponAmount
    : calcTaxEx(form.itemPriceTaxIn, form.itemTaxRate)
      + calcTaxEx(form.shippingTaxIn, form.shippingTaxRate)
      + (form.showOptionalFee ? calcTaxEx(form.optionalFeeTaxIn, form.optionalTaxRate) : 0)
      - couponAmount);

  const feeRate = data.settings?.platformFees?.['メルカリ'] || 0.10;
  const profit = calcProfit(Number(form.listPrice), totalPurchaseTaxIn, feeRate, CONFIG.ESTIMATED_SHIPPING);
  const divisor = data.settings?.priceSplitDivisor || 100;
  const mgmtNo = form.purchaseDate && totalPurchaseTaxIn
    ? generateMgmtNo(form.purchaseDate, form.listDate, totalPurchaseTaxIn, divisor)
    : '';

  const handleTagPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!apiKey) { toast('⚠️ APIキーを設定してください'); return; }
    setTagReading(true);
    try {
      const result = await readPriceFromImage(file, CONFIG.TAG_PRICE_PROMPT, apiKey);
      if (result.price) {
        setForm(prev => ({ ...prev, itemPriceTaxIn: result.price }));
        setTagReadResult({ type: 'store', price: result.price, notes: result.notes, taxType: result.tax_type, confidence: result.confidence });
        const confLabel = result.confidence === 'low' ? ' ⚠️推定値・要確認' : '';
        toast(`✅ 値札読み取り: ¥${result.price.toLocaleString()}${result.tax_type ? ` (${result.tax_type})` : ''}${confLabel}`);
      } else {
        toast(`❌ 価格が見つかりません。${result.notes ? result.notes : '値札部分を正面から撮影してください'}`);
      }
    } catch(e) {
      toast('❌ 読み取り失敗: ' + e.message);
    } finally {
      setTagReading(false);
    }
  };

  const handleAuctionPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!apiKey) { toast('⚠️ APIキーを設定してください'); return; }
    setTagReading(true);
    try {
      // タイトルや日付を含む拡張レスポンスのため maxTokens を増やす
      const result = await readPriceFromImage(file, CONFIG.AUCTION_PRICE_PROMPT, apiKey, 600);
      const bidPrice = result.bid_price || 0;
      const shipping = result.shipping || 0;
      const total = result.total || (bidPrice + shipping);

      const updates = {
        itemPriceTaxIn: (bidPrice || total) > 0 ? (bidPrice || total) : '',
        shippingTaxIn:  shipping > 0 ? shipping : '',
      };

      // 商品タイトル（省略なし・40字制限なし）
      if (result.product_title) {
        updates.productName = result.product_title;
      }

      // 仕入れ日（落札終了日）– parsePurchaseDateで全フォーマット対応、年誤作動も補正
      const auctionParsedDate = parsePurchaseDate(result.purchase_date);
      if (auctionParsedDate) {
        updates.purchaseDate = auctionParsedDate;
      }

      // ストア名（登録済み候補ファジーマッチ → なければ正規化した生テキスト）
      if (result.store_name) {
        const master = data.settings?.storeMaster || getInitialData().settings.storeMaster;
        const settingsYahooNames = (data.settings?.yahooStores||[]).map(s => s.storeName);
        const allKnown = [...(master.normalStores||[]), ...(master.yahooStores||[]), ...settingsYahooNames];
        const matched = findClosestStore(result.store_name, allKnown);
        const cleanName = matched || normalizeStoreName(result.store_name);
        updates.purchaseStore = cleanName;
        setStoreCustomText(matched ? null : cleanName);
      }

      setForm(prev => ({ ...prev, ...updates }));
      setTagReadResult({ type: 'online', ...result, total });

      const filled = [
        result.product_title && 'タイトル',
        result.purchase_date && '仕入れ日',
        result.store_name   && 'ストア名',
        total > 0           && `¥${total.toLocaleString()}`,
      ].filter(Boolean).join(' / ');
      toast(`✅ 読み取り成功: ${filled || '価格のみ'}`);

      if (total === 0 && !result.product_title) {
        toast('❌ 価格を読み取れませんでした。手入力してください');
      }
    } catch(e) {
      toast('❌ 読み取り失敗: ' + e.message);
    } finally {
      setTagReading(false);
    }
  };

  const generateDescription = () => {
    // ---- 各パーツを組み立て ----

    // ブランド：日本語名を先頭、英語名を2行目（説明文での視認性優先）
    const brandLines = [];
    if (form.brandReading) brandLines.push(form.brandReading);
    if (form.brand && form.brand !== form.brandReading) brandLines.push(form.brand);
    if (brandLines.length === 0) brandLines.push('（ブランド未入力）');

    // カテゴリー：seoCategories（複数タグ）優先、なければフォールバック
    const categoryText = (form.seoCategories?.length > 0)
      ? form.seoCategories.join(' ')
      : (form.categoryKeywords || form.category || '（カテゴリー未入力）');

    // カラー（表示用＋英語形式優先）
    const colorText = form.colorDisplay || form.color || '（カラー未入力）';

    // サイズブロック
    const sizeLabels = {
      '衣類':   [['sizeM1','着丈'],['sizeM2','身幅'],['sizeM3','肩幅'],['sizeM4','袖丈']],
      'バッグ': [['sizeM1','高さ'],['sizeM2','横幅'],['sizeM3','マチ'],['sizeM4','ショルダー']],
      '小物':   [['sizeM1','高さ'],['sizeM2','横幅'],['sizeM3','マチ']],
      'シューズ': [],
    };
    const mLabels = sizeLabels[form.category] || [];
    const measureLines = mLabels
      .filter(([key]) => form[key] && form[key] !== '')
      .map(([key, label]) => `${label}：${form[key]}cm`);
    const sizeTagLine = form.sizeTag ? `表記サイズ：${form.sizeTag}` : '表記サイズ：（未入力）';
    const sizeBlock = [sizeTagLine, '', ...measureLines].join('\n').trimEnd();

    // 状態詳細
    const conditionText = form.conditionDetail || '（状態詳細未入力）';

    // ---- 完全固定フォーマットで出力 ----
    const lines = [
      'We offer immediate purchase approval. Our store deals exclusively in authentic products, so please feel confident in making your purchase.',
      '',
      '【購入後24時間以内に発送！】【即購入歓迎！】',
      '',
      '※他サイトでも出品中のため、売り切れた場合は急な出品停止もあります。ご了承下さい。',
      '',
      getHashtag(form.category, form.gender),
      '',
      '【ブランド】',
      ...brandLines,
      '',
      ...(form.modelNumber ? ['【型番・モデル】', form.modelNumber, ''] : []),
      '【カテゴリー】',
      categoryText,
      '',
      '【カラー】',
      colorText,
      '',
      '※iPhoneでの撮影の都合上、実際の色味と若干の誤差がある場合があることをご了承下さい。',
      '',
      '【購入元】',
      'ブランドリユース店',
      '日本流通自主管理協会加盟店（AACD）',
      '質屋・古物市場・ストア商品',
      '鑑定済商品です',
      '',
      '※万が一コピー品・偽物などがあった場合、返品対応させて頂きますのでお申し付け下さい。',
      '',
      '【商品状態】',
      ...(form.conditionDetail
        ? [form.conditionDetail]
        : ['中古品のため多少の使用感ありますが、目立った傷や汚れなどはなく今後もご愛用できる商品です！']),
      '',
      '※中古品にご理解のほどよろしくお願い致します。',
      '',
      '【サイズ】',
      '',
      sizeBlock,
      '',
      '※サイズに関して若干の誤差はご了承下さいませ。',
      '',
      '【発送について】',
      '・なるべくコンパクトにして発送致します。',
      '・らくらくメルカリ便とゆうゆうメルカリ便についてサイズ次第で配送時に変更する可能性ございます。',
      '',
      `管理番号：${mgmtNo || ''}`,
    ];

    // 3連続以上の空行を2行に正規化
    const desc = lines.join('\n').replace(/\n{3,}/g, '\n\n');
    setGeneratedDesc(desc);
    setShowDesc(true);
  };

  const resetForm = () => {
    // タイマー系をすべてクリア
    if (savingTimeoutRef.current) { clearTimeout(savingTimeoutRef.current); savingTimeoutRef.current = null; }
    if (draftSaveTimerRef.current) { clearTimeout(draftSaveTimerRef.current); draftSaveTimerRef.current = null; }
    if (newRegDraftTimerRef.current) { clearTimeout(newRegDraftTimerRef.current); newRegDraftTimerRef.current = null; }
    // ★ savingLockRef もリセット（キャンセルボタン経由の場合に備えて）
    savingLockRef.current = false;
    setSaving(false);
    if (pendingReturnSection) setPendingReturnSection(null);
    setFormError(null);
    clearDraft();
    // 編集モードの下書きもクリア（保存完了 or キャンセル時）
    if (editingItem) clearEditDraft(editingItem.id);
    photos.forEach(p => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
    });
    setStep(1); setPhotos([]); setAiResult(null); setGeneratedDesc(''); setShowDesc(false);
    setAiTypeDetection(null); setPurchaseTypeSource('manual'); setStoreCustomText(null);
    setScanMode('product_only');
    setRegistrationMode('unlisted');
    setSeoCategoryInput(''); setEditingItem(null);
    setStoreChain(''); setBranchInput('');
    setBundlePurchase(false); setBundleItems(initBundleItems(2)); setBundleSplitMethod('equal');
    setForm({
      productName: '', brand: '', category: '', color: '',
      brandReading: '', categoryKeywords: '', colorDisplay: '',
      condition: 'A', conditionDetail: '',
      sizeTag: '', sizeM1: '', sizeM2: '', sizeM3: '', sizeM4: '', sizeConfidence: 'medium', material: '',
      purchaseDate: today(), purchaseStore: '', sellerLicense: '', sellerCompanyName: '',
      paymentMethod: '現金', listDate: today(), listPrice: '',
      estimatedPriceRange: '', notes: '',
      englishTitle: '', descriptionText: '',
      seoCategories: [],
      itemPriceTaxIn: '', itemTaxRate: 10,
      shippingTaxIn: '', shippingTaxRate: 10,
      optionalFeeTaxIn: '', optionalTaxRate: 10,
      showOptionalFee: false,
    });
  };

  // 保存後に売上登録へ遷移するフラグ
  const postSaveNavToSale = React.useRef(false);
  // ★ savingLockRef: Refで同期的ロック（React stateは非同期なので連続タップで突破される場合がある）
  const savingLockRef = React.useRef(false);

  const handleSaveAndSell = () => { postSaveNavToSale.current = true; handleSave(); };

  const handleSave = () => {
    // ★ Refで同期チェック（saving stateより確実）
    if (savingLockRef.current) {
      console.warn('[Save] blocked: already in progress');
      return;
    }
    // ★ 即座にロック取得（同期的・React renderを待たない）
    savingLockRef.current = true;
    setFormError(null);

    try {
      // ── バリデーション（try内：finally でロックが必ず解放される）──
      if (!form.productName.trim()) {
        setFormError('商品名を入力してください');
        return; // finally でロック解放
      }
      if (!bundlePurchase && (Number(form.itemPriceTaxIn) <= 0 || form.itemPriceTaxIn === '')) {
        setFormError('仕入れ価格を入力してください（0円より大きい金額）');
        return; // finally でロック解放
      }
      if (bundlePurchase) {
        const filledItems = bundleItems.filter(bi => bi.purchasePrice !== '');
        if (filledItems.length < 2) {
          setFormError('まとめ仕入れは2件以上の金額を入力してください');
          return; // finally でロック解放
        }
        const badExisting = bundleItems.find(bi => bi.mode === 'existing' && !bi.existingItemId);
        if (badExisting) {
          setFormError(`${badExisting.label}：既存商品を選択してください（または「新規登録」に切替）`);
          return; // finally でロック解放
        }
      }

      // バリデーション通過 → UI を「保存中」に（同期的に保存するのでUIには一瞬しか見えない）
      setSaving(true);
      // ★ 安全タイムアウト: 保存処理が何らかの理由でハングした場合に10秒後に自動リセット
      if (savingTimeoutRef.current) clearTimeout(savingTimeoutRef.current);
      savingTimeoutRef.current = setTimeout(() => {
        if (savingLockRef.current) {
          console.warn('[Save] safety timeout: auto-reset saving state');
          savingLockRef.current = false;
          setSaving(false);
          savingTimeoutRef.current = null;
        }
      }, 10000);

      // ★ 保存前の緊急バックアップ（保存失敗時もフォームデータを復元できるように）
      try {
        localStorage.setItem('nobushop_save_backup', JSON.stringify({
          form, purchaseType, registrationMode,
          editingItemId: editingItem?.id || null,
          bundlePurchase, bundleItems: bundlePurchase ? bundleItems : undefined,
          savedAt: new Date().toISOString(),
        }));
      } catch(_) {}

      console.log('[Save] start', {
        mode: editingItem ? 'edit' : (bundlePurchase ? 'bundle' : 'new'),
        bundlePurchase,
        bundleItemsCount: bundleItems.length,
        bundleItemPrices: bundleItems.map(bi => ({ label: bi.label, price: bi.purchasePrice, mode: bi.mode })),
        id: editingItem?.id, name: form.productName, price: form.itemPriceTaxIn,
        ts: new Date().toISOString(),
      });
      // photos配列: IDとbase64サムネイルを保存（3重バックアップ: IndexedDB + thumbMap + Supabase）
      // ★ 編集時: IndexedDB消失でthumbDataUrlがnullになっていても、既存アイテムの値で補完する
      const existingPhotoThumbMap = new Map((editingItem?.photos || []).map(p => [p.id, p.thumbDataUrl || null]));
      const photoRefs = photos.map(p => ({
        id: p.id,
        thumbId: p.thumbId,
        // 現在のthumbDataUrlがnullでも既存アイテムのthumbDataUrlで補完（消失を防ぐ）
        thumbDataUrl: p.thumbDataUrl || existingPhotoThumbMap.get(p.id) || null,
      }));
      // 税込・税抜内訳を保存
      const purchaseCost = {
        totalTaxIn: totalPurchaseTaxIn,
        totalTaxEx: totalPurchaseTaxEx,
        itemPriceTaxIn: Number(form.itemPriceTaxIn) || 0,
        itemTaxRate: form.itemTaxRate,
        itemPriceTaxEx: calcTaxEx(form.itemPriceTaxIn, form.itemTaxRate),
        ...(purchaseType === 'online' ? {
          shippingTaxIn: Number(form.shippingTaxIn) || 0,
          shippingTaxRate: form.shippingTaxRate,
          shippingTaxEx: calcTaxEx(form.shippingTaxIn, form.shippingTaxRate),
          optionalFeeTaxIn: form.showOptionalFee ? (Number(form.optionalFeeTaxIn) || 0) : 0,
          optionalTaxRate: form.optionalTaxRate,
          optionalFeeTaxEx: form.showOptionalFee ? calcTaxEx(form.optionalFeeTaxIn, form.optionalTaxRate) : 0,
        } : {}),
        // クーポン（店舗・電脳どちらでも保存）
        ...(couponAmount > 0 ? { couponTaxIn: couponAmount, couponNote: form.couponNote || '' } : {}),
      };

      if (editingItem) {
        // ---- 編集モード: 既存アイテムを上書き ----
        const updatedItem = {
          ...editingItem,   // id, mgmtNo, createdAt など元データを保持
          ...form,
          // ★ registrationMode からステータスを明示設定（...editingItemの古いstatusを上書き）
          status: registrationMode === 'listed' ? 'listed' : 'unlisted',
          // 出品済みに変更した場合、listDateが未設定なら今日の日付をセット
          listDate: registrationMode === 'listed'
            ? (form.listDate || editingItem.listDate || new Date().toISOString().slice(0, 10))
            : (form.listDate || editingItem.listDate || ''),
          size: computedSize,
          purchasePrice: totalPurchaseTaxIn,
          purchaseCost,
          purchaseType,
          purchaseTypeSource,
          purchaseStoreType: (() => { const m = data.settings?.storeMaster || getInitialData().settings.storeMaster; return (m.yahooStores||[]).includes(form.purchaseStore) ? 'yahoo' : 'normal'; })(),
          aiTypeDetection: aiTypeDetection || editingItem.aiTypeDetection || null,
          listPrice: Number(form.listPrice) || 0,
          photos: photoRefs,
          descriptionText: generatedDesc || form.descriptionText || '',
          updatedAt: new Date().toISOString(),
        };
        let updated = data.inventory.map(i => i.id === editingItem.id ? updatedItem : i);
        // ★ まとめ仕入れ: bundleAllPricesで指定された兄弟アイテムの価格を一括更新
        if (editingItem.bundleGroup && Object.keys(bundleAllPrices).length > 0) {
          updated = updated.map(inv => {
            const newPriceStr = bundleAllPrices[inv.id];
            if (newPriceStr === undefined) return inv;
            const np = Math.max(0, Number(newPriceStr) || 0);
            if (np === (inv.purchasePrice || 0)) return inv;
            return { ...inv, purchasePrice: np,
              purchaseCost: { ...inv.purchaseCost, totalTaxIn: np, totalTaxEx: np },
              updatedAt: new Date().toISOString() };
          });
        }
        setData({ ...data, inventory: updated });
        toast('✅ 商品情報を更新しました！');
        const savedId = editingItem.id;
        const goSell = postSaveNavToSale.current;
        postSaveNavToSale.current = false;
        const returnTab = pendingReturnTab; // 保存後に戻るタブ
        const returnSection = pendingReturnSection; // 保存後にOtherTabで表示するセクション
        clearEditDraft(savedId);
        console.log('[Save] edit success:', savedId);
        try { localStorage.removeItem('nobushop_save_backup'); } catch(_) {}
        resetForm();
        if (goSell) { setPendingSaleItemId(savedId); setTab('sales'); }
        else if (returnTab) {
          if (returnSection) setPendingReturnSection(returnSection);
          setTab(returnTab);
        }
        return;
      }

      // ── まとめ仕入れ（複数アイテムを一括登録）────────────────
      if (bundlePurchase) {
        // ★ バンドルパス確認ログ（デバッグ用）
        console.log('[Bundle] entered bundle path', {
          items: bundleItems.map(bi => ({ label: bi.label, price: bi.purchasePrice, mode: bi.mode }))
        });
        const purchaseStoreType = (() => {
          const m = data.settings?.storeMaster || getInitialData().settings.storeMaster;
          return (m.yahooStores||[]).includes(form.purchaseStore) ? 'yahoo' : 'normal';
        })();
        const bundleGroupId = `bundle_${Date.now()}`;
        const ts = Date.now();

        // ── 新規作成アイテム ──
        const newBundleItems = bundleItems.filter(bi => bi.mode !== 'existing');
        const createdItems = newBundleItems.map((bi, idx) => {
          const bPrice = Number(bi.purchasePrice) || 0;
          return {
            id: `${ts}_bundle_${idx}`,
            ...form,
            userId: currentUser,
            productName: bi.productName.trim() || `${form.productName || '商品'} [${bi.label}]`,
            brand: '',
            listDate: '',
            purchasePrice: bPrice,
            purchaseCost: { totalTaxIn: bPrice, totalTaxEx: bPrice },
            size: computedSize,
            purchaseType, purchaseTypeSource, purchaseStoreType,
            aiTypeDetection: aiTypeDetection || null,
            listPrice: Number(form.listPrice) || 0,
            photos: idx === 0 ? photoRefs : [],
            mgmtNo: idx === 0 ? mgmtNo : null,
            status: 'unlisted',
            bundleGroup: bundleGroupId,
            bundleLabel: bi.label,
            descriptionText: idx === 0 ? (generatedDesc || '') : '',
            createdAt: new Date(ts + idx).toISOString(),
          };
        });

        // ── 既存アイテム更新 ──
        const existingBundleItems = bundleItems.filter(bi => bi.mode === 'existing' && bi.existingItemId);
        const updatedInventory = data.inventory.map(invItem => {
          const bi = existingBundleItems.find(b => b.existingItemId === invItem.id);
          if (!bi) return invItem;
          const bPrice = Number(bi.purchasePrice) || invItem.purchasePrice || 0;
          return {
            ...invItem,
            purchasePrice: bPrice,
            purchaseCost: { totalTaxIn: bPrice, totalTaxEx: bPrice },
            ...(form.purchaseDate  ? { purchaseDate:  form.purchaseDate  } : {}),
            ...(form.purchaseStore ? { purchaseStore: form.purchaseStore } : {}),
            purchaseType,
            purchaseTypeSource,
            purchaseStoreType,
            bundleGroup: bundleGroupId,
            bundleLabel: bi.label,
            updatedAt: new Date().toISOString(),
          };
        });

        const totalCount = createdItems.length + existingBundleItems.length;
        setData({ ...data, inventory: [...updatedInventory, ...createdItems] });
        const msgParts = [];
        if (createdItems.length)        msgParts.push(`新規${createdItems.length}件`);
        if (existingBundleItems.length) msgParts.push(`既存更新${existingBundleItems.length}件`);
        const priceDetail = createdItems.map(i => `${i.bundleLabel}:¥${(i.purchasePrice||0).toLocaleString()}`).join(' / ');
        toast(`✅ まとめ仕入れ ${totalCount}件（${msgParts.join(' + ')}）を登録しました！\n${priceDetail}`);
        console.log('[Save] bundle success:', totalCount, createdItems.map(i => ({ id: i.id, name: i.productName, price: i.purchasePrice })));
        try { localStorage.removeItem('nobushop_save_backup'); } catch(_) {}
        resetForm();
        return;
      }

      // ---- 通常新規登録 ----
      const newItem = {
        id: Date.now().toString(),
        ...form,
        userId: currentUser,
        size: computedSize,
        purchasePrice: totalPurchaseTaxIn,
        purchaseCost,
        purchaseType,
        purchaseTypeSource,
        purchaseStoreType: (() => { const m = data.settings?.storeMaster || getInitialData().settings.storeMaster; return (m.yahooStores||[]).includes(form.purchaseStore) ? 'yahoo' : 'normal'; })(),
        aiTypeDetection: aiTypeDetection || null,
        listPrice: Number(form.listPrice) || 0,
        photos: photoRefs,
        mgmtNo,
        status: registrationMode === 'listed' ? 'listed' : 'unlisted',
        profit,
        descriptionText: generatedDesc || '',
        createdAt: new Date().toISOString(),
      };
      setData({ ...data, inventory: [...data.inventory, newItem] });
      toast('✅ 仕入れを登録しました！');
      const goSellNew = postSaveNavToSale.current;
      postSaveNavToSale.current = false;
      setLastSavedItem(newItem);
      console.log('[Save] new success:', newItem.id);
      try { localStorage.removeItem('nobushop_save_backup'); } catch(_) {}
      resetForm();
      if (goSellNew) { setPendingSaleItemId(newItem.id); setTab('sales'); }

    } catch(e) {
      // ★ 保存処理中の例外を捕捉してエラー表示（finally でロックも解放）
      console.error('[Save] ERROR:', e.message, e.stack || '');
      setFormError('保存中にエラーが発生しました。もう一度タップしてください。\n（入力データは保護されています）\n原因: ' + (e?.message || String(e)));
      // saving は finally で必ず false にリセットされる

    } finally {
      // ★★★ finally: 成功・失敗・バリデーションreturn・例外 どれでも必ず実行 ★★★
      // これにより「保存ボタンが二度と押せなくなる」バグを完全に防止する
      savingLockRef.current = false;
      // saving=true にした場合（バリデーション通過後）はresetFormかここでfalseにする
      // バリデーション失敗でreturnした場合はsaving=falseのままなのでsetSaving(false)は無害
      setSaving(false);
    }
  };

  // ── まとめ仕入れ合計金額の一括再配分 ────────────────────────
  // 全グループアイテムを比率維持 / 均等 / 手動で一括更新し、フォーム値も同期する
  const handleBundleRescale = () => {
    if (!editingItem?.bundleGroup) return;
    const allBundled = data.inventory
      .filter(i => i.bundleGroup === editingItem.bundleGroup)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    if (allBundled.length === 0) return;
    const count = allBundled.length;
    let newPrices;
    let methodLabel;
    if (bundleRescaleMethod === 'manual') {
      // 手動指定：各フィールドの入力値をそのまま使用
      newPrices = allBundled.map(item => Math.max(0, Number(bundleManualPrices[item.id]) || item.purchasePrice || 0));
      methodLabel = '手動指定';
    } else {
      const newTotal = Number(bundleRescaleTotal);
      if (!newTotal || newTotal <= 0) { toast('❌ 新しい合計金額を入力してください'); return; }
      const currentTotal = allBundled.reduce((s, i) => s + (i.purchasePrice || 0), 0);
      if (bundleRescaleMethod === 'equal') {
        const base = Math.floor(newTotal / count);
        newPrices = allBundled.map((_, idx) =>
          idx === count - 1 ? Math.max(0, newTotal - base * (count - 1)) : base
        );
        methodLabel = '均等';
      } else {
        // 比率維持（currentTotal=0 の場合は均等フォールバック）
        if (currentTotal === 0) {
          const base = Math.floor(newTotal / count);
          newPrices = allBundled.map((_, idx) =>
            idx === count - 1 ? Math.max(0, newTotal - base * (count - 1)) : base
          );
        } else {
          let sum = 0;
          newPrices = allBundled.map((item, idx) => {
            if (idx === count - 1) return Math.max(0, newTotal - sum);
            const p = Math.round(newTotal * (item.purchasePrice || 0) / currentTotal);
            sum += p;
            return p;
          });
        }
        methodLabel = '比率維持';
      }
    }
    const updatedInv = data.inventory.map(inv => {
      const idx = allBundled.findIndex(i => i.id === inv.id);
      if (idx === -1) return inv;
      const np = newPrices[idx];
      return { ...inv, purchasePrice: np,
        purchaseCost: { ...inv.purchaseCost, totalTaxIn: np, totalTaxEx: np },
        updatedAt: new Date().toISOString() };
    });
    setData({ ...data, inventory: updatedInv });
    // 現在編集中アイテムのフォーム値も同期
    const myIdx = allBundled.findIndex(i => i.id === editingItem.id);
    if (myIdx !== -1) setForm(prev => ({ ...prev, itemPriceTaxIn: newPrices[myIdx] }));
    const savedTotal = newPrices.reduce((s, p) => s + p, 0);
    setBundleRescaleTotal('');
    setBundleManualPrices({});
    toast(`✅ まとめ仕入れを更新しました（${count}点・${methodLabel}・合計¥${savedTotal.toLocaleString()}）`);
  };

  const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fade-in">
      {/* ── 仕入れ登録完了後 クイックアクションバナー ── */}
      {lastSavedItem && !editingItem && (
        <div style={{background:'#f0fdf4',borderBottom:'1px solid #bbf7d0',padding:'10px 16px',
          display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:'#166534',fontWeight:700,marginBottom:2}}>✅ 登録完了</div>
            <div style={{fontSize:12,color:'#1e293b',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {lastSavedItem.brand ? `${lastSavedItem.brand} ` : ''}{lastSavedItem.productName}
            </div>
          </div>
          <button
            onClick={() => { setTab('inventory'); setLastSavedItem(null); }}
            style={{flexShrink:0,padding:'7px 12px',borderRadius:99,background:'#e0f2fe',color:'#0369a1',
              border:'none',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',touchAction:'manipulation'}}>
            📋 在庫へ
          </button>
          <button
            onClick={() => {
              setPendingSaleItemId(lastSavedItem.id);
              setTab('sales');
              setLastSavedItem(null);
            }}
            style={{flexShrink:0,padding:'7px 12px',borderRadius:99,background:'#E84040',color:'white',
              border:'none',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',touchAction:'manipulation'}}>
            💰 売上記録
          </button>
          <button onClick={() => setLastSavedItem(null)}
            style={{flexShrink:0,background:'none',border:'none',fontSize:18,color:'#999',cursor:'pointer',padding:'0 4px',lineHeight:1}}>
            ×
          </button>
        </div>
      )}
      <div className="header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,paddingRight:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
          {!editingItem && (
            <button onClick={() => setTab('inventory')}
              style={{background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.4)',
                borderRadius:8,padding:'5px 10px',fontSize:12,fontWeight:700,cursor:'pointer',
                whiteSpace:'nowrap',flexShrink:0,touchAction:'manipulation'}}>
              ← 在庫
            </button>
          )}
          <h1 style={{margin:0,fontSize:18,fontWeight:800,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {editingItem ? '✏️ 商品を編集' : '📦 仕入れ登録'}
          </h1>
        </div>
        {editingItem && (
          <button onClick={() => {
            const returnTab = pendingReturnTab;
            const returnSection = pendingReturnSection;
            resetForm();
            if (returnTab) {
              if (returnSection) setPendingReturnSection(returnSection);
              setTab(returnTab);
            }
          }}
            style={{background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.5)',borderRadius:8,padding:'4px 12px',fontSize:13,cursor:'pointer',flexShrink:0,touchAction:'manipulation'}}>
            ✕ キャンセル
          </button>
        )}
      </div>

      {/* 登録モード選択（新規登録・Step1のみ表示）*/}
      {!editingItem && step === 1 && (
        <div style={{padding:'12px 16px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <button onClick={() => setRegistrationMode('unlisted')}
              style={{padding:'12px 8px',borderRadius:14,border: registrationMode==='unlisted' ? '2px solid #E84040' : '2px solid #e5e5e5',
                background: registrationMode==='unlisted' ? '#fff0f0' : 'white',
                cursor:'pointer',textAlign:'center',touchAction:'manipulation'}}>
              <div style={{fontSize:22,marginBottom:4}}>📦</div>
              <div style={{fontSize:13,fontWeight:700,color: registrationMode==='unlisted'?'#E84040':'#333'}}>未出品を登録</div>
              <div style={{fontSize:10,color:'#999',marginTop:2}}>AI解析あり</div>
            </button>
            <button onClick={() => setRegistrationMode('listed')}
              style={{padding:'12px 8px',borderRadius:14,border: registrationMode==='listed' ? '2px solid #2563eb' : '2px solid #e5e5e5',
                background: registrationMode==='listed' ? '#eff6ff' : 'white',
                cursor:'pointer',textAlign:'center',touchAction:'manipulation'}}>
              <div style={{fontSize:22,marginBottom:4}}>✅</div>
              <div style={{fontSize:13,fontWeight:700,color: registrationMode==='listed'?'#2563eb':'#333'}}>出品済みを登録</div>
              <div style={{fontSize:10,color:'#999',marginTop:2}}>AI解析なし・簡易入力</div>
            </button>
          </div>
        </div>
      )}

      {/* ステップインジケーター */}
      <div className="step-indicator" style={{paddingTop:12}}>
        {[1,2,3].map(s => (
          <div key={s} className={`step ${s < step ? 'done' : s === step ? 'active' : ''}`}/>
        ))}
      </div>

      <div style={{padding:'0 16px 16px'}}>

        {/* 下書き復元バナー */}
        {draftBanner && !editingItem && (
          <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:12,padding:'12px 14px',marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:13,color:'#92400e',marginBottom:4}}>📝 入力中のデータが残っています</div>
            <div style={{fontSize:12,color:'#78350f',marginBottom:10}}>
              前回の入力を再開できます（商品名: {draftBanner.form?.productName || '—'}）
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => {
                setForm(draftBanner.form);
                setPurchaseType(draftBanner.purchaseType || 'store');
                setGeneratedDesc(draftBanner.generatedDesc || '');
                setRegistrationMode(draftBanner.registrationMode || 'unlisted');
                // 写真も復元（thumbDataUrl → thumbMap → IDのみ の順でフォールバック）
                if (draftBanner.photoRefs?.length) {
                  const thumbMap = loadThumbMap();
                  // ★ thumbDataUrlがないものも除外しない（IndexedDBにある場合があるため）
                  const restoredPhotos = draftBanner.photoRefs.map(r => {
                    const thumbDU = r.thumbDataUrl || thumbMap[r.id] || null;
                    return {
                      id: r.id,
                      thumbId: r.thumbId,
                      thumbDataUrl: thumbDU,
                      previewUrl: thumbDU,
                      thumbUrl: null,
                      file: null,
                      fromDraft: true,
                    };
                  });
                  setPhotos(restoredPhotos);
                }
                setStep(3);
                setDraftBanner(null);
                toast('📝 下書きを復元しました');
              }} style={{flex:2,padding:'9px 0',background:'#f59e0b',color:'white',border:'none',
                borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                続きから再開
              </button>
              <button onClick={() => { clearDraft(); setDraftBanner(null); }}
                style={{flex:1,padding:'9px 0',background:'white',color:'#666',border:'1px solid #e5e7eb',
                  borderRadius:8,fontSize:13,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                破棄
              </button>
            </div>
          </div>
        )}

        {/* Step 1: 写真 */}
        {step >= 1 && (
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Step 1: 写真を追加（最大5枚）</div>
            <div style={{fontSize:12,color:'#999',marginBottom:12}}>1枚目がトップ画像になります</div>

            {/* 写真追加ボタン */}
            {photos.length < 5 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                <button className="btn-secondary" style={{padding:'12px 8px',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}
                  onClick={() => cameraInputRef.current?.click()}>
                  📷 カメラで撮影
                </button>
                <button className="btn-secondary" style={{padding:'12px 8px',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}
                  onClick={() => multiInputRef.current?.click()}>
                  🖼 写真を選択（複数可）
                </button>
              </div>
            )}

            {/* hidden file inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhotoSelect} style={{display:'none'}}/>
            <input ref={multiInputRef} type="file" accept="image/*" multiple
              onChange={handlePhotoSelect} style={{display:'none'}}/>

            {/* サムネイルプレビュー */}
            {photos.length > 0 && (
              <div style={{marginBottom:12}}>
                {/* 並び替えヒント */}
                <div style={{fontSize:11,color: swapIdx !== null ? 'var(--color-primary)' : '#bbb',
                  fontWeight:700,marginBottom:8,textAlign:'center',
                  background: swapIdx !== null ? '#fff0f0' : '#f8f8f8',
                  borderRadius:8,padding:'6px 10px',transition:'all 0.2s'}}>
                  {swapIdx !== null
                    ? `📸 ${swapIdx + 1}枚目を選択中 → 入れ替えたい写真をタップ`
                    : '↕ 写真をタップして並び替え'}
                </div>
                <div className="photo-grid">
                  {photos.map((p, i) => {
                    const isSelected = swapIdx === i;
                    return (
                      <div key={p.id} className="photo-item"
                        onClick={() => {
                          if (swapIdx === null) {
                            // 1枚目選択
                            setSwapIdx(i);
                          } else if (swapIdx === i) {
                            // 同じ写真→選択解除
                            setSwapIdx(null);
                          } else {
                            // 2枚目選択→入れ替え
                            setPhotos(prev => {
                              const arr = [...prev];
                              [arr[swapIdx], arr[i]] = [arr[i], arr[swapIdx]];
                              return arr;
                            });
                            setSwapIdx(null);
                          }
                        }}
                        style={{
                          outline: isSelected ? '3px solid var(--color-primary)' : 'none',
                          outlineOffset: '-3px',
                          transform: isSelected ? 'scale(0.94)' : 'scale(1)',
                          transition: 'transform 0.15s, outline 0.15s',
                          borderRadius: 12,
                        }}>
                        <img src={p.thumbUrl || p.previewUrl} alt={`photo${i}`}/>
                        {/* TOPバッジ or 番号 */}
                        <div style={{position:'absolute',top:5,left:5,
                          background: i === 0 ? 'var(--color-primary)' : 'rgba(0,0,0,0.45)',
                          color:'white',fontSize:10,padding:'2px 7px',borderRadius:6,fontWeight:700}}>
                          {i === 0 ? 'TOP' : i + 1}
                        </div>
                        {/* 選択中インジケーター */}
                        {isSelected && (
                          <div style={{position:'absolute',inset:0,background:'rgba(232,64,64,0.15)',
                            display:'flex',alignItems:'center',justifyContent:'center',borderRadius:12}}>
                            <div style={{background:'var(--color-primary)',color:'white',borderRadius:99,padding:'4px 12px',fontSize:12,fontWeight:700}}>
                              選択中
                            </div>
                          </div>
                        )}
                        {/* 削除ボタン（並び替えモード中は非表示） */}
                        {swapIdx === null && (
                          <button onClick={e => { e.stopPropagation(); removePhoto(i); }}
                            style={{position:'absolute',top:5,right:5,background:'rgba(0,0,0,0.5)',
                              color:'white',border:'none',borderRadius:'50%',width:26,height:26,
                              display:'flex',alignItems:'center',justifyContent:'center',
                              cursor:'pointer',fontSize:14,fontWeight:700}}>×</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:8,marginTop:4}}>
              {photos.length > 0 && step === 1 && registrationMode === 'unlisted' && (
                <button className="btn-primary" style={{flex:1}}
                  onClick={() => setStep(2)}>次へ → AI解析</button>
              )}
              {photos.length > 0 && step === 1 && registrationMode === 'listed' && (
                <button className="btn-primary" style={{flex:1,background:'#2563eb',boxShadow:'0 4px 16px rgba(37,99,235,0.28)'}}
                  onClick={() => setStep(3)}>次へ → 入力へ</button>
              )}
              {step === 1 && (
                <button className="btn-secondary" style={{flex: photos.length > 0 ? '0 0 auto' : 1}}
                  onClick={() => setStep(3)}>
                  {photos.length > 0 ? 'スキップ' : '📝 写真なしで入力'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: AI解析（未出品モードのみ）*/}
        {step >= 2 && registrationMode === 'unlisted' && (
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:10}}>Step 2: AI解析</div>

            {/* 読み取り範囲選択 */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:'#666',fontWeight:600,marginBottom:6}}>読み取り範囲を選択</div>
              <div style={{display:'flex',gap:8}}>
                {[
                  ['product_only', '🔍 商品情報のみ', '商品写真だけの時'],
                  ['with_price',   '💴 仕入れ値も読み取る', '落札・値札画面も含む時'],
                ].map(([mode, label, sub]) => (
                  <button key={mode} type="button"
                    onClick={() => setScanMode(mode)}
                    style={{flex:1,padding:'10px 8px',borderRadius:10,border:'2px solid',
                      borderColor: scanMode === mode ? 'var(--color-primary)' : '#e0e0e0',
                      background: scanMode === mode ? '#fff0f0' : '#f9fafb',
                      cursor:'pointer',textAlign:'center',
                      WebkitTapHighlightColor:'transparent'}}>
                    <div style={{fontSize:13,fontWeight:700,
                      color: scanMode === mode ? 'var(--color-primary)' : '#555'}}>
                      {label}
                    </div>
                    <div style={{fontSize:11,color:'#999',marginTop:2}}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {!apiKey && (
              <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:8,padding:12,marginBottom:12,fontSize:13,color:'#92400e'}}>
                ⚠️ APIキー未設定。設定タブで入力してください。
              </div>
            )}
            <button className="btn-primary" style={{width:'100%'}}
              onClick={handleAnalyze} disabled={analyzing}>
              {analyzing
                ? <><span className="spinner"/><span>解析中...</span></>
                : scanMode === 'with_price' ? '🤖 AI解析する（仕入れ値まで）' : '🤖 AI解析する'}
            </button>
            {step === 2 && !aiResult && (
              <button className="btn-secondary" style={{width:'100%',marginTop:8}}
                onClick={() => setStep(3)}>スキップして手動入力</button>
            )}
          </div>
        )}

        {/* Step 3: 入力フォーム */}
        {step >= 3 && (
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>Step 3: 商品情報</div>

            {/* 商品名 */}
            <div style={{marginBottom:12}}>
              <label className="field-label">商品名（日本語）
                <span style={{marginLeft:6,fontSize:11,fontWeight:700,
                  color: form.productName.length>40 ? '#dc2626' : form.productName.length>30 ? '#f59e0b' : '#999'}}>
                  {form.productName.length}字{form.productName.length>40 ? '（メルカリ出品時は40字以内に調整）' : ''}
                </span>
              </label>
              <div style={{display:'flex',gap:6}}>
                <input className="input-field" style={{flex:1}} value={form.productName}
                  onChange={e => setF('productName', e.target.value)} placeholder="例: ノースフェイス ダウンジャケット ブラック L"/>
                <button disabled={!form.productName}
                  onClick={() => copyToClipboard(form.productName).then(ok => toast(ok ? '📋 商品名をコピー' : 'コピー失敗'))}
                  style={{padding:'0 12px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:12,fontWeight:600,cursor:'pointer',color:'#555',opacity:form.productName?1:0.4,whiteSpace:'nowrap'}}>
                  コピー
                </button>
              </div>
            </div>

            {/* 英語タイトル */}
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                <label className="field-label" style={{margin:0}}>英語タイトル（メルカリ用・SEO）</label>
                <span style={{
                  fontSize:11, fontWeight:700,
                  color: form.englishTitle.length > 40 ? '#dc2626' : form.englishTitle.length >= 35 ? '#f59e0b' : '#16a34a',
                }}>{form.englishTitle.length}/40</span>
              </div>
              <div style={{display:'flex',gap:6}}>
                <input className={`input-field${form.englishTitle.length > 40 ? ' highlight' : ''}`}
                  style={{flex:1}}
                  value={form.englishTitle}
                  onChange={e => setF('englishTitle', e.target.value)}
                  placeholder="AI解析で自動入力。例: Louis Vuitton Musette Salsa Shoulder Bag"/>
                <button disabled={!form.englishTitle}
                  onClick={() => copyToClipboard(form.englishTitle).then(ok => toast(ok ? '📋 英語タイトルをコピー' : 'コピー失敗'))}
                  style={{padding:'0 12px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:12,fontWeight:600,cursor:'pointer',color:'#555',opacity:form.englishTitle?1:0.4,whiteSpace:'nowrap'}}>
                  コピー
                </button>
              </div>
              {form.englishTitle.length > 40 && (
                <div style={{fontSize:11,color:'#dc2626',marginTop:3}}>⚠️ 40文字を超えています（{form.englishTitle.length - 40}文字オーバー）</div>
              )}
            </div>

            {/* ブランド */}
            <div style={{marginBottom:12}}>
              <label className="field-label">ブランド</label>
              {/* 英語ブランド名 */}
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                <input className="input-field" style={{flex:1}}
                  value={form.brand} onChange={e => setF('brand', e.target.value)}
                  placeholder="英語（例: THE NORTH FACE）"/>
                <button disabled={!form.brand}
                  onClick={() => copyToClipboard(form.brand).then(ok => toast(ok ? '📋 英語ブランドをコピー' : 'コピー失敗'))}
                  style={{padding:'0 12px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:12,fontWeight:600,cursor:'pointer',color:'#555',opacity:form.brand?1:0.4,whiteSpace:'nowrap'}}>
                  コピー
                </button>
              </div>
              {/* 日本語ブランド名 */}
              <div style={{display:'flex',gap:6}}>
                <input className="input-field" style={{flex:1}}
                  value={form.brandReading} onChange={e => setF('brandReading', e.target.value)}
                  placeholder="日本語（例: ザノースフェイス）"/>
                <button disabled={!form.brandReading}
                  onClick={() => copyToClipboard(form.brandReading).then(ok => toast(ok ? '📋 日本語ブランドをコピー' : 'コピー失敗'))}
                  style={{padding:'0 12px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:12,fontWeight:600,cursor:'pointer',color:'#555',opacity:form.brandReading?1:0.4,whiteSpace:'nowrap'}}>
                  コピー
                </button>
              </div>
            </div>

            {/* 型番・モデル名 */}
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                <label className="field-label" style={{margin:0}}>型番・モデル名</label>
                {form.modelNumber && (
                  <button onClick={() => copyToClipboard(form.modelNumber).then(ok => toast(ok ? '📋 コピーしました' : 'コピー失敗'))}
                    style={{fontSize:11,color:'#E84040',background:'#fff0f0',border:'1px solid #fca5a5',borderRadius:6,padding:'2px 8px',cursor:'pointer',fontWeight:600}}>
                    コピー
                  </button>
                )}
              </div>
              <input className="input-field"
                value={form.modelNumber}
                onChange={e => setF('modelNumber', e.target.value)}
                placeholder="AI解析で自動入力（例: M51258 / Musette Salsa）"/>
              {form.modelNumber ? (
                <div style={{fontSize:11,color:'#16a34a',marginTop:3}}>✅ 型番・モデル名取得済み</div>
              ) : (
                <div style={{fontSize:11,color:'#888',marginTop:3}}>💡 内側ラベル・タグ・刻印の写真も追加すると型番の精度が上がります</div>
              )}
            </div>

            {/* カテゴリー */}
            <div style={{marginBottom:12}}>
              <label className="field-label">カテゴリー</label>
              {/* 主カテゴリ（サイズ計算・候補提案に使用） */}
              <select className="input-field" style={{marginBottom:8}}
                value={form.category} onChange={e => setF('category', e.target.value)}>
                <option value="">選択</option>
                {['バッグ','衣類','小物','シューズ','その他'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* SEOタグ */}
              <div style={{fontSize:11,color:'#666',fontWeight:600,marginBottom:5}}>
                SEOタグ <span style={{color:'#999',fontWeight:400}}>（最大10個・説明文に自動反映）</span>
              </div>

              {/* 登録済みタグ */}
              {form.seoCategories.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:7}}>
                  {form.seoCategories.map(tag => (
                    <span key={tag} style={{background:'#dbeafe',color:'#1e40af',padding:'3px 10px',borderRadius:20,fontSize:13,display:'flex',alignItems:'center',gap:4,fontWeight:500}}>
                      {tag}
                      <button onClick={() => setF('seoCategories', form.seoCategories.filter(t => t !== tag))}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#1e40af',padding:'0 0 0 2px',fontSize:15,lineHeight:1,display:'flex',alignItems:'center'}}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* タグ入力 */}
              {form.seoCategories.length < 10 && (
                <div style={{display:'flex',gap:6,marginBottom:7}}>
                  <input className="input-field" style={{flex:1}}
                    value={seoCategoryInput}
                    onChange={e => setSeoCategoryInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && seoCategoryInput.trim()) {
                        const tag = seoCategoryInput.trim();
                        if (!form.seoCategories.includes(tag) && form.seoCategories.length < 10) {
                          setF('seoCategories', [...form.seoCategories, tag]);
                        }
                        setSeoCategoryInput('');
                        e.preventDefault();
                      }
                    }}
                    placeholder="タグを入力 (Enterで追加)"/>
                  <button
                    onClick={() => {
                      const tag = seoCategoryInput.trim();
                      if (!tag) return;
                      if (form.seoCategories.includes(tag)) { toast('すでに追加済みです'); return; }
                      if (form.seoCategories.length >= 10) { toast('タグは最大10個です'); return; }
                      setF('seoCategories', [...form.seoCategories, tag]);
                      setSeoCategoryInput('');
                    }}
                    style={{padding:'0 14px',borderRadius:10,border:'1.5px solid var(--color-primary)',background:'white',fontSize:13,fontWeight:600,cursor:'pointer',color:'var(--color-primary)',whiteSpace:'nowrap'}}>
                    追加
                  </button>
                </div>
              )}

              {/* 候補タグ */}
              {form.category && CONFIG.CATEGORY_SUGGESTIONS[form.category]?.length > 0 && (
                <div>
                  <div style={{fontSize:11,color:'#999',marginBottom:4}}>候補（タップで追加）：</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {CONFIG.CATEGORY_SUGGESTIONS[form.category]
                      .filter(s => !form.seoCategories.includes(s))
                      .map(s => (
                        <button key={s}
                          onClick={() => {
                            if (form.seoCategories.length >= 10) { toast('タグは最大10個です'); return; }
                            setF('seoCategories', [...form.seoCategories, s]);
                          }}
                          style={{padding:'3px 10px',borderRadius:20,border:'1px solid #d1d5db',background:'#f9fafb',fontSize:12,cursor:'pointer',color:'#374151'}}>
                          + {s}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* カラー・状態 */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label className="field-label">カラー</label>
                <input className="input-field" value={form.color}
                  onChange={e => setF('color', e.target.value)}
                  onBlur={e => setF('color', normalizeColor(e.target.value))}
                  placeholder="カラー（例：ブラック / 黒）"/>
              </div>
              <div>
                <label className="field-label">状態ランク</label>
                <select className="input-field" value={form.condition}
                  onChange={e => {
                    const v = e.target.value;
                    setF('condition', v);
                    if (CONDITION_TEMPLATES[v]) setF('conditionDetail', CONDITION_TEMPLATES[v]);
                  }}>
                  {['S','A','B','C','D'].map(c => <option key={c} value={c}>{c}ランク</option>)}
                </select>
              </div>
            </div>

            {/* サイズ */}
            <div style={{marginBottom:12}}>
              <label className="field-label">
                サイズ {form.sizeConfidence === 'low' && <span style={{color:'#d97706',fontSize:11}}>⚠️ 要採寸</span>}
              </label>

              {/* 表記サイズ */}
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:'#999',marginBottom:4}}>表記サイズ（タグ）</div>
                <input className={`input-field ${form.sizeConfidence === 'low' ? 'highlight' : ''}`}
                  value={form.sizeTag} onChange={e => setF('sizeTag', e.target.value)}
                  placeholder={form.category === 'シューズ' ? '例: 27.0cm / US9 / EU42' : '例: S / M / L / XL / 38'}/>
              </div>

              {/* 実寸入力欄（カテゴリー別） */}
              {measureFields.length > 0 && (
                <div>
                  <div style={{fontSize:11,color:'#999',marginBottom:4}}>実寸 (cm)　※空欄でも登録可</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                    {measureFields.map(([key, label]) => (
                      <div key={key} style={{position:'relative'}}>
                        <input type="number" className="input-field"
                          style={{paddingRight: label.length > 3 ? 72 : 40}}
                          value={form[key]}
                          onChange={e => setF(key, e.target.value)}
                          placeholder="—"/>
                        <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#aaa',pointerEvents:'none'}}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 合成プレビュー */}
              {computedSize && (
                <div style={{marginTop:8,padding:'6px 10px',background:'#f4f4f4',borderRadius:8,fontSize:12,color:'#555'}}>
                  📐 {computedSize}
                </div>
              )}
            </div>

            {/* 状態詳細 */}
            <div style={{marginBottom:12}}>
              <label className="field-label">状態詳細</label>
              <textarea className="input-field" value={form.conditionDetail}
                onChange={e => setF('conditionDetail', e.target.value)}
                placeholder="状態の詳細説明" style={{minHeight:80}}/>
            </div>

            <hr style={{borderColor:'#f0f0f0',margin:'12px 0'}}/>

            {/* 仕入れ方法 */}
            <div style={{marginBottom:12}}>
              <label className="field-label">仕入れ方法</label>

              {/* AI判定結果カード */}
              {aiTypeDetection && (
                <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:12,marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:13,color:'#0369a1'}}>🤖 AI自動判定</span>
                    <span style={{
                      background: aiTypeDetection.confidence >= 80 ? '#dcfce7' : aiTypeDetection.confidence >= 60 ? '#fef9c3' : '#fee2e2',
                      color: aiTypeDetection.confidence >= 80 ? '#166534' : aiTypeDetection.confidence >= 60 ? '#854d0e' : '#991b1b',
                      borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:700,
                    }}>信頼度 {aiTypeDetection.confidence}%</span>
                  </div>
                  <div style={{fontWeight:600,fontSize:13,color:'#0c4a6e',marginBottom:4}}>
                    {aiTypeDetection.type === 'store' ? '🏪 店舗仕入れ' : '💻 電脳仕入れ'} と判定
                  </div>
                  {aiTypeDetection.reason && (
                    <div style={{fontSize:12,color:'#555',marginBottom:6}}>{aiTypeDetection.reason}</div>
                  )}
                  <div style={{fontSize:12,color: purchaseTypeSource === 'ai' ? '#059669' : '#999',fontWeight: purchaseTypeSource === 'ai' ? 600 : 400}}>
                    {purchaseTypeSource === 'ai' ? '✅ 自動適用済み · 下のボタンで変更可' : '✏️ 手動で変更しました'}
                  </div>
                </div>
              )}

              {/* 仕入れ方法トグル */}
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                {[['store','🏪 店舗仕入れ'],['online','💻 電脳仕入れ']].map(([type, label]) => (
                  <button key={type} type="button"
                    onClick={() => {
                      setPurchaseType(type);
                      setPurchaseTypeSource('manual');
                      setTagReadResult(null);
                      // 電脳仕入れ選択時は決済方法をPayPayに自動セット
                      if (type === 'online') setF('paymentMethod', 'PayPay');
                    }}
                    style={{
                      flex:1, padding:'10px 8px', borderRadius:8, border:'2px solid',
                      borderColor: purchaseType === type ? 'var(--color-primary)' : '#e0e0e0',
                      background: purchaseType === type ? '#fff0f0' : 'white',
                      color: purchaseType === type ? 'var(--color-primary)' : '#666',
                      fontWeight: purchaseType === type ? 700 : 400,
                      fontSize:13, cursor:'pointer'
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* 写真読み取りボタン */}
              <div style={{marginBottom:10}}>
                <button type="button" className="btn-secondary" style={{width:'100%'}}
                  onClick={() => tagPhotoRef.current?.click()} disabled={tagReading}>
                  {tagReading
                    ? <><span className="spinner"/>{purchaseType === 'store' ? '値札を読み取り中...' : '画面を読み取り中...'}</>
                    : purchaseType === 'store' ? '📸 値札タグを読み取る（自動入力）' : '📸 落札・注文画面を読み取る（自動入力）'}
                </button>
                <input ref={tagPhotoRef} type="file" accept="image/*"
                  onChange={purchaseType === 'store' ? handleTagPhoto : handleAuctionPhoto}
                  style={{display:'none'}}/>
                {tagReadResult?.type === 'store' && (
                  <div style={{marginTop:6,padding:'8px 12px',background:'#f0fdf4',borderRadius:8,fontSize:13,color:'#166534'}}>
                    ✅ タグ読み取り: ¥{tagReadResult.price?.toLocaleString()}
                    {tagReadResult.notes && <span style={{color:'#888',marginLeft:8}}>{tagReadResult.notes}</span>}
                  </div>
                )}
                {tagReadResult?.type === 'online' && (
                  <div style={{marginTop:6,padding:'10px 12px',background:'#f0fdf4',borderRadius:8,fontSize:13,color:'#166534',lineHeight:1.7}}>
                    <div style={{fontWeight:700,marginBottom:4}}>
                      ✅ {tagReadResult.platform && <span style={{marginRight:6}}>{tagReadResult.platform}</span>}
                      落札¥{(tagReadResult.bid_price||0).toLocaleString()} + 送料¥{(tagReadResult.shipping||0).toLocaleString()}
                      <span style={{marginLeft:8}}>= ¥{tagReadResult.total?.toLocaleString()}</span>
                    </div>
                    {tagReadResult.product_title && (
                      <div style={{fontSize:12,color:'#166534',marginTop:2}}>
                        📝 タイトル: <span style={{fontWeight:600}}>{tagReadResult.product_title.slice(0,50)}{tagReadResult.product_title.length>50?'…':''}</span>
                      </div>
                    )}
                    {tagReadResult.purchase_date && (
                      <div style={{fontSize:12,color:'#166534'}}>📅 仕入れ日: {tagReadResult.purchase_date}</div>
                    )}
                    {tagReadResult.store_name && (
                      <div style={{fontSize:12,color:'#166534'}}>🏪 ストア: {tagReadResult.store_name}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 仕入れ情報（読み取り結果の下に配置） */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label className="field-label">仕入れ日</label>
                <input type="date" className="input-field" value={form.purchaseDate}
                  onChange={e => setF('purchaseDate', e.target.value)}/>
              </div>
              <div>
                <label className="field-label">仕入れ先</label>
                {/* ── 統合仕入れ先マスタ選択 ── */}
                {(() => {
                  const master = data.settings?.storeMaster || getInitialData().settings.storeMaster;
                  const settingsYahooStores = data.settings?.yahooStores || [];
                  const yahooNames = new Set([
                    ...(master.yahooStores||[]),
                    ...settingsYahooStores.map(s => s.storeName),
                  ]);
                  const storeList = (purchaseType === 'online'
                    ? [
                        ...(master.yahooStores||[]),
                        ...settingsYahooStores.map(s => s.storeName).filter(n => n),
                      ]
                    : (master.normalStores||[])
                  ).filter((v,i,a) => v && a.indexOf(v) === i)
                   .sort((a,b) => a.localeCompare(b, 'ja'));

                  // ── 電脳仕入れ：従来UI ──
                  if (purchaseType === 'online') {
                    const handleSelect = (val) => {
                      if (val === '__custom__') {
                        setStoreCustomText('');
                        setF('purchaseStore', '');
                        setF('sellerLicense', '');
                        setF('sellerCompanyName', '');
                      } else {
                        setStoreCustomText(null);
                        setF('purchaseStore', val);
                        const foundYahoo = settingsYahooStores.find(s => s.storeName === val);
                        if (foundYahoo) {
                          setF('sellerLicense', foundYahoo.license || '');
                          setF('sellerCompanyName', foundYahoo.companyName || '');
                        } else if (yahooNames.has(val)) {
                          setF('sellerLicense', '');
                          setF('sellerCompanyName', '');
                        } else {
                          setF('sellerLicense', (data.settings?.storeLicenses||{})[val] || '');
                          setF('sellerCompanyName', '');
                        }
                      }
                    };
                    return (
                      <>
                        <select className="input-field"
                          value={storeCustomText !== null ? '__custom__' : (form.purchaseStore || '')}
                          onChange={e => handleSelect(e.target.value)}>
                          <option value="">選択してください</option>
                          {storeList.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="__custom__">＋ その他（手入力）</option>
                        </select>
                        {storeCustomText !== null && (
                          <div style={{marginTop:6,display:'flex',gap:6}}>
                            <input className="input-field" style={{flex:1,marginBottom:0}}
                              value={storeCustomText}
                              onChange={e => { setStoreCustomText(e.target.value); setF('purchaseStore', e.target.value); }}
                              placeholder="仕入れ先名を入力"/>
                            <button
                              onClick={() => {
                                const name = normalizeStoreName(storeCustomText.trim());
                                if (!name) return;
                                const newMaster = {
                                  ...master,
                                  yahooStores: [...new Set([...(master.yahooStores||[]), name])].sort((a,b)=>a.localeCompare(b,'ja')),
                                };
                                setData({ ...data, settings: { ...data.settings, storeMaster: newMaster } });
                                setF('purchaseStore', name);
                                setStoreCustomText(null);
                                toast('✅ 電脳仕入れ先を追加しました');
                              }}
                              style={{padding:'10px 14px',border:'none',borderRadius:10,background:'var(--color-primary)',
                                color:'white',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
                              追加
                            </button>
                          </div>
                        )}
                      </>
                    );
                  }

                  // ── 店舗仕入れ：2段階UI（チェーン → 支店） ──
                  const locs = master.storeLocations || {};
                  // チェーン選択
                  const handleChainSelect = (val) => {
                    if (val === '__custom__') {
                      setStoreCustomText('');
                      setStoreChain('__custom__');
                      setBranchInput('');
                      setF('purchaseStore', '');
                    } else {
                      setStoreCustomText(null);
                      setStoreChain(val);
                      setBranchInput('');
                      // 支店登録がないチェーンはそのまま仕入れ先に
                      setF('purchaseStore', val);
                      setF('sellerLicense', (data.settings?.storeLicenses||{})[val] || '');
                      setF('sellerCompanyName', '');
                    }
                  };

                  // 支店を選択 or 追加して登録
                  const selectBranch = (branchName, addToMaster = false) => {
                    const full = storeChain + ' ' + branchName;
                    setF('purchaseStore', full);
                    setBranchInput(branchName);
                    if (addToMaster && storeChain && storeChain !== '__custom__') {
                      const existing = locs[storeChain] || [];
                      if (!existing.includes(branchName)) {
                        const newLocs = {
                          ...locs,
                          [storeChain]: [...existing, branchName].sort((a,b) => a.localeCompare(b,'ja')),
                        };
                        setData({ ...data, settings: { ...data.settings,
                          storeMaster: { ...data.settings.storeMaster, storeLocations: newLocs } } });
                        toast('✅ 店舗名を登録しました');
                      }
                    }
                  };

                  // 現チェーンの支店リスト
                  const chainBranches = (storeChain && storeChain !== '__custom__') ? (locs[storeChain] || []) : [];
                  // サジェスト（入力テキストで絞り込み）
                  const suggestions = branchInput
                    ? chainBranches.filter(b => b.includes(branchInput) && b !== branchInput)
                    : [];

                  // 表示用：現在のpurchaseStoreからチェーン部分を除いた支店名
                  const displayChainVal = storeChain === '__custom__'
                    ? '__custom__'
                    : (storeChain || (
                        storeList.find(c => form.purchaseStore === c || form.purchaseStore?.startsWith(c + ' ')) || ''
                      ));

                  return (
                    <>
                      {/* チェーン選択 */}
                      <select className="input-field"
                        value={storeCustomText !== null ? '__custom__' : (displayChainVal || '')}
                        onChange={e => handleChainSelect(e.target.value)}>
                        <option value="">選択してください</option>
                        {storeList.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="__custom__">＋ その他（手入力）</option>
                      </select>

                      {/* チェーン手入力 */}
                      {storeCustomText !== null && (
                        <div style={{marginTop:6,display:'flex',gap:6}}>
                          <input className="input-field" style={{flex:1,marginBottom:0}}
                            value={storeCustomText}
                            onChange={e => { setStoreCustomText(e.target.value); setF('purchaseStore', e.target.value); }}
                            placeholder="仕入れ先名を入力"/>
                          <button
                            onClick={() => {
                              const name = storeCustomText.trim();
                              if (!name) return;
                              const newMaster = {
                                ...master,
                                normalStores: [...new Set([...(master.normalStores||[]), name])].sort((a,b)=>a.localeCompare(b,'ja')),
                              };
                              setData({ ...data, settings: { ...data.settings, storeMaster: newMaster } });
                              setF('purchaseStore', name);
                              setStoreChain(name);
                              setStoreCustomText(null);
                              toast('✅ 店舗仕入れ先を追加しました');
                            }}
                            style={{padding:'10px 14px',border:'none',borderRadius:10,background:'var(--color-primary)',
                              color:'white',fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
                            追加
                          </button>
                        </div>
                      )}

                      {/* 支店選択UI（チェーンが選択済みかつ手入力モードでない） */}
                      {storeChain && storeChain !== '__custom__' && storeCustomText === null && (
                        <div style={{marginTop:8,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'10px 12px'}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                            店舗（支店）名
                          </div>

                          {/* 登録済み支店チップ */}
                          {chainBranches.length > 0 && (
                            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                              {chainBranches.map(b => (
                                <button key={b}
                                  onClick={() => selectBranch(b, false)}
                                  style={{
                                    padding:'5px 10px',border:'1.5px solid',fontSize:12,fontWeight:600,borderRadius:8,cursor:'pointer',
                                    whiteSpace:'nowrap',
                                    borderColor: branchInput === b ? 'var(--color-primary)' : '#cbd5e1',
                                    background: branchInput === b ? 'rgba(232,64,64,0.08)' : 'white',
                                    color: branchInput === b ? 'var(--color-primary)' : '#334155',
                                  }}>
                                  {b}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 支店テキスト入力 + サジェスト */}
                          <div style={{position:'relative'}}>
                            <input className="input-field" style={{marginBottom:0}}
                              value={branchInput}
                              onChange={e => {
                                setBranchInput(e.target.value);
                                setF('purchaseStore', storeChain + (e.target.value ? ' ' + e.target.value : ''));
                              }}
                              placeholder="例：八戸根城店（手入力または選択）"/>
                            {suggestions.length > 0 && (
                              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',
                                border:'1px solid #e2e8f0',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,0.1)',
                                zIndex:10,overflow:'hidden',marginTop:2}}>
                                {suggestions.map(s => (
                                  <button key={s}
                                    onClick={() => selectBranch(s, false)}
                                    style={{width:'100%',textAlign:'left',padding:'10px 12px',border:'none',
                                      background:'white',fontSize:13,cursor:'pointer',borderBottom:'1px solid #f1f5f9'}}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ＋ 追加ボタン（手入力して未登録の場合） */}
                          {branchInput.trim() && !chainBranches.includes(branchInput.trim()) && (
                            <button
                              onClick={() => selectBranch(branchInput.trim(), true)}
                              style={{marginTop:6,width:'100%',padding:'8px',border:'1.5px dashed var(--color-primary)',
                                borderRadius:8,background:'rgba(232,64,64,0.04)',color:'var(--color-primary)',
                                fontSize:12,fontWeight:700,cursor:'pointer'}}>
                              ＋「{branchInput.trim()}」を新しい店舗として登録
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
                {/* 許可証番号は設定画面で管理 */}
              </div>
            </div>

            {/* 費用内訳入力（税込・税抜対応） */}
            <div style={{background:'#fafafa',borderRadius:10,padding:12,marginBottom:12,border:'1px solid #ebebeb'}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'#333'}}>
                {purchaseType === 'store' ? '🏪 仕入れ費用（税込入力）' : '💻 仕入れ費用内訳（税込入力）'}
              </div>

              {/* 商品価格 ── まとめ仕入れ時は全商品一括入力、通常は単品入力 */}
              {editingItem?.bundleGroup ? (() => {
                const allGrp = data.inventory
                  .filter(i => i.bundleGroup === editingItem.bundleGroup)
                  .sort((a, b) => (a.createdAt||'').localeCompare(b.createdAt||''));
                const allGrpTotal = allGrp.reduce((s, gi) => {
                  const v = gi.id === editingItem.id
                    ? (Number(form.itemPriceTaxIn) || 0)
                    : (Number(bundleAllPrices[gi.id]) || gi.purchasePrice || 0);
                  return s + v;
                }, 0);
                return (
                  <div style={{marginBottom:10}}>
                    <label className="field-label">
                      📦 各商品の仕入れ金額（税込）
                      <span style={{color:'#888',fontWeight:400,marginLeft:6,fontSize:11}}>
                        まとめ仕入れ全{allGrp.length}点
                      </span>
                    </label>
                    {allGrp.map((gi, idx) => {
                      const isMe = gi.id === editingItem.id;
                      const val = isMe
                        ? form.itemPriceTaxIn
                        : (bundleAllPrices[gi.id] ?? String(gi.purchasePrice || 0));
                      return (
                        <div key={gi.id} style={{display:'flex',alignItems:'center',gap:6,marginBottom:7}}>
                          <span style={{fontSize:12, flexShrink:0, width:62, textAlign:'right',
                            fontWeight: isMe ? 700 : 400,
                            color: isMe ? 'var(--color-primary)' : '#555'}}>
                            {gi.bundleLabel ? `商品${gi.bundleLabel}` : `商品${idx+1}`}{isMe ? '✏️' : ''}
                          </span>
                          <input type="number" className="input-field" style={{flex:1,
                            border: isMe ? '2px solid var(--color-primary)' : '1.5px solid #e0e0e0',
                            borderRadius:10}}
                            value={val}
                            onChange={e => {
                              if (isMe) setF('itemPriceTaxIn', e.target.value);
                              else setBundleAllPrices(prev => ({...prev, [gi.id]: e.target.value}));
                            }}
                            placeholder="0"/>
                          <span style={{fontSize:12,color:'#666',flexShrink:0}}>円</span>
                        </div>
                      );
                    })}
                    <div style={{borderTop:'1.5px solid #e5e7eb',paddingTop:6,marginTop:2,
                      display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}>
                      <span style={{color:'#555',fontWeight:600}}>合計</span>
                      <span style={{fontWeight:800,color:'var(--color-primary)',fontSize:16}}>
                        ¥{allGrpTotal.toLocaleString()}
                        <span style={{fontSize:11,color:'#999',fontWeight:400}}> 税込</span>
                      </span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
                      <span style={{fontSize:12,color:'#666',flexShrink:0}}>税率（全商品共通）</span>
                      <select className="input-field" style={{flex:1,padding:'8px 4px',fontSize:13}}
                        value={form.itemTaxRate}
                        onChange={e => setF('itemTaxRate', Number(e.target.value))}>
                        <option value={10}>10%</option>
                        <option value={8}>8%</option>
                        <option value={0}>非課税</option>
                      </select>
                    </div>
                  </div>
                );
              })() : (
                <div style={{marginBottom:10}}>
                  <label className="field-label">
                    商品価格（税込）⚡
                    {form.itemPriceTaxIn ? (
                      <span style={{color:'#888',fontWeight:400,marginLeft:6,fontSize:11}}>
                        税抜 ¥{calcTaxEx(form.itemPriceTaxIn, form.itemTaxRate).toLocaleString()}
                      </span>
                    ) : null}
                  </label>
                  <div style={{display:'flex',gap:6}}>
                    <input type="number" className="input-field" style={{flex:1}}
                      value={form.itemPriceTaxIn}
                      onChange={e => setF('itemPriceTaxIn', e.target.value)}
                      placeholder="8000"/>
                    <select className="input-field" style={{width:76,padding:'12px 4px',fontSize:13}}
                      value={form.itemTaxRate}
                      onChange={e => setF('itemTaxRate', Number(e.target.value))}>
                      <option value={10}>10%</option>
                      <option value={8}>8%</option>
                      <option value={0}>非課税</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 電脳仕入れ: 送料 */}
              {purchaseType === 'online' && (
                <>
                  <div style={{marginBottom:8}}>
                    <label className="field-label">
                      送料（税込）
                      {form.shippingTaxIn ? (
                        <span style={{color:'#888',fontWeight:400,marginLeft:6,fontSize:11}}>
                          税抜 ¥{calcTaxEx(form.shippingTaxIn, form.shippingTaxRate).toLocaleString()}
                        </span>
                      ) : null}
                    </label>
                    <div style={{display:'flex',gap:6}}>
                      <input type="number" className="input-field" style={{flex:1}}
                        value={form.shippingTaxIn}
                        onChange={e => setF('shippingTaxIn', e.target.value)}
                        placeholder="800"/>
                      <select className="input-field" style={{width:76,padding:'12px 4px',fontSize:13}}
                        value={form.shippingTaxRate}
                        onChange={e => setF('shippingTaxRate', Number(e.target.value))}>
                        <option value={10}>10%</option>
                        <option value={8}>8%</option>
                        <option value={0}>非課税</option>
                      </select>
                    </div>
                  </div>

                  {!form.showOptionalFee ? (
                    <button type="button"
                      onClick={() => setF('showOptionalFee', true)}
                      style={{fontSize:12,color:'#888',background:'none',border:'none',cursor:'pointer',padding:'2px 0',textDecoration:'underline'}}>
                      ＋ 手数料を追加
                    </button>
                  ) : (
                    <div style={{marginBottom:8}}>
                      <label className="field-label">
                        手数料（税込）
                        {form.optionalFeeTaxIn ? (
                          <span style={{color:'#888',fontWeight:400,marginLeft:6,fontSize:11}}>
                            税抜 ¥{calcTaxEx(form.optionalFeeTaxIn, form.optionalTaxRate).toLocaleString()}
                          </span>
                        ) : null}
                      </label>
                      <div style={{display:'flex',gap:6}}>
                        <input type="number" className="input-field" style={{flex:1}}
                          value={form.optionalFeeTaxIn}
                          onChange={e => setF('optionalFeeTaxIn', e.target.value)}
                          placeholder="0"/>
                        <select className="input-field" style={{width:76,padding:'12px 4px',fontSize:13}}
                          value={form.optionalTaxRate}
                          onChange={e => setF('optionalTaxRate', Number(e.target.value))}>
                          <option value={10}>10%</option>
                          <option value={8}>8%</option>
                          <option value={0}>非課税</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── クーポン利用 ────────────────────── */}
              <div style={{marginBottom:8}}>
                <label className="field-label" style={{display:'flex',alignItems:'center',gap:6}}>
                  🏷️ クーポン利用
                  <span style={{fontSize:11,color:'#16a34a',fontWeight:400}}>値引き額（マイナス扱い）</span>
                </label>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <span style={{color:'#dc2626',fontWeight:700,fontSize:16,flexShrink:0}}>−</span>
                  <input type="number" className="input-field" style={{flex:1}}
                    value={form.couponTaxIn}
                    onChange={e => setF('couponTaxIn', e.target.value)}
                    placeholder="0（未使用は空欄）"/>
                  <span style={{fontSize:12,color:'#666',flexShrink:0}}>円</span>
                </div>
                <input className="input-field" style={{marginTop:6,fontSize:13}}
                  value={form.couponNote}
                  onChange={e => setF('couponNote', e.target.value)}
                  placeholder="クーポン名・メモ（例：1,000円OFFクーポン）"/>
              </div>

              {/* 合計表示 */}
              {totalPurchaseTaxIn > 0 && (
                <div style={{borderTop:'1px solid #e4e4e4',paddingTop:10,marginTop:8}}>
                  {couponAmount > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#dc2626',marginBottom:6}}>
                      <span>🏷️ クーポン値引き{form.couponNote ? `（${form.couponNote}）` : ''}</span>
                      <span style={{fontWeight:700}}>−¥{couponAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                    <span style={{fontWeight:700,fontSize:13,color:'#333'}}>仕入れ合計</span>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:700,fontSize:20,color:'var(--color-primary)'}}>¥{totalPurchaseTaxIn.toLocaleString()}<span style={{fontSize:12,color:'#999',fontWeight:400}}> 税込</span></div>
                      <div style={{fontSize:11,color:'#999'}}>税抜 ¥{totalPurchaseTaxEx.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── まとめ仕入れ合計の比率/均等リスケールパネル ── */}
            {editingItem?.bundleGroup && (() => {
              const grpItems = data.inventory
                .filter(i => i.bundleGroup === editingItem.bundleGroup)
                .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
              const grpTotal = grpItems.reduce((s, i) => s + (i.purchasePrice || 0), 0);
              return (
                <div style={{background:'#fffbeb',border:'1.5px solid #fcd34d',borderRadius:10,padding:12,marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:12,color:'#92400e',marginBottom:8}}>
                    🔄 まとめ合計から比率/均等で再配分
                  </div>
                  {/* 再計算方法選択 */}
                  <div style={{display:'flex',gap:0,marginBottom:8,borderRadius:8,overflow:'hidden',border:'1.5px solid #fcd34d'}}>
                    {[['ratio','比率を維持'],['equal','均等に分配']].map(([val, label], vi) => (
                      <button key={val} type="button"
                        onClick={() => setBundleRescaleMethod(val)}
                        style={{flex:1,padding:'8px 0',border:'none',
                          borderRight: vi === 0 ? '1px solid #fcd34d' : 'none',
                          background: bundleRescaleMethod === val ? '#d97706' : '#fef9c3',
                          color: bundleRescaleMethod === val ? 'white' : '#92400e',
                          fontWeight:700,fontSize:11,cursor:'pointer',touchAction:'manipulation'}}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* 新しい合計入力 */}
                  <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
                    <input type="number" className="input-field" style={{flex:1}}
                      value={bundleRescaleTotal}
                      onChange={e => setBundleRescaleTotal(e.target.value)}
                      placeholder={`現在の合計 ${grpTotal.toLocaleString()}円`}/>
                    <span style={{fontSize:12,color:'#666',flexShrink:0}}>円</span>
                  </div>
                  <button type="button"
                    onClick={handleBundleRescale}
                    style={{width:'100%',padding:'9px 0',borderRadius:8,border:'none',
                      background: bundleRescaleTotal ? '#d97706' : '#e5e7eb',
                      color: bundleRescaleTotal ? 'white' : '#9ca3af',
                      fontWeight:700,fontSize:13,
                      cursor: bundleRescaleTotal ? 'pointer' : 'default',
                      touchAction:'manipulation'}}>
                    全{grpItems.length}点を再配分する
                  </button>
                </div>
              );
            })()}

            <div style={{marginBottom:12}}>
              <label className="field-label">決済方法</label>
              <select className="input-field" value={form.paymentMethod} onChange={e => setF('paymentMethod', e.target.value)}>
                {['現金','クレカ','PayPay','メルペイ','その他'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                  <label className="field-label" style={{margin:0}}>出品日</label>
                  <button type="button"
                    onClick={() => setF('listDate', form.listDate === '' ? today() : '')}
                    style={{fontSize:11,padding:'2px 8px',borderRadius:8,border:'1.5px solid',
                      borderColor: form.listDate === '' ? 'var(--color-primary)' : '#d0d0d0',
                      background: form.listDate === '' ? '#fff0f0' : 'white',
                      color: form.listDate === '' ? 'var(--color-primary)' : '#888',
                      fontWeight:700,cursor:'pointer',lineHeight:'1.4'}}>
                    未定
                  </button>
                </div>
                {form.listDate === '' ? (
                  <div style={{padding:'8px 10px',background:'#fff0f0',borderRadius:10,
                    border:'1.5px solid var(--color-primary)',fontSize:12,
                    color:'var(--color-primary)',fontWeight:700,textAlign:'center'}}>
                    未定
                  </div>
                ) : (
                  <input type="date" className="input-field" value={form.listDate}
                    onChange={e => setF('listDate', e.target.value)}/>
                )}
              </div>
              <div>
                <label className="field-label">見込み売上 (円)</label>
                <input type="number" className="input-field" value={form.listPrice}
                  onChange={e => setF('listPrice', e.target.value)} placeholder="15000"/>
              </div>
            </div>

            {/* 見込み利益 */}
            {form.listPrice && form.purchasePrice && (
              <div style={{background: profit >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${profit >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius:10,padding:12,marginBottom:12}}>
                <div style={{fontSize:12,color:'#666',marginBottom:4}}>見込み利益（手数料{(feeRate*100).toFixed(1)}% + 送料概算¥{CONFIG.ESTIMATED_SHIPPING}）</div>
                <div style={{fontSize:22,fontWeight:700,color: profit >= 0 ? '#16a34a' : '#dc2626'}}>
                  ¥{formatMoney(profit)}
                </div>
              </div>
            )}

            {/* 管理番号 */}
            {mgmtNo && (
              <div style={{background:'#f8f8f8',borderRadius:10,padding:12,marginBottom:12}}>
                <div style={{fontSize:12,color:'#666',marginBottom:4}}>管理番号</div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{fontFamily:'monospace',fontSize:15,fontWeight:600,flex:1}}>{mgmtNo}</div>
                  <button onClick={() => { copyToClipboard(mgmtNo).then(ok => toast(ok ? 'コピーしました' : 'コピー失敗：手動でコピーしてください')); }}
                    style={{background:'var(--color-primary)',color:'white',border:'none',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer'}}>コピー</button>
                </div>
              </div>
            )}

            {/* 商品説明生成 */}
            <button className="btn-secondary" style={{width:'100%',marginBottom:8}}
              onClick={generateDescription}>📝 商品説明文を生成</button>

            {showDesc && (
              <div style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <label className="field-label" style={{margin:0}}>商品説明文</label>
                  <button onClick={() => { copyToClipboard(generatedDesc).then(ok => toast(ok ? 'コピーしました' : 'コピー失敗：手動でコピーしてください')); }}
                    style={{background:'var(--color-primary)',color:'white',border:'none',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer'}}>全文コピー</button>
                </div>
                <textarea className="input-field" value={generatedDesc}
                  onChange={e => setGeneratedDesc(e.target.value)}
                  style={{minHeight:200,fontFamily:'monospace',fontSize:12}}/>
              </div>
            )}

            {/* ── まとめ仕入れ（分割登録） ── */}
            <div style={{marginTop:16,paddingTop:16,borderTop:'1.5px dashed #e5e7eb'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom: bundlePurchase ? 12 : 0}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>📦 まとめ仕入れ</div>
                  <div style={{fontSize:11,color:'#999',marginTop:1}}>複数商品を1つの仕入れから分割登録</div>
                </div>
                <button onClick={() => setBundlePurchase(v => !v)}
                  style={{padding:'7px 16px',borderRadius:99,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,
                    background: bundlePurchase ? '#1e293b' : '#f3f4f6',
                    color: bundlePurchase ? 'white' : '#555',
                    WebkitTapHighlightColor:'transparent',transition:'all 0.15s'}}>
                  {bundlePurchase ? 'ON' : 'OFF'}
                </button>
              </div>

              {bundlePurchase && (() => {
                const totalBudget = totalPurchaseTaxIn || 0;
                const allocated = bundleItems.reduce((s, bi) => s + (Number(bi.purchasePrice) || 0), 0);
                const remaining = totalBudget - allocated;

                const applyEqual = () => {
                  const n = bundleItems.length;
                  const base = Math.floor(totalBudget / n);
                  const rem  = totalBudget - base * n;
                  setBundleItems(prev => prev.map((bi, i) => ({
                    ...bi, purchasePrice: String(i === n-1 ? base + rem : base)
                  })));
                };
                const setBundleCount = (n) => {
                  const newItems = initBundleItems(n);
                  if (bundleSplitMethod === 'equal') {
                    const base = Math.floor(totalBudget / n);
                    const rem  = totalBudget - base * n;
                    setBundleItems(newItems.map((bi, i) => ({ ...bi, purchasePrice: String(i === n-1 ? base + rem : base) })));
                  } else {
                    setBundleItems(newItems);
                  }
                };

                return (
                  <>
                    {/* 分割数 */}
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:11,color:'#888',fontWeight:700,marginBottom:6}}>分割数</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {[2,3,4].map(n => (
                          <button key={n} onClick={() => setBundleCount(n)}
                            style={{padding:'6px 16px',borderRadius:99,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                              background: bundleItems.length===n ? '#1e293b' : '#f3f4f6',
                              color: bundleItems.length===n ? 'white' : '#555',
                              WebkitTapHighlightColor:'transparent'}}>
                            {n}件
                          </button>
                        ))}
                        <button onClick={() => setBundleCount(bundleItems.length + 1)}
                          style={{padding:'6px 14px',borderRadius:99,border:'1.5px dashed #d1d5db',background:'white',
                            fontSize:13,cursor:'pointer',color:'#666',fontWeight:700}}>＋</button>
                        {bundleItems.length > 2 && (
                          <button onClick={() => setBundleCount(bundleItems.length - 1)}
                            style={{padding:'6px 14px',borderRadius:99,border:'1.5px dashed #fca5a5',background:'white',
                              fontSize:13,cursor:'pointer',color:'#dc2626',fontWeight:700}}>－</button>
                        )}
                      </div>
                    </div>

                    {/* 分割方法 */}
                    <div style={{display:'flex',gap:6,marginBottom:12}}>
                      {[['equal','均等分割'],['manual','手動分割']].map(([m,l]) => (
                        <button key={m} onClick={() => { setBundleSplitMethod(m); if (m==='equal') applyEqual(); }}
                          style={{flex:1,padding:'7px 0',borderRadius:99,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                            background: bundleSplitMethod===m ? '#E84040' : '#f3f4f6',
                            color: bundleSplitMethod===m ? 'white' : '#777',
                            WebkitTapHighlightColor:'transparent'}}>
                          {l}
                        </button>
                      ))}
                    </div>

                    {/* 各アイテム入力 */}
                    {bundleItems.map((bi, idx) => {
                      const isExisting = bi.mode === 'existing';
                      const selectedInv = isExisting && bi.existingItemId
                        ? data.inventory.find(i => i.id === bi.existingItemId) : null;
                      return (
                        <div key={bi.id} style={{background: isExisting ? '#eff6ff' : '#f8fafc',
                          borderRadius:10,padding:'10px 12px',marginBottom:8,
                          border:`1px solid ${isExisting ? '#bfdbfe' : '#e2e8f0'}`}}>

                          {/* ラベル + モード切り替えボタン */}
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                            <span style={{fontWeight:800,fontSize:13,color:'white',
                              background: isExisting ? '#2563eb' : '#475569',
                              borderRadius:99,padding:'2px 10px',flexShrink:0}}>{bi.label}</span>
                            <div style={{display:'flex',flex:1,gap:4}}>
                              {[['new','＋ 新規登録'],['existing','📦 既存商品']].map(([m,l]) => (
                                <button key={m}
                                  onClick={() => setBundleItems(prev => prev.map((b,i) =>
                                    i===idx ? {...b, mode:m, existingItemId:'', existingItemQuery:''} : b))}
                                  style={{flex:1,padding:'5px 0',borderRadius:8,border:'none',cursor:'pointer',
                                    fontSize:11,fontWeight:700,WebkitTapHighlightColor:'transparent',
                                    background: bi.mode===m ? (m==='existing' ? '#2563eb' : '#1e293b') : '#e2e8f0',
                                    color: bi.mode===m ? 'white' : '#777'}}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 新規登録モード：商品名入力 */}
                          {!isExisting && (
                            <input value={bi.productName}
                              placeholder={`${form.productName || '商品名'} [${bi.label}]`}
                              onChange={e => setBundleItems(prev => prev.map((b,i) => i===idx ? {...b,productName:e.target.value} : b))}
                              style={{width:'100%',padding:'6px 8px',borderRadius:8,border:'1px solid #e2e8f0',
                                fontSize:12,background:'white',marginBottom:8,boxSizing:'border-box'}}/>
                          )}

                          {/* 既存商品モード：選択済み or 検索 */}
                          {isExisting && (
                            <div style={{marginBottom:8}}>
                              {selectedInv ? (
                                /* 選択済み：商品カード + 解除ボタン */
                                <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                                  background:'white',borderRadius:8,border:'1px solid #93c5fd'}}>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:12,fontWeight:700,overflow:'hidden',
                                      textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#1e40af'}}>
                                      ✔ {selectedInv.brand} {selectedInv.productName || '商品'}
                                    </div>
                                    <div style={{fontSize:10,color:'#888',marginTop:2,display:'flex',gap:8}}>
                                      {selectedInv.purchaseDate
                                        ? <span>仕入れ日：{selectedInv.purchaseDate}</span>
                                        : <span style={{color:'#f59e0b',fontWeight:700}}>仕入れ日未入力</span>}
                                      {(data.sales||[]).some(s=>s.inventoryId===selectedInv.id) &&
                                        <span style={{color:'#2563eb',fontWeight:700}}>売上登録済</span>}
                                    </div>
                                  </div>
                                  <button onClick={() => setBundleItems(prev => prev.map((b,i) =>
                                    i===idx ? {...b, existingItemId:'', existingItemQuery:''} : b))}
                                    style={{background:'none',border:'none',color:'#9ca3af',fontSize:18,
                                      cursor:'pointer',padding:'0 4px',lineHeight:1}}>✕</button>
                                </div>
                              ) : (
                                /* 未選択：インライン検索 */
                                <div>
                                  <input value={bi.existingItemQuery || ''}
                                    placeholder="商品名・ブランドで検索..."
                                    onChange={e => setBundleItems(prev => prev.map((b,i) =>
                                      i===idx ? {...b, existingItemQuery:e.target.value} : b))}
                                    style={{width:'100%',padding:'7px 10px',borderRadius:8,
                                      border:'1px solid #93c5fd',fontSize:12,background:'white',
                                      boxSizing:'border-box'}}/>
                                  {(bi.existingItemQuery||'').trim().length >= 1 && (() => {
                                    const q = (bi.existingItemQuery||'').toLowerCase();
                                    const usedIds = new Set(bundleItems
                                      .filter((b,j) => j!==idx && b.existingItemId)
                                      .map(b => b.existingItemId));
                                    const candidates = data.inventory.filter(inv =>
                                      !usedIds.has(inv.id) &&
                                      ((inv.brand||'').toLowerCase().includes(q) ||
                                       (inv.productName||'').toLowerCase().includes(q) ||
                                       (inv.modelNumber||'').toLowerCase().includes(q))
                                    ).slice(0, 8);
                                    return (
                                      <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,
                                        marginTop:4,maxHeight:200,overflowY:'auto',
                                        boxShadow:'0 4px 16px rgba(0,0,0,0.12)',zIndex:10,position:'relative'}}>
                                        {candidates.length === 0 ? (
                                          <div style={{padding:'10px 12px',fontSize:12,color:'#999'}}>
                                            一致する商品が見つかりません
                                          </div>
                                        ) : candidates.map(inv => {
                                          const hasSale = (data.sales||[]).some(s=>s.inventoryId===inv.id);
                                          return (
                                            <button key={inv.id}
                                              onClick={() => setBundleItems(prev => prev.map((b,i) =>
                                                i===idx ? {...b, existingItemId:inv.id, existingItemQuery:''} : b))}
                                              style={{width:'100%',padding:'9px 12px',background:'none',border:'none',
                                                borderBottom:'1px solid #f3f4f6',cursor:'pointer',textAlign:'left',
                                                WebkitTapHighlightColor:'transparent'}}>
                                              <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>
                                                {inv.brand} {inv.productName}
                                              </div>
                                              <div style={{fontSize:10,color:'#888',display:'flex',gap:8,marginTop:2,flexWrap:'wrap'}}>
                                                <span>¥{(inv.purchasePrice||0).toLocaleString()}</span>
                                                {inv.purchaseDate && <span>{inv.purchaseDate}</span>}
                                                {hasSale &&
                                                  <span style={{color:'#2563eb',fontWeight:700,
                                                    background:'#eff6ff',borderRadius:4,padding:'0 4px'}}>
                                                    売上登録済
                                                  </span>}
                                                {!inv.purchaseDate &&
                                                  <span style={{color:'#f59e0b',fontWeight:700,
                                                    background:'#fffbeb',borderRadius:4,padding:'0 4px'}}>
                                                    仕入れ日未入力
                                                  </span>}
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 仕入れ値（共通） */}
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:12,color:'#666',flexShrink:0}}>仕入れ値</span>
                            <input type="number" value={bi.purchasePrice} placeholder="0"
                              onChange={e => {
                                const newVal = e.target.value;
                                setBundleItems(prev => {
                                  const updated = prev.map((b, i) => i === idx ? {...b, purchasePrice: newVal} : b);
                                  // ★ 手動分割モードで最後以外の商品を変更 → 最後の商品に残額を自動セット
                                  if (bundleSplitMethod === 'manual' && idx < prev.length - 1 && totalBudget > 0) {
                                    const sumOthers = updated.slice(0, -1).reduce((s, b) => s + (Number(b.purchasePrice) || 0), 0);
                                    const remaining = Math.max(0, totalBudget - sumOthers);
                                    const lastIdx = updated.length - 1;
                                    return updated.map((b, i) => i === lastIdx ? {...b, purchasePrice: String(remaining)} : b);
                                  }
                                  return updated;
                                });
                              }}
                              style={{flex:1,padding:'6px 8px',borderRadius:8,border:'1px solid #e2e8f0',
                                fontSize:14,fontWeight:700,background:'white',textAlign:'right'}}/>
                            <span style={{fontSize:12,color:'#666'}}>円</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* 配分サマリー */}
                    <div style={{background: Math.abs(remaining)<=1 ? '#f0fdf4' : '#fef3c7',
                      border:`1px solid ${Math.abs(remaining)<=1 ? '#bbf7d0' : '#fcd34d'}`,
                      borderRadius:8,padding:'8px 12px',fontSize:12,
                      display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{color:'#555'}}>
                        配分済：<b>¥{allocated.toLocaleString()}</b> / 合計：¥{totalBudget.toLocaleString()}
                      </span>
                      <span style={{fontWeight:700, color: Math.abs(remaining)<=1 ? '#16a34a' : '#d97706'}}>
                        {Math.abs(remaining)<=1 ? '✅ 一致' : `差額：¥${remaining.toLocaleString()}`}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        )}
      </div>

      {/* 保存ボタンバー用スペーサー（fixedレイアウトでコンテンツが隠れるのを防止） */}
      {step >= 3 && <div style={{height:'200px'}} aria-hidden="true" />}

      {/* 保存ボタン：ReactDOM.createPortal で body 直下にレンダリング
          ★ kbOffset: iOS Safari visualViewport API でキーボード高さを追跡し座標ズレを根本解決
          ★ zIndex:9000: すべてのオーバーレイ（modal-overlay:200, 各種modal:300/1000）より上 */}
      {step >= 3 && ReactDOM.createPortal(
        <div style={{
          position:'fixed',
          bottom: kbOffset > 0 ? `${kbOffset + 4}px` : 'calc(64px + env(safe-area-inset-bottom))',
          left:0,right:0,
          background:'white',padding:'10px 16px 12px',borderTop:'1px solid #f0f0f0',
          zIndex:9000,boxShadow:'0 -4px 12px rgba(0,0,0,0.08)',
          touchAction:'manipulation',
          // ★ iOSコンポジットレイヤー強制生成: ボタンバーを独立レイヤーに昇格させ
          //    ページの再描画ループからの影響を切り離す（タッチ不能バグの根本対策）
          WebkitTransform:'translateZ(0)',transform:'translateZ(0)',
          WebkitBackfaceVisibility:'hidden',backfaceVisibility:'hidden',
          willChange:'bottom'}}>
          {/* 出品ステータス選択 */}
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            {[
              ['unlisted', '📦 未出品', '#E84040'],
              ['listed',   '✅ 出品済み', '#2563eb'],
            ].map(([mode, label, color]) => (
              <button key={mode} type="button"
                onClick={() => setRegistrationMode(mode)}
                style={{flex:1,padding:'9px 8px',borderRadius:10,border:'2px solid',
                  borderColor: registrationMode === mode ? color : '#e0e0e0',
                  background: registrationMode === mode ? (mode === 'listed' ? '#eff6ff' : '#fff0f0') : 'white',
                  fontSize:13,fontWeight:700,cursor:'pointer',
                  color: registrationMode === mode ? color : '#888',
                  touchAction:'manipulation'}}>
                {label}
              </button>
            ))}
          </div>
          {/* バンドルモード確認パネル */}
          {bundlePurchase && !editingItem && (
            <div style={{background:'#eff6ff',border:'1px solid #93c5fd',borderRadius:8,
              padding:'7px 12px',marginBottom:8,fontSize:12,color:'#1e40af',fontWeight:700}}>
              📦 バンドルモード ON — {bundleItems.length}件分割
              {bundleItems.map((bi,i) => (
                <span key={i} style={{marginLeft:8,fontSize:11,fontWeight:600,
                  color: bi.purchasePrice && bi.purchasePrice !== '0' ? '#1e40af' : '#ef4444'}}>
                  {bi.label}:¥{bi.purchasePrice || '未入力'}
                </span>
              ))}
            </div>
          )}
          {/* インラインバリデーションエラー */}
          {formError && (
            <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,
              padding:'10px 14px',marginBottom:10,color:'#dc2626',fontWeight:600,fontSize:13,
              display:'flex',alignItems:'flex-start',gap:6,whiteSpace:'pre-line'}}>
              ⚠️ {formError}
            </div>
          )}
          <button className="btn-primary"
            style={{width:'100%',padding:16,fontSize:17,opacity:saving?0.75:1,transition:'opacity 0.15s',touchAction:'manipulation'}}
            onClick={handleSave}
            disabled={saving}>
            {saving ? '💾 保存中...' : editingItem ? '💾 更新保存する' : bundlePurchase ? `📦 まとめ仕入れ ${bundleItems.length}件を登録する` : '💾 仕入れを登録する'}
          </button>
          <button
            onClick={handleSaveAndSell}
            disabled={saving}
            style={{width:'100%',marginTop:8,padding:14,fontSize:15,fontWeight:700,
              border:'none',borderRadius:12,cursor:'pointer',touchAction:'manipulation',
              background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',
              display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              opacity:saving?0.75:1,transition:'opacity 0.15s'}}>
            💰 {editingItem ? '保存して' : '登録して'}そのまま売上登録する
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

// ============================================================
// サムネイル表示コンポーネント（IndexedDB対応）
// ============================================================
const ItemThumbnail = ({ thumbId, thumbDataUrl, size = 70, fallback = '📦' }) => {
  const [url, setUrl] = React.useState(thumbDataUrl || null);
  React.useEffect(() => {
    // base64が既にあればIndexedDBにアクセスしない
    if (thumbDataUrl) { setUrl(thumbDataUrl); return; }
    if (!thumbId) return;
    let objectUrl = null;
    (async () => {
      try {
        const blob = await getPhoto(thumbId);
        if (blob) {
          objectUrl = blobToURL(blob);
          setUrl(objectUrl);
        }
      } catch(e) { /* ignore */ }
    })();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [thumbId, thumbDataUrl]);

  if (url) {
    return <img src={url} alt="" style={{width:size,height:size,borderRadius:10,objectFit:'cover',flexShrink:0}}/>;
  }
  return <div style={{width:size,height:size,borderRadius:10,background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.4,flexShrink:0}}>{fallback}</div>;
};

// 詳細モーダル用の写真スライド（フル画像をIndexedDBから取得）
const PhotoSlide = ({ photoRef }) => {
  const [url, setUrl] = React.useState(photoRef?.thumbDataUrl || null);
  React.useEffect(() => {
    if (!photoRef?.id) return;
    let objectUrl = null;
    (async () => {
      try {
        const blob = await getPhoto(photoRef.id);
        if (blob) {
          objectUrl = blobToURL(blob);
          setUrl(objectUrl);
        } else if (photoRef.thumbDataUrl) {
          // IndexedDBになければbase64サムネイルで代替
          setUrl(photoRef.thumbDataUrl);
        }
      } catch(e) {
        if (photoRef.thumbDataUrl) setUrl(photoRef.thumbDataUrl);
      }
    })();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoRef?.id]);

  if (!url) return null;
  return <img src={url} alt="" style={{height:150,borderRadius:10,objectFit:'cover',flexShrink:0}}/>;
};

// ============================================================
// 在庫一覧タブ
// ============================================================
const InventoryTab = () => {
  const { data, setData, setTab, setEditingItem, setPendingSaleItemId, setPendingReturnTab,
          pendingInventoryFilter, setPendingInventoryFilter,
          pendingInventoryScrollY, setPendingInventoryScrollY } = React.useContext(AppContext);
  const toast = useToast();
  // ★ 編集から戻った時: useState の初期化関数で正しいタブを「最初から」設定する
  // useEffect で後から setFilter() すると「未出品で描画 → 出品中に切り替え」という2段階になり
  // その間にスクロールが実行されて「未出品の下の方に飛ぶ」バグが起きる。
  // useState の初期化関数はマウント時に1回だけ実行され、最初のレンダリングから正しいタブが表示される。
  const [filter, setFilter] = React.useState(() => pendingInventoryFilter || 'unlisted');
  const [sort, setSort]     = React.useState('old');  // 古い順がデフォルト（滞留把握）
  const [search, setSearch] = React.useState('');
  const [storeFilter, setStoreFilter] = React.useState(''); // 仕入れ先で絞り込み
  const [selected, setSelected] = React.useState(null);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [checkedIds, setCheckedIds] = React.useState(new Set());
  const [bulkConfirm, setBulkConfirm] = React.useState(false);

  // ★ マウント時: pending値をクリア & スクロール位置を復元
  // filter は useState 初期化で既に正しい値になっているため、setFilter は不要
  React.useEffect(() => {
    // pending値をクリア（次回のマウント時に誤って復元されないようにする）
    if (pendingInventoryFilter) setPendingInventoryFilter(null);
    // スクロール位置を復元（初回レンダリング完了後に実行）
    if (pendingInventoryScrollY !== null && pendingInventoryScrollY > 0) {
      const y = pendingInventoryScrollY;
      setPendingInventoryScrollY(null);
      setTimeout(() => {
        window.scrollTo({ top: y, behavior: 'instant' });
      }, 100);
    }
  }, []); // マウント時のみ実行

  // 仕入れからの経過日数
  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  };

  // アラートレベル（未出品・出品中のみ）
  const alertLevel = (item) => {
    if (item.status === 'sold') return null;
    // 出品日（listDate）を優先。未設定の場合のみ仕入れ日（purchaseDate）で代替
    const baseDate = item.listDate || item.purchaseDate;
    const d = daysSince(baseDate);
    if (d === null) return null;
    if (d >= 60) return { level: 'danger', label: '値下げ推奨', days: d };
    if (d >= 30) return { level: 'warn',   label: '値下げ検討', days: d };
    return { level: 'ok', days: d };
  };

  // 表示・フィルター用に正規化した仕入れ先を返す（データ未修正でも正規名で扱う）
  const normalizedStore = (item) => normalizeStoreName(item.purchaseStore) || '';

  const filtered = data.inventory.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (storeFilter && normalizedStore(item) !== storeFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (item.productName||'').toLowerCase().includes(q) ||
             (item.brand||'').toLowerCase().includes(q) ||
             (item.memo||'').toLowerCase().includes(q);
    }
    return true;
  });

  // 仕入れ先サマリー（storeFilter選択時に表示）※正規化名で照合
  const storeFilteredAll = storeFilter
    ? data.inventory.filter(i => normalizedStore(i) === storeFilter) : [];
  const storeTotal = storeFilteredAll.reduce((s, i) => s + (i.purchasePrice||0), 0);
  const storeSold  = storeFilteredAll.filter(i => i.status === 'sold');
  const storeSoldProfit = storeSold.reduce((s, i) => {
    const sale = data.sales?.find(sl => sl.inventoryId === i.id);
    return s + (sale?.profit || 0);
  }, 0);

  // 仕入れ先ドロップダウン用（正規化＋重複排除＋あいうえお順）
  const storeOptions = [...new Set(
    data.inventory.map(i => normalizedStore(i)).filter(Boolean)
  )].sort((a,b) => a.localeCompare(b, 'ja'));

  // 並び替え
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'new')    return (b.purchaseDate||'') > (a.purchaseDate||'') ? 1 : -1;
    if (sort === 'old')    return (a.purchaseDate||'') > (b.purchaseDate||'') ? 1 : -1;
    if (sort === 'profit') {
      const pa = (a.listPrice||0) - (a.purchasePrice||0);
      const pb = (b.listPrice||0) - (b.purchasePrice||0);
      return pb - pa;
    }
    return 0;
  });

  const statusLabel = { unlisted: '未出品', listed: '出品中', sold: '売却済' };
  const statusClass = { unlisted: 'tag-unlisted', listed: 'tag-active', sold: 'tag-sold' };

  const markAsSold = (item) => {
    const updated = data.inventory.map(i => i.id === item.id ? { ...i, status: 'sold' } : i);
    setData({ ...data, inventory: updated });
    setSelected(null);
    // 売上記録タブへ自動遷移（商品を事前選択）
    setPendingSaleItemId(item.id);
    setTab('sales');
    toast('✅ 売却済みに変更しました。売上情報を入力してください。');
  };

  const markAsListed = (item) => {
    const updated = data.inventory.map(i => i.id === item.id ? { ...i, status: 'listed' } : i);
    setData({ ...data, inventory: updated });
    setSelected(null);
    toast('✅ 出品中に変更しました');
  };

  const markAsUnlisted = (item) => {
    const updated = data.inventory.map(i => i.id === item.id ? { ...i, status: 'unlisted' } : i);
    setData({ ...data, inventory: updated });
    setSelected(null);
    toast('✅ 未出品に戻しました');
  };

  const deleteItem = (item) => {
    if (!confirm('この商品を削除しますか？')) return;
    const now = new Date().toISOString();
    // ★ トゥームストーン: 削除したIDを記録し、クラウドとのマージで復活しないようにする
    const newDeletedIds = { ...(data.settings?._deletedIds || {}), [item.id]: now };
    (data.sales||[]).filter(s => s.inventoryId === item.id).forEach(s => { newDeletedIds[s.id] = now; });
    const newInv   = data.inventory.filter(i => i.id !== item.id);
    const newSales = (data.sales||[]).filter(s => s.inventoryId !== item.id);
    setData({ ...data, inventory: newInv, sales: newSales, settings: { ...data.settings, _deletedIds: newDeletedIds } });
    setSelected(null);
    toast('🗑️ 削除しました');
  };

  const toggleCheck = (id, e) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === sorted.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(sorted.map(i => i.id)));
    }
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setCheckedIds(new Set());
    setBulkConfirm(false);
  };

  const executeBulkDelete = () => {
    const now = new Date().toISOString();
    // ★ トゥームストーン: 削除した全IDを記録し、クラウドとのマージで復活しないようにする
    const newDeletedIds = { ...(data.settings?._deletedIds || {}) };
    checkedIds.forEach(id => { newDeletedIds[id] = now; });
    (data.sales||[]).filter(s => checkedIds.has(s.inventoryId)).forEach(s => { newDeletedIds[s.id] = now; });
    const newInv   = data.inventory.filter(i => !checkedIds.has(i.id));
    const newSales = (data.sales||[]).filter(s => !checkedIds.has(s.inventoryId));
    setData({ ...data, inventory: newInv, sales: newSales, settings: { ...data.settings, _deletedIds: newDeletedIds } });
    const cnt = checkedIds.size;
    exitBulkMode();
    toast(`🗑️ ${cnt}件を削除しました`);
  };

  const allChecked  = sorted.length > 0 && checkedIds.size === sorted.length;
  const someChecked = checkedIds.size > 0 && checkedIds.size < sorted.length;

  return (
    <div className="fade-in">
      <div className="header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,paddingRight:12}}>
        <h1 style={{margin:0,fontSize:18,fontWeight:800}}>📋 在庫一覧</h1>
        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          {!bulkMode && (
            <button onClick={() => setTab('purchase')}
              style={{background:'white',color:'var(--color-primary)',border:'2px solid var(--color-primary)',
                borderRadius:10,padding:'7px 14px',fontSize:13,fontWeight:700,cursor:'pointer',
                whiteSpace:'nowrap',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}}>
              ＋ 新規登録
            </button>
          )}
          {!bulkMode ? (
            <button onClick={() => setBulkMode(true)}
              style={{background:'#f3f4f6',border:'none',borderRadius:8,padding:'7px 10px',fontSize:12,fontWeight:600,color:'#555',cursor:'pointer',WebkitTapHighlightColor:'transparent',whiteSpace:'nowrap'}}>
              まとめて削除
            </button>
          ) : (
            <button onClick={exitBulkMode}
              style={{background:'#f3f4f6',border:'none',borderRadius:8,padding:'7px 10px',fontSize:12,fontWeight:600,color:'#555',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
              キャンセル
            </button>
          )}
        </div>
      </div>

      {/* 検索バー */}
      <div style={{padding:'10px 16px',background:'white',borderBottom:'1px solid #f0f0f0'}}>
        <div style={{position:'relative',display:'flex',alignItems:'center'}}>
          <span style={{position:'absolute',left:10,fontSize:15,color:'#aaa',pointerEvents:'none'}}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="商品名・ブランド名で検索..."
            style={{width:'100%',padding:'9px 36px 9px 34px',borderRadius:10,border:'1.5px solid #e5e7eb',
              fontSize:14,outline:'none',background:'#f9fafb',boxSizing:'border-box',
              WebkitAppearance:'none'}}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{position:'absolute',right:8,background:'none',border:'none',cursor:'pointer',
                fontSize:16,color:'#aaa',padding:'2px 4px',lineHeight:1}}>×</button>
          )}
        </div>
      </div>

      {/* フィルター */}
      <div style={{display:'flex',gap:8,padding:'10px 16px',background:'white',borderBottom:'1px solid #f0f0f0',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
        {[['unlisted','未出品','#6b7280'],['listed','出品中','#1e40af'],['sold','売却済','#5b21b6'],['all','すべて','#6b7280']].map(([v,l,c]) => {
          const base = v === 'all' ? data.inventory : data.inventory.filter(i => i.status === v);
          const cnt = search.trim()
            ? base.filter(i => {
                const q = search.trim().toLowerCase();
                return (i.productName||'').toLowerCase().includes(q) ||
                       (i.brand||'').toLowerCase().includes(q) ||
                       (i.memo||'').toLowerCase().includes(q);
              }).length
            : base.length;
          const active = filter === v;
          return (
            <button key={v} onClick={() => { setFilter(v); setCheckedIds(new Set()); }}
              style={{flexShrink:0,padding:'7px 14px',borderRadius:99,border:'none',cursor:'pointer',
                fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:5,
                background: active ? 'var(--color-primary)' : '#f3f4f6',
                color: active ? 'white' : '#666',
                boxShadow: active ? '0 2px 8px rgba(232,64,64,0.25)' : 'none',
                transition:'all 0.2s', WebkitTapHighlightColor:'transparent'}}>
              {l}
              <span style={{
                background: active ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                color: active ? 'white' : '#888',
                borderRadius:99, padding:'1px 7px', fontSize:11, fontWeight:700}}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* 並び替えバー */}
      {!bulkMode && (
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
          <span style={{fontSize:11,color:'#aaa',fontWeight:600,flexShrink:0}}>並び替え</span>
          {[['old','古い順'],['new','新しい順'],['profit','利益が高い順']].map(([v,l]) => (
            <button key={v} onClick={() => setSort(v)}
              style={{padding:'4px 10px',borderRadius:99,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,
                background: sort===v ? '#1e293b' : '#f3f4f6',
                color: sort===v ? 'white' : '#777',
                WebkitTapHighlightColor:'transparent',transition:'all 0.15s'}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ストアで絞り込み */}
      {!bulkMode && storeOptions.length > 0 && (
        <div style={{padding:'8px 16px',background:'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,color:'#aaa',fontWeight:600,flexShrink:0}}>仕入れ先</span>
            <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
              style={{flex:1,padding:'5px 8px',borderRadius:8,border:'1.5px solid #e0e0e0',
                fontSize:12,background:'white',color:'#333'}}>
              <option value="">すべての仕入れ先</option>
              {storeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {storeFilter && (
              <button onClick={() => setStoreFilter('')}
                style={{background:'none',border:'none',color:'#aaa',fontSize:16,cursor:'pointer',padding:'0 4px'}}>×</button>
            )}
          </div>
          {storeFilter && (
            <div style={{display:'flex',gap:12,marginTop:6,fontSize:11,color:'#666'}}>
              <span>全{storeFilteredAll.length}件</span>
              <span>仕入合計 ¥{storeTotal.toLocaleString()}</span>
              <span>売却済 {storeSold.length}件</span>
              <span style={{color: storeSoldProfit>=0?'#16a34a':'#dc2626',fontWeight:700}}>
                利益 ¥{storeSoldProfit.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 一括選択バー（まとめて削除モード時） */}
      {bulkMode && filtered.length > 0 && (
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:'#fff8f8',borderBottom:'2px solid #fecaca'}}>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none',flex:1}}>
            <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked; }}
              onChange={toggleAll}
              style={{width:20,height:20,cursor:'pointer',accentColor:'var(--color-primary)'}} />
            <span style={{fontSize:14,fontWeight:600,color:'#333'}}>
              {checkedIds.size > 0 ? `${checkedIds.size}件を選択中` : 'すべて選択'}
            </span>
          </label>
          <button
            disabled={checkedIds.size === 0}
            onClick={() => setBulkConfirm(true)}
            style={{padding:'8px 18px',borderRadius:10,border:'none',
              background: checkedIds.size > 0 ? '#dc2626' : '#e5e7eb',
              color: checkedIds.size > 0 ? 'white' : '#aaa',
              fontWeight:700,fontSize:14,cursor: checkedIds.size > 0 ? 'pointer' : 'default',
              WebkitTapHighlightColor:'transparent',transition:'all 0.15s'}}>
            🗑️ 削除
          </button>
        </div>
      )}

      <div style={{padding:'12px 16px', paddingBottom: bulkMode && checkedIds.size > 0 ? 100 : 12}}>
        {sorted.length === 0 ? (
          <div className="card" style={{padding:24,textAlign:'center',color:'#999'}}>
            {filter === 'all' ? '在庫がありません' : `${statusLabel[filter]}の商品がありません`}
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {sorted.map(item => {
              const isChecked = checkedIds.has(item.id);
              const alert = alertLevel(item);
              const estProfit = (item.listPrice||0) - (item.purchasePrice||0);
              const isSold = item.status === 'sold';
              const saleRecord = isSold ? (data.sales||[]).find(s => s.inventoryId === item.id) : null;
              const soldProfit = saleRecord?.profit ?? null;
              const isProfitable = soldProfit !== null ? soldProfit >= 0 : null;
              return (
                <div key={item.id} className="card"
                  style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',
                    background: isChecked ? '#fef2f2'
                              : isSold ? '#f8f8f8'
                              : alert?.level==='danger' ? '#fff8f8' : 'white',
                    border: isChecked ? '1.5px solid #fca5a5'
                          : isSold ? '1.5px solid #e0e0e0'
                          : alert?.level==='danger' ? '1.5px solid #fecaca'
                          : alert?.level==='warn'   ? '1.5px solid #fde68a'
                          : '1.5px solid transparent',
                    borderLeft: isSold ? '4px solid #7c3aed' : undefined,
                    opacity: isSold ? 0.85 : 1,
                    transition:'all 0.15s'}}
                  onClick={bulkMode ? (e) => toggleCheck(item.id, e) : () => setSelected(item)}>
                  {bulkMode && (
                    <input type="checkbox" checked={isChecked}
                      onChange={e => toggleCheck(item.id, e)}
                      onClick={e => e.stopPropagation()}
                      style={{width:22,height:22,flexShrink:0,cursor:'pointer',accentColor:'var(--color-primary)'}} />
                  )}
                  <div style={{position:'relative',flexShrink:0}}>
                    <ItemThumbnail thumbId={item.photos?.[0]?.thumbId} thumbDataUrl={item.photos?.[0]?.thumbDataUrl} size={68} fallback="📦" />
                    {/* 売却済はサムネイル上にオーバーレイ */}
                    {isSold && (
                      <div style={{position:'absolute',inset:0,borderRadius:10,
                        background:'rgba(124,58,237,0.15)',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:9,fontWeight:800,color:'white',
                          background:'#7c3aed',borderRadius:4,padding:'2px 5px',letterSpacing:'0.04em'}}>
                          SOLD
                        </span>
                      </div>
                    )}
                    {!isSold && (
                      <span className={`tag ${statusClass[item.status] || 'tag-unlisted'}`}
                        style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',whiteSpace:'nowrap',fontSize:10,padding:'2px 7px'}}>
                        {statusLabel[item.status] || '未出品'}
                      </span>
                    )}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color: isSold ? '#9ca3af' : '#bbb',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:2}}>{item.brand}</div>
                    <div style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color: isSold ? '#555' : '#111',marginBottom:4}}>{item.productName}</div>
                    <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                      {conditionTag(item.condition)}
                      {/* 売却済バッジ＋売却日 */}
                      {isSold && (
                        <span style={{fontSize:10,fontWeight:700,borderRadius:6,padding:'2px 7px',
                          background:'#ede9fe',color:'#6d28d9',border:'1px solid #ddd6fe'}}>
                          ✅ 売却済{saleRecord?.saleDate ? ` ${saleRecord.saleDate.slice(5)}` : ''}
                        </span>
                      )}
                      {/* 出品準備度バッジ（未出品のみ） */}
                      {item.status === 'unlisted' && (() => {
                        const done = [
                          (item.photos||[]).length > 0,
                          !!item.productName,
                          (item.listPrice||0) > 0,
                          !!item.listDate,
                          !!item.descriptionText,
                          !!item.englishTitle,
                        ].filter(Boolean).length;
                        const total = 6;
                        if (done === total) return (
                          <span style={{fontSize:10,fontWeight:700,borderRadius:6,padding:'2px 7px',
                            background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0'}}>
                            ✅ 出品準備OK
                          </span>
                        );
                        return (
                          <span style={{fontSize:10,fontWeight:700,borderRadius:6,padding:'2px 7px',
                            background:'#fafafa',color:'#9ca3af',border:'1px solid #e5e7eb'}}>
                            準備 {done}/{total}
                          </span>
                        );
                      })()}
                      {/* 経過日数・アラートバッジ */}
                      {alert && !isSold && (
                        <span style={{
                          fontSize:10,fontWeight:700,borderRadius:6,padding:'2px 7px',
                          background:'#f0fdf4',
                          color:'#6b7280',
                          border:'1px solid #e5e7eb',
                        }}>
                          {alert.days}日
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    {isSold ? (
                      /* 売却済：実績データを表示 */
                      <>
                        <div style={{fontSize:11,color:'#9ca3af',marginBottom:2}}>売上</div>
                        <div style={{fontSize:13,fontWeight:700,color:'#555'}}>
                          {saleRecord ? `¥${formatMoney(saleRecord.salePrice)}` : '−'}
                        </div>
                        {soldProfit !== null && (
                          <div style={{
                            fontSize:12,fontWeight:800,marginTop:3,
                            color: isProfitable ? '#16a34a' : '#dc2626',
                            background: isProfitable ? '#f0fdf4' : '#fef2f2',
                            borderRadius:6,padding:'2px 6px',display:'inline-block',
                          }}>
                            {isProfitable?'+':''}¥{formatMoney(soldProfit)}
                          </div>
                        )}
                      </>
                    ) : (
                      /* 未出品・出品中：仕入れ＋出品価格＋推定利益 */
                      <>
                        <div style={{fontSize:11,color:'#bbb',marginBottom:2}}>仕入</div>
                        <div style={{fontSize:13,fontWeight:700,color:'#555'}}>¥{formatMoney(item.purchasePrice)}</div>
                        {item.listPrice > 0 && (
                          <div style={{fontSize:12,fontWeight:700,color:'var(--color-primary)',marginTop:2}}>¥{formatMoney(item.listPrice)}</div>
                        )}
                        {estProfit !== 0 && (
                          <div style={{fontSize:10,fontWeight:700,marginTop:2,
                            color: estProfit > 0 ? '#16a34a' : '#dc2626'}}>
                            {estProfit > 0 ? '+' : ''}¥{formatMoney(estProfit)}
                          </div>
                        )}
                      </>
                    )}
                    {!bulkMode && <div style={{fontSize:10,color:'#ccc',marginTop:1}}>→</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 一括削除確認モーダル */}
      {bulkConfirm && (
        <div className="modal-overlay" onClick={() => setBulkConfirm(false)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()} style={{maxWidth:360}}>
            <div className="modal-handle"/>
            <div style={{textAlign:'center',padding:'8px 0 16px'}}>
              <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
              <div style={{fontWeight:800,fontSize:18,marginBottom:8,color:'#111'}}>
                {checkedIds.size}件を削除しますか？
              </div>
              <div style={{fontSize:14,color:'#888',lineHeight:1.6}}>
                選択した商品を削除します。<br/>この操作は元に戻せません。
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:8}}>
              <button onClick={() => setBulkConfirm(false)}
                style={{flex:1,padding:14,borderRadius:12,border:'1.5px solid #e0e0e0',background:'white',fontSize:15,fontWeight:700,cursor:'pointer',color:'#555'}}>
                キャンセル
              </button>
              <button onClick={executeBulkDelete}
                style={{flex:1,padding:14,borderRadius:12,border:'none',background:'#dc2626',color:'white',fontSize:15,fontWeight:700,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:17,letterSpacing:'-0.02em'}}>商品詳細</div>
              <button onClick={() => setSelected(null)} style={{background:'#f3f4f6',border:'none',borderRadius:99,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#666',fontSize:18,fontWeight:700}}>×</button>
            </div>

            {/* 写真スライド（IndexedDBから取得） */}
            {selected.photos?.length > 0 && (
              <div style={{display:'flex',gap:8,overflowX:'auto',marginBottom:16,paddingBottom:4}}>
                {selected.photos.map((p, i) => (
                  <PhotoSlide key={p.id || i} photoRef={p} />
                ))}
              </div>
            )}

            {/* 回転日数バナー（売却済みのみ） */}
            {selected.status === 'sold' && (() => {
              const sale = (data.sales||[]).find(s => s.inventoryId === selected.id);
              const ld = sale?.listDate || selected.listDate;
              const sd = sale?.saleDate;
              const td = (ld && sd) ? Math.max(0, Math.floor((new Date(sd) - new Date(ld)) / 86400000)) : null;
              if (td === null) return null;
              return (
                <div style={{background:'linear-gradient(135deg,#0369a1,#0284c7)',borderRadius:12,padding:'10px 16px',
                  display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.8)',fontWeight:700}}>🔄 回転日数</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.65)',marginTop:2}}>
                      {ld} → {sd}
                    </div>
                  </div>
                  <div style={{fontSize:28,fontWeight:800,color:'white'}}>
                    {td}<span style={{fontSize:14,fontWeight:600}}>日</span>
                  </div>
                </div>
              );
            })()}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:'#999'}}>管理番号</div>
                <div style={{fontFamily:'monospace',fontSize:13,fontWeight:600}}>{selected.mgmtNo || '-'}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>状態</div>
                {conditionTag(selected.condition)}
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>ブランド</div>
                <div style={{fontWeight:600}}>{selected.brand || '-'}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>カテゴリー</div>
                <div>{selected.category || '-'}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>仕入れ値</div>
                <div style={{fontWeight:600}}>¥{formatMoney(selected.purchasePrice)}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>見込み売上</div>
                <div style={{fontWeight:600}}>¥{formatMoney(selected.listPrice)}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>仕入れ日</div>
                <div>{selected.purchaseDate}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>出品日</div>
                <div>{selected.listDate || <span style={{color:'#E84040',fontSize:12}}>未定</span>}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>仕入れ先</div>
                <div>{selected.purchaseStore || '-'}</div>
              </div>
            </div>

            {selected.size && (
              <div style={{marginBottom:10}}>
                <div style={{fontSize:12,color:'#999'}}>サイズ</div>
                <div>{selected.size}</div>
              </div>
            )}

            {/* 出品準備チェックリスト（未出品・出品中のみ） */}
            {selected.status !== 'sold' && (() => {
              const checks = [
                { label: '写真',         ok: (selected.photos||[]).length > 0,  note: `${(selected.photos||[]).length}枚` },
                { label: '商品名',       ok: !!selected.productName,             note: null },
                { label: '見込み売上',   ok: (selected.listPrice||0) > 0,        note: selected.listPrice > 0 ? `¥${formatMoney(selected.listPrice)}` : null },
                { label: '出品日',       ok: selected.listDate != null,          note: selected.listDate || '未定' },
                { label: '説明文',       ok: !!selected.descriptionText,         note: null },
                { label: 'メルカリ用タイトル', ok: !!selected.englishTitle,      note: null },
              ];
              const doneCount = checks.filter(c => c.ok).length;
              const allDone = doneCount === checks.length;
              return (
                <div style={{background: allDone ? '#f0fdf4' : '#fafafa',
                  border: `1.5px solid ${allDone ? '#bbf7d0' : '#e5e7eb'}`,
                  borderRadius:14,padding:'12px 14px',marginBottom:14}}>
                  {/* ヘッダー */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <div style={{fontWeight:800,fontSize:13,color: allDone ? '#16a34a' : '#374151'}}>
                      {allDone ? '✅ 出品準備完了！' : '🚀 出品前チェック'}
                    </div>
                    <div style={{fontSize:11,background: allDone ? '#dcfce7' : '#f3f4f6',
                      color: allDone ? '#16a34a' : '#888',
                      borderRadius:99,padding:'2px 10px',fontWeight:700}}>
                      {doneCount}/{checks.length}
                    </div>
                  </div>
                  {/* チェック項目 */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 12px',marginBottom:12}}>
                    {checks.map(c => (
                      <div key={c.label} style={{display:'flex',alignItems:'center',gap:5}}>
                        <span style={{fontSize:14,flexShrink:0}}>{c.ok ? '✅' : '⬜'}</span>
                        <span style={{fontSize:12,color: c.ok ? '#374151' : '#9ca3af',fontWeight: c.ok ? 600 : 400}}>
                          {c.label}
                          {c.ok && c.note && <span style={{fontSize:10,color:'#6b7280',marginLeft:3}}>({c.note})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* コピーボタン */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <button
                      onClick={() => {
                        if (!selected.productName) { toast('⚠️ 商品名がありません'); return; }
                        copyToClipboard(selected.productName).then(ok => toast(ok ? '📋 商品名をコピー' : 'コピー失敗'));
                      }}
                      style={{padding:'10px 6px',borderRadius:10,border:'1.5px solid #e0e0e0',
                        background: selected.productName ? 'white' : '#f9fafb',
                        fontSize:12,fontWeight:700,cursor:'pointer',color:'#333',
                        opacity:selected.productName?1:0.5,
                        WebkitTapHighlightColor:'transparent'}}>
                      📋 商品名
                    </button>
                    <button
                      onClick={() => {
                        if (!selected.englishTitle) { toast('⚠️ 英語タイトルがありません'); return; }
                        copyToClipboard(selected.englishTitle).then(ok => toast(ok ? '📋 英語タイトルをコピー' : 'コピー失敗'));
                      }}
                      style={{padding:'10px 6px',borderRadius:10,border:'1.5px solid #e0e0e0',
                        background: selected.englishTitle ? 'white' : '#f9fafb',
                        fontSize:12,fontWeight:700,cursor:'pointer',color:'#333',
                        opacity:selected.englishTitle?1:0.5,
                        WebkitTapHighlightColor:'transparent'}}>
                      📋 英語タイトル
                    </button>
                    <button
                      onClick={() => {
                        if (!selected.descriptionText) { toast('⚠️ 説明文がありません。仕入れ登録から生成してください'); return; }
                        copyToClipboard(selected.descriptionText).then(ok => toast(ok ? '📋 説明文をコピーしました' : 'コピー失敗'));
                      }}
                      style={{gridColumn:'1 / -1',padding:'10px 6px',borderRadius:10,border:'1.5px solid #e0e0e0',
                        background: selected.descriptionText ? 'white' : '#f9fafb',
                        fontSize:12,fontWeight:700,cursor:'pointer',color:'#333',
                        opacity:selected.descriptionText?1:0.5,
                        WebkitTapHighlightColor:'transparent'}}>
                      📋 説明文コピー
                    </button>
                  </div>
                  {/* 未完了の場合ヒント */}
                  {!allDone && (
                    <div style={{marginTop:8,fontSize:11,color:'#9ca3af',textAlign:'center'}}>
                      ⬜ の項目は「✏️ 編集」から入力できます
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 売却済みのコピーボタン（既存） */}
            {selected.status === 'sold' && (selected.productName || selected.englishTitle || selected.descriptionText) && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                {selected.productName && (
                  <button onClick={() => copyToClipboard(selected.productName).then(ok => toast(ok ? '📋 商品名をコピー' : 'コピー失敗'))}
                    style={{padding:'10px 8px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:13,fontWeight:600,cursor:'pointer',color:'#333',WebkitTapHighlightColor:'transparent'}}>
                    📋 商品名
                  </button>
                )}
                {selected.englishTitle && (
                  <button onClick={() => copyToClipboard(selected.englishTitle).then(ok => toast(ok ? '📋 英語タイトルをコピー' : 'コピー失敗'))}
                    style={{padding:'10px 8px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:13,fontWeight:600,cursor:'pointer',color:'#333',WebkitTapHighlightColor:'transparent'}}>
                    📋 英語タイトル
                  </button>
                )}
                {selected.descriptionText && (
                  <button onClick={() => copyToClipboard(selected.descriptionText).then(ok => toast(ok ? '📋 説明文をコピーしました' : 'コピー失敗'))}
                    style={{gridColumn:'1 / -1',padding:'10px 8px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:13,fontWeight:600,cursor:'pointer',color:'#333',WebkitTapHighlightColor:'transparent'}}>
                    📋 説明文コピー
                  </button>
                )}
              </div>
            )}

            {/* アクションボタン */}
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
              {/* 編集ボタン */}
              <button className="btn-secondary" style={{width:'100%'}}
                onClick={() => {
                  // ★ 編集前の状態を保存（戻り時にフィルター・スクロール位置を復元するため）
                  setPendingReturnTab('inventory');
                  setPendingInventoryFilter(filter);          // 現在のタブ（未出品/出品中/売却済）
                  setPendingInventoryScrollY(window.scrollY); // 現在のスクロール位置
                  setEditingItem(selected);
                  setTab('purchase');
                  setSelected(null);
                }}>
                ✏️ 編集
              </button>

              {selected.status !== 'sold' && (
                <button className="btn-primary" style={{width:'100%'}}
                  onClick={() => markAsSold(selected)}>
                  🎉 売れた！（売上記録へ →）
                </button>
              )}
              {selected.status === 'sold' && (
                <button style={{width:'100%',padding:'12px',borderRadius:12,border:'1.5px solid #E84040',
                  background:'white',color:'#E84040',fontSize:14,fontWeight:700,cursor:'pointer'}}
                  onClick={() => {
                    setSelected(null);
                    setPendingSaleItemId(selected.id);
                    setTab('sales');
                  }}>
                  💰 この商品の売上を記録する →
                </button>
              )}
              {selected.status === 'unlisted' && (
                <button className="btn-secondary" style={{width:'100%'}}
                  onClick={() => markAsListed(selected)}>
                  📱 出品中にする
                </button>
              )}
              {selected.status === 'listed' && (
                <button className="btn-secondary" style={{width:'100%'}}
                  onClick={() => markAsUnlisted(selected)}>
                  📦 未出品に戻す
                </button>
              )}
              {selected.status === 'sold' && (
                <button className="btn-secondary" style={{width:'100%'}}
                  onClick={() => {
                    if (!window.confirm('売却済みを取り消して「出品中」に戻しますか？')) return;
                    const updated = data.inventory.map(i => i.id === selected.id ? { ...i, status: 'listed' } : i);
                    setData({ ...data, inventory: updated });
                    setSelected(null);
                    toast('↩️ 出品中に戻しました');
                  }}>
                  ↩️ 売却済みを取り消す
                </button>
              )}
              <button onClick={() => deleteItem(selected)}
                style={{width:'100%',padding:12,borderRadius:12,border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontWeight:600,cursor:'pointer',minHeight:44}}>
                🗑️ 削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 売上記録タブ
// ============================================================
const SalesTab = () => {
  const { data, setData, currentUser, setEditingItem, setTab, pendingSaleItemId, setPendingSaleItemId, pendingEditSaleId, setPendingEditSaleId, setPendingReturnTab } = React.useContext(AppContext);
  const toast = useToast();
  const [showForm, setShowForm] = React.useState(false);
  const [editingSale, setEditingSale] = React.useState(null);
  const [monthDetail, setMonthDetail] = React.useState(null); // 月次詳細モーダル用 "YYYY-MM"
  const emptyForm = { inventoryId: '', platform: 'メルカリ', salePrice: '', feeRate: 0.10, shipping: CONFIG.ESTIMATED_SHIPPING.toString(), saleDate: today(), listDate: '', platformId: '', purchasePrice: '', purchaseDate: '', purchaseStore: '' };
  const [form, setForm] = React.useState(emptyForm);
  const [ssReading, setSsReading] = React.useState(false);
  const [ssCandidate, setSsCandidate] = React.useState(null); // {item, extracted}
  const ssInputRef = React.useRef();
  // バッチ取込
  const [batchLoading, setBatchLoading] = React.useState(false); // {done,total} or false
  const [batchRows, setBatchRows] = React.useState(null); // [{extracted, matchedItem, skip, inventoryId}] or null
  const batchInputRef = React.useRef();
  const [dupConfirm, setDupConfirm] = React.useState(null); // {existingSale, reason, onConfirm}
  const [saleStoreCustom, setSaleStoreCustom] = React.useState(null); // null=選択, string=手入力
  const [saving, setSaving] = React.useState(false); // 保存中フラグ（二重タップ防止）
  const [formError, setFormError] = React.useState(null); // インラインバリデーションエラー
  // ── 売上入力 下書き保存 ───────────────────────────────────
  const SALE_DRAFT_KEY = 'nobushop_sale_draft';
  const [saleDraftBanner, setSaleDraftBanner] = React.useState(null);
  const saveSaleDraft = React.useCallback((f, bundle, items, splitMethod) => {
    try {
      localStorage.setItem(SALE_DRAFT_KEY, JSON.stringify({ form: f, bundleSale: bundle, bundleSaleItems: items, bundleSaleSplitMethod: splitMethod, savedAt: new Date().toISOString() }));
    } catch(_) {}
  }, []);
  const clearSaleDraft = () => { try { localStorage.removeItem(SALE_DRAFT_KEY); } catch(_) {} };
  // ── まとめ販売（売上分割）────────────────────────────────
  // ※ bundleSale 等は下書き保存 useEffect の deps に使うため、effects より先に宣言する
  const SALE_BUNDLE_LABELS = ['A','B','C','D','E','F'];
  const initSaleBundleItems = (n) => Array.from({length:n}, (_,i) =>
    ({ id: String(i), label:`商品${SALE_BUNDLE_LABELS[i]||i+1}`, inventoryId:'', salePrice:'', shipping:'' })
  );
  const [bundleSale, setBundleSale] = React.useState(false);
  const [bundleSaleItems, setBundleSaleItems] = React.useState(initSaleBundleItems(2));
  const [bundleSaleSplitMethod, setBundleSaleSplitMethod] = React.useState('equal');
  const [bundleSaleInlineForm, setBundleSaleInlineForm] = React.useState(null); // {idx, productName, brand, purchasePrice}
  // フォーム変化時に自動保存（新規のみ・有意な入力がある場合のみ）
  React.useEffect(() => {
    if (!showForm || editingSale) return;
    if (!form.inventoryId && !form.salePrice) return; // 商品・価格が未入力なら保存しない
    saveSaleDraft(form, bundleSale, bundleSaleItems, bundleSaleSplitMethod);
  }, [form, bundleSale, bundleSaleItems, bundleSaleSplitMethod, showForm, editingSale]);
  // タブ切り替え・アプリ切り替え時にも強制保存（フリーズ対策）
  React.useEffect(() => {
    const forceSave = () => {
      if (showForm && !editingSale && (form.inventoryId || form.salePrice)) {
        saveSaleDraft(form, bundleSale, bundleSaleItems, bundleSaleSplitMethod);
      }
    };
    document.addEventListener('visibilitychange', forceSave);
    window.addEventListener('pagehide', forceSave);
    return () => {
      document.removeEventListener('visibilitychange', forceSave);
      window.removeEventListener('pagehide', forceSave);
    };
  }, [form, bundleSale, bundleSaleItems, bundleSaleSplitMethod, showForm, editingSale, saveSaleDraft]);
  const apiKey = data.settings?.apiKey || '';

  // 上位N件マッチング（ブランド・商品名・型番・価格を総合評価）
  const findTopMatches = (extracted, items, topN = 3) => {
    const norm = s => (s || '').toLowerCase()
      .replace(/[\(（]推定[\)）]/g, '')
      .replace(/[・\-\/\s　（）()【】「」]+/g, ' ').trim();
    const tokens = s => norm(s).split(/\s+/).filter(t => t.length >= 2);
    // AI読み取り結果を1つの検索文字列にまとめる
    const searchStr = [extracted.product_name, extracted.brand, extracted.model_number].filter(Boolean).join(' ');
    const searchTokens = tokens(searchStr);
    if (searchTokens.length === 0) return [];
    const scored = items.map(item => {
      const itemStr = [item.brand, item.productName, item.modelNumber, item.brandReading].filter(Boolean).join(' ');
      const itemTokens = tokens(itemStr);
      let hit = 0;
      for (const t of searchTokens) {
        if (itemTokens.some(it => it.includes(t) || t.includes(it))) hit++;
      }
      let score = hit / searchTokens.length;
      // ブランド一致ボーナス
      if (extracted.brand && item.brand) {
        const aBrand = norm(extracted.brand);
        const iBrand = norm(item.brand);
        if (iBrand.includes(aBrand) || aBrand.includes(iBrand)) score += 0.4;
      }
      // 型番一致ボーナス
      if (extracted.model_number && item.modelNumber) {
        if (norm(item.modelNumber).includes(norm(extracted.model_number))) score += 0.5;
      }
      // 価格近似ボーナス（出品予定価格との比較）
      if (extracted.sale_price && item.listPrice) {
        const diff = Math.abs(extracted.sale_price - item.listPrice) / Math.max(item.listPrice, 1);
        if (diff < 0.05) score += 0.3;
        else if (diff < 0.2) score += 0.1;
      }
      return { item, score };
    });
    return scored
      .filter(s => s.score >= 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(s => s.item);
  };

  // スクショ読み込み処理
  const handleSsInput = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!apiKey) { toast('⚠️ APIキーを設定してください'); return; }
    setSsReading(true);
    try {
      const blob = await compressImage(file, 1200, 0.9);
      const b64 = await blobToBase64(blob);
      const text = await analyzeImagesWithClaude([{mimeType:'image/jpeg', data:b64}], apiKey, SS_ANALYSIS_PROMPT, 500);
      const stripped = text.replace(/```(?:json)?\s*/gi,'').replace(/```/g,'');
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('読み取り失敗');
      const result = JSON.parse(jsonMatch[0]);
      if (!result.product_name) throw new Error('商品名を読み取れませんでした');
      // data.inventory はすでに currentUser でフィルター済み
      const candidates = findTopMatches(result, data.inventory);
      if (candidates.length === 0) {
        toast('❌ 登録済みの商品から一致するものが見つかりませんでした');
        return;
      }
      setSsCandidate({ candidates, extracted: result });
    } catch(err) {
      toast('❌ ' + err.message);
    } finally {
      setSsReading(false);
    }
  };

  // ── バッチスクショ取込 ──
  // 商品タイトルからブランド・カテゴリーを推定
  const guessFromTitle = (title) => {
    const t = (title || '').toLowerCase();
    // ブランド辞書（表示名, 検索キーワード）
    const BRANDS = [
      ['LOUIS VUITTON', ['louis vuitton','ルイヴィトン','lv ','ヴィトン']],
      ['Chanel', ['chanel','シャネル']],
      ['Gucci', ['gucci','グッチ']],
      ['Hermès', ['hermes','hermès','エルメス','バーキン','ケリー']],
      ['Prada', ['prada','プラダ']],
      ['Christian Dior', ['christian dior','dior','ディオール','クリスチャンディオール']],
      ['Bottega Veneta', ['bottega veneta','ボッテガ']],
      ['Saint Laurent', ['saint laurent','ysl','サンローラン']],
      ['Burberry', ['burberry','バーバリー']],
      ['Céline', ['celine','céline','セリーヌ']],
      ['Givenchy', ['givenchy','ジバンシィ','ジバンシー']],
      ['Fendi', ['fendi','フェンディ']],
      ['Versace', ['versace','ヴェルサーチ']],
      ['Valentino', ['valentino','ヴァレンティノ']],
      ['Balenciaga', ['balenciaga','バレンシアガ']],
      ['Alexander McQueen', ['alexander mcqueen','マックイーン']],
      ['Miu Miu', ['miu miu','ミュウミュウ']],
      ['Loewe', ['loewe','ロエベ']],
      ['Marni', ['marni','マルニ']],
      ['Tod\'s', ['tod\'s','tods','トッズ']],
      ['Cartier', ['cartier','カルティエ']],
      ['Bvlgari', ['bvlgari','bulgari','ブルガリ']],
      ['Tiffany', ['tiffany','ティファニー']],
      ['Coach', ['coach','コーチ']],
      ['Michael Kors', ['michael kors','マイケルコース']],
      ['Kate Spade', ['kate spade','ケイトスペード']],
      ['Furla', ['furla','フルラ']],
      ['Longchamp', ['longchamp','ロンシャン']],
      ['Mulberry', ['mulberry','マルベリー']],
      ['MCM', ['mcm ','mcmバッグ']],
      ['Vivienne Westwood', ['vivienne westwood','ヴィヴィアン']],
      ['Moschino', ['moschino','モスキーノ']],
      ['Marc Jacobs', ['marc jacobs','マークジェイコブス']],
      ['Tory Burch', ['tory burch','トリーバーチ']],
      ['Max Mara', ['max mara','マックスマーラ']],
      ['Moncler', ['moncler','モンクレール']],
      ['Canada Goose', ['canada goose','カナダグース']],
      ['The North Face', ['the north face','ノースフェイス']],
      ['Supreme', ['supreme','シュプリーム']],
      ['Nike', ['nike','ナイキ']],
      ['Adidas', ['adidas','アディダス']],
      ['Puma', ['puma','プーマ']],
      ['New Balance', ['new balance','ニューバランス']],
      ['Converse', ['converse','コンバース']],
      ['Vans', ['vans','ヴァンズ']],
    ];
    let detectedBrand = '';
    for (const [name, keywords] of BRANDS) {
      if (keywords.some(k => t.includes(k))) { detectedBrand = name; break; }
    }
    // カテゴリー推定
    const CAT_RULES = [
      ['バッグ', ['バッグ','bag','鞄','かばん','ショルダー','トート','クラッチ','リュック','ボストン','ポーチ','ハンドバッグ','ミニバッグ','クロスボディ','ウエストバッグ','サコッシュ','バックパック']],
      ['小物', ['財布','ウォレット','wallet','コインケース','カードケース','キーケース','名刺入れ','ベルト','スカーフ','ストール','帽子','手袋','サングラス','ジュエリー','アクセサリー','ネックレス','リング','腕時計','時計']],
      ['シューズ', ['シューズ','スニーカー','靴','パンプス','ブーツ','サンダル','ローファー','mule','shoe','sneaker','boot']],
      ['毛皮', ['ファー','毛皮','ミンク','フォックス','ラビット','レザー','fur','mink']],
      ['衣類', ['コート','ジャケット','シャツ','ブラウス','スカート','パンツ','ニット','セーター','ワンピース','スーツ','ダウン','ブルゾン','トップス','カーディガン','デニム']],
    ];
    let detectedCategory = '';
    for (const [cat, keywords] of CAT_RULES) {
      if (keywords.some(k => t.includes(k))) { detectedCategory = cat; break; }
    }
    return { brand: detectedBrand, category: detectedCategory };
  };

  // JSON配列をロバストに解析するヘルパー
  const parseJsonArray = (text) => {
    const stripped = text.replace(/```(?:json)?\s*/gi,'').replace(/```/g,'').trim();
    // 方法1: テキスト全体が配列
    try { const r = JSON.parse(stripped); if (Array.isArray(r)) return r; } catch(_){}
    // 方法2: 配列部分を抽出
    const m = stripped.match(/\[[\s\S]*\]/);
    if (m) { try { const r = JSON.parse(m[0]); if (Array.isArray(r)) return r; } catch(_){} }
    // 方法3: 切れた配列を補完（最後の不完全オブジェクトを除去）
    if (m) {
      try {
        const fixed = m[0].replace(/,?\s*\{[^}]*$/, '') + ']';
        const r = JSON.parse(fixed);
        if (Array.isArray(r)) return r;
      } catch(_){}
    }
    return null;
  };

  const handleBatchSsInput = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    if (!apiKey) { toast('⚠️ APIキーを設定してください'); return; }
    setBatchLoading({ done: 0, total: files.length });
    const allRows = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const blob = await compressImage(files[i], 1400, 0.9);
        const b64  = await blobToBase64(blob);
        const text = await analyzeImagesWithClaude([{ mimeType:'image/jpeg', data:b64 }], apiKey, BATCH_SS_PROMPT, 3000);
        const items = parseJsonArray(text);
        if (!items) { toast(`⚠️ ${i+1}枚目: 読み取り結果を解析できませんでした`); continue; }
        items.forEach(ex => {
          if (!ex.product_name) return;
          // 在庫と照合（商品名で近似マッチ）
          const norm = s => (s||'').toLowerCase().replace(/[【】（）()「」\s]/g,'');
          const exNorm = norm(ex.product_name);
          let bestItem = null, bestScore = 0;
          data.inventory.forEach(inv => {
            const invNorm = norm((inv.brand||'')+' '+(inv.productName||''));
            let matches = 0;
            const words = exNorm.replace(/[^\w\u3000-\u9fff]/g,' ').split(/\s+/).filter(w=>w.length>1);
            words.forEach(w => { if (invNorm.includes(w)) matches += w.length; });
            const score = exNorm.length > 0 ? matches / exNorm.length : 0;
            if (score > bestScore) { bestScore = score; bestItem = inv; }
          });
          const matchedItem = bestScore > 0.25 ? bestItem : null;
          // 重複チェック（複合条件）
          let dupSale = null;
          let dupReason = '';
          // ① 商品IDが一致（強制重複）
          if (ex.product_id) {
            const found = (data.sales||[]).find(s => s.platformId && s.platformId === ex.product_id);
            if (found) { dupSale = found; dupReason = '商品IDが一致しています'; }
          }
          // ② 在庫IDが一致（強制重複）
          if (!dupSale && matchedItem) {
            const found = (data.sales||[]).find(s => s.inventoryId === matchedItem.id);
            if (found) { dupSale = found; dupReason = '同じ在庫商品が既に売上登録済みです'; }
          }
          // ③ 複合条件（タイトル類似 + ブランド + カテゴリ + 価格 + 送料）
          if (!dupSale) {
            const normStr = s => (s || '').trim().toLowerCase();
            const exTitle = normStr(ex.product_name);
            for (const s of data.sales || []) {
              if (ex.product_id && s.platformId === ex.product_id) continue; // already checked
              const sInv = data.inventory.find(i => i.id === s.inventoryId);
              if (!sInv) continue;
              const sTitle = normStr((sInv.brand||'') + ' ' + (sInv.productName||''));
              const sim = diceSimilarity(exTitle, sTitle);
              if (sim < 0.6) continue;
              const gBrand = guessFromTitle(ex.product_name).brand || '';
              const brandMatch = gBrand && normStr(sInv.brand) && normStr(gBrand) === normStr(sInv.brand);
              if (!brandMatch) continue;
              const priceDiff = (ex.sale_price && s.salePrice)
                ? Math.abs(s.salePrice - ex.sale_price) / Math.max(s.salePrice, 1) : 1;
              if (priceDiff > 0.05) continue;
              const shipA = ex.shipping != null ? Number(ex.shipping) : null;
              const shipB = s.shipping  != null ? Number(s.shipping)  : null;
              if (shipA != null && shipB != null && Math.abs(shipA - shipB) > 50) continue;
              dupSale = s;
              dupReason = `タイトル類似度 ${Math.round(sim*100)}% · ブランド一致 · 販売価格一致${shipA!=null&&shipB!=null?' · 送料一致':''}`;
              break;
            }
          }
          const isMatomeSale = (ex.product_name || '').includes('まとめ');
          allRows.push({
            extracted: ex,
            matchedItem,
            inventoryId: matchedItem?.id || '',
            skip: !!dupSale,
            isDuplicate: !!dupSale,
            duplicateSale: dupSale || null,
            duplicateReason: dupReason,
            mode: matchedItem ? 'match' : 'new', // 在庫なし→即「新規仕入れ登録」モード
            splitEnabled: isMatomeSale, // "まとめ"商品は自動で分割候補ON
            splitItems: [{ inventoryId: '', salePrice: '' }, { inventoryId: '', salePrice: '' }],
            newForm: (() => {
              const g = guessFromTitle(ex.product_name);
              return {
                brand: g.brand, productName: ex.product_name || '',
                purchasePrice: '', purchaseDate: '',
                purchaseStore: '', category: g.category,
                listDate: ex.sale_date || '',
              };
            })(),
          });
        });
      } catch(err) {
        console.error('batch ss error', err);
        toast(`⚠️ ${i+1}枚目の読み取りに失敗しました`);
      }
      setBatchLoading({ done: i + 1, total: files.length });
    }
    setBatchLoading(false);
    if (allRows.length === 0) { toast('❌ 商品データを読み取れませんでした'); return; }
    setBatchRows(allRows);
  };

  const updateBatchRow = (idx, patch) =>
    setBatchRows(prev => prev.map((r,i) => i===idx ? {...r,...patch} : r));
  const updateBatchNewForm = (idx, key, val) =>
    setBatchRows(prev => prev.map((r,i) => i===idx ? {...r, newForm:{...r.newForm,[key]:val}} : r));

  const executeBatchSave = () => {
    if (!batchRows) return;
    const toSave = batchRows.filter(r => !r.skip && (r.inventoryId || r.mode==='new'));
    if (toSave.length === 0) { toast('⚠️ 登録する商品がありません'); return; }
    const fees = data.settings?.platformFees || CONFIG.PLATFORM_FEES;
    const newSalesList = [];
    const addedInventory = [];
    const updatedInv = [...data.inventory];

    toSave.forEach(r => {
      const ex = r.extracted;
      const salePrice = ex.sale_price || 0;
      const shipping  = ex.shipping ?? CONFIG.ESTIMATED_SHIPPING;
      const feeRate   = fees[ex.platform||'メルカリ'] ?? 0.10;
      const fee       = ex.platform_fee != null ? ex.platform_fee : Math.round(salePrice * feeRate);
      const platform  = ex.platform || 'メルカリ';
      const saleDate  = ex.sale_date || today();

      // ── 分割登録モード ──────────────────────────────────────────
      if (r.splitEnabled) {
        const filled = (r.splitItems || []).filter(si => si.inventoryId && si.salePrice !== '');
        if (filled.length >= 2) {
          const ts = Date.now();
          const totalShip = shipping;
          const shipBase  = Math.floor(totalShip / filled.length);
          const shipRem   = totalShip - shipBase * filled.length;
          const bundleGroup = `bundle_batch_${ts}`;
          filled.forEach((si, siIdx) => {
            const inv = updatedInv.find(i => i.id === si.inventoryId);
            const sp  = Number(si.salePrice);
            const ship= siIdx === filled.length-1 ? shipBase + shipRem : shipBase;
            const pp  = inv?.purchasePrice || 0;
            const ld  = inv?.listDate || '';
            const invIdx = updatedInv.findIndex(i => i.id === si.inventoryId);
            if (invIdx >= 0) updatedInv[invIdx] = { ...updatedInv[invIdx], status: 'sold' };
            newSalesList.push({
              id: `sale_${ts}_${siIdx}`,
              inventoryId: si.inventoryId,
              platform, salePrice: sp, feeRate, shipping: ship,
              profit: Math.round(sp * (1 - feeRate) - ship - pp),
              saleDate, listDate: ld,
              turnoverDays: (ld && saleDate) ? Math.max(0, Math.floor((new Date(saleDate) - new Date(ld)) / 86400000)) : null,
              bundleGroup, bundleLabel: `商品${SALE_BUNDLE_LABELS[siIdx]||siIdx+1}`,
              purchasePrice: pp,
              userId: data.currentUser || 'self',
              createdAt: new Date(ts + siIdx).toISOString(),
            });
          });
          return; // 次の行へ
        }
        // splitItems未入力の場合は通常登録にフォールバック
      }

      // ── 通常登録 ────────────────────────────────────────────────
      let invId = r.inventoryId;
      let purchasePrice = 0;
      let listDate = '';

      if (r.mode === 'new') {
        // 新規仕入れ登録
        const nf = r.newForm;
        const newInvId = `inv_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        purchasePrice = Number(nf.purchasePrice) || 0;
        listDate = nf.listDate || '';
        const newInvItem = {
          id: newInvId,
          brand: nf.brand || '',
          productName: nf.productName || ex.product_name || '',
          purchasePrice,
          purchaseDate: nf.purchaseDate || '',  // 売上スクショから仕入れ日は設定しない
          purchaseStore: nf.purchaseStore || '',
          category: nf.category || '',
          listDate,
          listPrice: salePrice,
          status: 'sold',
          photos: [],
          userId: data.currentUser || 'self',
        };
        addedInventory.push(newInvItem);
        updatedInv.push(newInvItem);
        invId = newInvId;
      } else {
        const inv = updatedInv.find(i => i.id === invId);
        purchasePrice = inv?.purchasePrice || 0;
        listDate = inv?.listDate || '';
        // 在庫を売却済みに
        const idx2 = updatedInv.findIndex(i => i.id === invId);
        if (idx2 >= 0) updatedInv[idx2] = { ...updatedInv[idx2], status: 'sold' };
      }

      const profit = ex.profit != null ? ex.profit : salePrice - fee - shipping - purchasePrice;
      newSalesList.push({
        id: `sale_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        inventoryId: invId,
        platform, salePrice, feeRate, shipping, profit,
        saleDate, listDate,
        turnoverDays: (listDate && ex.sale_date)
          ? Math.max(0, Math.floor((new Date(ex.sale_date) - new Date(listDate)) / 86400000))
          : null,
        userId: data.currentUser || 'self',
      });
    });

    setData({ ...data, inventory: updatedInv, sales: [...(data.sales||[]), ...newSalesList] });
    setBatchRows(null);
    toast(`✅ ${newSalesList.length}件の売上を登録しました（新規仕入れ: ${addedInventory.length}件）`);
  };

  const soldItems = data.inventory.filter(i => i.status === 'sold');
  const unrecordedSold = soldItems.filter(i => !data.sales.find(s => s.inventoryId === i.id));

  const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePlatformChange = (platform) => {
    const fees = data.settings?.platformFees || CONFIG.PLATFORM_FEES;
    const rate = fees[platform] ?? 0.10;
    setForm(prev => ({ ...prev, platform, feeRate: rate }));
  };

  const openNew = () => {
    setEditingSale(null);
    setForm(emptyForm);
    // 下書きチェック
    try {
      const raw = localStorage.getItem(SALE_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form?.inventoryId || parsed?.form?.salePrice) setSaleDraftBanner(parsed);
        else setSaleDraftBanner(null);
      } else { setSaleDraftBanner(null); }
    } catch(_) { setSaleDraftBanner(null); }
    setShowForm(true);
  };

  // 在庫商品を事前選択した状態で売上フォームを開く
  const openNewWithItem = React.useCallback((inventoryId) => {
    const inv = data.inventory.find(i => i.id === inventoryId);
    const fees = data.settings?.platformFees || CONFIG.PLATFORM_FEES;
    const platform = emptyForm.platform;
    const feeRate = fees[platform] ?? 0.10;
    // 下書きをクリアしてバナーが出ないようにする（仕入れからの遷移時に干渉しないよう）
    clearSaleDraft();
    setSaleDraftBanner(null);
    setEditingSale(null);
    setBundleSale(false);
    setForm({
      ...emptyForm,
      inventoryId,
      platform,
      feeRate,
      salePrice:     (inv?.listPrice  > 0) ? String(inv.listPrice)    : '',
      purchasePrice: inv?.purchasePrice ? String(inv.purchasePrice) : '',
      listDate:      inv?.listDate     || '',   // 在庫の出品日を反映
      purchaseDate:  inv?.purchaseDate  || '',
      purchaseStore: inv?.purchaseStore || '',
    });
    setShowForm(true);
  }, [data.inventory, data.settings]);

  // pendingSaleItemId（他タブからの遷移）を受け取ってフォームを開く
  // ※ 既存売上がある場合は edit モードで開く（重複ダイアログ回避）
  React.useEffect(() => {
    if (pendingSaleItemId) {
      const existingSale = (data.sales || []).find(s => s.inventoryId === pendingSaleItemId);
      if (existingSale) {
        openEdit(existingSale); // 既存売上に仕入れ情報を追記するため編集モードで開く
      } else {
        openNewWithItem(pendingSaleItemId);
      }
      setPendingSaleItemId(null);
    }
  }, [pendingSaleItemId]);

  // pendingEditSaleId（エクスポート画面からの売上編集遷移）
  React.useEffect(() => {
    if (pendingEditSaleId) {
      const sale = (data.sales||[]).find(s => s.id === pendingEditSaleId);
      if (sale) openEdit(sale);
      setPendingEditSaleId(null);
    }
  }, [pendingEditSaleId]);

  const openEdit = (sale) => {
    setEditingSale(sale);
    const item = data.inventory.find(i => i.id === sale.inventoryId);
    setForm({
      inventoryId: sale.inventoryId || '',
      platform: sale.platform || 'メルカリ',
      salePrice: String(sale.salePrice || ''),
      feeRate: sale.feeRate ?? 0.10,
      shipping: String(sale.shipping ?? CONFIG.ESTIMATED_SHIPPING),
      saleDate: sale.saleDate || today(),
      listDate: sale.listDate || item?.listDate || '',
      platformId: sale.platformId || '',
      purchasePrice: sale.purchasePrice != null ? String(sale.purchasePrice)
        : (item?.purchasePrice != null ? String(item.purchasePrice) : ''),
      purchaseDate:  item?.purchaseDate  || '',  // 在庫から引き継ぎ
      purchaseStore: item?.purchaseStore || '',  // 在庫から引き継ぎ
    });
    // 「まとめ」商品名なら分割UIを自動ON
    if ((item?.productName || '').includes('まとめ')) {
      setBundleSale(true);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false); setEditingSale(null); setForm(emptyForm);
    setBundleSale(false); setBundleSaleItems(initSaleBundleItems(2)); setBundleSaleSplitMethod('equal'); setBundleSaleInlineForm(null);
    setSaleStoreCustom(null);
    setSaving(false); setFormError(null); setDupConfirm(null);
  };

  const selectedItem = data.inventory.find(i => i.id === form.inventoryId);
  // フォームに仕入れ値が入力されていればそちらを優先（NaN防止）
  const effectivePurchasePrice = (() => {
    const raw = form.purchasePrice !== '' ? Number(form.purchasePrice) : Number(selectedItem?.purchasePrice);
    return (isNaN(raw) || raw == null) ? 0 : raw;
  })();
  const profit = selectedItem
    ? Math.round(Number(form.salePrice || 0) * (1 - (form.feeRate || 0)) - Number(form.shipping || 0) - effectivePurchasePrice)
    : 0;
  // 回転日数（出品日→売却日）
  const calcTurnoverDays = (listDate, saleDate) => {
    if (!listDate || !saleDate) return null;
    const diff = new Date(saleDate).getTime() - new Date(listDate).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  };

  // 重複売上チェック（商品ID一致 or 同在庫の売上登録済み）
  // ── 重複売上 複合判定 ──────────────────────────────────────────
  // Dice係数でタイトル類似度を計算（bigram）
  const diceSimilarity = (a, b) => {
    const n = s => (s || '').toLowerCase().replace(/[\s　【】（）()「」\-_・,、。．]/g, '');
    const na = n(a), nb = n(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const bigrams = s => { const set = new Set(); for (let i=0; i<s.length-1; i++) set.add(s.slice(i,i+2)); return set; };
    const ba = bigrams(na), bb = bigrams(nb);
    if (ba.size === 0 || bb.size === 0) return 0;
    let common = 0; for (const g of ba) if (bb.has(g)) common++;
    return (2 * common) / (ba.size + bb.size);
  };

  const findDuplicateSale = ({ inventoryId, platformId, salePrice, shipping, brand, category, productName }) => {
    const normStr = s => (s || '').trim().toLowerCase();
    const newTitle = normStr((brand || '') + ' ' + (productName || ''));
    const newBrand = normStr(brand);
    const newCat   = normStr(category);

    for (const s of data.sales || []) {
      if (editingSale && s.id === editingSale.id) continue;

      // ① 商品IDが一致（強制重複）
      if (platformId && platformId.trim() && s.platformId && s.platformId === platformId.trim()) {
        return { sale: s, reason: '商品IDが一致しています', level: 'strong' };
      }

      // ※ 同一inventoryId は重複ではなく「更新」として扱う（handleSaveで別途処理）

      // ② 複合条件（タイトル類似 + ブランド + カテゴリ + 価格 + 送料）
      const exInv = data.inventory.find(i => i.id === s.inventoryId);
      if (!exInv) continue;

      const exTitle = normStr((exInv.brand || '') + ' ' + (exInv.productName || ''));
      const similarity = diceSimilarity(newTitle, exTitle);
      if (similarity < 0.6) continue;

      const brandMatch = newBrand && normStr(exInv.brand) && newBrand === normStr(exInv.brand);
      if (!brandMatch) continue;

      const catMatch = newCat && normStr(exInv.category) && newCat === normStr(exInv.category);
      if (!catMatch) continue;

      const priceDiff = (salePrice && s.salePrice)
        ? Math.abs(s.salePrice - Number(salePrice)) / Math.max(s.salePrice, 1) : 1;
      if (priceDiff > 0.05) continue;

      const shipA = shipping != null ? Number(shipping) : null;
      const shipB = s.shipping    != null ? Number(s.shipping) : null;
      if (shipA != null && shipB != null && Math.abs(shipA - shipB) > 50) continue;

      const reasons = [
        `タイトル類似度 ${Math.round(similarity * 100)}%`,
        'ブランド一致', 'カテゴリ一致', '販売価格一致',
        ...(shipA != null && shipB != null ? ['送料一致'] : []),
      ];
      return { sale: s, reason: reasons.join(' · '), level: 'warning' };
    }
    return null;
  };

  const handleSave = () => {
    if (saving) return; // 二重タップ防止
    setFormError(null);

    // ── まとめ販売（複数アイテムを一括登録）新規・編集両対応 ──────────────
    if (bundleSale) {
      const filled = bundleSaleItems.filter(bi => bi.inventoryId && bi.salePrice !== '');
      if (filled.length < 2) {
        setFormError('まとめ販売は2件以上の商品と価格を入力してください');
        return;
      }
      setSaving(true);
      try {
        const ts = Date.now();
        const newSales = filled.map((bi, idx) => {
          const inv = data.inventory.find(i => i.id === bi.inventoryId);
          const sp  = Number(bi.salePrice);
          const ship = Number(bi.shipping) || 0;
          const pp  = inv?.purchasePrice || 0;
          return {
            id: `sale_${ts}_${idx}`,
            inventoryId: bi.inventoryId,
            userId: currentUser,
            platform: form.platform,
            salePrice: sp, feeRate: form.feeRate, shipping: ship,
            saleDate: form.saleDate, platformId: form.platformId || '',
            purchasePrice: pp,
            profit: Math.round(sp * (1 - form.feeRate) - ship - pp),
            listDate: inv?.listDate || '',
            turnoverDays: (inv?.listDate && form.saleDate)
              ? Math.max(0, Math.floor((new Date(form.saleDate) - new Date(inv.listDate)) / 86400000))
              : null,
            bundleGroup: `bundle_sale_${ts}`,
            bundleLabel: bi.label,
            createdAt: new Date(ts + idx).toISOString(),
          };
        });
        const updatedInv = data.inventory.map(i =>
          filled.some(bi => bi.inventoryId === i.id) ? { ...i, status: 'sold' } : i
        );
        const baseSales = editingSale
          ? data.sales.filter(s => s.id !== editingSale.id)
          : data.sales;
        setData({ ...data, inventory: updatedInv, sales: [...baseSales, ...newSales] });
        clearSaleDraft();
        toast(`✅ まとめ販売 ${newSales.length}件の売上を${editingSale ? '再登録' : '登録'}しました`);
        closeForm();
      } catch(e) {
        console.error('bundleSave error:', e);
        setFormError('保存中にエラーが発生しました。もう一度お試しください。');
      } finally {
        setSaving(false);
      }
      return;
    }

    // ── バリデーション（インライン表示） ──
    if (!form.inventoryId) {
      setFormError('商品を選択してください');
      return;
    }
    if (!form.salePrice) {
      setFormError('販売価格を入力してください');
      return;
    }

    const doSave = () => {
      setSaving(true);
      try {
        const listDate  = form.listDate || selectedItem?.listDate || '';
        const turnoverDays = calcTurnoverDays(listDate, form.saleDate);
        const purchasePriceVal = form.purchasePrice !== '' ? Number(form.purchasePrice) : (selectedItem?.purchasePrice || 0);

        // 在庫の仕入れ情報を更新（仕入れ値・仕入れ日・仕入れ先）
        const invPatch = selectedItem ? {
          ...(form.purchasePrice !== '' ? { purchasePrice: Number(form.purchasePrice) } : {}),
          ...(form.purchaseDate  ? { purchaseDate:  form.purchaseDate  } : {}),
          ...(form.purchaseStore ? { purchaseStore: form.purchaseStore } : {}),
        } : null;
        const updatedInventory = (invPatch && Object.keys(invPatch).length > 0 && selectedItem)
          ? data.inventory.map(i => i.id === selectedItem.id ? { ...i, ...invPatch } : i)
          : data.inventory;

        if (editingSale) {
          // ── 編集 ──
          const updated = {
            ...editingSale, ...form,
            salePrice: Number(form.salePrice), shipping: Number(form.shipping),
            purchasePrice: purchasePriceVal, profit, listDate, turnoverDays,
            platformId: form.platformId || '', updatedAt: new Date().toISOString(),
          };
          setData({ ...data, inventory: updatedInventory, sales: data.sales.map(s => s.id === editingSale.id ? updated : s) });
          clearSaleDraft();
          toast('✅ 売上を更新しました');
        } else {
          // ── 新規 ──
          const newSale = {
            id: Date.now().toString(), ...form, userId: currentUser,
            salePrice: Number(form.salePrice), shipping: Number(form.shipping),
            purchasePrice: purchasePriceVal, profit, listDate, turnoverDays,
            platformId: form.platformId || '', createdAt: new Date().toISOString(),
            productName: selectedItem?.productName || '',
            brand: selectedItem?.brand || '',
          };
          setData({ ...data, inventory: updatedInventory, sales: [...data.sales, newSale] });
          clearSaleDraft();
          toast('✅ 売上を記録しました');
        }
        closeForm();
      } catch(e) {
        console.error('doSave error:', e);
        setFormError('保存中にエラーが発生しました。もう一度お試しください。');
      } finally {
        setSaving(false);
      }
    };

    // 新規登録時のみ重複チェック
    if (!editingSale) {
      // ── 同一在庫商品（inventoryId）の既存売上があれば自動的に更新モードへ切替 ──
      // 重複ではなく「仕入れ情報の後付けマージ」として扱う
      const sameItemSale = form.inventoryId
        ? (data.sales || []).find(s => s.inventoryId === form.inventoryId)
        : null;
      if (sameItemSale) {
        // 既存売上を editingSale として設定し、フォームを merge した状態で再保存
        const listDate = form.listDate || selectedItem?.listDate || sameItemSale.listDate || '';
        const turnoverDays = calcTurnoverDays(listDate, sameItemSale.saleDate || form.saleDate);
        const purchasePriceVal = form.purchasePrice !== ''
          ? Number(form.purchasePrice)
          : (sameItemSale.purchasePrice ?? selectedItem?.purchasePrice ?? 0);
        const invPatch = selectedItem ? {
          ...(form.purchasePrice !== '' ? { purchasePrice: Number(form.purchasePrice) } : {}),
          ...(form.purchaseDate  ? { purchaseDate:  form.purchaseDate  } : {}),
          ...(form.purchaseStore ? { purchaseStore: form.purchaseStore } : {}),
        } : null;
        const updatedInventory = (invPatch && Object.keys(invPatch).length > 0 && selectedItem)
          ? data.inventory.map(i => i.id === selectedItem.id ? { ...i, ...invPatch } : i)
          : data.inventory;
        // 既存売上レコードに仕入れ情報・出品日をマージ（販売情報は既存を優先）
        const merged = {
          ...sameItemSale,
          purchasePrice: purchasePriceVal,
          listDate,
          turnoverDays,
          ...(form.platformId  ? { platformId:  form.platformId  } : {}),
          updatedAt: new Date().toISOString(),
        };
        setSaving(true);
        try {
          setData({ ...data, inventory: updatedInventory, sales: data.sales.map(s => s.id === sameItemSale.id ? merged : s) });
          clearSaleDraft();
          toast('✅ 既存の売上記録に仕入れ情報を反映しました');
          closeForm();
        } catch(e) {
          console.error('merge error:', e);
          setFormError('保存中にエラーが発生しました。もう一度お試しください。');
        } finally {
          setSaving(false);
        }
        return;
      }

      // ── 異なる商品の重複チェック ──
      const dup = findDuplicateSale({
        inventoryId: form.inventoryId,
        platformId:  form.platformId,
        salePrice:   Number(form.salePrice),
        shipping:    Number(form.shipping),
        brand:       selectedItem?.brand       || '',
        category:    selectedItem?.category    || '',
        productName: selectedItem?.productName || '',
      });
      if (dup) {
        setDupConfirm({ existingSale: dup.sale, reason: dup.reason, onConfirm: doSave });
        return;
      }
    }
    doSave();
  };

  const handleDelete = (saleId) => {
    if (!window.confirm('この売上記録を削除しますか？')) return;
    // ★ トゥームストーン: 削除した売上IDを記録し、クラウドとのマージで復活しないようにする
    const now = new Date().toISOString();
    const newDeletedIds = { ...(data.settings?._deletedIds || {}), [saleId]: now };
    setData({ ...data, sales: data.sales.filter(s => s.id !== saleId), settings: { ...data.settings, _deletedIds: newDeletedIds } });
    closeForm();
    toast('🗑️ 売上記録を削除しました');
  };

  // 孤立売上を除外（在庫に紐づかない売上は集計しない）
  const _salesInvIdSet = new Set((data.inventory||[]).map(i => i.id));
  const validSales = (data.sales||[]).filter(s => !s.inventoryId || _salesInvIdSet.has(s.inventoryId));
  // 実効仕入れ値（売上レコード or 在庫から取得）
  const getSalePP = (s) => {
    if ((s.purchasePrice||0) > 0) return s.purchasePrice;
    return (data.inventory||[]).find(i => i.id === s.inventoryId)?.purchasePrice || 0;
  };
  // 集計用：販売価格＋仕入れ値が両方揃っているものだけ
  const summarySales = validSales.filter(s => (s.salePrice||0) > 0 && getSalePP(s) > 0);
  // 未完了チェック（バッジ表示用）
  const isSaleIncomplete = (s) => !(s.salePrice > 0) || !(getSalePP(s) > 0);

  // 月次サマリー（集計用のみ使用）
  const salesByMonth = {};
  summarySales.forEach(s => {
    const m = s.saleDate?.slice(0,7) || 'unknown';
    if (!salesByMonth[m]) salesByMonth[m] = { revenue: 0, profit: 0, count: 0, platforms: {} };
    salesByMonth[m].revenue += s.salePrice || 0;
    salesByMonth[m].profit += s.profit || 0;
    salesByMonth[m].count++;
    const p = s.platform || 'その他';
    salesByMonth[m].platforms[p] = (salesByMonth[m].platforms[p] || 0) + 1;
  });
  const months = Object.keys(salesByMonth).sort().reverse();

  return (
    <div className="fade-in">
      <div className="header" style={{position:'sticky',top:0,zIndex:50,display:'flex',justifyContent:'space-between',alignItems:'center',paddingRight:12}}>
        <h1 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:'-0.02em'}}>💰 売上記録</h1>
        <button className="btn-primary" style={{padding:'8px 16px',fontSize:14,fontWeight:700,borderRadius:12,flexShrink:0,touchAction:'manipulation'}}
          onClick={openNew}>
          ＋ 登録
        </button>
      </div>

      <div style={{padding:'12px 16px'}}>
        {unrecordedSold.length > 0 && (
          <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:12,marginBottom:12,fontSize:13}}>
            <div style={{fontWeight:700,color:'#92400e',marginBottom:4}}>⚠️ 売上未記録の商品が{unrecordedSold.length}件あります</div>
            <div style={{color:'#92400e'}}>「売上登録」から記録してください</div>
          </div>
        )}

        {/* 販売履歴一括取込ボタン */}
        <button onClick={() => { if (!apiKey) { toast('⚠️ APIキーを設定してください'); return; } batchInputRef.current?.click(); }}
          style={{width:'100%',marginBottom:16,padding:'11px',borderRadius:12,border:'1.5px dashed #d1d5db',
            background:'#fafafa',color:'#555',fontWeight:600,fontSize:14,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            WebkitTapHighlightColor:'transparent'}}>
          {batchLoading
            ? `📸 読み取り中… ${batchLoading.done}/${batchLoading.total}枚`
            : '📸 メルカリ販売履歴を一括取込'}
        </button>

        {/* 月次サマリー */}
        {months.length > 0 && (
          <>
            <div className="section-title">月次サマリー</div>
            {months.map(m => {
              const mData = salesByMonth[m];
              const mProfitRate = mData.revenue > 0 ? Math.round(mData.profit / mData.revenue * 100) : 0;
              const platformEntries = Object.entries(mData.platforms).sort((a,b) => b[1]-a[1]);
              const isGood = mData.profit >= 0;
              return (
                <div key={m} className="card" style={{marginBottom:10,overflow:'hidden',cursor:'pointer'}}
                  onClick={() => setMonthDetail(m)}>
                  {/* ヘッダー帯 */}
                  <div style={{background: isGood ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#dc2626,#ef4444)',
                    padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontWeight:800,fontSize:15,color:'white',letterSpacing:'-0.02em'}}>{m.replace('-','年')}月</div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{color:'rgba(255,255,255,0.9)',fontSize:13,fontWeight:700}}>
                        利益率 {mProfitRate}% · {mData.count}件
                      </div>
                      <span style={{color:'rgba(255,255,255,0.7)',fontSize:16}}>›</span>
                    </div>
                  </div>
                  <div style={{padding:'12px 16px'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:10}}>
                      <div>
                        <div style={{fontSize:11,color:'#aaa',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:3}}>売上</div>
                        <div style={{fontWeight:800,fontSize:20,color:'#111',letterSpacing:'-0.02em'}}>¥{formatMoney(mData.revenue)}</div>
                      </div>
                      <div>
                        <div style={{fontSize:11,color:'#aaa',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:3}}>純利益</div>
                        <div style={{fontWeight:800,fontSize:20,color: isGood ? '#16a34a' : '#dc2626',letterSpacing:'-0.02em'}}>¥{formatMoney(mData.profit)}</div>
                      </div>
                    </div>
                    {platformEntries.length > 0 && (
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {platformEntries.map(([p,cnt]) => (
                          <span key={p} style={{fontSize:11,background:'#f3f4f6',color:'#555',borderRadius:99,padding:'3px 10px',fontWeight:700}}>{p} {cnt}件</span>
                        ))}
                      </div>
                    )}
                    <div style={{marginTop:8,fontSize:11,color:'#bbb',fontWeight:600,textAlign:'right'}}>タップして明細を見る →</div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* 今月の利益ランキング */}
        {(() => {
          const now = new Date();
          const cm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
          const thisMonth = summarySales
            .filter(s => s.saleDate?.startsWith(cm))
            .map(s => ({ ...s, item: data.inventory.find(i => i.id === s.inventoryId) }))
            .sort((a,b) => (b.profit||0) - (a.profit||0));
          if (thisMonth.length < 2) return null;
          const top3    = thisMonth.slice(0, 3);
          const worst3  = [...thisMonth].reverse().slice(0, 3);
          const RankRow = ({ s, rank, isWorst }) => {
            const rate = s.salePrice > 0 ? Math.round((s.profit||0)/s.salePrice*100) : 0;
            const isPos = (s.profit||0) >= 0;
            return (
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',
                borderBottom:'1px solid #f3f4f6'}}>
                <div style={{width:22,height:22,borderRadius:99,display:'flex',alignItems:'center',justifyContent:'center',
                  fontWeight:800,fontSize:12,flexShrink:0,
                  background: rank===1 ? (isWorst?'#fef2f2':'#fef9c3') : '#f3f4f6',
                  color: rank===1 ? (isWorst?'#dc2626':'#ca8a04') : '#888'}}>
                  {rank}
                </div>
                <div style={{flex:1,minWidth:0,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#333',fontWeight:600}}>
                  {(s.item?.brand || s.brand) && <span style={{color:'#bbb',fontSize:11,marginRight:4}}>{s.item?.brand || s.brand}</span>}
                  {s.item?.productName || s.productName || '商品'}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:800,color: isPos?'#16a34a':'#dc2626'}}>
                    {isPos?'+':''}¥{formatMoney(s.profit)}
                  </div>
                  <div style={{fontSize:10,color:'#aaa'}}>{rate}%</div>
                </div>
              </div>
            );
          };
          return (
            <div style={{marginBottom:12}}>
              <div className="section-title">今月の利益ランキング</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div className="card" style={{padding:'12px 14px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#ca8a04',marginBottom:8}}>🏆 トップ {top3.length}件</div>
                  {top3.map((s,i) => <RankRow key={s.id} s={s} rank={i+1} isWorst={false}/>)}
                </div>
                <div className="card" style={{padding:'12px 14px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#dc2626',marginBottom:8}}>📉 ワースト {worst3.length}件</div>
                  {worst3.map((s,i) => <RankRow key={s.id} s={s} rank={i+1} isWorst={true}/>)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 売上記録一覧（仕入れ日順） */}
        {validSales.length > 0 && (
          <>
            <div className="section-title">売上記録一覧</div>
            {[...validSales].sort((a, b) => {
              const ia = data.inventory.find(i => i.id === a.inventoryId) || {};
              const ib = data.inventory.find(i => i.id === b.inventoryId) || {};
              const da = ia.purchaseDate || a.purchaseDate || '';
              const db = ib.purchaseDate || b.purchaseDate || '';
              // 仕入れ日の昇順（古い仕入れ順）。同日は売却日の昇順
              if (da !== db) return da < db ? -1 : 1;
              return (a.saleDate||'') < (b.saleDate||'') ? -1 : 1;
            }).map(s => {
              const item = data.inventory.find(i => i.id === s.inventoryId);
              const sProfitRate = s.salePrice > 0 ? Math.round((s.profit || 0) / s.salePrice * 100) : 0;
              const isProfit = (s.profit || 0) >= 0;
              const incomplete = isSaleIncomplete(s);
              return (
                <div key={s.id} className="card" style={{padding:'12px 14px',marginBottom:8,display:'flex',gap:12,alignItems:'center',cursor:'pointer',
                  borderLeft: incomplete ? '3px solid #f59e0b' : 'none'}}
                  onClick={() => openEdit(s)}>
                  <ItemThumbnail thumbId={item?.photos?.[0]?.thumbId} thumbDataUrl={item?.photos?.[0]?.thumbDataUrl} size={52} fallback="💰" />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#111',marginBottom:3}}>
                      {(item?.brand || s.brand) && <span style={{color:'#aaa',fontWeight:700,fontSize:11,marginRight:5,textTransform:'uppercase'}}>{item?.brand || s.brand}</span>}
                      {item?.productName || s.productName || s.memo || '商品'}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                      <span style={{fontSize:11,background:'#f3f4f6',color:'#555',borderRadius:99,padding:'2px 8px',fontWeight:700}}>{s.platform}</span>
                      <span style={{fontSize:11,color:'#bbb'}}>{s.saleDate}</span>
                      {incomplete && (
                        <span style={{fontSize:10,background:'#fff7ed',color:'#c2410c',borderRadius:99,
                          padding:'1px 7px',fontWeight:700,border:'1px solid #fed7aa'}}>
                          ⚠ 仕入れ値未入力
                        </span>
                      )}
                    </div>
                    {(item?.purchaseDate || item?.purchaseStore || item?.storeName || item?.category) && (
                      <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap',marginTop:3}}>
                        {item.purchaseDate && <span style={{fontSize:10,color:'#9ca3af'}}>仕入: {item.purchaseDate}</span>}
                        {(item.purchaseStore || item.storeName) && <span style={{fontSize:10,color:'#9ca3af'}}>・{item.purchaseStore||item.storeName}</span>}
                        {item.category && <span style={{fontSize:10,color:'#9ca3af'}}>・{item.category}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontWeight:800,fontSize:15,color:'#111',letterSpacing:'-0.02em'}}>¥{formatMoney(s.salePrice)}</div>
                    {incomplete ? (
                      <div style={{fontSize:11,color:'#f59e0b',fontWeight:700,marginTop:2}}>集計対象外</div>
                    ) : (
                      <div style={{
                        fontSize:12,fontWeight:700,marginTop:2,
                        color: isProfit ? '#16a34a' : '#dc2626',
                        background: isProfit ? '#f0fdf4' : '#fef2f2',
                        borderRadius:99, padding:'2px 8px', display:'inline-block'}}>
                        {isProfit ? '+' : ''}¥{formatMoney(s.profit)} ({sProfitRate}%)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* 月次詳細モーダル */}
      {monthDetail && (() => {
        const [y, mo] = monthDetail.split('-');
        const label = `${y}年${parseInt(mo)}月`;
        // 一覧はすべての有効売上（未完了も表示して編集できるように）
        const mdSales = validSales
          .filter(s => s.saleDate?.startsWith(monthDetail))
          .sort((a, b) => (b.saleDate||'') > (a.saleDate||'') ? 1 : -1);
        // 集計は完全データのみ
        const mdCompleteSales = summarySales.filter(s => s.saleDate?.startsWith(monthDetail));
        const mdRevenue = mdCompleteSales.reduce((s, r) => s + (r.salePrice||0), 0);
        const mdProfit  = mdCompleteSales.reduce((s, r) => s + (r.profit||0), 0);
        const mdRate    = mdRevenue > 0 ? Math.round(mdProfit / mdRevenue * 100) : 0;
        return (
          <div className="modal-overlay" onClick={() => setMonthDetail(null)}>
            <div className="modal-content slide-up" onClick={e => e.stopPropagation()}
              style={{maxHeight:'88vh',display:'flex',flexDirection:'column',padding:0,overflow:'hidden'}}>

              {/* ヘッダー */}
              <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',padding:'16px 18px',borderRadius:'20px 20px 0 0',flexShrink:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div style={{fontWeight:800,fontSize:17,color:'white'}}>{label} 売上明細</div>
                  <button onClick={() => setMonthDetail(null)}
                    style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:99,width:30,height:30,
                      fontSize:18,cursor:'pointer',color:'white',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[['売上', `¥${formatMoney(mdRevenue)}`, 'white'],
                    ['純利益', `¥${formatMoney(mdProfit)}`, mdProfit >= 0 ? '#4ade80' : '#f87171'],
                    ['利益率', `${mdRate}%`, '#93c5fd']].map(([l,v,c]) => (
                    <div key={l} style={{background:'rgba(255,255,255,0.07)',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',fontWeight:700,marginBottom:3}}>{l}</div>
                      <div style={{fontSize:15,fontWeight:800,color:c,letterSpacing:'-0.02em'}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:8,fontSize:12,color:'rgba(255,255,255,0.5)',textAlign:'right'}}>{mdSales.length}件</div>
              </div>

              {/* 商品リスト */}
              <div style={{overflowY:'auto',flex:1,padding:'12px 14px',WebkitOverflowScrolling:'touch'}}>
                {mdSales.length === 0 ? (
                  <div style={{textAlign:'center',color:'#aaa',padding:40,fontSize:14}}>データがありません</div>
                ) : mdSales.map(s => {
                  const inv = data.inventory.find(i => i.id === s.inventoryId);
                  const isPos = (s.profit||0) >= 0;
                  const rate  = s.salePrice > 0 ? Math.round((s.profit||0) / s.salePrice * 100) : 0;
                  const mdIncomplete = isSaleIncomplete(s);
                  return (
                    <div key={s.id} style={{display:'flex',alignItems:'center',gap:11,
                      padding:'10px 0',borderBottom:'1px solid #f3f4f6',cursor:'pointer',
                      borderLeft: mdIncomplete ? '3px solid #f59e0b' : '3px solid transparent',
                      paddingLeft: 6,
                      WebkitTapHighlightColor:'rgba(0,0,0,0.04)'}}
                      onClick={() => { setMonthDetail(null); openEdit(s); }}>
                      {/* サムネイル */}
                      <div style={{flexShrink:0}}>
                        <ItemThumbnail
                          thumbId={inv?.photos?.[0]?.thumbId}
                          thumbDataUrl={inv?.photos?.[0]?.thumbDataUrl}
                          size={50} fallback="💰" />
                      </div>
                      {/* 商品情報 */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',
                          whiteSpace:'nowrap',color:'#111',lineHeight:1.3}}>
                          {(inv?.brand || s.brand) && <span style={{color:'#bbb',fontSize:11,marginRight:4}}>{inv?.brand || s.brand}</span>}
                          {inv?.productName || s.productName || s.memo || '商品'}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4,flexWrap:'wrap'}}>
                          <span style={{fontSize:11,background:'#f3f4f6',color:'#555',borderRadius:99,
                            padding:'2px 8px',fontWeight:700,flexShrink:0}}>{s.platform||'−'}</span>
                          <span style={{fontSize:11,color:'#bbb',flexShrink:0}}>{s.saleDate}</span>
                          {mdIncomplete && (
                            <span style={{fontSize:10,background:'#fff7ed',color:'#c2410c',borderRadius:99,
                              padding:'1px 6px',fontWeight:700,border:'1px solid #fed7aa',flexShrink:0}}>
                              ⚠ 仕入れ値未入力
                            </span>
                          )}
                        </div>
                      </div>
                      {/* 金額 */}
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontWeight:800,fontSize:14,color:'#111'}}>¥{formatMoney(s.salePrice)}</div>
                        {mdIncomplete ? (
                          <div style={{fontSize:11,color:'#f59e0b',fontWeight:700,marginTop:3}}>集計対象外</div>
                        ) : (
                          <div style={{fontSize:11,fontWeight:700,marginTop:3,
                            color: isPos ? '#16a34a' : '#dc2626',
                            background: isPos ? '#f0fdf4' : '#fef2f2',
                            borderRadius:99,padding:'2px 7px',display:'inline-block'}}>
                            {isPos?'+':''}¥{formatMoney(s.profit)} ({rate}%)
                          </div>
                        )}
                      </div>
                      {/* 編集アイコン */}
                      <div style={{flexShrink:0,color:'#d1d5db',fontSize:15,paddingLeft:2}}>✏️</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* バッチ取込レビューモーダル */}
      {batchRows && (
        <div className="modal-overlay" onClick={() => setBatchRows(null)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()}
            style={{maxHeight:'90vh',display:'flex',flexDirection:'column',padding:0,overflow:'hidden'}}>

            {/* ヘッダー */}
            <div style={{padding:'16px 18px',borderBottom:'1px solid #f0f0f0',flexShrink:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div style={{fontWeight:800,fontSize:16}}>📸 販売履歴一括取込</div>
                <button onClick={() => setBatchRows(null)}
                  style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#666'}}>×</button>
              </div>
              <div style={{fontSize:12,color:'#888'}}>
                {batchRows.filter(r=>!r.skip&&(r.inventoryId||r.mode==='new')).length}件を登録
                {batchRows.filter(r=>r.isDuplicate).length > 0 && (
                  <span style={{marginLeft:6,color:'#d97706',fontWeight:700}}>
                    · ⚠️ 重複候補{batchRows.filter(r=>r.isDuplicate).length}件（チェック外し済み）
                  </span>
                )}
              </div>
            </div>

            {/* 行リスト */}
            <div style={{overflowY:'auto',flex:1,padding:'8px 14px',WebkitOverflowScrolling:'touch'}}>
              {batchRows.map((row, idx) => {
                const ex = row.extracted;
                const nf = row.newForm;
                return (
                  <div key={idx} style={{padding:'12px 0',borderBottom:'1px solid #f0f0f0',
                    opacity: row.skip ? 0.4 : 1, transition:'opacity 0.2s'}}>
                    <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                      {/* チェックボックス */}
                      <input type="checkbox" checked={!row.skip}
                        onChange={e => updateBatchRow(idx, {skip:!e.target.checked})}
                        style={{marginTop:2,width:18,height:18,flexShrink:0,accentColor:'var(--color-primary)',cursor:'pointer'}}/>
                      <div style={{flex:1,minWidth:0}}>
                        {/* 商品名 + 重複バッジ */}
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
                          <div style={{fontSize:12,fontWeight:700,color:'#111',
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>{ex.product_name}</div>
                          {row.isDuplicate && (
                            <span style={{fontSize:10,fontWeight:700,color:'#d97706',background:'#fef3c7',
                              border:'1px solid #fcd34d',borderRadius:99,padding:'2px 8px',flexShrink:0,whiteSpace:'nowrap'}}>
                              ⚠️ 重複候補
                            </span>
                          )}
                        </div>
                        {/* 重複詳細（既存レコード情報） */}
                        {row.isDuplicate && row.duplicateSale && (
                          <div style={{fontSize:10,color:'#b45309',background:'#fffbeb',border:'1px solid #fcd34d',
                            borderRadius:8,padding:'5px 8px',marginBottom:6}}>
                            {row.duplicateReason && (
                              <div style={{fontWeight:700,marginBottom:3}}>{row.duplicateReason}</div>
                            )}
                            <span style={{fontWeight:700}}>登録済み：</span>
                            {row.duplicateSale.saleDate} · 販売価格 ¥{formatMoney(row.duplicateSale.salePrice)} · {row.duplicateSale.platform || 'フリマ'}
                            {row.duplicateSale.platformId ? ` · ID:${row.duplicateSale.platformId}` : ''}
                            <span style={{display:'block',marginTop:2,color:'#999'}}>
                              ※チェックを入れると重複登録されます
                            </span>
                          </div>
                        )}
                        {/* 金額サマリー（ラベル付き） */}
                        <div style={{display:'flex',gap:6,fontSize:11,color:'#666',flexWrap:'wrap',marginBottom:8}}>
                          {ex.sale_price != null && <span style={{fontWeight:700,color:'#0369a1'}}>販売価格：¥{formatMoney(ex.sale_price)}</span>}
                          {ex.platform_fee != null && <span>手数料：¥{formatMoney(ex.platform_fee)}</span>}
                          {ex.shipping != null && <span>送料：¥{formatMoney(ex.shipping)}</span>}
                          {ex.profit != null && (
                            <span style={{fontWeight:700,color:ex.profit>=0?'#16a34a':'#dc2626'}}>
                              利益：{ex.profit>=0?'+':''}¥{formatMoney(ex.profit)}
                            </span>
                          )}
                          {ex.sale_date && <span style={{color:'#bbb'}}>📅{ex.sale_date}</span>}
                        </div>

                        {/* モード切替タブ */}
                        <div style={{display:'flex',gap:4,marginBottom:8}}>
                          {[['new','新規仕入れ登録'],['match','既存在庫と紐付け']].map(([m,l]) => (
                            <button key={m} onClick={() => updateBatchRow(idx,{mode:m})}
                              style={{flex:1,padding:'5px 0',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,
                                background: row.mode===m ? '#0f172a' : '#f3f4f6',
                                color: row.mode===m ? 'white' : '#888',
                                WebkitTapHighlightColor:'transparent'}}>
                              {l}
                            </button>
                          ))}
                        </div>

                        {/* 新規仕入れ登録フォーム */}
                        {row.mode === 'new' && (
                          <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 10px 6px',border:'1px solid #e2e8f0'}}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                              <div>
                                <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:2}}>ブランド</div>
                                <input value={nf.brand} onChange={e=>updateBatchNewForm(idx,'brand',e.target.value)}
                                  placeholder="例: Gucci"
                                  style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:12,boxSizing:'border-box'}}/>
                              </div>
                              <div>
                                <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:2}}>カテゴリー</div>
                                <select value={nf.category} onChange={e=>updateBatchNewForm(idx,'category',e.target.value)}
                                  style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:12,background:'white',boxSizing:'border-box'}}>
                                  <option value="">選択...</option>
                                  {['バッグ','衣類','小物','シューズ','毛皮','その他'].map(c=><option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                            </div>
                            <div style={{marginBottom:6}}>
                              <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:2}}>商品名</div>
                              <input value={nf.productName} onChange={e=>updateBatchNewForm(idx,'productName',e.target.value)}
                                style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:12,boxSizing:'border-box'}}/>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                              <div>
                                <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:2}}>仕入れ値（円）</div>
                                <input type="number" value={nf.purchasePrice} onChange={e=>updateBatchNewForm(idx,'purchasePrice',e.target.value)}
                                  placeholder="0"
                                  style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:12,boxSizing:'border-box'}}/>
                              </div>
                              <div>
                                <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:2}}>仕入れ日</div>
                                <input type="date" value={nf.purchaseDate} onChange={e=>updateBatchNewForm(idx,'purchaseDate',e.target.value)}
                                  style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:12,background:'white',boxSizing:'border-box'}}/>
                              </div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                              <div>
                                <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:2}}>仕入れ先</div>
                                <input value={nf.purchaseStore} onChange={e=>updateBatchNewForm(idx,'purchaseStore',e.target.value)}
                                  placeholder="例: ヤフオク"
                                  style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:12,boxSizing:'border-box'}}/>
                              </div>
                              <div>
                                <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:2}}>出品日</div>
                                <input type="date" value={nf.listDate} onChange={e=>updateBatchNewForm(idx,'listDate',e.target.value)}
                                  style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:12,background:'white',boxSizing:'border-box'}}/>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 既存在庫紐付けモード */}
                        {row.mode === 'match' && !row.splitEnabled && (
                          <div>
                            {row.matchedItem ? (
                              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                                <span style={{fontSize:11,background:'#f0fdf4',color:'#16a34a',borderRadius:99,
                                  padding:'3px 10px',fontWeight:700,border:'1px solid #bbf7d0'}}>
                                  ✓ {row.matchedItem.brand} {row.matchedItem.productName}
                                </span>
                                <button onClick={() => updateBatchRow(idx,{matchedItem:null,inventoryId:''})}
                                  style={{fontSize:11,color:'#888',background:'none',border:'none',cursor:'pointer',padding:0}}>変更</button>
                              </div>
                            ) : null}
                            <select value={row.inventoryId}
                              onChange={e => {
                                const inv = data.inventory.find(it => it.id === e.target.value);
                                updateBatchRow(idx,{inventoryId:e.target.value, matchedItem:inv||null});
                              }}
                              style={{marginTop: row.matchedItem ? 6 : 0, width:'100%',padding:'7px 8px',borderRadius:8,
                                border:'1px solid #e5e7eb',fontSize:12,background:'white',color:'#333',display: row.matchedItem ? 'none' : 'block'}}>
                              <option value="">在庫から選択...</option>
                              {data.inventory.map(i => (
                                <option key={i.id} value={i.id}>{i.brand} {i.productName}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* ── 分割登録セクション ── */}
                        <div style={{marginTop:8,paddingTop:8,borderTop:'1px dashed #e5e7eb'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom: row.splitEnabled ? 8 : 0}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{fontSize:12,fontWeight:700,color:'#475569'}}>📦 分割登録</span>
                              {(ex.product_name||'').includes('まとめ') && !row.splitEnabled && (
                                <span style={{fontSize:10,color:'#d97706',background:'#fef3c7',borderRadius:99,padding:'1px 7px',fontWeight:700,border:'1px solid #fcd34d'}}>
                                  まとめ商品
                                </span>
                              )}
                            </div>
                            <button onClick={() => updateBatchRow(idx, { splitEnabled: !row.splitEnabled })}
                              style={{padding:'3px 10px',borderRadius:99,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,
                                background: row.splitEnabled ? '#1e293b' : '#f3f4f6',
                                color: row.splitEnabled ? 'white' : '#666',
                                WebkitTapHighlightColor:'transparent'}}>
                              {row.splitEnabled ? 'ON' : 'OFF'}
                            </button>
                          </div>

                          {row.splitEnabled && (() => {
                            const splitItems = row.splitItems || [];
                            const totalSplit = splitItems.reduce((s,si) => s + (Number(si.salePrice)||0), 0);
                            const rowTotal = ex.sale_price || 0;
                            const updateSplitItem = (siIdx, patch) =>
                              updateBatchRow(idx, { splitItems: splitItems.map((si,i) => i===siIdx ? {...si,...patch} : si) });
                            const setSplitCount = (n) => {
                              const current = splitItems.slice(0, n);
                              while (current.length < n) current.push({ inventoryId: '', salePrice: '' });
                              updateBatchRow(idx, { splitItems: current });
                            };
                            return (
                              <>
                                {/* 分割数 */}
                                <div style={{display:'flex',gap:4,marginBottom:8}}>
                                  {[2,3,4].map(n => (
                                    <button key={n} onClick={() => setSplitCount(n)}
                                      style={{padding:'3px 10px',borderRadius:99,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,
                                        background: splitItems.length===n ? '#1e293b' : '#f3f4f6',
                                        color: splitItems.length===n ? 'white' : '#666'}}>
                                      {n}件
                                    </button>
                                  ))}
                                  {splitItems.length < 6 && (
                                    <button onClick={() => setSplitCount(splitItems.length+1)}
                                      style={{padding:'3px 8px',borderRadius:99,border:'1.5px dashed #d1d5db',background:'white',fontSize:12,cursor:'pointer',color:'#666',fontWeight:700}}>＋</button>
                                  )}
                                  {splitItems.length > 2 && (
                                    <button onClick={() => setSplitCount(splitItems.length-1)}
                                      style={{padding:'3px 8px',borderRadius:99,border:'1.5px dashed #fca5a5',background:'white',fontSize:12,cursor:'pointer',color:'#dc2626',fontWeight:700}}>－</button>
                                  )}
                                </div>
                                {/* 各アイテム */}
                                {splitItems.map((si, siIdx) => (
                                  <div key={siIdx} style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px',marginBottom:6,border:'1px solid #e2e8f0'}}>
                                    <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4}}>
                                      <span style={{fontWeight:800,fontSize:10,color:'white',background:'#475569',borderRadius:99,padding:'1px 8px',flexShrink:0}}>
                                        商品{SALE_BUNDLE_LABELS[siIdx]||siIdx+1}
                                      </span>
                                    </div>
                                    <select value={si.inventoryId}
                                      onChange={e => updateSplitItem(siIdx, {inventoryId: e.target.value})}
                                      style={{width:'100%',padding:'5px 7px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:11,background:'white',color:'#333',marginBottom:4}}>
                                      <option value="">在庫から選択...</option>
                                      {data.inventory.filter(i => i.status !== 'sold').map(i => (
                                        <option key={i.id} value={i.id}>{i.brand} {i.productName}</option>
                                      ))}
                                    </select>
                                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                                      <span style={{fontSize:11,color:'#666',flexShrink:0}}>販売価格</span>
                                      <input type="number" value={si.salePrice} placeholder="0"
                                        onChange={e => updateSplitItem(siIdx, {salePrice: e.target.value})}
                                        style={{flex:1,padding:'4px 6px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:12,fontWeight:700,background:'white',textAlign:'right'}}/>
                                      <span style={{fontSize:11,color:'#666'}}>円</span>
                                    </div>
                                  </div>
                                ))}
                                {/* 合計確認 */}
                                <div style={{fontSize:11,padding:'5px 8px',borderRadius:7,
                                  background: totalSplit > 0 && rowTotal && totalSplit === rowTotal ? '#f0fdf4' : '#f8fafc',
                                  border:`1px solid ${totalSplit > 0 && rowTotal && totalSplit === rowTotal ? '#bbf7d0' : '#e2e8f0'}`,
                                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                  <span>分割合計：<b>¥{totalSplit.toLocaleString()}</b></span>
                                  {rowTotal ? (
                                    totalSplit === rowTotal
                                      ? <span style={{color:'#16a34a',fontWeight:700}}>✓ 合計一致</span>
                                      : <span style={{color:'#999'}}>/ 合計 ¥{rowTotal.toLocaleString()}</span>
                                  ) : null}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* フッター */}
            <div style={{padding:'12px 16px',borderTop:'1px solid #f0f0f0',flexShrink:0,display:'flex',gap:8}}>
              <button onClick={() => setBatchRows(null)}
                style={{flex:1,padding:12,borderRadius:12,border:'1px solid #e5e7eb',background:'white',
                  color:'#555',fontWeight:600,fontSize:14,cursor:'pointer'}}>
                キャンセル
              </button>
              <button onClick={executeBatchSave}
                style={{flex:2,padding:12,borderRadius:12,border:'none',background:'var(--color-primary)',
                  color:'white',fontWeight:700,fontSize:14,cursor:'pointer'}}>
                {batchRows.filter(r=>!r.skip&&(r.inventoryId||r.mode==='new')).length}件を一括登録
              </button>
            </div>
          </div>
        </div>
      )}

      {/* バッチ取込用 file input（複数選択対応） */}
      <input ref={batchInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/*" multiple
        style={{position:'fixed',top:0,left:0,width:'0.1px',height:'0.1px',opacity:0,overflow:'hidden',pointerEvents:'none'}}
        onChange={handleBatchSsInput}/>

      {/* スクショ確認モーダル（複数候補対応） */}
      {ssCandidate && (
        <div className="modal-overlay" onClick={() => setSsCandidate(null)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:16}}>📸 スクショ読み取り結果</div>
              <button onClick={() => setSsCandidate(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#666'}}>×</button>
            </div>

            {/* 読み取り結果サマリー */}
            <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'10px 12px',marginBottom:14,fontSize:13}}>
              <div style={{fontWeight:600,marginBottom:4,color:'#0369a1'}}>{ssCandidate.extracted.platform || 'フリマ'} · {ssCandidate.extracted.product_name}</div>
              <div style={{color:'#555',display:'flex',gap:12,flexWrap:'wrap'}}>
                {ssCandidate.extracted.sale_price && <span style={{fontWeight:700,color:'#0369a1'}}>販売価格：¥{formatMoney(ssCandidate.extracted.sale_price)}</span>}
                {ssCandidate.extracted.platform_fee && <span>手数料：¥{formatMoney(ssCandidate.extracted.platform_fee)}</span>}
                {ssCandidate.extracted.shipping != null && <span>送料：¥{formatMoney(ssCandidate.extracted.shipping)}</span>}
                {ssCandidate.extracted.profit && <span style={{color:'#16a34a'}}>利益：¥{formatMoney(ssCandidate.extracted.profit)}</span>}
                {ssCandidate.extracted.sale_date && <span>📅 {ssCandidate.extracted.sale_date}</span>}
                {ssCandidate.extracted.product_id && <span>ID: {ssCandidate.extracted.product_id}</span>}
              </div>
            </div>

            {/* 候補一覧（タップで選択） */}
            <div style={{fontSize:13,color:'#666',marginBottom:8}}>
              {ssCandidate.candidates.length === 1 ? 'この商品でいいですか？' : `候補が${ssCandidate.candidates.length}件見つかりました。タップして選択してください。`}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
              {ssCandidate.candidates.map(item => (
                <button key={item.id}
                  style={{background:'#f8f8f8',border:'2px solid #e5e5e5',borderRadius:12,padding:'10px 12px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left',width:'100%'}}
                  onClick={() => {
                    const ex = ssCandidate.extracted;
                    const platform = ex.platform || 'メルカリ';
                    const fees = data.settings?.platformFees || CONFIG.PLATFORM_FEES;
                    const feeRate = (ex.sale_price && ex.platform_fee)
                      ? Math.round(ex.platform_fee / ex.sale_price * 1000) / 1000
                      : (fees[platform] ?? 0.10);
                    setForm({
                      inventoryId:   item.id,
                      platform,
                      salePrice:     String(ex.sale_price || ''),
                      feeRate,
                      shipping:      String(ex.shipping != null ? ex.shipping : CONFIG.ESTIMATED_SHIPPING),
                      saleDate:      ex.sale_date || today(),
                      platformId:    ex.product_id || '',
                      purchaseDate:  item.purchaseDate  || '',  // 在庫から引き継ぐ（売上SSからは設定しない）
                      purchaseStore: item.purchaseStore || '',  // 在庫から引き継ぐ
                    });
                    setSsCandidate(null);
                    setShowForm(true);
                  }}>
                  <ItemThumbnail thumbId={item.photos?.[0]?.thumbId} thumbDataUrl={item.photos?.[0]?.thumbDataUrl} size={46} fallback="📦"/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.brand} {item.productName}</div>
                    <div style={{fontSize:11,color:'#999',marginTop:2}}>仕入れ ¥{formatMoney(item.purchasePrice)} · {item.modelNumber || '型番なし'}</div>
                  </div>
                  <span style={{color:'#E84040',fontWeight:700,fontSize:18}}>›</span>
                </button>
              ))}
            </div>

            <button style={{width:'100%',background:'#f0f0f0',border:'none',borderRadius:10,padding:'11px',fontWeight:600,cursor:'pointer',fontSize:14}}
              onClick={() => setSsCandidate(null)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* スクショ用file input（モーダルの外に置かないとiOSで動かない） */}
      <input ref={ssInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/*"
        style={{position:'fixed',top:0,left:0,width:'0.1px',height:'0.1px',opacity:0,overflow:'hidden',pointerEvents:'none'}}
        onChange={handleSsInput}/>

      {/* 売上登録・編集モーダル */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content slide-up" style={{paddingBottom:'calc(24px + env(safe-area-inset-bottom))'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:17}}>{editingSale ? '✏️ 売上を編集' : '売上登録'}</div>
              <button onClick={closeForm} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#666'}}>×</button>
            </div>

            {/* 下書き復元バナー */}
            {saleDraftBanner && !editingSale && (
              <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:13}}>
                <div style={{fontWeight:600,color:'#166534',marginBottom:6}}>
                  📝 前回の入力途中データがあります（{saleDraftBanner.savedAt ? new Date(saleDraftBanner.savedAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}）
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button style={{flex:1,background:'#16a34a',color:'white',border:'none',borderRadius:8,padding:'8px',fontSize:13,fontWeight:600,cursor:'pointer'}}
                    onClick={() => {
                      setForm(saleDraftBanner.form || emptyForm);
                      if (saleDraftBanner.bundleSale) setBundleSale(true);
                      if (saleDraftBanner.bundleSaleItems) setBundleSaleItems(saleDraftBanner.bundleSaleItems);
                      if (saleDraftBanner.bundleSaleSplitMethod) setBundleSaleSplitMethod(saleDraftBanner.bundleSaleSplitMethod);
                      setSaleDraftBanner(null);
                    }}>復元する</button>
                  <button style={{flex:1,background:'white',color:'#dc2626',border:'1px solid #fca5a5',borderRadius:8,padding:'8px',fontSize:13,fontWeight:600,cursor:'pointer'}}
                    onClick={() => { clearSaleDraft(); setSaleDraftBanner(null); }}>破棄</button>
                </div>
              </div>
            )}

            {/* 編集時：商品情報カード */}
            {editingSale && (() => {
              const linkedItem = data.inventory.find(i => i.id === editingSale.inventoryId);
              if (!linkedItem) return null;
              return (
                <div style={{background:'#f8f8f8',borderRadius:12,padding:'10px 12px',marginBottom:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom: linkedItem.brand ? 0 : 8}}>
                    <ItemThumbnail thumbId={linkedItem.photos?.[0]?.thumbId} thumbDataUrl={linkedItem.photos?.[0]?.thumbDataUrl} size={44} fallback="📦" />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {linkedItem.brand && <span style={{color:'#888',fontSize:12,marginRight:4}}>{linkedItem.brand}</span>}
                        {linkedItem.productName}
                      </div>
                      <div style={{fontSize:11,color:'#999',marginTop:1}}>仕入れ ¥{formatMoney(linkedItem.purchasePrice)}</div>
                    </div>
                    <button style={{background:'#6b7280',color:'white',border:'none',borderRadius:8,padding:'6px 10px',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}
                      onClick={() => { closeForm(); setPendingReturnTab('sales'); setEditingItem(linkedItem); setTab('purchase'); }}>
                      仕入れ登録へ
                    </button>
                  </div>
                  {!linkedItem.brand && (
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>
                      <span style={{fontSize:11,color:'#dc2626',fontWeight:700,flexShrink:0}}>⚠️ ブランド未入力</span>
                      <input
                        className="input-field"
                        style={{flex:1,fontSize:13,padding:'5px 10px',height:'auto'}}
                        placeholder="ブランド名を入力"
                        onBlur={e => {
                          const val = e.target.value.trim();
                          if (!val) return;
                          const updated = data.inventory.map(i => i.id === linkedItem.id ? { ...i, brand: val } : i);
                          setData({ ...data, inventory: updated });
                          toast('✅ ブランドを保存しました');
                        }}
                      />
                    </div>
                  )}
                  {linkedItem.brand && (
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>
                      <span style={{fontSize:11,color:'#888',flexShrink:0}}>ブランド：</span>
                      <input
                        className="input-field"
                        style={{flex:1,fontSize:13,padding:'5px 10px',height:'auto'}}
                        defaultValue={linkedItem.brand}
                        onBlur={e => {
                          const val = e.target.value.trim();
                          if (val === linkedItem.brand) return;
                          const updated = data.inventory.map(i => i.id === linkedItem.id ? { ...i, brand: val } : i);
                          setData({ ...data, inventory: updated });
                          toast('✅ ブランドを更新しました');
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* スクショから自動読み込み */}
            <button style={{width:'100%',marginBottom:14,background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:12,padding:'12px',fontSize:14,fontWeight:600,cursor:'pointer',color:'#0369a1',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}
              onClick={() => ssInputRef.current?.click()} disabled={ssReading}>
              {ssReading ? <><span className="spinner"/><span>読み取り中...</span></> : '📸 メルカリのスクショから自動入力'}
            </button>

            {/* ── まとめ販売（分割登録）── */}
            <div style={{marginBottom:14,border:'1.5px solid',borderColor: bundleSale ? '#1e293b' : '#e5e7eb',borderRadius:12,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',
                background: bundleSale ? '#1e293b' : '#f8fafc',cursor:'pointer'}}
                onClick={() => setBundleSale(v => !v)}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color: bundleSale ? 'white' : '#333'}}>📦 まとめ販売（分割登録）</div>
                  <div style={{fontSize:11,color: bundleSale ? '#94a3b8' : '#999',marginTop:1}}>複数商品を1回の売上から分割登録</div>
                </div>
                <div style={{padding:'5px 14px',borderRadius:99,fontSize:13,fontWeight:700,
                  background: bundleSale ? 'white' : '#e5e7eb',
                  color: bundleSale ? '#1e293b' : '#555'}}>
                  {bundleSale ? 'ON' : 'OFF'}
                </div>
              </div>

              {bundleSale && (
                <div style={{padding:'12px 14px',borderTop:'1px solid #e5e7eb'}}>
                  {/* 分割数 */}
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'#888',fontWeight:700,marginBottom:6}}>分割数</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {[2,3,4].map(n => (
                        <button key={n} onClick={() => {
                          const newItems = initSaleBundleItems(n);
                          if (bundleSaleSplitMethod==='equal' && Number(form.salePrice)>0) {
                            const total=Number(form.salePrice), base=Math.floor(total/n), rem=total-base*n;
                            const totalShip=Number(form.shipping)||0, baseShip=Math.floor(totalShip/n), remShip=totalShip-baseShip*n;
                            setBundleSaleItems(newItems.map((bi,i)=>({...bi,salePrice:String(i===n-1?base+rem:base),shipping:String(i===n-1?baseShip+remShip:baseShip)})));
                          } else { setBundleSaleItems(newItems); }
                        }}
                          style={{padding:'6px 16px',borderRadius:99,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                            background: bundleSaleItems.length===n ? '#1e293b' : '#f3f4f6',
                            color: bundleSaleItems.length===n ? 'white' : '#555',
                            WebkitTapHighlightColor:'transparent'}}>
                          {n}件
                        </button>
                      ))}
                      <button onClick={() => setBundleSaleItems(prev => [...prev, {id:String(prev.length),label:`商品${SALE_BUNDLE_LABELS[prev.length]||prev.length+1}`,inventoryId:'',salePrice:''}])}
                        style={{padding:'6px 14px',borderRadius:99,border:'1.5px dashed #d1d5db',background:'white',fontSize:13,cursor:'pointer',color:'#666',fontWeight:700}}>＋</button>
                      {bundleSaleItems.length > 2 && (
                        <button onClick={() => setBundleSaleItems(prev => prev.slice(0,-1))}
                          style={{padding:'6px 14px',borderRadius:99,border:'1.5px dashed #fca5a5',background:'white',fontSize:13,cursor:'pointer',color:'#dc2626',fontWeight:700}}>－</button>
                      )}
                    </div>
                  </div>

                  {/* 分割方法 */}
                  <div style={{display:'flex',gap:6,marginBottom:12}}>
                    {[['equal','均等分割'],['manual','手動分割']].map(([m,l]) => (
                      <button key={m} onClick={() => {
                        setBundleSaleSplitMethod(m);
                        if (m==='equal' && Number(form.salePrice)>0) {
                          const total=Number(form.salePrice), n=bundleSaleItems.length;
                          const base=Math.floor(total/n), rem=total-base*n;
                          const totalShip=Number(form.shipping)||0, baseShip=Math.floor(totalShip/n), remShip=totalShip-baseShip*n;
                          setBundleSaleItems(prev=>prev.map((bi,i)=>({...bi,salePrice:String(i===n-1?base+rem:base),shipping:String(i===n-1?baseShip+remShip:baseShip)})));
                        }
                      }}
                        style={{flex:1,padding:'7px 0',borderRadius:99,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                          background: bundleSaleSplitMethod===m ? '#E84040' : '#f3f4f6',
                          color: bundleSaleSplitMethod===m ? 'white' : '#777',
                          WebkitTapHighlightColor:'transparent'}}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* 各アイテム */}
                  {bundleSaleItems.map((bi, idx) => {
                    const selectedInv = data.inventory.find(i => i.id === bi.inventoryId);
                    return (
                    <div key={bi.id} style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px',marginBottom:8,border:'1px solid #e2e8f0'}}>
                      {/* ラベル行 */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                        <span style={{fontWeight:800,fontSize:13,color:'white',background:'#475569',borderRadius:99,padding:'2px 10px',flexShrink:0}}>{bi.label}</span>
                        {selectedInv && (
                          <span style={{fontSize:11,color:'#64748b',maxWidth:'60%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {selectedInv.brand} {selectedInv.productName}
                          </span>
                        )}
                      </div>
                      {/* 在庫から選択 */}
                      <select value={bi.inventoryId}
                        onChange={e => setBundleSaleItems(prev => prev.map((b,i) => i===idx ? {...b, inventoryId: e.target.value} : b))}
                        style={{width:'100%',padding:'7px 8px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,background:'white',color: bi.inventoryId ? '#1a1a1a' : '#9ca3af',marginBottom:6}}>
                        <option value="">在庫から商品を選択...</option>
                        {data.inventory.filter(i => i.status !== 'sold').map(i => (
                          <option key={i.id} value={i.id}>{i.brand ? `${i.brand} ` : ''}{i.productName}</option>
                        ))}
                      </select>
                      {/* 新規仕入れ登録ボタン */}
                      <button
                        onClick={() => setBundleSaleInlineForm({
                          idx,
                          productName:'', brand:'', category:'', color:'',
                          condition:'A', purchaseDate:today(), purchaseStore:'',
                          paymentMethod:'現金', itemPriceTaxIn:'', listPrice:'', listDate:today(), notes:''
                        })}
                        style={{width:'100%',padding:'6px',borderRadius:8,border:'1.5px dashed #fbbf24',background:'#fffbeb',fontSize:11,color:'#92400e',cursor:'pointer',fontWeight:700,marginBottom:8}}>
                        ＋ 在庫にない場合は新規仕入れ登録
                      </button>
                      {/* 販売価格・送料 */}
                      <div style={{display:'flex',gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:3}}>販売価格</div>
                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <input type="number" value={bi.salePrice} placeholder="0"
                              onChange={e => setBundleSaleItems(prev => prev.map((b,i) => i===idx ? {...b, salePrice: e.target.value} : b))}
                              style={{flex:1,padding:'6px 8px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:13,fontWeight:700,background:'white',textAlign:'right'}}/>
                            <span style={{fontSize:11,color:'#888'}}>円</span>
                          </div>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,color:'#888',fontWeight:700,marginBottom:3}}>送料</div>
                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <input type="number" value={bi.shipping} placeholder="0"
                              onChange={e => setBundleSaleItems(prev => prev.map((b,i) => i===idx ? {...b, shipping: e.target.value} : b))}
                              style={{flex:1,padding:'6px 8px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:13,fontWeight:700,background:'white',textAlign:'right'}}/>
                            <span style={{fontSize:11,color:'#888'}}>円</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}

                  {/* 合計サマリー（販売価格＋送料） */}
                  {(() => {
                    const totalSale = Number(form.salePrice) || 0;
                    const totalShip = Number(form.shipping) || 0;
                    const allocSale = bundleSaleItems.reduce((s,bi) => s+(Number(bi.salePrice)||0), 0);
                    const allocShip = bundleSaleItems.reduce((s,bi) => s+(Number(bi.shipping)||0), 0);
                    const remSale = totalSale - allocSale;
                    const remShip = totalShip - allocShip;
                    const saleOk = Math.abs(remSale) <= 1;
                    const shipOk = totalShip === 0 || Math.abs(remShip) <= 1;
                    const allOk  = saleOk && shipOk;
                    return (
                      <div style={{background: allOk ? '#f0fdf4' : '#fef3c7',
                        border:`1px solid ${allOk ? '#bbf7d0' : '#fcd34d'}`,
                        borderRadius:8,padding:'8px 12px',fontSize:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom: totalShip>0 ? 4 : 0}}>
                          <span style={{color:'#555'}}>販売価格：<b>¥{allocSale.toLocaleString()}</b>{totalSale>0 && <span style={{color:'#999'}}> / ¥{totalSale.toLocaleString()}</span>}</span>
                          <span style={{fontWeight:700,color: saleOk ? '#16a34a' : '#d97706'}}>
                            {saleOk ? '✅' : totalSale>0 ? `差額 ¥${remSale.toLocaleString()}` : '—'}
                          </span>
                        </div>
                        {totalShip > 0 && (
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{color:'#555'}}>送料：<b>¥{allocShip.toLocaleString()}</b><span style={{color:'#999'}}> / ¥{totalShip.toLocaleString()}</span></span>
                            <span style={{fontWeight:700,color: shipOk ? '#16a34a' : '#d97706'}}>
                              {shipOk ? '✅' : `差額 ¥${remShip.toLocaleString()}`}
                            </span>
                          </div>
                        )}
                        {!totalSale && <span style={{color:'#999'}}>上で販売価格を入力すると自動配分されます</span>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* ── 商品新規作成＆紐付けモーダル（分割売上専用）── */}
            {bundleSaleInlineForm && (() => {
              const inf = bundleSaleInlineForm;
              const setInf = (key, val) => setBundleSaleInlineForm(prev => ({...prev, [key]: val}));
              // このスロットの売上データ（読み取り専用・連動元）
              const slotBi = bundleSaleItems[inf.idx] || {};
              const slotSalePrice = Number(slotBi.salePrice) || 0;
              const slotShipping  = Number(slotBi.shipping)  || 0;
              const slotLabel     = SALE_BUNDLE_LABELS[inf.idx] ? `商品${SALE_BUNDLE_LABELS[inf.idx]}` : `商品${inf.idx+1}`;
              // リアルタイム利益プレビュー
              const purchaseAmt = Number(inf.itemPriceTaxIn) || 0;
              const estProfit   = slotSalePrice > 0
                ? Math.round(slotSalePrice * (1 - (Number(form.feeRate)||0.10)) - slotShipping - purchaseAmt)
                : null;

              const saveInlineInv = () => {
                if (!inf.productName.trim()) { toast('商品名を入力してください'); return; }
                if (!inf.itemPriceTaxIn)     { toast('仕入れ価格を入力してください'); return; }
                const newItem = {
                  id: Date.now().toString(),
                  productName:  inf.productName.trim(),
                  brand:        inf.brand.trim(),
                  category:     inf.category,
                  color:        inf.color,
                  condition:    inf.condition,
                  conditionDetail: '',
                  purchaseDate: inf.purchaseDate,
                  purchaseStore:inf.purchaseStore,
                  paymentMethod:inf.paymentMethod,
                  purchasePrice: purchaseAmt,
                  purchaseCost: { totalTaxIn: purchaseAmt, totalTaxEx: purchaseAmt },
                  // 売上コンテキストから自動連携（重複入力なし）
                  listPrice: slotSalePrice,   // 販売価格 = 出品価格
                  listDate:  form.saleDate,   // 売上日 = 出品日（回転日数計算に使用）
                  notes: inf.notes,
                  status: 'listed',
                  userId: currentUser,
                  photos: [], seoCategories: [], descriptionText: '',
                  createdAt: new Date().toISOString(),
                };
                setData({ ...data, inventory: [...data.inventory, newItem] });
                setBundleSaleItems(prev => prev.map((b,i) => i===inf.idx ? {...b, inventoryId: newItem.id} : b));
                setBundleSaleInlineForm(null);
                toast(`✅ ${slotLabel}の商品を作成して紐付けました`);
              };

              return (
                <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:300,display:'flex',alignItems:'flex-end',backdropFilter:'blur(4px)'}}>
                  <div style={{background:'white',borderRadius:'24px 24px 0 0',width:'100%',maxHeight:'92vh',overflowY:'auto',
                    padding:'8px 20px 0',paddingBottom:'calc(24px + env(safe-area-inset-bottom))'}}>
                    <div style={{width:40,height:4,background:'#e0e0e0',borderRadius:2,margin:'0 auto 14px'}}/>

                    {/* ヘッダー */}
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:16,color:'#1e293b'}}>📦 {slotLabel}の商品を新規作成</div>
                        <div style={{fontSize:12,color:'#64748b',marginTop:2}}>仕入れ情報だけ入力 → 売上情報は自動連携</div>
                      </div>
                      <button onClick={() => setBundleSaleInlineForm(null)}
                        style={{padding:'6px 14px',borderRadius:99,border:'1px solid #e0e0e0',background:'white',
                          fontSize:13,cursor:'pointer',color:'#555',fontWeight:600,flexShrink:0,marginLeft:8}}>
                        閉じる
                      </button>
                    </div>

                    {/* 売上コンテキスト（自動連携・読み取り専用） */}
                    <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:12,padding:'10px 14px',marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#0369a1',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                        🔗 売上情報（自動連携済み・入力不要）
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,fontSize:12}}>
                        <div><span style={{color:'#888'}}>販売価格：</span><b style={{color:'#1e293b'}}>¥{slotSalePrice.toLocaleString()}</b></div>
                        <div><span style={{color:'#888'}}>送料：</span><b style={{color:'#1e293b'}}>¥{slotShipping.toLocaleString()}</b></div>
                        <div><span style={{color:'#888'}}>売上日：</span><b style={{color:'#1e293b'}}>{form.saleDate}</b></div>
                        <div><span style={{color:'#888'}}>プラットフォーム：</span><b style={{color:'#1e293b'}}>{form.platform}</b></div>
                      </div>
                      <div style={{marginTop:6,fontSize:11,color:'#0369a1'}}>
                        ※ 出品価格・出品日は売上情報から自動セットされます
                      </div>
                    </div>

                    {/* ── 入力が必要な仕入れ情報 ── */}

                    {/* 商品名 */}
                    <div style={{marginBottom:12}}>
                      <label className="field-label">商品名 <span style={{color:'#E84040'}}>*必須</span></label>
                      <input className="input-field" value={inf.productName}
                        onChange={e => setInf('productName', e.target.value)}
                        placeholder="例: ノースフェイス ダウンジャケット ブラック L"/>
                    </div>

                    {/* ブランド */}
                    <div style={{marginBottom:12}}>
                      <label className="field-label">ブランド</label>
                      <input className="input-field" value={inf.brand}
                        onChange={e => setInf('brand', e.target.value)}
                        placeholder="例: THE NORTH FACE"/>
                    </div>

                    {/* カテゴリ・色 */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                      <div>
                        <label className="field-label">カテゴリー</label>
                        <select className="input-field" value={inf.category} onChange={e => setInf('category', e.target.value)}>
                          <option value="">選択</option>
                          {['バッグ','衣類','小物','シューズ','その他'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">カラー</label>
                        <input className="input-field" value={inf.color} onChange={e => setInf('color', e.target.value)} placeholder="カラー"/>
                      </div>
                    </div>

                    {/* 状態ランク */}
                    <div style={{marginBottom:14}}>
                      <label className="field-label">状態ランク</label>
                      <div style={{display:'flex',gap:8}}>
                        {['S','A','B','C'].map(c => (
                          <button key={c} onClick={() => setInf('condition', c)}
                            style={{flex:1,padding:'10px 0',borderRadius:10,border:'2px solid',
                              borderColor: inf.condition===c ? 'var(--color-primary)' : '#e0e0e0',
                              background: inf.condition===c ? '#fff0f0' : 'white',
                              color: inf.condition===c ? 'var(--color-primary)' : '#666',
                              fontWeight: inf.condition===c ? 700 : 400, fontSize:15, cursor:'pointer'}}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <hr style={{borderColor:'#f0f0f0',margin:'4px 0 14px'}}/>

                    {/* 仕入れ日・支払方法 */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                      <div>
                        <label className="field-label">仕入れ日</label>
                        <input type="date" className="input-field" value={inf.purchaseDate}
                          onChange={e => setInf('purchaseDate', e.target.value)}/>
                      </div>
                      <div>
                        <label className="field-label">支払方法</label>
                        <select className="input-field" value={inf.paymentMethod}
                          onChange={e => setInf('paymentMethod', e.target.value)}>
                          {['現金','クレカ','PayPay','メルペイ','その他'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* 仕入れ先 */}
                    <div style={{marginBottom:12}}>
                      <label className="field-label">仕入れ先</label>
                      <input className="input-field" value={inf.purchaseStore}
                        onChange={e => setInf('purchaseStore', e.target.value)}
                        placeholder="例: ブックオフ 渋谷店"/>
                    </div>

                    {/* 仕入れ価格（必須）+ リアルタイム利益プレビュー */}
                    <div style={{marginBottom:12}}>
                      <label className="field-label">仕入れ価格（税込） <span style={{color:'#E84040'}}>*必須</span></label>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <input type="number" className="input-field"
                          style={{flex:1,textAlign:'right',fontWeight:700,fontSize:20}}
                          value={inf.itemPriceTaxIn}
                          onChange={e => setInf('itemPriceTaxIn', e.target.value)}
                          placeholder="0"/>
                        <span style={{fontSize:14,color:'#666',flexShrink:0}}>円</span>
                      </div>
                      {/* 利益プレビュー */}
                      {slotSalePrice > 0 && (
                        <div style={{background: estProfit > 0 ? '#f0fdf4' : estProfit === 0 ? '#fafafa' : '#fef2f2',
                          border:`1px solid ${estProfit > 0 ? '#bbf7d0' : estProfit === 0 ? '#e5e7eb' : '#fecaca'}`,
                          borderRadius:8,padding:'8px 12px',fontSize:12}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{color:'#555'}}>概算利益</span>
                            <span style={{fontWeight:800,fontSize:15,
                              color: estProfit > 0 ? '#16a34a' : estProfit === 0 ? '#555' : '#dc2626'}}>
                              {purchaseAmt > 0
                                ? `¥${(estProfit||0).toLocaleString()}`
                                : '仕入れ価格を入力'}
                            </span>
                          </div>
                          {purchaseAmt > 0 && (
                            <div style={{color:'#888',marginTop:3}}>
                              ¥{slotSalePrice.toLocaleString()} × {Math.round((1-(Number(form.feeRate)||0.10))*100)}% − 送料¥{slotShipping.toLocaleString()} − 仕入¥{purchaseAmt.toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* メモ */}
                    <div style={{marginBottom:20}}>
                      <label className="field-label">メモ（省略可）</label>
                      <textarea className="input-field" value={inf.notes}
                        onChange={e => setInf('notes', e.target.value)}
                        placeholder="状態詳細・特記事項など" style={{minHeight:72}}/>
                    </div>

                    {/* 登録ボタン */}
                    <button className="btn-primary" style={{width:'100%',marginBottom:8}} onClick={saveInlineInv}>
                      ✅ {slotLabel}の商品を作成して紐付ける
                    </button>
                    <div style={{textAlign:'center',fontSize:11,color:'#94a3b8',marginBottom:8}}>
                      出品価格・出品日・販売価格・送料は売上情報から自動連携されます
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 通常モードの商品選択（まとめ販売OFFのみ表示） */}
            {!bundleSale && (
            <div style={{marginBottom:12}}>
              <label className="field-label">商品選択</label>
              <select className="input-field" value={form.inventoryId} onChange={e => {
                const iid = e.target.value;
                const inv = data.inventory.find(i => i.id === iid);
                setForm(prev => ({
                  ...prev, inventoryId: iid,
                  listDate:      inv?.listDate      || '',   // 在庫の出品日を常に反映
                  purchaseDate:  inv?.purchaseDate  || '',   // 在庫から仕入れ日を引き継ぎ
                  purchaseStore: inv?.purchaseStore || '',   // 在庫から仕入れ先を引き継ぎ
                }));
                setSaleStoreCustom(null); // 仕入れ先選択をリセット
              }}>
                <option value="">商品を選択...</option>
                {data.inventory.map(i => {
                  const statusLabels = { unlisted:'未出品', listed:'出品中', sold:'売却済' };
                  return <option key={i.id} value={i.id}>{i.brand} {i.productName}（{statusLabels[i.status]||i.status}）</option>;
                })}
              </select>
            </div>
            )}

            {/* 仕入れ情報（古物台帳対応）*/}
            {(form.inventoryId || editingSale) && !bundleSale && (() => {
              const missingDate  = !form.purchaseDate;
              const missingStore = !form.purchaseStore;
              const hasWarning   = missingDate || missingStore;
              return (
                <div style={{
                  background: hasWarning ? '#fff7ed' : '#f8fafc',
                  border:`1px solid ${hasWarning ? '#fcd34d' : '#e2e8f0'}`,
                  borderRadius:10, padding:'10px 12px', marginBottom:12,
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                    <span style={{fontWeight:700,fontSize:12}}>📋 仕入れ情報</span>
                    {hasWarning && (
                      <span style={{fontSize:10,color:'#d97706',fontWeight:600}}>
                        ⚠️ {[missingDate&&'仕入れ日',missingStore&&'仕入れ先'].filter(Boolean).join('・')}が未入力（古物台帳に反映されません）
                      </span>
                    )}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label style={{fontSize:10,color:'#888',fontWeight:700,display:'block',marginBottom:2}}>仕入れ日</label>
                      <input type="date" value={form.purchaseDate || ''}
                        onChange={e => setF('purchaseDate', e.target.value)}
                        style={{width:'100%',padding:'6px 8px',borderRadius:8,fontSize:12,background:'white',boxSizing:'border-box',
                          border:`1px solid ${missingDate ? '#fcd34d' : '#e2e8f0'}`}}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,color:'#888',fontWeight:700,display:'block',marginBottom:2}}>仕入れ先</label>
                      {(() => {
                        const master = data.settings?.storeMaster || getInitialData().settings.storeMaster;
                        // 全仕入れ先候補（マスタ登録済みのみ・自動追加しない）
                        const allStores = [
                          ...(master.normalStores||[]),
                          ...(master.yahooStores||[]),
                          ...(data.settings?.yahooStores||[]).map(s=>s.storeName).filter(Boolean),
                        ].filter((v,i,a) => v && a.indexOf(v) === i)
                         .sort((a,b) => a.localeCompare(b,'ja'));
                        // 現在値が候補にない = カスタム入力中
                        const isCustom = saleStoreCustom !== null ||
                          (form.purchaseStore && !allStores.includes(form.purchaseStore));
                        return (
                          <>
                            <select
                              value={isCustom ? '__custom__' : (form.purchaseStore || '')}
                              onChange={e => {
                                if (e.target.value === '__custom__') {
                                  setSaleStoreCustom(form.purchaseStore || '');
                                } else {
                                  setSaleStoreCustom(null);
                                  setF('purchaseStore', e.target.value);
                                }
                              }}
                              style={{width:'100%',padding:'6px 8px',borderRadius:8,fontSize:12,background:'white',
                                boxSizing:'border-box',border:`1px solid ${missingStore ? '#fcd34d' : '#e2e8f0'}`}}>
                              <option value="">選択してください</option>
                              {allStores.map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="__custom__">＋ その他（手入力）</option>
                            </select>
                            {isCustom && (
                              <input
                                value={saleStoreCustom !== null ? saleStoreCustom : (form.purchaseStore || '')}
                                onChange={e => { setSaleStoreCustom(e.target.value); setF('purchaseStore', e.target.value); }}
                                placeholder="仕入れ先を入力"
                                style={{marginTop:4,width:'100%',padding:'6px 8px',borderRadius:8,fontSize:12,
                                  background:'white',boxSizing:'border-box',border:`1px solid ${missingStore?'#fcd34d':'#e2e8f0'}`}}/>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label className="field-label">販売プラットフォーム</label>
                <select className="input-field" value={form.platform} onChange={e => handlePlatformChange(e.target.value)}>
                  {['メルカリ','ヤフオク','ラクマ','その他'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">
                  手数料率 (%)
                  {form.platform === 'ラクマ' && <span style={{fontSize:10,color:'#f59e0b',marginLeft:4}}>※変動型・手動確認</span>}
                </label>
                <input type="number" className="input-field" value={(form.feeRate * 100).toFixed(1)}
                  onChange={e => setF('feeRate', Number(e.target.value) / 100)} step="0.1"/>
              </div>
            </div>
            {form.platform === 'ラクマ' && (
              <div style={{fontSize:11,color:'#92400e',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:8,padding:'6px 10px',marginBottom:10}}>
                ⚠️ ラクマの手数料は商品カテゴリー・販売価格により変動します。実際の手数料を確認して手動で入力してください。
              </div>
            )}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div>
                <label className="field-label">販売価格 (円)</label>
                <input type="number" className="input-field" value={form.salePrice}
                  onChange={e => setF('salePrice', e.target.value)} placeholder="15000"/>
              </div>
              <div>
                <label className="field-label">送料 (円)</label>
                <input type="number" className="input-field" value={form.shipping}
                  onChange={e => setF('shipping', e.target.value)}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label className="field-label" style={{display:'flex',alignItems:'center',gap:5}}>
                仕入れ値 (円)
                {form.purchasePrice === '' || form.purchasePrice === '0' ? (
                  <span style={{fontSize:10,background:'#fff7ed',color:'#c2410c',borderRadius:99,padding:'1px 7px',fontWeight:700,border:'1px solid #fed7aa'}}>未入力</span>
                ) : null}
              </label>
              <input type="number" className="input-field" value={form.purchasePrice}
                onChange={e => setF('purchasePrice', e.target.value)} placeholder="仕入れ値を入力"
                style={{borderColor: (form.purchasePrice === '' || form.purchasePrice === '0') ? '#fed7aa' : undefined}}/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label className="field-label">出品日</label>
                <input type="date" className="input-field" value={form.listDate}
                  onChange={e => setF('listDate', e.target.value)}/>
              </div>
              <div>
                <label className="field-label">売却日</label>
                <input type="date" className="input-field" value={form.saleDate}
                  onChange={e => setF('saleDate', e.target.value)}/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label className="field-label">商品ID</label>
                <input type="text" className="input-field" value={form.platformId}
                  onChange={e => setF('platformId', e.target.value)} placeholder="m46193847261" style={{fontSize:12}}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
                {(() => {
                  const td = calcTurnoverDays(form.listDate, form.saleDate);
                  if (td === null) return null;
                  return (
                    <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'8px 12px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'#0369a1',fontWeight:700,marginBottom:2}}>🔄 回転日数</div>
                      <div style={{fontSize:18,fontWeight:800,color:'#0369a1'}}>{td}<span style={{fontSize:11,fontWeight:600}}> 日</span></div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {!bundleSale && form.salePrice && selectedItem && (() => {
              const sp = Number(form.salePrice) || 0;
              const safeProfit = isNaN(profit) ? 0 : profit;
              const profitRate = sp > 0 ? Math.round(safeProfit / sp * 100) : 0;
              const ppDisplay = (() => {
                const n = Number(effectivePurchasePrice);
                return isNaN(n) ? '未入力' : formatMoney(n);
              })();
              return (
                <div style={{background: safeProfit >= 0 ? '#f0fdf4' : '#fef2f2',border:`1px solid ${safeProfit >= 0 ? '#bbf7d0' : '#fecaca'}`,borderRadius:10,padding:12,marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontSize:12,color:'#666',marginBottom:4}}>純利益</div>
                      <div style={{fontSize:22,fontWeight:700,color: safeProfit >= 0 ? '#16a34a' : '#dc2626'}}>¥{formatMoney(safeProfit)}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:12,color:'#666',marginBottom:4}}>利益率</div>
                      <div style={{fontSize:22,fontWeight:700,color: safeProfit >= 0 ? '#16a34a' : '#dc2626'}}>{profitRate}%</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:'#999',marginTop:6}}>仕入れ ¥{ppDisplay} / 手数料 ¥{Math.round(sp * (form.feeRate||0)).toLocaleString()} / 送料 ¥{Number(form.shipping||0).toLocaleString()}</div>
                </div>
              );
            })()}

            {/* インラインバリデーションエラー */}
            {formError && (
              <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,
                padding:'10px 14px',marginBottom:10,color:'#dc2626',fontWeight:600,fontSize:13,
                display:'flex',alignItems:'center',gap:6}}>
                ⚠️ {formError}
              </div>
            )}
            <button className="btn-primary"
              style={{width:'100%',touchAction:'manipulation',opacity:saving?0.75:1,transition:'opacity 0.15s'}}
              onClick={handleSave}
              disabled={saving}>
              {saving ? '💾 保存中...' : bundleSale
                ? `💾 ${bundleSaleItems.filter(bi=>bi.inventoryId&&bi.salePrice!=='').length}件に分割して${editingSale?'再登録':'登録'}する`
                : editingSale ? '💾 売上を更新する' : '💾 売上を記録する'}
            </button>
            {editingSale && (
              <button style={{width:'100%',marginTop:8,background:'none',border:'1px solid #fca5a5',color:'#dc2626',borderRadius:12,padding:'12px',fontSize:14,fontWeight:600,cursor:'pointer'}}
                onClick={() => handleDelete(editingSale.id)}>
                🗑️ この売上記録を削除する
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===================================================
          重複確認モーダル
          ※ showForm より後に描画することで z-index 競合を回避
             （同じ z-index:200 のとき DOM 後順が前面に表示される）
          =================================================== */}
      {dupConfirm && (
        <div className="modal-overlay" style={{zIndex:300}} onClick={() => setDupConfirm(null)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()} style={{maxWidth:400}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:16,color:'#d97706'}}>⚠️ 重複の可能性</div>
              <button onClick={() => setDupConfirm(null)}
                style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#666'}}>×</button>
            </div>
            <div style={{fontSize:13,color:'#444',marginBottom:14}}>{dupConfirm.reason}</div>
            <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:10,padding:'10px 12px',marginBottom:16,fontSize:12}}>
              <div style={{fontWeight:700,color:'#92400e',marginBottom:6}}>📋 登録済みの売上</div>
              <div style={{color:'#555',display:'flex',flexDirection:'column',gap:3}}>
                {(() => {
                  const s = dupConfirm.existingSale;
                  const inv = data.inventory.find(i => i.id === s.inventoryId);
                  return (
                    <>
                      {inv && <span>🏷️ {inv.brand} {inv.productName}</span>}
                      <span>販売価格：¥{formatMoney(s.salePrice)}</span>
                      <span>📅 {s.saleDate}</span>
                      <span>🛒 {s.platform || 'フリマ'}</span>
                      {s.platformId && <span>ID: {s.platformId}</span>}
                    </>
                  );
                })()}
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setDupConfirm(null)}
                style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #e5e7eb',
                  background:'white',color:'#555',fontWeight:600,fontSize:14,cursor:'pointer',touchAction:'manipulation'}}>
                キャンセル
              </button>
              <button onClick={() => { setDupConfirm(null); dupConfirm.onConfirm(); }}
                style={{flex:2,padding:'12px',borderRadius:10,border:'none',
                  background:'#d97706',color:'white',fontWeight:700,fontSize:14,cursor:'pointer',touchAction:'manipulation'}}>
                それでも登録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// エクスポートパネル（独立コンポーネント）
// ============================================================
const ExportPanel = ({ data, settings, setSetting, toast, exportAll, exportCSV, exportKobotsuCSV, setTab, setPendingEditSaleId, setEditingItem, setPendingReturnTab, setPendingReturnSection }) => {
  const [gToken, setGToken]                   = React.useState(null);
  const [gSyncing, setGSyncing]               = React.useState(false);
  const [showAllKobotsu, setShowAllKobotsu]       = React.useState(false); // 古物台帳全件表示モーダル
  const [showAllSales, setShowAllSales]           = React.useState(false); // 売上管理表全件表示
  const [expandedBundleGroup, setExpandedBundleGroup] = React.useState(null); // まとめ仕入れ詳細展開
  const [kobotsuSelected, setKobotsuSelected] = React.useState(null); // 古物台帳 商品詳細モーダル
  const [syncMode, setSyncMode]               = React.useState('normal'); // 'normal' | 'full'
  const [syncResult, setSyncResult]           = React.useState(null);
  const [spreadsheetInput, setSpreadsheetInput] = React.useState(settings.googleSpreadsheetId || '');
  const tcRef = React.useRef(null);
  // Client IDはgoogle-config.jsで一元管理 — ユーザー入力不要
  const gClientId = (typeof window !== 'undefined' && window.GOOGLE_CLIENT_ID) || '';

  const spreadsheetId = settings.googleSpreadsheetId || '';

  // ── Sheets API helpers ──────────────────────────────────────
  const GSHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
  const LOG = (...a) => console.log('[SYNC]', ...a);

  // 汎用リクエスト — エラー時は必ず throw
  const sheetsReq = async (token, url, opts = {}) => {
    LOG('REQ', opts.method || 'GET', url.replace(GSHEETS, ''));
    const r = await fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers||{}) }
    });
    const j = await r.json();
    if (!r.ok) {
      const msg = j.error?.message || `HTTP ${r.status}`;
      LOG('ERROR', msg, JSON.stringify(j).slice(0, 200));
      throw new Error(msg);
    }
    LOG('OK', opts.method || 'GET', JSON.stringify(j).slice(0, 120));
    return j;
  };

  // GET values — 「範囲が見つからない＝シートが空」は空配列で返す、それ以外は throw
  const sheetsGet = async (token, sid, range) => {
    const r = await fetch(`${GSHEETS}/${sid}/values/${encodeURIComponent(range)}`,
      { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) {
      const msg = j.error?.message || `HTTP ${r.status}`;
      // "Unable to parse range" = タブは存在するが行データが0件 → 空扱い
      if (r.status === 400 && msg.toLowerCase().includes('parse range')) {
        LOG('sheetsGet: empty range (no data rows)', range);
        return { values: [] };
      }
      LOG('sheetsGet ERROR', msg);
      throw new Error(msg);
    }
    return j;
  };

  // batchUpdate (値書き込み)
  const sheetsBatchUpdate = (token, sid, rangeData) =>
    sheetsReq(token, `${GSHEETS}/${sid}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: rangeData })
    });

  // append (行追加)
  const sheetsAppend = (token, sid, sheetName, rows) =>
    sheetsReq(token,
      `${GSHEETS}/${sid}/values/${encodeURIComponent(sheetName + '!A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values: rows }) }
    );

  // clear (データ行削除)
  const sheetsClearRange = (token, sid, range) =>
    sheetsReq(token,
      `${GSHEETS}/${sid}/values/${encodeURIComponent(range)}:clear`,
      { method: 'POST' }
    );

  // タブが存在しなければ作成
  const ensureSheetTab = async (token, sid, title) => {
    LOG('ensureSheetTab:', title);
    const meta = await sheetsReq(token, `${GSHEETS}/${sid}`);
    const exists = meta.sheets?.some(s => s.properties?.title === title);
    LOG('tab exists?', title, exists);
    if (!exists) {
      await sheetsReq(token, `${GSHEETS}/${sid}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
      });
      LOG('tab created:', title);
    }
  };

  // ── 行ビルダー ───────────────────────────────────────────────
  // 在庫データ
  const INV_HEADERS = [
    '商品名','ステータス','ブランド','カテゴリー',
    '仕入れ日','仕入れ金額(税込)','出品価格',
    '仕入先','プラットフォーム','管理番号','メモ','ID'
  ];
  const INV_COL_W    = [220,70,110,110, 90,105,90, 150,105,100,150, 220];
  const INV_DATE_COLS = [4];
  const INV_ID_COL   = 11;

  // 売上データ（仕入れ情報 + 売上情報の統合ビュー、仕入れ日順）
  const SALE_HEADERS = [
    'No.','仕入れ日','商品名','ブランド','カテゴリー',
    '仕入れ金額','出品価格','仕入先',
    '売上日','売上金額','純利益','利益率%',
    'プラットフォーム','手数料','配送料','ID'
  ];
  const SALE_COL_W    = [40,90,220,110,110, 95,85,150, 90,90,90,60, 105,70,70, 220];
  const SALE_DATE_COLS = [1, 8];
  const SALE_ID_COL   = 15;

  // 古物台帳（管理番号を末尾に、在庫ID不要）
  const KOBOTSU_HEADERS = [
    '取得日','品名','ブランド','カテゴリー','数量',
    '取得価格','取得先名称','会社名','許可証番号',
    '売却日','売却価格','売却先（プラットフォーム）','管理番号'
  ];
  const KOBOTSU_COL_W    = [90,220,110,110,50, 90,160,160,130, 90,90,130, 100];
  const KOBOTSU_DATE_COLS = [0, 9];

  const statusLabel = s => s === 'unlisted' ? '未出品' : s === 'listed' ? '出品中' : s === 'sold' ? '売却済' : s || '';
  const fmtDt = s => s ? String(s).slice(0,19).replace('T',' ') : '';

  const invRow = item => [
    item.productName||'', statusLabel(item.status), item.brand||'', item.category||'',
    item.purchaseDate||'', item.purchasePrice||0, item.listPrice||'',
    item.purchaseStore||item.storeName||'', item.platform||'', item.mgmtNo||'', item.memo||'',
    item.id||''
  ];

  // 売上行：仕入れ情報（在庫から）+ 売上情報、先頭に連番
  const saleRow = (s, invMap, rowNum) => {
    const inv = invMap[s.inventoryId] || {};
    const rate = s.salePrice > 0 ? Math.round((s.profit||0)/s.salePrice*100) : 0;
    return [
      rowNum,
      inv.purchaseDate||'',
      inv.productName||'',
      inv.brand||'',
      inv.category||'',
      inv.purchasePrice||0,
      inv.listPrice||'',
      inv.purchaseStore||inv.storeName||'',
      s.saleDate||'',
      s.salePrice||0,
      s.profit||0,
      rate,
      s.platform||inv.platform||'',
      Math.round((s.salePrice||0)*(s.feeRate||0)),
      s.shipping||0,
      s.id||''
    ];
  };

  // 古物台帳行（在庫ID列なし）
  const kobotsuRow = (item, sale) => {
    const lic = resolveLicense(item);
    const co  = resolveCompanyName(item);
    return [
      item.purchaseDate||'',
      item.productName||'',
      item.brand||'',
      item.category||'',
      1,
      item.purchasePrice||0,
      item.purchaseStore||item.storeName||'',
      co, lic,
      sale?.saleDate||'',
      sale?.salePrice||'',
      sale ? (sale.platform||'') : '',
      item.mgmtNo||''
    ];
  };

  // ── シート書式設定（白ベース・グレーヘッダー・列幅・フィルター・日付書式）──
  const formatSheet = async (token, sid, sheetTitle, colWidths, dateColIdxs) => {
    try {
      LOG('formatSheet:', sheetTitle);
      const meta = await sheetsReq(token, `${GSHEETS}/${sid}`);
      const sheet = meta.sheets?.find(s => s.properties?.title === sheetTitle);
      if (!sheet) { LOG('formatSheet: not found', sheetTitle); return; }
      const sheetId = sheet.properties.sheetId;

      const requests = [
        // 1行目固定
        { updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
        } },
        // ヘッダー行：薄グレー背景・黒太字（白ベースの見やすいデザイン）
        { repeatCell: {
            range: { sheetId, startRowIndex:0, endRowIndex:1 },
            cell: { userEnteredFormat: {
              backgroundColor: { red:0.91, green:0.91, blue:0.91 },
              textFormat: { bold:true, foregroundColor:{red:0.07,green:0.07,blue:0.07}, fontSize:10 },
              verticalAlignment: 'MIDDLE',
              horizontalAlignment: 'CENTER',
              wrapStrategy: 'CLIP'
            }},
            fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,wrapStrategy)'
        } },
        // データ行：白背景・折り返しなし・縦中央
        { repeatCell: {
            range: { sheetId, startRowIndex:1 },
            cell: { userEnteredFormat: {
              backgroundColor: { red:1, green:1, blue:1 },
              verticalAlignment: 'MIDDLE',
              wrapStrategy: 'CLIP'
            }},
            fields: 'userEnteredFormat(backgroundColor,verticalAlignment,wrapStrategy)'
        } },
        // 列幅
        ...colWidths.map((w, i) => ({
          updateDimensionProperties: {
            range: { sheetId, dimension:'COLUMNS', startIndex:i, endIndex:i+1 },
            properties: { pixelSize: w },
            fields: 'pixelSize'
          }
        })),
        // フィルター
        { setBasicFilter: { filter: { range: { sheetId, startRowIndex:0, startColumnIndex:0 } } } },
        // 日付列を yyyy/mm/dd 形式に
        ...(dateColIdxs||[]).map(ci => ({
          repeatCell: {
            range: { sheetId, startRowIndex:1, startColumnIndex:ci, endColumnIndex:ci+1 },
            cell: { userEnteredFormat: { numberFormat: { type:'DATE', pattern:'yyyy/mm/dd' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        })),
      ];

      await sheetsReq(token, `${GSHEETS}/${sid}:batchUpdate`, {
        method:'POST', body: JSON.stringify({ requests })
      });
      LOG('formatSheet done:', sheetTitle);
    } catch(e) {
      LOG('formatSheet warning (non-fatal):', e.message);
    }
  };

  // ── upsert（差分同期）idCol = ID列のインデックス ─────────────
  const upsertSheet = async (token, sid, sheetName, headers, localRows, idCol) => {
    LOG(`upsertSheet [${sheetName}] rows=${localRows.length} idCol=${idCol}`);
    // ID列のみ取得（列番号をA1記法に変換）
    const colLetter = String.fromCharCode(65 + idCol); // 0→A, 11→L etc.
    const existing = (await sheetsGet(token, sid, `${sheetName}!${colLetter}:${colLetter}`)).values || [];
    LOG(`existing rows (incl header): ${existing.length}`);

    // ヘッダーがなければ書く
    if (existing.length === 0) {
      LOG('writing headers to A1');
      await sheetsBatchUpdate(token, sid, [{ range: `${sheetName}!A1`, values: [headers] }]);
    }

    // ID → 行番号マップ（ヘッダー行スキップ）
    const idToRow = {};
    existing.forEach((row, i) => { if (i > 0 && row[0]) idToRow[String(row[0])] = i + 1; });

    const toUpdate = [], toAppend = [];
    localRows.forEach(row => {
      const id = String(row[idCol] || '');
      if (id && idToRow[id]) toUpdate.push({ range: `${sheetName}!A${idToRow[id]}`, values: [row] });
      else toAppend.push(row);
    });
    LOG(`toUpdate=${toUpdate.length} toAppend=${toAppend.length}`);

    for (let i = 0; i < toUpdate.length; i += 100) {
      LOG(`batchUpdate chunk ${i}`);
      await sheetsBatchUpdate(token, sid, toUpdate.slice(i, i + 100));
    }
    for (let i = 0; i < toAppend.length; i += 500) {
      LOG(`append chunk ${i}`);
      await sheetsAppend(token, sid, sheetName, toAppend.slice(i, i + 500));
    }
    LOG(`upsertSheet [${sheetName}] done`);
    return { updated: toUpdate.length, added: toAppend.length };
  };

  // ── 全件再同期（クリア→書き直し）───────────────────────────
  const fullResyncSheet = async (token, sid, sheetName, headers, localRows) => {
    LOG(`fullResyncSheet [${sheetName}] rows=${localRows.length}`);
    await sheetsBatchUpdate(token, sid, [{ range: `${sheetName}!A1`, values: [headers] }]);
    LOG('clearing A2:Z10000');
    await sheetsClearRange(token, sid, `${sheetName}!A2:Z10000`);
    for (let i = 0; i < localRows.length; i += 500) {
      LOG(`append chunk ${i}`);
      await sheetsAppend(token, sid, sheetName, localRows.slice(i, i + 500));
    }
    LOG(`fullResyncSheet [${sheetName}] done`);
    return { updated: 0, added: localRows.length };
  };

  // ── メイン同期処理 ───────────────────────────────────────────
  const doSheetsSync = async (token, mode) => {
    setGSyncing(true);
    setSyncResult(null);
    try {
      LOG('=== doSheetsSync start ===', 'mode:', mode);
      LOG('inventory:', data.inventory.length, 'sales:', data.sales.length);

      // spreadsheetId を確定
      let sid = (settings.googleSpreadsheetId || '').trim()
             || spreadsheetInput.replace(/.*\/d\/([\w-]+).*/,'$1').trim();
      LOG('spreadsheetId (resolved):', sid || '(none → will create)');

      const TAB_NAMES = ['在庫データ','売上データ','古物台帳'];

      if (!sid) {
        LOG('creating new spreadsheet...');
        const cr = await sheetsReq(token, GSHEETS, {
          method: 'POST',
          body: JSON.stringify({
            properties: { title: 'SalesLog データ' },
            sheets: TAB_NAMES.map(title => ({ properties: { title } }))
          })
        });
        sid = cr.spreadsheetId;
        LOG('created spreadsheetId:', sid);
        setSetting('googleSpreadsheetId', sid);
        setSpreadsheetInput(`https://docs.google.com/spreadsheets/d/${sid}`);
      } else {
        for (const t of TAB_NAMES) await ensureSheetTab(token, sid, t);
      }

      // 行データ構築
      const invMap = {};
      data.inventory.forEach(i => { invMap[i.id] = i; });
      const invRows      = data.inventory.map(invRow);
      // 売上：仕入れ日昇順でソートしてから連番付与
      const sortedSales  = [...data.sales].sort((a, b) => {
        const da = (invMap[a.inventoryId]||{}).purchaseDate||'';
        const db = (invMap[b.inventoryId]||{}).purchaseDate||'';
        return da < db ? -1 : da > db ? 1 : 0;
      });
      const saleRows     = sortedSales.map((s, i) => saleRow(s, invMap, i + 1));
      // 古物台帳：全在庫を対象
      const kobotsuRows  = data.inventory.map(item =>
        kobotsuRow(item, data.sales.find(s => s.inventoryId === item.id))
      );
      LOG(`invRows=${invRows.length} saleRows=${saleRows.length} kobotsuRows=${kobotsuRows.length}`);

      // 直列同期（API競合を避ける）
      LOG('--- syncing 在庫データ ---');
      const invRes = mode === 'full'
        ? await fullResyncSheet(token, sid, '在庫データ', INV_HEADERS, invRows)
        : await upsertSheet(token, sid, '在庫データ', INV_HEADERS, invRows, INV_ID_COL);

      LOG('--- syncing 売上データ ---');
      const saleRes = mode === 'full'
        ? await fullResyncSheet(token, sid, '売上データ', SALE_HEADERS, saleRows)
        : await upsertSheet(token, sid, '売上データ', SALE_HEADERS, saleRows, SALE_ID_COL);

      LOG('--- syncing 古物台帳 ---');
      // 古物台帳はIDなし → 常にフルリセット
      const kobotsuRes = await fullResyncSheet(token, sid, '古物台帳', KOBOTSU_HEADERS, kobotsuRows);

      // 書式設定（同期後に適用 — 失敗してもデータには影響しない）
      LOG('--- formatting sheets ---');
      await formatSheet(token, sid, '在庫データ',  INV_COL_W,     INV_DATE_COLS);
      await formatSheet(token, sid, '売上データ',  SALE_COL_W,    SALE_DATE_COLS);
      await formatSheet(token, sid, '古物台帳',    KOBOTSU_COL_W, KOBOTSU_DATE_COLS);

      const now = new Date().toISOString();
      setSetting('googleLastSyncTime', now);
      const result = {
        invAdded: invRes.added, invUpdated: invRes.updated,
        saleAdded: saleRes.added, saleUpdated: saleRes.updated,
        kobotsuAdded: kobotsuRes.added,
        time: now, sid
      };
      setSyncResult(result);
      LOG('=== doSheetsSync complete ===', result);
      toast(`✅ 同期完了 — 在庫 +${invRes.added}/更新${invRes.updated} · 売上 +${saleRes.added}/更新${saleRes.updated} · 古物台帳 ${kobotsuRes.added}件`);

    } catch(err) {
      LOG('=== doSheetsSync FAILED ===', err.message, err.stack);
      const msg = err.message || String(err);
      if (msg.includes('401') || msg.includes('invalid_token')) {
        setGToken(null);
        toast('⚠️ 認証が切れました。再度ログインしてください');
      } else {
        alert('❌ 同期失敗\n\n' + msg);
        toast('❌ 同期失敗: ' + msg);
      }
    } finally {
      setGSyncing(false);
    }
  };

  const handleGoogleLogin = (mode) => {
    if (!gClientId) {
      toast('⚠️ google-config.js に Client ID を設定してください');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      toast('⚠️ Google APIを読み込み中です。少し待って再試行してください');
      return;
    }
    if (!tcRef.current) {
      tcRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: gClientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: () => {},
      });
    }
    tcRef.current.callback = (res) => {
      if (res.error) { toast('❌ ログイン失敗: ' + res.error); return; }
      setGToken(res.access_token);
      doSheetsSync(res.access_token, mode || syncMode);
    };
    tcRef.current.requestAccessToken({ prompt: gToken ? '' : 'consent' });
  };

  const salesPreview = [...data.sales].sort((a,b) => {
    const ia = data.inventory.find(i=>i.id===a.inventoryId)||{};
    const ib = data.inventory.find(i=>i.id===b.inventoryId)||{};
    const da = ia.purchaseDate || a.purchaseDate || '';
    const db = ib.purchaseDate || b.purchaseDate || '';
    return da > db ? 1 : da < db ? -1 : 0;
  });
  const kobotsuPreview = [...data.inventory]
    .sort((a,b) => {
      const dc = (a.purchaseDate||'') > (b.purchaseDate||'') ? 1 : (a.purchaseDate||'') < (b.purchaseDate||'') ? -1 : 0;
      if (dc !== 0) return dc;
      // 同日はbundleGroupでまとめる（同グループが隣接するよう）
      const ag = a.bundleGroup || a.id, bg = b.bundleGroup || b.id;
      return ag > bg ? 1 : ag < bg ? -1 : 0;
    })
    .map(item => ({ item, sale: data.sales.find(s=>s.inventoryId===item.id) }));

  // まとめ仕入れグループ → 色マップ（表示専用）
  const BUNDLE_PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#84cc16','#f97316','#ec4899','#64748b'];
  const bundleColorMap = (() => {
    const map = {};
    let ci = 0;
    kobotsuPreview.forEach(({item}) => {
      if (item.bundleGroup && !map[item.bundleGroup]) {
        map[item.bundleGroup] = { color: BUNDLE_PALETTE[ci % BUNDLE_PALETTE.length], count: 0 };
        ci++;
      }
      if (item.bundleGroup) map[item.bundleGroup].count++;
    });
    return map;
  })();
  const getBundleStyle = (item) => bundleColorMap[item.bundleGroup] || null;

  const thStyle = {padding:'5px 7px',textAlign:'left',fontSize:11,color:'#888',fontWeight:700,borderBottom:'1px solid #eee',whiteSpace:'nowrap'};
  const tdStyle = (extra={}) => ({padding:'6px 7px',whiteSpace:'nowrap',...extra});

  // 許可証番号の解決関数（item保存値 → settings.yahooStores → settings.storeLicenses の順で検索）
  const resolveLicense = (item) => {
    if (item.sellerLicense) return item.sellerLicense;
    const found = (data.settings?.yahooStores||[]).find(s => s.storeName === item.purchaseStore);
    if (found?.license) return found.license;
    return (settings.storeLicenses||{})[item.purchaseStore] || '';
  };
  const resolveCompanyName = (item) => {
    if (item.sellerCompanyName) return item.sellerCompanyName;
    const found = (data.settings?.yahooStores||[]).find(s => s.storeName === item.purchaseStore);
    return found?.companyName || '';
  };

  return (
    <div>
      {/* ── Google Sheets連携カード ── */}
      <div className="card" style={{padding:16,marginBottom:12,border:'1.5px solid #d1fae5',borderRadius:14}}>

        {/* ヘッダー */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
          <div style={{width:40,height:40,borderRadius:10,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📗</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15}}>Googleスプレッドシート連携</div>
            <div style={{fontSize:11,color:'#9ca3af',marginTop:1}}>在庫・売上データをワンタップで同期</div>
          </div>
          {gToken && (
            <div style={{fontSize:10,color:'#16a34a',fontWeight:700,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:99,padding:'3px 9px',flexShrink:0}}>
              ✅ 接続中
            </div>
          )}
        </div>

        {/* Client ID未設定の場合は開発者向け注記のみ表示（エンドユーザーは触らない） */}
        {!gClientId && (
          <div style={{background:'#fef9c3',border:'1px solid #fde047',borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:11,color:'#854d0e',lineHeight:1.6}}>
            <strong>⚙️ 開発者設定が必要：</strong><br/>
            <code style={{fontSize:10}}>/public/js/google-config.js</code> に Google OAuth Client ID を設定してください。<br/>
            設定後はエンドユーザーの操作は不要です。
          </div>
        )}

        {/* 連携先スプレッドシート指定（オプション） */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:'#6b7280',fontWeight:600,marginBottom:4}}>
            連携先スプレッドシート
            <span style={{fontWeight:400,color:'#9ca3af',marginLeft:4}}>（空欄 = 自動新規作成）</span>
          </div>
          <div style={{display:'flex',gap:6}}>
            <input className="input-field" style={{flex:1,fontSize:12,padding:'8px 10px'}}
              value={spreadsheetInput}
              onChange={e => setSpreadsheetInput(e.target.value)}
              placeholder="既存シートのURL または ID を貼り付け"/>
            {spreadsheetInput.trim() && (
              <button
                style={{flexShrink:0,background:'#16a34a',color:'#fff',border:'none',borderRadius:8,padding:'0 12px',fontSize:12,cursor:'pointer',fontWeight:600}}
                onClick={() => {
                  const sid = spreadsheetInput.replace(/.*\/d\/([\w-]+).*/,'$1').trim() || spreadsheetInput.trim();
                  if (sid) { setSetting('googleSpreadsheetId', sid); toast('✅ スプレッドシートを設定しました'); }
                }}>保存</button>
            )}
          </div>
          {spreadsheetId && (
            <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} target="_blank"
              style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:'#2563eb',marginTop:5,textDecoration:'none'}}>
              📊 <span style={{textDecoration:'underline'}}>連携中のシートを開く ↗</span>
            </a>
          )}
        </div>

        {/* 同期モード選択 */}
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {[['normal','通常同期','新規追加＋更新のみ'],['full','全件再同期','シート全体を上書き']].map(([m,label,desc]) => (
            <button key={m} onClick={() => setSyncMode(m)}
              style={{flex:1,padding:'8px 6px',borderRadius:10,cursor:'pointer',textAlign:'center',transition:'all 0.15s',
                border:`1.5px solid ${syncMode===m?'#16a34a':'#e5e7eb'}`,
                background: syncMode===m ? '#f0fdf4' : '#ffffff'}}>
              <div style={{fontSize:12,fontWeight:700,color: syncMode===m?'#16a34a':'#374151'}}>{label}</div>
              <div style={{fontSize:9,color:'#9ca3af',marginTop:2,lineHeight:1.3}}>{desc}</div>
            </button>
          ))}
        </div>

        {/* ── メイン同期ボタン ── */}
        <button
          style={{width:'100%',padding:'14px',borderRadius:12,border:'none',cursor: gSyncing ? 'not-allowed' : 'pointer',
            fontSize:15,fontWeight:700,color:'#fff',marginBottom:8,transition:'background 0.2s',
            background: gSyncing ? '#9ca3af' : gToken ? '#16a34a' : '#4285f4'}}
          onClick={() => gToken ? doSheetsSync(gToken, syncMode) : handleGoogleLogin(syncMode)}
          disabled={gSyncing}>
          {gSyncing ? (
            <><span className="spinner"/> 同期中...</>
          ) : gToken ? (
            `🔄 ${syncMode === 'full' ? '全件再同期' : '同期する'}　在庫 ${data.inventory.length}件・売上 ${data.sales.length}件`
          ) : (
            <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
              <svg width="18" height="18" viewBox="0 0 18 18" style={{flexShrink:0}}>
                <path fill="#fff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#fff" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#fff" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#fff" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Googleでログインして同期
            </span>
          )}
        </button>

        {/* 同期結果カード */}
        {syncResult && !gSyncing && (
          <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 12px',marginBottom:6,border:'1px solid #bbf7d0'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#16a34a',marginBottom:6}}>
              ✅ 同期完了 — {new Date(syncResult.time).toLocaleString('ja-JP')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
              {[['📦 在庫', syncResult.invAdded, syncResult.invUpdated],
                ['💰 売上', syncResult.saleAdded, syncResult.saleUpdated],
                ['📋 古物台帳', syncResult.kobotsuAdded, null]].map(([label,added,updated]) => (
                <div key={label} style={{background:'#fff',borderRadius:7,padding:'6px 8px',fontSize:11}}>
                  <div style={{fontSize:9,color:'#9ca3af',fontWeight:600,marginBottom:3}}>{label}</div>
                  <span style={{color:'#16a34a',fontWeight:700}}>+{added}件</span>
                  {updated !== null && <><span style={{color:'#9ca3af',fontSize:10,marginLeft:3}}>追加</span>
                  <span style={{color:'#f59e0b',fontWeight:700,marginLeft:6}}>{updated}件</span>
                  <span style={{color:'#9ca3af',fontSize:10,marginLeft:3}}>更新</span></>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 前回同期時刻 */}
        {!syncResult && settings.googleLastSyncTime && (
          <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',paddingTop:2}}>
            前回の同期: {new Date(settings.googleLastSyncTime).toLocaleString('ja-JP')}
          </div>
        )}
      </div>

      {/* まとめてDL */}
      <button className="btn-primary" style={{width:'100%',marginBottom:16,fontSize:15}} onClick={exportAll}>
        📦 売上管理表 ＋ 古物台帳　まとめてDL
      </button>

      {/* ── 売上管理表プレビュー ── */}
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:15}}>📊 売上管理表</div>
            <div style={{fontSize:12,color:'#999',marginTop:2}}>売上 {data.sales.length}件</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            {salesPreview.length > 10 && (
              <button className="btn-secondary" style={{padding:'7px 12px',fontSize:12}}
                onClick={() => setShowAllSales(v => !v)}>
                {showAllSales ? '▲ 折りたたむ' : `全件表示（${salesPreview.length}件）`}
              </button>
            )}
            <button className="btn-secondary" style={{padding:'7px 14px',fontSize:13}} onClick={exportCSV}>CSVのみ</button>
          </div>
        </div>
        {salesPreview.length === 0 ? (
          <div style={{textAlign:'center',color:'#bbb',padding:'16px 0',fontSize:13}}>売上記録がありません</div>
        ) : (
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table style={{fontSize:11,borderCollapse:'collapse',minWidth:480}}>
              <thead>
                <tr style={{background:'#f8f8f8'}}>
                  {['仕入日','ブランド','品名','仕入先','仕入単価','販売日','販路','売上','純利益','利益率'].map(h=>(
                    <th key={h} style={{...thStyle,fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(showAllSales ? salesPreview : salesPreview.slice(0,10)).map(s => {
                  const item = data.inventory.find(i=>i.id===s.inventoryId)||{};
                  const sp   = s.salePrice||0;
                  const fee  = Math.round(sp*(s.feeRate||0));
                  const ship = s.shipping||0;
                  const sProfit = sp - fee - ship;
                  const nProfit = sProfit - (item.purchasePrice||s.purchasePrice||0);
                  const rate = sp>0 ? Math.round(nProfit/sp*100) : 0;
                  const brand = item.brand || s.brand || '';
                  const productName = item.productName || s.productName || s.memo || '−';
                  const store = item.purchaseStore || s.purchaseStore || '';
                  const td = (extra={}) => ({padding:'4px 6px',whiteSpace:'nowrap',...extra});
                  const canEdit = typeof setPendingEditSaleId === 'function' && typeof setTab === 'function';
                  return (
                    <tr key={s.id}
                      onClick={canEdit ? () => { setPendingEditSaleId(s.id); setTab('sales'); } : undefined}
                      style={{borderBottom:'1px solid #f3f3f3', cursor: canEdit ? 'pointer' : 'default'}}
                      onMouseEnter={canEdit ? e => e.currentTarget.style.background='#f0f9ff' : undefined}
                      onMouseLeave={canEdit ? e => e.currentTarget.style.background='' : undefined}>
                      <td style={td({color:'#777',fontSize:10})}>{item.purchaseDate||s.purchaseDate||'−'}</td>
                      <td style={td({maxWidth:70,overflow:'hidden',textOverflow:'ellipsis'})}>
                        {brand
                          ? <span style={{color:'#888',fontWeight:700,textTransform:'uppercase',fontSize:10}}>{brand}</span>
                          : <span style={{color:'#dc2626',fontWeight:700,fontSize:9}}>⚠️</span>}
                      </td>
                      <td style={td({fontWeight:600,maxWidth:110,overflow:'hidden',textOverflow:'ellipsis'})}>{productName}</td>
                      <td style={td({maxWidth:80,overflow:'hidden',textOverflow:'ellipsis'})}>
                        {store
                          ? <span style={{color:'#555',fontSize:10}}>{store}</span>
                          : <span style={{color:'#dc2626',fontWeight:700,fontSize:9}}>⚠️</span>}
                      </td>
                      <td style={td({fontWeight:600})}>¥{formatMoney(item.purchasePrice||s.purchasePrice||0)}</td>
                      <td style={td({color:'#555',fontSize:10})}>{s.saleDate}</td>
                      <td style={td({fontSize:10})}>{s.platform}</td>
                      <td style={td({fontWeight:700})}>¥{formatMoney(sp)}</td>
                      <td style={td({fontWeight:700,color:nProfit>=0?'#16a34a':'#dc2626'})}>¥{formatMoney(nProfit)}</td>
                      <td style={td({fontWeight:700,color:rate>=0?'#16a34a':'#dc2626'})}>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!showAllSales && salesPreview.length > 10 && (
              <button type="button" onClick={() => setShowAllSales(true)}
                style={{display:'block',width:'100%',marginTop:8,padding:'8px',borderRadius:8,
                  border:'1px dashed #ddd',background:'#fafafa',cursor:'pointer',
                  fontSize:12,color:'#2563eb',fontWeight:700,textAlign:'center'}}>
                …他 {salesPreview.length-10}件を全て表示
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 古物台帳プレビュー ── */}
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <div>
            <div style={{fontWeight:700,fontSize:15}}>📜 古物台帳</div>
            <div style={{fontSize:12,color:'#999',marginTop:2}}>在庫 {data.inventory.length}件（売却済 {data.sales.length}件含む）</div>
          </div>
          <button className="btn-secondary" style={{padding:'7px 14px',fontSize:13}} onClick={exportKobotsuCSV}>CSVのみ</button>
        </div>
        <div style={{fontSize:11,color:'#92400e',background:'#fff7ed',borderRadius:8,padding:'6px 10px',marginBottom:10}}>
          📌 1商品1行・仕入れ＋売却を横並び記録（古物営業法対応）
        </div>
        {kobotsuPreview.length === 0 ? (
          <div style={{textAlign:'center',color:'#bbb',padding:'16px 0',fontSize:13}}>データがありません</div>
        ) : (
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table style={{fontSize:12,borderCollapse:'collapse',minWidth:560}}>
              <thead>
                <tr>
                  <th colSpan={5} style={{...thStyle,background:'#dbeafe',color:'#1e3a5f',textAlign:'center'}}>◀ 仕入れ（入れ）</th>
                  <th colSpan={3} style={{...thStyle,background:'#d1fae5',color:'#065f46',textAlign:'center'}}>払出し（売却）▶</th>
                  <th style={{...thStyle,background:'#f5f5f5'}}></th>
                </tr>
                <tr style={{background:'#f8f8f8'}}>
                  {['仕入年月日','品目','品名（特徴）','仕入単価','仕入先','許可証番号','売却年月日','売却単価','販路',''].map(h=>(
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kobotsuPreview.slice(0,10).map(({item,sale},i) => {
                  const bs = getBundleStyle(item);
                  const canEditKobotsu = typeof setEditingItem === 'function' && typeof setTab === 'function';
                  const goEditFromKobotsu = canEditKobotsu ? (e) => {
                    e.stopPropagation();
                    if (setPendingReturnSection) setPendingReturnSection('export');
                    if (setPendingReturnTab) setPendingReturnTab('other');
                    setEditingItem(item); setTab('purchase');
                  } : undefined;
                  const rowBg = bs ? `${bs.color}12` : (i%2===0?'white':'#fafafa');
                  return (
                  <tr key={item.id}
                    onClick={bs ? () => setExpandedBundleGroup(item.bundleGroup) : () => setKobotsuSelected(item)}
                    style={{borderBottom:'1px solid #f3f3f3',
                      background: rowBg,
                      borderLeft: bs ? `4px solid ${bs.color}` : '4px solid transparent',
                      cursor:'pointer'}}
                    onMouseEnter={e => { if (!bs) e.currentTarget.style.background='#f0f9ff'; }}
                    onMouseLeave={e => { if (!bs) e.currentTarget.style.background=rowBg; }}>
                    <td style={tdStyle({color: item.purchaseDate ? '#555' : '#dc2626', fontWeight: item.purchaseDate ? 400 : 700})}>{item.purchaseDate || '⚠️未入力'}</td>
                    <td style={tdStyle({color: item.category ? '#555' : '#dc2626', fontWeight: item.category ? 400 : 700})}>{item.category || '⚠️未入力'}</td>
                    <td style={tdStyle({maxWidth:140,overflow:'hidden',textOverflow:'ellipsis'})}>
                      {bs && (
                        <span style={{display:'inline-block',background:bs.color,color:'white',borderRadius:4,
                          padding:'1px 5px',fontSize:9,fontWeight:700,marginRight:5,verticalAlign:'middle',flexShrink:0}}>
                          📦まとめ{bs.count}点 ›
                        </span>
                      )}
                      {item.brand
                        ? <span style={{color:'#888',fontSize:10,marginRight:3}}>{item.brand}</span>
                        : <span style={{color:'#dc2626',fontWeight:700,fontSize:9}}>⚠️ブランド未入力 </span>}
                      {item.productName}
                    </td>
                    <td style={tdStyle({fontWeight:600})}>¥{formatMoney(item.purchasePrice)}</td>
                    <td style={tdStyle({fontSize:11,maxWidth:80,overflow:'hidden',textOverflow:'ellipsis'})}>
                      <div style={{color: item.purchaseStore ? '#555' : '#dc2626', fontWeight: item.purchaseStore ? 400 : 700}}>{item.purchaseStore||'⚠️未入力'}</div>
                      {resolveCompanyName(item) && <div style={{fontSize:10,color:'#aaa'}}>{resolveCompanyName(item)}</div>}
                    </td>
                    <td style={tdStyle({color:'#777',fontSize:10,maxWidth:80,overflow:'hidden',textOverflow:'ellipsis'})}>
                      {resolveLicense(item) || '未設定'}
                    </td>
                    <td style={tdStyle({color: sale?'#16a34a':'#bbb'})}>{sale?.saleDate||'−'}</td>
                    <td style={tdStyle({fontWeight: sale?700:400,color:sale?'#16a34a':'#bbb'})}>{sale ? `¥${formatMoney(sale.salePrice)}` : '−'}</td>
                    <td style={tdStyle({color:sale?'#555':'#bbb'})}>{sale?.platform||'−'}</td>
                    <td style={tdStyle({padding:'4px 6px'})}>
                      {canEditKobotsu && (
                        <button onClick={goEditFromKobotsu}
                          style={{padding:'3px 8px',fontSize:11,fontWeight:700,border:'1px solid #d1d5db',
                            borderRadius:6,background:'white',color:'#374151',cursor:'pointer',
                            whiteSpace:'nowrap',touchAction:'manipulation',lineHeight:1.4}}>
                          ✏️ 編集
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {kobotsuPreview.length > 10 && (
              <button type="button" onClick={() => setShowAllKobotsu(true)}
                style={{display:'block',width:'100%',marginTop:8,padding:'8px',borderRadius:8,
                  border:'1px dashed #ddd',background:'#fafafa',cursor:'pointer',
                  fontSize:12,color:'#2563eb',fontWeight:700,textAlign:'center'}}>
                …他 {kobotsuPreview.length-10}件を全て表示
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 古物台帳 全件表示モーダル ── */}
      {/* ── まとめ仕入れ詳細モーダル ── */}
      {expandedBundleGroup && (() => {
        const bundleItems = kobotsuPreview.filter(({item}) => item.bundleGroup === expandedBundleGroup);
        const bs = getBundleStyle(bundleItems[0]?.item);
        const totalPP = bundleItems.reduce((s, {item}) => s + (item.purchasePrice||0), 0);
        const soldCount = bundleItems.filter(({sale}) => !!sale).length;
        const totalSP   = bundleItems.reduce((s, {sale}) => s + (sale?.salePrice||0), 0);
        const FIELDS = [
          ['品名', ({item}) => [item.brand, item.productName].filter(Boolean).join(' ') || '−'],
          ['品目（カテゴリ）', ({item}) => item.category||'−'],
          ['カラー', ({item}) => item.color||'−'],
          ['状態ランク', ({item}) => item.condition||'−'],
          ['仕入れ日', ({item}) => item.purchaseDate||'⚠️未入力'],
          ['仕入れ先', ({item}) => item.purchaseStore||'⚠️未入力'],
          ['仕入れ価格', ({item}) => item.purchasePrice ? `¥${formatMoney(item.purchasePrice)}` : '−'],
          ['出品価格（定価）', ({item}) => item.listPrice ? `¥${formatMoney(item.listPrice)}` : '−'],
          ['売却日', ({sale}) => sale?.saleDate||'未売却'],
          ['販売価格', ({sale}) => sale?.salePrice ? `¥${formatMoney(sale.salePrice)}` : '−'],
          ['純利益', ({sale,item}) => {
            if (!sale) return '−';
            const profit = sale.profit ?? Math.round(sale.salePrice*(1-(sale.feeRate||0.1)) - (sale.shipping||0) - (item.purchasePrice||0));
            return `¥${formatMoney(profit)}`;
          }],
          ['販路', ({sale}) => sale?.platform||'−'],
          ['メモ', ({item}) => item.notes||'−'],
        ];
        return (
          <div className="modal-overlay" onClick={() => setExpandedBundleGroup(null)}>
            <div className="modal-content slide-up" onClick={e => e.stopPropagation()}
              style={{maxHeight:'90vh',display:'flex',flexDirection:'column',padding:0,overflow:'hidden'}}>
              {/* ヘッダー */}
              <div style={{
                background: bs ? `linear-gradient(135deg, ${bs.color}dd, ${bs.color}99)` : '#374151',
                padding:'14px 18px',borderRadius:'20px 20px 0 0',flexShrink:0,
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontWeight:800,fontSize:16,color:'white'}}>📦 まとめ仕入れ詳細</div>
                  <button onClick={() => setExpandedBundleGroup(null)}
                    style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:99,width:30,height:30,
                      fontSize:18,cursor:'pointer',color:'white',display:'flex',alignItems:'center',justifyContent:'center',touchAction:'manipulation'}}>×</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[
                    ['点数', `${bundleItems.length}点`, 'white'],
                    ['仕入れ総額', `¥${formatMoney(totalPP)}`, '#fde68a'],
                    ['売却済', `${soldCount}/${bundleItems.length}件`, totalSP>0 ? '#86efac' : 'rgba(255,255,255,0.7)'],
                  ].map(([l,v,c]) => (
                    <div key={l} style={{background:'rgba(255,255,255,0.15)',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:700,marginBottom:3}}>{l}</div>
                      <div style={{fontSize:14,fontWeight:800,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* アイテムリスト */}
              <div style={{overflowY:'auto',flex:1,padding:'12px 16px',WebkitOverflowScrolling:'touch'}}>
                {bundleItems.map(({item,sale},idx) => (
                  <div key={item.id} style={{
                    marginBottom:12,borderRadius:14,overflow:'hidden',
                    border: `2px solid ${bs?.color||'#e5e5e5'}22`,
                    boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    {/* アイテムヘッダー */}
                    <div style={{background: bs ? `${bs.color}18` : '#f9fafb', padding:'8px 12px',
                      borderBottom:`1px solid ${bs?.color||'#e5e5e5'}33`,
                      display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:22,height:22,borderRadius:99,background:bs?.color||'#6b7280',
                        color:'white',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {idx+1}
                      </div>
                      <div style={{flex:1,fontWeight:700,fontSize:13,color:'#111',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {item.brand && <span style={{color:'#999',fontSize:11,marginRight:4}}>{item.brand}</span>}
                        {item.productName||'商品名未入力'}
                      </div>
                      {sale ? (
                        <span style={{fontSize:11,background:'#d1fae5',color:'#065f46',borderRadius:99,padding:'2px 8px',fontWeight:700,flexShrink:0}}>売却済</span>
                      ) : (
                        <span style={{fontSize:11,background:'#f3f4f6',color:'#6b7280',borderRadius:99,padding:'2px 8px',fontWeight:700,flexShrink:0}}>未売却</span>
                      )}
                      {typeof setEditingItem === 'function' && (
                        <button onClick={() => {
                          setExpandedBundleGroup(null);
                          if (setPendingReturnSection) setPendingReturnSection('export');
                          if (setPendingReturnTab) setPendingReturnTab('other');
                          setEditingItem(item); setTab('purchase');
                        }}
                          style={{padding:'3px 10px',fontSize:11,fontWeight:700,border:'1px solid #d1d5db',
                            borderRadius:6,background:'white',color:'#374151',cursor:'pointer',
                            flexShrink:0,whiteSpace:'nowrap',touchAction:'manipulation'}}>
                          ✏️ 編集
                        </button>
                      )}
                    </div>
                    {/* 詳細フィールド */}
                    <div style={{padding:'10px 12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 10px',background:'white'}}>
                      {FIELDS.map(([label, getter]) => {
                        const val = getter({item,sale});
                        if (val === '−' || val === null) return null;
                        const isWarning = val?.toString().startsWith('⚠️');
                        return (
                          <div key={label} style={{minWidth:0}}>
                            <div style={{fontSize:9,color:'#9ca3af',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</div>
                            <div style={{fontSize:12,fontWeight:600,color: isWarning ? '#dc2626' : '#111',marginTop:1,wordBreak:'break-all'}}>{val}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {showAllKobotsu && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',flexDirection:'column'}}
          onClick={e => { if (e.target === e.currentTarget) setShowAllKobotsu(false); }}>
          <div style={{background:'white',margin:'0',flex:1,display:'flex',flexDirection:'column',
            borderRadius:0,overflow:'hidden',maxHeight:'100vh'}}>
            {/* ヘッダー */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'12px 16px',borderBottom:'1px solid #eee',flexShrink:0,background:'white'}}>
              <div>
                <div style={{fontWeight:700,fontSize:16}}>📜 古物台帳 全件</div>
                <div style={{fontSize:12,color:'#999',marginTop:2}}>全 {kobotsuPreview.length} 件</div>
              </div>
              <button onClick={() => setShowAllKobotsu(false)}
                style={{background:'#f5f5f5',border:'none',borderRadius:20,width:32,height:32,
                  fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                ✕
              </button>
            </div>
            {/* テーブル */}
            <div style={{flex:1,overflowY:'auto',overflowX:'auto',WebkitOverflowScrolling:'touch',padding:'0 4px 16px'}}>
              <table style={{fontSize:12,borderCollapse:'collapse',minWidth:560,width:'100%'}}>
                <thead style={{position:'sticky',top:0,zIndex:1}}>
                  <tr>
                    <th colSpan={5} style={{...thStyle,background:'#dbeafe',color:'#1e3a5f',textAlign:'center'}}>◀ 仕入れ（入れ）</th>
                    <th colSpan={3} style={{...thStyle,background:'#d1fae5',color:'#065f46',textAlign:'center'}}>払出し（売却）▶</th>
                    <th style={{...thStyle,background:'#f5f5f5'}}></th>
                  </tr>
                  <tr style={{background:'#f8f8f8'}}>
                    {['仕入年月日','品目','品名（特徴）','仕入単価','仕入先','許可証番号','売却年月日','売却単価','販路',''].map(h=>(
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kobotsuPreview.map(({item,sale},i) => {
                    const bs = getBundleStyle(item);
                    const canEditKobotsu = typeof setEditingItem === 'function' && typeof setTab === 'function';
                    const goEditFromKobotsuAll = canEditKobotsu ? (e) => {
                      e.stopPropagation();
                      setShowAllKobotsu(false);
                      if (setPendingReturnSection) setPendingReturnSection('export');
                      if (setPendingReturnTab) setPendingReturnTab('other');
                      setEditingItem(item); setTab('purchase');
                    } : undefined;
                    return (
                    <tr key={item.id}
                      onClick={bs ? () => setExpandedBundleGroup(item.bundleGroup) : () => { setShowAllKobotsu(false); setKobotsuSelected(item); }}
                      style={{borderBottom:'1px solid #f3f3f3',
                        background: bs ? `${bs.color}12` : (i%2===0?'white':'#fafafa'),
                        borderLeft: bs ? `4px solid ${bs.color}` : '4px solid transparent',
                        cursor:'pointer'}}>
                      <td style={tdStyle({color: item.purchaseDate ? '#555' : '#dc2626', fontWeight: item.purchaseDate ? 400 : 700})}>{item.purchaseDate || '⚠️未入力'}</td>
                      <td style={tdStyle({color: item.category ? '#555' : '#dc2626', fontWeight: item.category ? 400 : 700})}>{item.category||'⚠️未入力'}</td>
                      <td style={tdStyle({maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'})}>
                        {bs && (
                          <span style={{display:'inline-block',background:bs.color,color:'white',borderRadius:4,
                            padding:'1px 5px',fontSize:9,fontWeight:700,marginRight:5,verticalAlign:'middle'}}>
                            📦まとめ{bs.count}点 ›
                          </span>
                        )}
                        {item.brand
                          ? <span style={{color:'#888',fontSize:10,marginRight:3}}>{item.brand}</span>
                          : <span style={{color:'#dc2626',fontWeight:700,fontSize:9}}>⚠️ブランド未入力 </span>}
                        {item.productName}
                      </td>
                      <td style={tdStyle({fontWeight:600})}>¥{formatMoney(item.purchasePrice)}</td>
                      <td style={tdStyle({fontSize:11,maxWidth:90,overflow:'hidden',textOverflow:'ellipsis'})}>
                        <div style={{color: item.purchaseStore ? '#555' : '#dc2626', fontWeight: item.purchaseStore ? 400 : 700}}>{item.purchaseStore||'⚠️未入力'}</div>
                        {resolveCompanyName(item) && <div style={{fontSize:10,color:'#aaa'}}>{resolveCompanyName(item)}</div>}
                      </td>
                      <td style={tdStyle({color:'#777',fontSize:10,maxWidth:80,overflow:'hidden',textOverflow:'ellipsis'})}>
                        {resolveLicense(item) || '未設定'}
                      </td>
                      <td style={tdStyle({color: sale?'#16a34a':'#bbb'})}>{sale?.saleDate||'−'}</td>
                      <td style={tdStyle({fontWeight: sale?700:400,color:sale?'#16a34a':'#bbb'})}>{sale ? `¥${formatMoney(sale.salePrice)}` : '−'}</td>
                      <td style={tdStyle({color:sale?'#555':'#bbb'})}>{sale?.platform||'−'}</td>
                      <td style={tdStyle({padding:'4px 6px'})}>
                        {canEditKobotsu && (
                          <button onClick={goEditFromKobotsuAll}
                            style={{padding:'3px 8px',fontSize:11,fontWeight:700,border:'1px solid #d1d5db',
                              borderRadius:6,background:'white',color:'#374151',cursor:'pointer',
                              whiteSpace:'nowrap',touchAction:'manipulation',lineHeight:1.4}}>
                            ✏️ 編集
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 古物台帳 商品詳細モーダル ── */}
      {kobotsuSelected && (() => {
        const item = kobotsuSelected;
        const sale = data.sales.find(s => s.inventoryId === item.id);
        const statusCfg = item.status === 'sold'
          ? { label: '売却済', color: '#16a34a', bg: '#d1fae5' }
          : item.status === 'listed'
          ? { label: '出品中', color: '#2563eb', bg: '#eff6ff' }
          : { label: '未出品', color: '#d97706', bg: '#fef3c7' };
        const kobotsuChecks = [
          { label: '仕入年月日',       ok: !!item.purchaseDate,    value: item.purchaseDate    || '未入力' },
          { label: '品目（カテゴリ）', ok: !!item.category,        value: item.category        || '未入力' },
          { label: 'ブランド',         ok: !!item.brand,           value: item.brand           || '未入力' },
          { label: '商品名',           ok: !!item.productName,     value: item.productName     || '未入力' },
          { label: '仕入単価',         ok: item.purchasePrice > 0, value: item.purchasePrice   ? `¥${formatMoney(item.purchasePrice)}` : '未入力' },
          { label: '仕入先',           ok: !!item.purchaseStore,   value: item.purchaseStore   || '未入力' },
          { label: '許可証番号',       ok: !!resolveLicense(item), value: resolveLicense(item) || '未設定' },
        ];
        const missingCount = kobotsuChecks.filter(c => !c.ok).length;
        const canEdit = typeof setEditingItem === 'function' && typeof setTab === 'function';
        return (
          <div className="modal-overlay" onClick={() => setKobotsuSelected(null)}>
            <div className="modal-content slide-up" onClick={e => e.stopPropagation()}
              style={{maxWidth:420,width:'calc(100% - 32px)',maxHeight:'88vh',overflowY:'auto',padding:18}}>

              {/* ヘッダー */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:6}}>
                    <span style={{fontSize:11,background:statusCfg.bg,color:statusCfg.color,
                      borderRadius:99,padding:'2px 8px',fontWeight:700}}>
                      {statusCfg.label}
                    </span>
                    {missingCount > 0
                      ? <span style={{fontSize:11,background:'#fef2f2',color:'#dc2626',borderRadius:99,padding:'2px 8px',fontWeight:700}}>⚠️ 未入力 {missingCount}項目</span>
                      : <span style={{fontSize:11,background:'#dcfce7',color:'#16a34a',borderRadius:99,padding:'2px 8px',fontWeight:700}}>✅ 必要項目 入力済</span>
                    }
                  </div>
                  {item.brand && <div style={{fontSize:12,color:'#9ca3af',marginBottom:3}}>{item.brand}</div>}
                  <div style={{fontWeight:800,fontSize:16,lineHeight:1.3}}>{item.productName || '（商品名未入力）'}</div>
                </div>
                <button onClick={() => setKobotsuSelected(null)}
                  style={{background:'#f5f5f5',border:'none',borderRadius:20,width:32,height:32,fontSize:18,
                    cursor:'pointer',flexShrink:0,marginLeft:10,display:'flex',alignItems:'center',
                    justifyContent:'center',touchAction:'manipulation'}}>✕</button>
              </div>

              {/* 古物台帳 必要項目チェック */}
              <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 14px',marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:13}}>📜 古物台帳 必要項目</div>
                  <div style={{fontSize:11,borderRadius:99,padding:'2px 10px',fontWeight:700,
                    background: missingCount===0?'#dcfce7':'#fef2f2',
                    color:       missingCount===0?'#16a34a':'#dc2626'}}>
                    {missingCount===0 ? '完全入力済み' : `${missingCount}件 未入力`}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
                  {kobotsuChecks.map(c => (
                    <div key={c.label}>
                      <div style={{fontSize:10,color:'#9ca3af',fontWeight:600,marginBottom:2}}>{c.label}</div>
                      <div style={{fontSize:12,fontWeight:600,color: c.ok ? '#111' : '#dc2626',
                        display:'flex',alignItems:'center',gap:3}}>
                        {!c.ok && <span style={{fontSize:13}}>⚠️</span>}
                        {c.value}
                      </div>
                    </div>
                  ))}
                </div>
                {missingCount > 0 && (
                  <div style={{marginTop:12,fontSize:11,color:'#9ca3af',textAlign:'center'}}>
                    ⚠️ の項目は「✏️ 編集する」から入力できます
                  </div>
                )}
              </div>

              {/* 売却情報 */}
              {sale && (
                <div style={{background:'#f0fdf4',borderRadius:12,padding:'12px 14px',marginBottom:14}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'#16a34a'}}>💰 売却情報</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 14px'}}>
                    {[
                      ['売却日', sale.saleDate || '−', false],
                      ['販売価格', sale.salePrice ? `¥${formatMoney(sale.salePrice)}` : '−', true],
                      ['純利益', sale.profit != null ? `¥${formatMoney(sale.profit)}` : '−', true],
                      ['販路', sale.platform || '−', false],
                    ].map(([label, val, bold]) => (
                      <div key={label}>
                        <div style={{fontSize:10,color:'#9ca3af',fontWeight:600,marginBottom:1}}>{label}</div>
                        <div style={{fontSize:12,fontWeight: bold?700:600,color: bold?'#16a34a':'#111'}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ボタン */}
              {canEdit && (
                <button className="btn-primary"
                  style={{width:'100%',padding:14,fontSize:15,touchAction:'manipulation',marginBottom:8}}
                  onClick={() => {
                    setKobotsuSelected(null);
                    if (setPendingReturnSection) setPendingReturnSection('export');
                    if (setPendingReturnTab) setPendingReturnTab('other');
                    setEditingItem(item);
                    setTab('purchase');
                  }}>
                  ✏️ 編集する
                </button>
              )}
              <button onClick={() => setKobotsuSelected(null)}
                style={{width:'100%',padding:12,borderRadius:12,border:'1px solid #e5e7eb',background:'white',
                  color:'#374151',fontSize:14,cursor:'pointer',fontWeight:600,touchAction:'manipulation'}}>
                閉じる
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ============================================================
// Seller Book インポーター
// ============================================================

// CSV列名 → 内部フィールド名マッピング
// 入金額は netAmount として別管理し import 時に salePrice より優先する
const SELLER_BOOK_COL_MAP = {
  // 商品名
  '商品名':'productName', 'タイトル':'productName', '品名':'productName', '商品':'productName',
  // ブランド・カテゴリ
  'ブランド':'brand', 'カテゴリ':'category', 'カテゴリー':'category', '種別':'category',
  // 仕入れ価格
  '仕入値':'purchasePrice', '仕入金額':'purchasePrice', '仕入価格':'purchasePrice',
  '仕入れ値':'purchasePrice', '仕入れ金額':'purchasePrice', '仕入れ価格':'purchasePrice',
  '仕入額':'purchasePrice', '仕入れ額':'purchasePrice',
  '原価':'purchasePrice', '購入金額':'purchasePrice', '落札金額':'purchasePrice', '落札価格（税込）':'purchasePrice',
  // 入金額（手数料・送料控除後の実入金。salePrice より優先）
  '入金額':'netAmount', '入金':'netAmount', '実入金額':'netAmount', '手取り':'netAmount',
  // 販売価格（入金額がない場合のフォールバック）
  '販売価格':'salePrice', '売上金額':'salePrice', '売れた金額':'salePrice',
  '売却金額':'salePrice', '売却価格':'salePrice', '出品価格':'salePrice',
  '落札金額（税込）':'salePrice', '取引金額':'salePrice',
  // 手数料
  '手数料':'fee', '販売手数料':'fee', 'フリマ手数料':'fee',
  // 送料
  '送料':'shipping', '配送料':'shipping', '発送費':'shipping', '配送費':'shipping',
  // 利益
  '利益':'profit', '純利益':'profit', '粗利':'profit', '儲け':'profit',
  // プラットフォーム
  'プラットフォーム':'platform', '販売先':'platform', '販売チャネル':'platform',
  'フリマ':'platform', '出品先':'platform', 'サービス':'platform', 'アプリ':'platform',
  // 日付
  '仕入れ日':'purchaseDate', '仕入日':'purchaseDate', '購入日':'purchaseDate',
  '取得日':'purchaseDate', '落札日':'purchaseDate', '入手日':'purchaseDate',
  '出品日':'listDate',
  '売れた日':'saleDate', '売却日':'saleDate', '販売日':'saleDate',
  '取引完了日':'saleDate', '完了日':'saleDate', '評価日':'saleDate',
  // ステータス
  'ステータス':'status', '状態':'status',
  // メモ
  'メモ':'notes', '備考':'notes', 'コメント':'notes',
};

// 内部フィールド → 表示名（確認画面用）
const SB_FIELD_LABELS = {
  productName: '商品名', brand: 'ブランド', category: 'カテゴリ',
  purchasePrice: '仕入れ価格', netAmount: '入金額（販売価格として優先使用）',
  salePrice: '販売価格', fee: '手数料', shipping: '送料', profit: '利益',
  platform: 'プラットフォーム', purchaseDate: '仕入れ日', listDate: '出品日',
  saleDate: '売却日', status: 'ステータス', notes: 'メモ',
};

// CSVパーサー（BOM除去・Quoted field対応）
const parseCSVText = (text) => {
  // UTF-8 BOM除去
  const cleaned = text.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  // タブ区切り(TSV)自動検出
  const tabCount = (lines[0].match(/\t/g)||[]).length;
  const commaCount = (lines[0].match(/,/g)||[]).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';
  const parseRow = (line) => {
    const result = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i+1]==='"') { cur+='"'; i++; } else { inQ=!inQ; } }
      else if (c === delimiter && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    result.push(cur.trim());
    return result;
  };
  return { headers: parseRow(lines[0]), rows: lines.slice(1).map(parseRow) };
};

const SellerBookImporter = ({ data, setData, toast, currentUser }) => {
  const [parsed, setParsed]     = React.useState(null);   // { headers, rows, colMap, mapping, unmapped, fileName }
  const [importing, setImporting] = React.useState(false);
  const fileRef = React.useRef();

  const cleanNum = v => {
    if (!v && v !== 0) return 0;
    const s = String(v)
      .replace(/[￥¥]/g, '')                    // 全角・半角円記号
      .replace(/[，,]/g, '')                    // 全角・半角カンマ
      .replace(/[円]/g, '')                     // 「円」文字
      .replace(/[\s\u00A0\u3000]/g, '')         // 各種スペース（全角含む）
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30)); // 全角数字→半角
    return Number(s) || 0;
  };
  const cleanDate = v => {
    if (!v) return '';
    const s = String(v).replace(/\//g,'-').replace(/\s.*/,'');
    const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : '';
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const buf = await file.arrayBuffer();
    let text;
    try {
      // Shift-JIS を試みて文字化けが多ければ UTF-8 にフォールバック
      const dec = new TextDecoder('shift-jis'); text = dec.decode(buf);
      if ((text.match(/\uFFFD/g)||[]).length > 5) text = new TextDecoder('utf-8').decode(buf);
    } catch { text = new TextDecoder('utf-8').decode(buf); }

    const { headers, rows } = parseCSVText(text);
    if (!headers.length) { toast('❌ CSVを読み込めませんでした（ヘッダー行が見つかりません）'); return; }

    // 列名 → フィールドマッピングを構築
    const colMap = {};   // fieldName → colIndex
    const mapping = [];  // 確認画面用: { csvCol, fieldName, label }
    const unmapped = []; // マッピングできなかった列名

    headers.forEach((h, i) => {
      const key = h.trim();
      const field = SELLER_BOOK_COL_MAP[key];
      if (field) {
        colMap[field] = i;
        mapping.push({ csvCol: key, fieldName: field, label: SB_FIELD_LABELS[field] || field });
      } else if (key) {
        unmapped.push(key);
      }
    });

    setParsed({ headers, rows, colMap, mapping, unmapped, fileName: file.name });
    e.target.value = '';
  };

  const handleImport = () => {
    if (!parsed) return;
    setImporting(true);
    try {
      const { rows, colMap } = parsed;
      const uid = currentUser || 'self';
      const newInv   = [...(data.inventory||[])];
      const newSales = [...(data.sales||[])];
      let cnt = 0, skipped = 0;

      rows.forEach((row, ri) => {
        const get = f => colMap[f] != null ? (row[colMap[f]] || '') : '';

        const name = get('productName');
        if (!name) { skipped++; return; }

        const purchasePrice = cleanNum(get('purchasePrice'));
        // 入金額（netAmount）を販売価格として優先。なければ販売価格（salePrice）を使用
        const salePrice = cleanNum(get('netAmount')) || cleanNum(get('salePrice'));
        const purchaseDate = cleanDate(get('purchaseDate')) || today();
        const saleDate     = cleanDate(get('saleDate'));
        const listDate     = cleanDate(get('listDate'));
        const platform     = get('platform') || 'メルカリ';
        const statusRaw    = get('status');

        let status = 'unlisted';
        if (saleDate || /売|sold|完了|評価/i.test(statusRaw)) status = 'sold';
        else if (listDate || /出品中|listed/i.test(statusRaw))  status = 'listed';

        const itemId = `sb_${Date.now()}_${ri}_${Math.random().toString(36).slice(2,5)}`;
        newInv.push({
          id: itemId, userId: uid,
          productName: name,
          brand: get('brand'), category: get('category'),
          purchasePrice, listPrice: salePrice,
          purchaseDate, listDate, status, photos: [],
          createdAt: new Date().toISOString(),
        });

        if (status === 'sold' && saleDate) {
          const feeRate = platform==='ヤフオク'?0.088 : platform==='ラクマ'?0.06 : 0.10;
          const ship    = cleanNum(get('shipping')) || CONFIG.ESTIMATED_SHIPPING;
          const profit  = cleanNum(get('profit')) || calcProfit(salePrice, purchasePrice, feeRate, ship);
          newSales.push({
            id: `sbs_${Date.now()}_${ri}_${Math.random().toString(36).slice(2,5)}`,
            inventoryId: itemId, userId: uid,
            platform, salePrice, feeRate, shipping: ship, profit, saleDate,
          });
        }
        cnt++;
      });

      setData({ ...data, inventory: newInv, sales: newSales });
      const invAdded   = newInv.length   - (data.inventory||[]).length;
      const salesAdded = newSales.length - (data.sales||[]).length;
      toast(`✅ ${cnt}件インポート完了（在庫+${invAdded}件 / 売上+${salesAdded}件${skipped>0?` / スキップ${skipped}件`:''}）`);
      setParsed(null);
    } catch(e) {
      toast(`❌ インポートエラー: ${e.message}`);
    } finally { setImporting(false); }
  };

  return (
    <div>
      {/* ── ファイル選択カード ── */}
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>📥 Seller Book データインポート</div>
        <div style={{fontSize:12,color:'#666',marginBottom:12,lineHeight:1.7}}>
          Seller Book の「CSV出力」から書き出したファイルを読み込みます。<br/>
          <span style={{color:'#E84040',fontWeight:600}}>※ インポート前に必ずバックアップを取ってください</span>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{display:'none'}}/>
        <button className="btn-primary" style={{width:'100%'}} onClick={() => fileRef.current?.click()}>
          📂 CSVファイルを選択
        </button>
        <div style={{fontSize:11,color:'#999',marginTop:8,lineHeight:1.6}}>
          Seller Book → メニュー → CSV出力 → 全ステータス → CSV作成<br/>
          対応形式: UTF-8 / Shift-JIS (自動判定)
        </div>
      </div>

      {/* ── マッピング確認画面 ── */}
      {parsed && (
        <div className="card" style={{padding:16,marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>📋 列マッピング確認</div>
          <div style={{fontSize:12,color:'#888',marginBottom:12}}>
            {parsed.fileName} &nbsp;·&nbsp; {parsed.rows.length}件
          </div>

          {/* ✅ マッピング成功列 */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:'#065f46',marginBottom:6}}>
              ✅ 認識した列（{parsed.mapping.length}列）
            </div>
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,overflow:'hidden'}}>
              {parsed.mapping.map((m, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'7px 12px',borderBottom: i < parsed.mapping.length-1 ? '1px solid #dcfce7' : 'none'}}>
                  <span style={{fontSize:12,fontWeight:600,color:'#333'}}>{m.csvCol}</span>
                  <span style={{fontSize:11,color:'#16a34a',display:'flex',alignItems:'center',gap:4}}>
                    → {m.label}
                    {m.fieldName === 'netAmount' && (
                      <span style={{background:'#fef9c3',color:'#854d0e',fontSize:9,borderRadius:4,padding:'1px 5px',fontWeight:700}}>
                        販売価格として優先
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ⚠️ マッピングできなかった列 */}
          {parsed.unmapped.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:'#92400e',marginBottom:6}}>
                ⚠️ 未対応の列（インポートされません・{parsed.unmapped.length}列）
              </div>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'8px 12px',
                display:'flex',flexWrap:'wrap',gap:6}}>
                {parsed.unmapped.map(h => (
                  <span key={h} style={{background:'#fef3c7',color:'#92400e',fontSize:11,borderRadius:6,padding:'2px 8px'}}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* データプレビュー（先頭3件）*/}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:'#555',marginBottom:6}}>
              データプレビュー（先頭3件）
            </div>
            {parsed.rows.slice(0,3).map((row, i) => {
              const get = f => parsed.colMap[f] != null ? (row[parsed.colMap[f]] || '−') : '−';
              const salePriceVal = get('netAmount') !== '−' ? get('netAmount') : get('salePrice');
              return (
                <div key={i} style={{background:'#fafafa',borderRadius:8,padding:'9px 12px',marginBottom:6,fontSize:11,border:'1px solid #f0f0f0'}}>
                  <div style={{fontWeight:700,marginBottom:3,color:'#1a1a1a'}}>{get('productName')}</div>
                  <div style={{color:'#666',display:'flex',flexWrap:'wrap',gap:10}}>
                    <span>仕入 ¥{get('purchasePrice')}</span>
                    <span>販売 ¥{salePriceVal}</span>
                    {get('profit') !== '−' && <span>利益 ¥{get('profit')}</span>}
                    {get('platform') !== '−' && <span>{get('platform')}</span>}
                    {get('saleDate') !== '−' && <span>売却日 {get('saleDate')}</span>}
                    {get('purchaseDate') !== '−' && <span>仕入日 {get('purchaseDate')}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{display:'flex',gap:8}}>
            <button className="btn-primary" style={{flex:1}} onClick={handleImport} disabled={importing}>
              {importing
                ? <><span className="spinner"/><span>インポート中...</span></>
                : `✅ ${parsed.rows.length}件をインポート`}
            </button>
            <button className="btn-secondary" style={{flex:'0 0 auto'}} onClick={() => setParsed(null)}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 白抜きユーティリティ（OtherTab外の純粋関数）
// ============================================================

// File → base64文字列（dataURL の ","以降）
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// 透明PNG Blob → 白背景JPEG Blob（Canvas合成）
const compositeOnWhiteBg = (transparentBlob) => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(transparentBlob);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      blob ? resolve(blob) : reject(new Error('canvas変換失敗'));
    }, 'image/jpeg', 0.92);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像読み込み失敗')); };
  img.src = url;
});

// Fileを受け取り → プロキシ経由でbg除去 → 白背景JPEG Blobを返す
const runRemoveBg = async (file, apiKey) => {
  const imageBase64 = await fileToBase64(file);
  const res = await fetch('/api/removebg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, apiKey }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  // base64 PNG → Blob
  const bytes = Uint8Array.from(atob(data.imageBase64), c => c.charCodeAt(0));
  const pngBlob = new Blob([bytes], { type: 'image/png' });
  // 白背景合成してJPEGに
  return compositeOnWhiteBg(pngBlob);
};

// ============================================================
// その他タブ（設定・レシート・エクスポート）
// ============================================================
const OtherTab = () => {
  const { data, setData, dbStatus, dbError, userProfile, setUserProfile, currentUser, setTab, setPendingEditSaleId, setEditingItem, setPendingReturnTab, pendingReturnSection, setPendingReturnSection } = React.useContext(AppContext);
  const toast = useToast();
  const [activeSection, setActiveSection] = React.useState(pendingReturnSection || 'receipts');
  React.useEffect(() => { if (pendingReturnSection) setPendingReturnSection(null); }, []);
  const [receiptAnalyzing, setReceiptAnalyzing] = React.useState(false);
  const [receiptModal, setReceiptModal] = React.useState(null);
  const [receiptEdit, setReceiptEdit] = React.useState(null);
  // 白抜きツール用ステート（コンポーネント内で完結・アプリデータに書かない）
  const [bgItems, setBgItems] = React.useState([]); // [{id,name,file,resultBlob,resultUrl,status,error,selected}]
  const [bgProcessing, setBgProcessing] = React.useState(false);
  const bgFileInputRef = React.useRef();
  const [settings, setSettings] = React.useState({ ...getInitialData().settings, ...data.settings });
  const [yahooAddForm, setYahooAddForm] = React.useState(null); // null=非表示, {storeName:'',license:''}=入力中
  const [storeRenameForm, setStoreRenameForm] = React.useState({ from: '', to: '' }); // ストア名一括変更
  const receiptFileRef = React.useRef();
  const restoreFileRef = React.useRef();
  const [photoCount, setPhotoCount] = React.useState(0);
  const qrCanvasRef = React.useRef();
  const [appUrl, setAppUrl] = React.useState('');

  React.useEffect(() => {
    if (activeSection === 'settings') {
      getAllPhotoIds().then(ids => setPhotoCount(ids.length)).catch(() => {});
    }
    if (activeSection === 'qr') {
      // QRコードにセットするURLを決定してQRを生成する共通関数
      const generateQR = (url) => {
        setAppUrl(url);
        setTimeout(() => {
          if (qrCanvasRef.current && window.QRCode) {
            qrCanvasRef.current.innerHTML = '';
            new window.QRCode(qrCanvasRef.current, {
              text: url,
              width: 220,
              height: 220,
              colorDark: '#1a1a1a',
              colorLight: '#ffffff',
              correctLevel: window.QRCode.CorrectLevel.H,
            });
          }
        }, 100);
      };

      // ローカルネットワーク判定（192.168.x.x / 10.x.x.x / localhost）
      const h = location.hostname;
      const isLocal = h === 'localhost' || h === '127.0.0.1'
        || /^192\.168\./.test(h) || /^10\./.test(h)
        || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h);

      if (!isLocal) {
        // Vercel / 本番環境: 現在のオリジンをそのまま使用
        generateQR(window.location.origin);
      } else {
        // ローカル開発: config.jsonからIPを取得
        fetch('/config.json')
          .then(r => r.json())
          .then(cfg => generateQR(cfg.url || `http://${h}:3333`))
          .catch(() => generateQR(`http://${h}:3333`));
      }
    }
  }, [activeSection]);

  const saveSettings = () => {
    const newData = { ...data, settings };
    setData(newData);
    toast('✅ 設定を保存しました');
  };

  const setSetting = (key, val) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: val };
      // 即時保存が必要なキー
      if (['storeLicenses','yahooStores','googleClientId','googleSpreadsheetId'].includes(key)) {
        setData({ ...data, settings: updated });
      }
      return updated;
    });
  };
  const setPlatformFee = (platform, val) => setSettings(prev => ({
    ...prev,
    platformFees: { ...prev.platformFees, [platform]: Number(val) / 100 },
  }));

  const handleReceiptPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const apiKey = data.settings?.apiKey || '';
    if (!apiKey) { toast('⚠️ APIキーを設定してください'); return; }
    setReceiptAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        const [header, imgData] = dataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)[1];
        const text = await analyzeImagesWithClaude([{ mimeType, data: imgData }], apiKey, RECEIPT_ANALYSIS_PROMPT);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('JSON解析失敗');
        const result = JSON.parse(jsonMatch[0]);
        const newReceipt = {
          id: Date.now().toString(),
          store_name: result.store_name || '',
          purchase_date: result.purchase_date || '',
          total_amount: result.total_amount || 0,
          payment_method: result.payment_method || '',
          category: result.category || '雑費',
          items: result.items || [],
          memo: '',
          inventoryId: '',
          imageData: dataUrl,
          createdAt: new Date().toISOString(),
        };
        setData(prev => ({ ...prev, receipts: [...(prev.receipts || []), newReceipt] }));
        setReceiptModal(newReceipt);
        setReceiptEdit({ ...newReceipt });
        toast('✅ レシート読み取り完了！');
        setReceiptAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      toast(`❌ エラー: ${e.message}`);
      setReceiptAnalyzing(false);
    }
    e.target.value = '';
  };

  // ── CSVヘルパー ──────────────────────────────────────────
  // iOS Safari は <a download> が動かないため Web Share API を優先使用
  // 複数ファイルをまとめて渡せる（まとめてDL用）
  const makeCsvFile = (rows, filename) => {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    return new File(['\uFEFF' + csv], filename, { type: 'text/csv;charset=utf-8;' });
  };

  const shareOrDownloadFiles = async (files) => {
    // iOS Safari 15+: Web Share API でファイル共有（"ファイルに保存" が選べる）
    if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, title: files.map(f => f.name).join(' + ') });
        return;
      } catch(e) {
        if (e.name === 'AbortError') return; // キャンセルは無視
        // フォールバックへ
      }
    }
    // デスクトップ / フォールバック: 通常ダウンロード
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const downloadCsvBlob = (rows, filename) => {
    // 後方互換用ラッパー（旧呼び出し箇所があれば対応）
    shareOrDownloadFiles([makeCsvFile(rows, filename)]);
  };

  // ── 売上管理表CSV ────────────────────────────────────────
  // 販売利益 = 売上 − 手数料 − 送料（仕入れ前の粗利）
  // 純利益   = 販売利益 − 仕入単価（最終手取り）
  const buildSalesRows = () => {
    const headers = [
      'No','管理番号','ブランド','品名','古物品目',
      '仕入日','仕入先','仕入単価(円)','出品日',
      '販売日','曜日','月','販路',
      '売上(円)','手数料率(%)','手数料(円)','送料(円)',
      '販売利益(円)','純利益(円)','利益率(%)',
      '販売済',
    ];
    const rows = [...data.sales]
      .sort((a,b) => (a.saleDate||'') > (b.saleDate||'') ? 1 : -1)
      .map((s, i) => {
        const item = data.inventory.find(inv => inv.id === s.inventoryId) || {};
        const sp   = s.salePrice || 0;
        const fee  = Math.round(sp * (s.feeRate || 0));
        const ship = s.shipping || 0;
        const salesProfit = sp - fee - ship;                   // 販売利益
        const netProfit   = salesProfit - (item.purchasePrice || 0); // 純利益
        const profitRate  = sp > 0 ? (netProfit / sp * 100).toFixed(1) : '0.0';
        const saleDay = s.saleDate ? ['日','月','火','水','木','金','土'][new Date(s.saleDate).getDay()] : '';
        const month   = s.saleDate ? s.saleDate.slice(0,7) : '';
        return [
          i+1, item.mgmtNo||'', item.brand||'', item.productName||'', item.category||'',
          item.purchaseDate||'', item.purchaseStore||'', item.purchasePrice||0, item.listDate||'',
          s.saleDate||'', saleDay, month, s.platform||'',
          sp, ((s.feeRate||0)*100).toFixed(1), fee, ship,
          salesProfit, netProfit, profitRate,
          '済',
        ];
      });
    return [headers, ...rows];
  };

  const exportCSV = async () => {
    await shareOrDownloadFiles([makeCsvFile(buildSalesRows(), `売上管理表_${today()}.csv`)]);
    toast('📤 売上管理表を出力しました');
  };

  // ── 古物台帳CSV（1商品1行 / 仕入れ＋売却を横並びで記録）──────
  // 古物営業法に基づく台帳フォーマット:
  //  左側=仕入れ（入れ）/ 右側=売却（払出し）を同一行に記録
  const buildKobotsuRows = () => {
    const headers = [
      'No',
      // ── 仕入れ（入れ）──
      '仕入年月日','区分','品目','品名（特徴）','数量','仕入代価(円)',
      '仕入先','古物商許可証番号','決済方法',
      // ── 売却（払出し）──
      '売却年月日','売却区分','売却代価(円)','販路/売却先','販路会社名',
    ];
    // 全在庫を仕入日順に並べ、売却情報があれば横に付与
    const rows = [...data.inventory]
      .sort((a,b) => (a.purchaseDate||'') > (b.purchaseDate||'') ? 1 : -1)
      .map((item, i) => {
        const sale = data.sales.find(s => s.inventoryId === item.id);
        // 確認区分: 許可証番号があれば「古物商許可証 ○○号」、なければ「目視確認」
        // item保存値 → settings.yahooStores → settings.storeLicenses の順で解決
        const storeLicensesMap = settings.storeLicenses || data.settings?.storeLicenses || {};
        const foundYahooStore = (data.settings?.yahooStores||[]).find(s => s.storeName === item.purchaseStore);
        const license = item.sellerLicense || foundYahooStore?.license || storeLicensesMap[item.purchaseStore] || '';
        const confirmType = license
          ? `古物商許可証（${license}）`
          : (item.purchaseStore ? '目視確認' : '古物商許可証確認');
        // 販路の相手方情報
        const platformBuyer = sale?.platform
          ? { メルカリ: 'メルカリ株式会社', ラクマ: '楽天グループ株式会社', ヤフオク: 'ヤフー株式会社' }[sale.platform] || sale.platform
          : '';
        return [
          i+1,
          item.purchaseDate||'', '仕入れ', item.category||'', `${item.brand||''} ${item.productName||''}`.trim(),
          1, item.purchasePrice||0,
          item.purchaseStore||'', license, item.paymentMethod||'現金',
          sale ? (sale.saleDate||'') : '',
          sale ? '売却' : '',
          sale ? (sale.salePrice||0) : '',
          sale ? (sale.platform||'') : '',
          platformBuyer,
        ];
      });
    return [headers, ...rows];
  };

  const exportKobotsuCSV = async () => {
    await shareOrDownloadFiles([makeCsvFile(buildKobotsuRows(), `古物台帳_${today()}.csv`)]);
    toast('📤 古物台帳を出力しました');
  };

  // ── まとめてDL（両方同時）───────────────────────────────
  const exportAll = async () => {
    const files = [
      makeCsvFile(buildSalesRows(),   `売上管理表_${today()}.csv`),
      makeCsvFile(buildKobotsuRows(), `古物台帳_${today()}.csv`),
    ];
    await shareOrDownloadFiles(files);
    toast('📤 売上管理表 ＋ 古物台帳 を出力しました');
  };

  const downloadBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: loadData(),
    };
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nobushop_backup_${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('📥 バックアップをダウンロードしました');
  };

  const handleRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const restored = parsed.data || parsed;
        if (!restored.inventory) throw new Error('無効なバックアップファイルです');
        if (!confirm('現在のデータを上書きして復元しますか？')) return;
        setData({ ...getInitialData(), ...restored });
        toast('✅ バックアップから復元しました');
      } catch(err) {
        toast(`❌ 復元エラー: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sections = [
    { id: 'qr', label: 'QR', icon: '📱' },
    { id: 'receipts', label: 'レシート', icon: '🧾' },
    { id: 'removebg', label: '白抜き', icon: '✂️' },
    { id: 'export', label: 'エクスポート', icon: '📊' },
    { id: 'import', label: 'インポート', icon: '📥' },
    { id: 'settings', label: '設定', icon: '⚙️' },
    { id: 'db', label: 'DB', icon: '🗄️' },
  ];

  return (
    <div className="fade-in">
      <div className="header">
        <h1>⚙️ その他</h1>
      </div>

      {/* サブナビ */}
      <div style={{display:'flex',gap:8,padding:'10px 14px',background:'white',borderBottom:'1px solid #f0f0f0',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
        {sections.map(s => {
          const active = activeSection === s.id;
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{flexShrink:0,padding:'8px 14px',border:'none',cursor:'pointer',borderRadius:12,
                fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:5,
                background: active ? 'var(--color-primary)' : '#f3f4f6',
                color: active ? 'white' : '#777',
                boxShadow: active ? '0 2px 8px rgba(232,64,64,0.25)' : 'none',
                transition:'all 0.2s', WebkitTapHighlightColor:'transparent'}}>
              <span style={{fontSize:15}}>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{padding:'12px 16px'}}>

        {/* QRコード */}
        {activeSection === 'qr' && (
          <div>
            <div className="card" style={{padding:24,textAlign:'center',marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>📱 iPhoneで開く</div>
              <div style={{fontSize:13,color:'#666',marginBottom:20}}>
                カメラでスキャンするだけ！<br/>同じWi-Fiに繋がっていること
              </div>
              <div ref={qrCanvasRef} style={{display:'inline-block',padding:16,background:'white',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.12)'}}/>
              <div style={{marginTop:16,fontSize:13,color:'#999',wordBreak:'break-all'}}>
                {appUrl || '読み込み中...'}
              </div>
            </div>
            <div className="card" style={{padding:16,fontSize:13,color:'#555',lineHeight:1.7}}>
              <div style={{fontWeight:700,marginBottom:8}}>📲 ホーム画面に追加する方法</div>
              <div>① iPhoneのSafariでスキャン</div>
              <div>② 下の「共有ボタン」をタップ</div>
              <div>③「ホーム画面に追加」を選択</div>
              <div>④ アプリとして起動できます🎉</div>
              <div style={{marginTop:12,padding:10,background:'#fff7ed',borderRadius:8,color:'#92400e',fontSize:12}}>
                ⚠️ Macがスリープするとアクセスできなくなります
              </div>
            </div>
          </div>
        )}

        {/* レシート管理 */}
        {activeSection === 'receipts' && (() => {
          const receipts = data.receipts || [];
          const CATEGORIES = ['仕入高','荷造運賃','通信費','消耗品費','旅費交通費','雑費'];
          const CAT_COLORS = {
            '仕入高':'#3b82f6','荷造運賃':'#8b5cf6','通信費':'#06b6d4',
            '消耗品費':'#f59e0b','旅費交通費':'#10b981','雑費':'#6b7280'
          };

          // 月別グループ
          const byMonth = {};
          [...receipts].sort((a,b)=>(b.purchase_date||b.createdAt).localeCompare(a.purchase_date||a.createdAt))
            .forEach(r => {
              const m = (r.purchase_date||r.createdAt||'').slice(0,7) || '不明';
              if (!byMonth[m]) byMonth[m] = [];
              byMonth[m].push(r);
            });

          // 勘定科目別集計（全体）
          const catSummary = {};
          CATEGORIES.forEach(c => catSummary[c] = 0);
          receipts.forEach(r => {
            const c = r.category || '雑費';
            if (catSummary[c] !== undefined) catSummary[c] += (r.total_amount || 0);
            else catSummary['雑費'] += (r.total_amount || 0);
          });
          const totalAll = receipts.reduce((s,r)=>s+(r.total_amount||0), 0);

          const saveReceiptEdit = () => {
            if (!receiptEdit) return;
            setData(prev => ({
              ...prev,
              receipts: (prev.receipts||[]).map(r => r.id === receiptEdit.id ? { ...receiptEdit } : r),
            }));
            setReceiptModal({ ...receiptEdit });
            toast('✅ 保存しました');
          };

          const deleteReceipt = (id) => {
            setData(prev => ({ ...prev, receipts: (prev.receipts||[]).filter(r => r.id !== id) }));
            setReceiptModal(null);
            setReceiptEdit(null);
            toast('🗑️ 削除しました');
          };

          const exportReceiptCSV = () => {
            const headers = ['日付','店舗名','金額','決済方法','勘定科目','メモ'];
            const rows = [...receipts]
              .sort((a,b)=>(a.purchase_date||'').localeCompare(b.purchase_date||''))
              .map(r => [
                r.purchase_date||'',
                r.store_name||'',
                r.total_amount||0,
                r.payment_method||'',
                r.category||'雑費',
                r.memo||'',
              ]);
            shareOrDownloadFiles([makeCsvFile([headers,...rows], `レシート_${today()}.csv`)]);
            toast('📤 CSVを出力しました');
          };

          return (
            <div>
              {/* 撮影ボタン */}
              <button className="btn-primary" style={{width:'100%',marginBottom:12}}
                onClick={() => receiptFileRef.current?.click()} disabled={receiptAnalyzing}>
                {receiptAnalyzing ? <><span className="spinner"/>読み取り中...</> : '📷 レシートを撮影・追加'}
              </button>
              <input ref={receiptFileRef} type="file" accept="image/*" capture="environment"
                onChange={handleReceiptPhoto} style={{display:'none'}}/>

              {receipts.length > 0 && (
                <>
                  {/* 勘定科目別サマリー */}
                  <div className="card" style={{padding:14,marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <div style={{fontWeight:700,fontSize:14}}>📊 勘定科目別集計</div>
                      <button onClick={exportReceiptCSV}
                        style={{padding:'4px 10px',border:'1px solid #ddd',borderRadius:8,fontSize:12,background:'#f9f9f9',cursor:'pointer',fontWeight:600}}>
                        📤 CSV出力
                      </button>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {CATEGORIES.filter(c=>catSummary[c]>0).map(c => (
                        <div key={c} style={{background:'#f8f9fa',borderRadius:8,padding:'8px 10px',
                          borderLeft:`3px solid ${CAT_COLORS[c]}`}}>
                          <div style={{fontSize:11,color:'#666',fontWeight:600}}>{c}</div>
                          <div style={{fontSize:14,fontWeight:700,color:'#333'}}>¥{formatMoney(catSummary[c])}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:10,padding:'8px 12px',background:'#fff3cd',borderRadius:8,
                      display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontWeight:700,fontSize:13}}>合計経費</span>
                      <span style={{fontWeight:800,fontSize:16,color:'#92400e'}}>¥{formatMoney(totalAll)}</span>
                    </div>
                  </div>

                  {/* 月別レシート一覧 */}
                  {Object.entries(byMonth).map(([month, mrs]) => {
                    const monthTotal = mrs.reduce((s,r)=>s+(r.total_amount||0),0);
                    return (
                      <div key={month} style={{marginBottom:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                          padding:'6px 4px',marginBottom:6}}>
                          <div style={{fontWeight:700,fontSize:13,color:'#555'}}>{month}</div>
                          <div style={{fontSize:13,fontWeight:600,color:'#333'}}>¥{formatMoney(monthTotal)}</div>
                        </div>
                        {mrs.map(r => (
                          <div key={r.id} className="card" onClick={() => { setReceiptModal(r); setReceiptEdit({...r}); }}
                            style={{padding:'10px 12px',marginBottom:8,display:'flex',gap:10,cursor:'pointer',
                              WebkitTapHighlightColor:'transparent'}}>
                            {r.imageData && (
                              <img src={r.imageData} alt="" style={{width:48,height:64,objectFit:'cover',borderRadius:6,flexShrink:0}}/>
                            )}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:4}}>
                                <div style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {r.store_name || '店舗名不明'}
                                </div>
                                <div style={{fontWeight:700,fontSize:14,color:'#333',flexShrink:0}}>
                                  ¥{formatMoney(r.total_amount)}
                                </div>
                              </div>
                              <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                                <span style={{fontSize:11,color:'#666'}}>{r.purchase_date||'-'}</span>
                                <span style={{fontSize:11,padding:'1px 6px',borderRadius:10,fontWeight:600,
                                  background:`${CAT_COLORS[r.category]||'#6b7280'}22`,
                                  color: CAT_COLORS[r.category]||'#6b7280'}}>
                                  {r.category||'雑費'}
                                </span>
                                {r.payment_method && (
                                  <span style={{fontSize:11,color:'#999'}}>{r.payment_method}</span>
                                )}
                              </div>
                              {r.memo && (
                                <div style={{fontSize:12,color:'#888',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {r.memo}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}

              {receipts.length === 0 && (
                <div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
                  <div style={{fontSize:40,marginBottom:8}}>🧾</div>
                  <div style={{fontSize:14}}>レシートがありません</div>
                  <div style={{fontSize:12,marginTop:4}}>ボタンから撮影・追加してください</div>
                </div>
              )}

              {/* レシート詳細・編集モーダル */}
              {receiptModal && receiptEdit && (
                <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,
                  display:'flex',flexDirection:'column',justifyContent:'flex-end'}}
                  onClick={(e)=>{ if(e.target===e.currentTarget){ setReceiptModal(null); setReceiptEdit(null); }}}>
                  <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:'20px 16px',
                    maxHeight:'90vh',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                      <div style={{fontWeight:800,fontSize:17}}>🧾 レシート詳細</div>
                      <button onClick={()=>{ setReceiptModal(null); setReceiptEdit(null); }}
                        style={{border:'none',background:'none',fontSize:22,cursor:'pointer',padding:'2px 8px',color:'#999'}}>✕</button>
                    </div>

                    {/* 画像 */}
                    {receiptEdit.imageData && (
                      <img src={receiptEdit.imageData} alt="レシート" style={{width:'100%',maxHeight:240,objectFit:'contain',borderRadius:10,marginBottom:14,background:'#f5f5f5'}}/>
                    )}

                    {/* 店舗名 */}
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:4}}>店舗名</label>
                      <input value={receiptEdit.store_name||''} onChange={e=>setReceiptEdit(p=>({...p,store_name:e.target.value}))}
                        style={{width:'100%',padding:'10px 12px',border:'1px solid #ddd',borderRadius:10,fontSize:15,boxSizing:'border-box'}}/>
                    </div>

                    {/* 日付・金額 */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                      <div>
                        <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:4}}>日付</label>
                        <input type="date" value={receiptEdit.purchase_date||''} onChange={e=>setReceiptEdit(p=>({...p,purchase_date:e.target.value}))}
                          style={{width:'100%',padding:'10px 8px',border:'1px solid #ddd',borderRadius:10,fontSize:14,boxSizing:'border-box'}}/>
                      </div>
                      <div>
                        <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:4}}>金額</label>
                        <input type="number" value={receiptEdit.total_amount||''} onChange={e=>setReceiptEdit(p=>({...p,total_amount:Number(e.target.value)}))}
                          style={{width:'100%',padding:'10px 8px',border:'1px solid #ddd',borderRadius:10,fontSize:14,boxSizing:'border-box'}}/>
                      </div>
                    </div>

                    {/* 勘定科目 */}
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:6}}>勘定科目</label>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {CATEGORIES.map(c => (
                          <button key={c} onClick={()=>setReceiptEdit(p=>({...p,category:c}))}
                            style={{padding:'6px 12px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                              background: receiptEdit.category===c ? CAT_COLORS[c]||'#6b7280' : '#f0f0f0',
                              color: receiptEdit.category===c ? 'white' : '#555',
                              transition:'all 0.15s'}}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 決済方法 */}
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:4}}>決済方法</label>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {['現金','クレカ','PayPay','その他'].map(pm => (
                          <button key={pm} onClick={()=>setReceiptEdit(p=>({...p,payment_method:pm}))}
                            style={{padding:'6px 12px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                              background: receiptEdit.payment_method===pm ? '#4b5563' : '#f0f0f0',
                              color: receiptEdit.payment_method===pm ? 'white' : '#555',
                              transition:'all 0.15s'}}>
                            {pm}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 仕入れ紐付け */}
                    {receiptEdit.category === '仕入高' && (
                      <div style={{marginBottom:10}}>
                        <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:4}}>在庫と紐付け（任意）</label>
                        <select value={receiptEdit.inventoryId||''} onChange={e=>setReceiptEdit(p=>({...p,inventoryId:e.target.value}))}
                          style={{width:'100%',padding:'10px 12px',border:'1px solid #ddd',borderRadius:10,fontSize:14,boxSizing:'border-box',background:'white'}}>
                          <option value="">紐付けなし</option>
                          {(data.inventory||[]).map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.brand ? `${inv.brand} ` : ''}{inv.productName||'無題'}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* メモ */}
                    <div style={{marginBottom:16}}>
                      <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:4}}>メモ</label>
                      <textarea value={receiptEdit.memo||''} onChange={e=>setReceiptEdit(p=>({...p,memo:e.target.value}))}
                        rows={2} placeholder="備考など"
                        style={{width:'100%',padding:'10px 12px',border:'1px solid #ddd',borderRadius:10,fontSize:14,resize:'none',boxSizing:'border-box'}}/>
                    </div>

                    {/* ボタン */}
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{ if(window.confirm('このレシートを削除しますか？')) deleteReceipt(receiptEdit.id); }}
                        style={{flex:1,padding:14,border:'1px solid #fca5a5',borderRadius:12,background:'#fff',color:'#dc2626',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                        🗑️ 削除
                      </button>
                      <button onClick={saveReceiptEdit}
                        style={{flex:2,padding:14,border:'none',borderRadius:12,background:'var(--color-primary)',color:'white',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                        💾 保存
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeSection === 'import' && (
          <SellerBookImporter data={data} setData={setData} toast={toast} currentUser={currentUser} />
        )}

        {/* エクスポート */}
        {activeSection === 'export' && (
          <ExportPanel
            data={data}
            settings={settings}
            setSetting={setSetting}
            toast={toast}
            exportAll={exportAll}
            exportCSV={exportCSV}
            exportKobotsuCSV={exportKobotsuCSV}
            setTab={setTab}
            setPendingEditSaleId={setPendingEditSaleId}
            setEditingItem={setEditingItem}
            setPendingReturnTab={setPendingReturnTab}
            setPendingReturnSection={setPendingReturnSection}
          />
        )}


        {/* 白抜きツール */}
        {activeSection === 'removebg' && (() => {
          const removeBgKey = settings.removeBgApiKey || '';
          const doneCount = bgItems.filter(r => r.status === 'done').length;
          const selectedCount = bgItems.filter(r => r.selected).length;
          const processedCount = bgItems.filter(r => r.status === 'done' || r.status === 'error').length;

          const pickFiles = (e) => {
            const files = [...(e.target.files || [])];
            if (!files.length) return;
            // 古いBlobURLを解放してメモリ節約
            bgItems.forEach(r => { if (r.resultUrl) URL.revokeObjectURL(r.resultUrl); });
            setBgItems(files.map((f, i) => ({
              id: i, name: f.name, file: f,
              resultBlob: null, resultUrl: null,
              status: 'pending', error: null, selected: false,
            })));
            e.target.value = '';
          };

          const startProcessing = async () => {
            if (!removeBgKey) { toast('⚠️ Remove.bg APIキーを設定タブで入力してください'); return; }
            if (!bgItems.length) return;
            setBgProcessing(true);
            // pending→queuedにリセット
            setBgItems(prev => prev.map(r => ({ ...r, status: 'pending', resultBlob: null, resultUrl: null, error: null, selected: false })));
            for (let i = 0; i < bgItems.length; i++) {
              setBgItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'processing' } : r));
              try {
                const blob = await runRemoveBg(bgItems[i].file, removeBgKey);
                const url = URL.createObjectURL(blob);
                setBgItems(prev => prev.map((r, idx) => idx === i
                  ? { ...r, resultBlob: blob, resultUrl: url, status: 'done', selected: true } : r));
              } catch (err) {
                setBgItems(prev => prev.map((r, idx) => idx === i
                  ? { ...r, status: 'error', error: err.message } : r));
              }
            }
            setBgProcessing(false);
            toast('✅ 白抜き完了！');
          };

          const saveSelected = async () => {
            const sel = bgItems.filter(r => r.selected && r.resultBlob);
            if (!sel.length) { toast('⚠️ 保存する画像を選択してください'); return; }
            const files = sel.map((r, i) =>
              new File([r.resultBlob], `shiranueki_${i + 1}.jpg`, { type: 'image/jpeg' })
            );
            if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
              try { await navigator.share({ files, title: '白抜き画像' }); }
              catch (e) { if (e.name !== 'AbortError') toast(`❌ 共有エラー: ${e.message}`); }
            } else {
              files.forEach(f => {
                const url = URL.createObjectURL(f);
                const a = document.createElement('a');
                a.href = url; a.download = f.name;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);
              });
              toast(`📥 ${files.length}枚ダウンロードしました`);
            }
          };

          const clearAll = () => {
            bgItems.forEach(r => { if (r.resultUrl) URL.revokeObjectURL(r.resultUrl); });
            setBgItems([]);
            setBgProcessing(false);
          };

          const toggleSelect = (i) =>
            setBgItems(prev => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));
          const selectAll = () => setBgItems(prev => prev.map(r => r.status === 'done' ? { ...r, selected: true } : r));
          const deselectAll = () => setBgItems(prev => prev.map(r => ({ ...r, selected: false })));

          return (
            <div>
              {/* API Key 未設定バナー */}
              {!removeBgKey && (
                <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:14,marginBottom:14,fontSize:13}}>
                  <div style={{fontWeight:700,marginBottom:4,color:'#c2410c'}}>⚠️ Remove.bg APIキーが未設定</div>
                  <div style={{color:'#78350f',marginBottom:6}}>「設定」タブの「Remove.bg APIキー」に入力してください</div>
                  <div style={{color:'#92400e',fontSize:12}}>
                    <a href="https://www.remove.bg/api" target="_blank" rel="noreferrer"
                      style={{color:'#2563eb',fontWeight:600}}>remove.bg</a>
                    {' '}で無料取得（月50枚無料）→ 「設定」タブへ
                  </div>
                </div>
              )}

              {/* 初期状態：使い方＋選択ボタン */}
              {bgItems.length === 0 && (
                <>
                  <div className="card" style={{padding:16,marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>✂️ 白抜きツール — 使い方</div>
                    <div style={{fontSize:13,color:'#555',lineHeight:1.9}}>
                      <div>① 商品写真を複数枚まとめて選択</div>
                      <div>② 一括で白背景に変換（AI処理）</div>
                      <div>③ うまくいった画像だけチェック</div>
                      <div>④「保存」→ 写真アプリへ</div>
                      <div>⑤ 写真アプリから各商品に登録</div>
                    </div>
                    <div style={{marginTop:10,padding:'8px 10px',background:'#eff6ff',borderRadius:8,fontSize:12,color:'#1d4ed8'}}>
                      💡 3商品分まとめて白抜き → 保存 → 各商品に登録OK
                    </div>
                    <div style={{marginTop:8,padding:'8px 10px',background:'#f0fdf4',borderRadius:8,fontSize:12,color:'#166534'}}>
                      🔒 画像はアプリ内に保存されません。処理後すぐ破棄されます
                    </div>
                  </div>
                  <input type="file" accept="image/*" multiple ref={bgFileInputRef}
                    style={{display:'none'}} onChange={pickFiles}/>
                  <button className="btn-primary" style={{width:'100%'}}
                    onClick={() => bgFileInputRef.current?.click()}>
                    🖼️ 写真を選ぶ（複数可）
                  </button>
                </>
              )}

              {/* 選択済み・処理前 */}
              {bgItems.length > 0 && !bgProcessing && processedCount === 0 && (
                <>
                  <div style={{background:'#eff6ff',borderRadius:12,padding:'12px 14px',marginBottom:12,
                    display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:'#1e40af'}}>🖼️ {bgItems.length}枚選択中</div>
                      <div style={{fontSize:12,color:'#3b82f6',marginTop:2}}>1枚あたり約3〜8秒かかります</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={clearAll}
                        style={{padding:'8px 12px',border:'1px solid #ddd',borderRadius:8,background:'white',fontSize:13,cursor:'pointer',fontWeight:600}}>
                        取消
                      </button>
                      <button onClick={startProcessing}
                        style={{padding:'8px 14px',border:'none',borderRadius:8,background:'#1d4ed8',color:'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                        ✂️ 白抜き開始
                      </button>
                    </div>
                  </div>
                  {/* 選択ファイル一覧 */}
                  <div className="card" style={{padding:'8px 12px'}}>
                    {bgItems.map((r, i) => (
                      <div key={r.id} style={{padding:'7px 0',borderBottom: i < bgItems.length-1 ? '1px solid #f5f5f5' : 'none',
                        fontSize:13,color:'#555',display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:15}}>🖼️</span>
                        <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</span>
                        <span style={{fontSize:11,color:'#999',flexShrink:0}}>{(r.file.size/1024/1024).toFixed(1)}MB</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 処理中プログレス */}
              {bgProcessing && (
                <div className="card" style={{padding:24,textAlign:'center',marginBottom:12}}>
                  <div style={{fontSize:16,fontWeight:800,marginBottom:6}}>✂️ 白抜き処理中...</div>
                  <div style={{fontSize:14,color:'#666',marginBottom:14}}>
                    {processedCount} / {bgItems.length} 枚完了
                  </div>
                  <div style={{background:'#e5e7eb',borderRadius:99,height:10,overflow:'hidden',marginBottom:8}}>
                    <div style={{
                      height:'100%',background:'var(--color-primary)',borderRadius:99,
                      transition:'width 0.4s ease',
                      width:`${(processedCount / Math.max(bgItems.length, 1)) * 100}%`
                    }}/>
                  </div>
                  <div style={{fontSize:12,color:'#999'}}>
                    {bgItems.find(r => r.status === 'processing')?.name || ''}
                  </div>
                </div>
              )}

              {/* 結果グリッド */}
              {bgItems.length > 0 && (bgProcessing || processedCount > 0) && (
                <>
                  {!bgProcessing && (
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <div style={{fontWeight:700,fontSize:14}}>
                        ✅ {doneCount}/{bgItems.length}枚成功
                        {bgItems.filter(r=>r.status==='error').length > 0 && (
                          <span style={{color:'#dc2626',marginLeft:6,fontWeight:400,fontSize:12}}>
                            （{bgItems.filter(r=>r.status==='error').length}枚失敗）
                          </span>
                        )}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={selectAll}
                          style={{padding:'5px 10px',border:'1px solid #ddd',borderRadius:8,fontSize:12,cursor:'pointer',background:'white',fontWeight:600}}>
                          全選択
                        </button>
                        <button onClick={deselectAll}
                          style={{padding:'5px 10px',border:'1px solid #ddd',borderRadius:8,fontSize:12,cursor:'pointer',background:'white',fontWeight:600}}>
                          全解除
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                    {bgItems.map((r, i) => (
                      <div key={r.id}
                        onClick={() => r.status === 'done' && toggleSelect(i)}
                        style={{borderRadius:12,overflow:'hidden',cursor:r.status==='done'?'pointer':'default',
                          border: r.selected ? '2.5px solid var(--color-primary)' : '2px solid #e5e7eb',
                          background: r.status==='error' ? '#fff5f5' : 'white',
                          position:'relative', WebkitTapHighlightColor:'transparent'}}>

                        {/* 画像表示エリア */}
                        {r.resultUrl ? (
                          <img src={r.resultUrl} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'contain',background:'white',display:'block'}}/>
                        ) : r.status === 'processing' ? (
                          <div style={{aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f9fafb',gap:8}}>
                            <span className="spinner"/>
                            <span style={{fontSize:11,color:'#6b7280'}}>処理中...</span>
                          </div>
                        ) : r.status === 'error' ? (
                          <div style={{aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:10,gap:4}}>
                            <span style={{fontSize:28}}>❌</span>
                            <span style={{fontSize:11,color:'#dc2626',textAlign:'center',lineHeight:1.4}}>{r.error}</span>
                          </div>
                        ) : (
                          <div style={{aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb'}}>
                            <span style={{fontSize:11,color:'#9ca3af'}}>待機中</span>
                          </div>
                        )}

                        {/* チェックバッジ */}
                        {r.status === 'done' && (
                          <div style={{position:'absolute',top:6,right:6,width:24,height:24,borderRadius:12,
                            background: r.selected ? 'var(--color-primary)' : 'rgba(255,255,255,0.9)',
                            border: r.selected ? 'none' : '2px solid #ccc',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            boxShadow:'0 1px 4px rgba(0,0,0,0.2)',fontSize:13,color:'white',fontWeight:800}}>
                            {r.selected ? '✓' : ''}
                          </div>
                        )}

                        {/* ファイル名 */}
                        <div style={{padding:'4px 8px',fontSize:10,color:'#666',overflow:'hidden',
                          textOverflow:'ellipsis',whiteSpace:'nowrap',background:'#f9fafb',borderTop:'1px solid #f0f0f0'}}>
                          {r.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* アクションボタン */}
                  {!bgProcessing && (
                    <div style={{display:'flex',gap:8,marginBottom:12}}>
                      <button onClick={clearAll}
                        style={{flex:1,padding:14,border:'1px solid #e5e7eb',borderRadius:12,
                          background:'#f9fafb',fontWeight:700,fontSize:14,cursor:'pointer',color:'#374151'}}>
                        🗑️ クリア
                      </button>
                      <button onClick={saveSelected} disabled={selectedCount===0}
                        style={{flex:2,padding:14,border:'none',borderRadius:12,
                          background: selectedCount>0 ? 'var(--color-primary)' : '#d1d5db',
                          color:'white',fontWeight:700,fontSize:14,
                          cursor:selectedCount>0?'pointer':'default',transition:'background 0.2s'}}>
                        📱 選択した{selectedCount}枚を保存
                      </button>
                    </div>
                  )}

                  {!bgProcessing && (
                    <div style={{textAlign:'center',marginBottom:8}}>
                      <button onClick={() => {
                        bgItems.forEach(r => { if (r.resultUrl) URL.revokeObjectURL(r.resultUrl); });
                        setBgItems([]);
                        bgFileInputRef.current?.click();
                      }}
                        style={{border:'none',background:'none',color:'#2563eb',fontSize:13,cursor:'pointer',
                          textDecoration:'underline'}}>
                        ← 別の写真を選び直す
                      </button>
                    </div>
                  )}

                  {/* iOS保存ガイド */}
                  {!bgProcessing && doneCount > 0 && (
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#166534',lineHeight:1.7}}>
                      <div style={{fontWeight:700,marginBottom:4}}>📱 iPhoneへの保存方法</div>
                      <div>「保存」ボタン → 共有シートから「画像を保存」</div>
                      <div style={{color:'#15803d',marginTop:2}}>または長押し → 「写真に追加」でも保存できます</div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* 設定 */}
        {activeSection === 'settings' && (
          <div>

            {/* ── 仕入先 古物商許可証番号管理（通常店舗） ── */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🏪 仕入先 古物商番号管理</div>
              <div style={{fontSize:12,color:'#999',marginBottom:12}}>店を選んだとき自動で許可証番号が入力されます</div>
              {(() => {
                const licenses = settings.storeLicenses || {};
                // ヤフオクストアは別管理なので除外
                const storeNames = [...new Set([
                  ...CONFIG.PURCHASE_STORES.filter(s => s !== 'ヤフオクストア'),
                  ...Object.keys(licenses).filter(s => s !== 'ヤフオクストア'),
                ])];
                return storeNames.map(store => (
                  <div key={store} style={{marginBottom:10}}>
                    <label className="field-label">{store}</label>
                    <input className="input-field" style={{fontSize:13}}
                      value={licenses[store] || ''}
                      onChange={e => {
                        const updated = { ...licenses, [store]: e.target.value };
                        setSetting('storeLicenses', updated);
                      }}
                      placeholder="例: 青森県公安委員会 第041100001号"/>
                  </div>
                ));
              })()}
            </div>

            {/* ── ヤフオクストア 古物商番号管理 ── */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🟠 ヤフオクストア 古物商番号管理</div>
              <div style={{fontSize:12,color:'#999',marginBottom:12}}>店を選んだとき自動で許可証番号が入力されます</div>
              {(() => {
                // ★ 仕入れ登録と同じソース（storeMaster.yahooStores）を使う
                // ハードコードリストをやめることで、仕入れ登録の選択肢と設定画面を完全一致させる
                const masterYahooStores = (data.settings?.storeMaster || getInitialData().settings.storeMaster).yahooStores || [];
                const yahooStores = settings.yahooStores || [];
                // storeMaster ＋ 個別登録済みを統合してあいうえお順に表示（重複排除）
                const allNames = [...new Set([
                  ...masterYahooStores,
                  ...yahooStores.map(s => s.storeName).filter(Boolean),
                ])].sort((a,b) => a.localeCompare(b, 'ja'));

                // 指定ストアのライセンスを取得
                const getLicense = (name) =>
                  yahooStores.find(s => s.storeName === name)?.license || '';

                // 指定ストアのライセンスを保存（なければ新規追加）
                const setLicense = (name, license) => {
                  const exists = yahooStores.some(s => s.storeName === name);
                  const updated = exists
                    ? yahooStores.map(s => s.storeName === name ? {...s, license} : s)
                    : [...yahooStores, {id: Date.now().toString(), storeName: name, license, companyName: ''}];
                  setSetting('yahooStores', updated);
                };

                return (
                  <>
                    {allNames.map(name => (
                      <div key={name} style={{marginBottom:10}}>
                        <label className="field-label">{name}</label>
                        <input className="input-field" style={{fontSize:13}}
                          value={getLicense(name)}
                          onChange={e => setLicense(name, e.target.value)}
                          placeholder="例: 青森県公安委員会 第041100001号"/>
                      </div>
                    ))}
                    {/* 新規ストア追加（ストア名のみ入力 → リストに追加） */}
                    {yahooAddForm ? (
                      <div style={{display:'flex',gap:6,marginTop:4,alignItems:'center'}}>
                        <input className="input-field" style={{flex:1,marginBottom:0,fontSize:13}}
                          value={yahooAddForm.storeName}
                          onChange={e => setYahooAddForm({storeName: e.target.value})}
                          placeholder="ストア名を入力"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const name = yahooAddForm.storeName.trim();
                              if (!name || allNames.includes(name)) return;
                              setLicense(name, '');
                              setYahooAddForm(null);
                            }
                            if (e.key === 'Escape') setYahooAddForm(null);
                          }}/>
                        <button
                          onClick={() => {
                            const name = yahooAddForm.storeName.trim();
                            if (!name || allNames.includes(name)) { setYahooAddForm(null); return; }
                            setLicense(name, '');
                            setYahooAddForm(null);
                          }}
                          style={{padding:'10px 14px',borderRadius:10,border:'none',
                            background:'var(--color-primary)',color:'white',
                            fontWeight:700,fontSize:13,cursor:'pointer',flexShrink:0}}>
                          追加
                        </button>
                        <button onClick={() => setYahooAddForm(null)}
                          style={{padding:'10px 12px',borderRadius:10,border:'1.5px solid #e0e0e0',
                            background:'white',fontSize:13,cursor:'pointer',color:'#666',flexShrink:0}}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button className="btn-secondary" style={{width:'100%',fontSize:13,marginTop:4}}
                        onClick={() => setYahooAddForm({storeName:''})}>
                        ＋ 新規ストアを追加
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* ── 仕入れ先候補リスト管理 ── */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>📦 仕入れ先候補リスト管理</div>
              <div style={{fontSize:12,color:'#999',marginBottom:12}}>仕入れ登録・売上登録の「仕入れ先」ドロップダウンに表示される候補を管理します</div>
              {(() => {
                const master = data.settings?.storeMaster || getInitialData().settings.storeMaster;
                const delNormal = (name) => {
                  const newMaster = { ...master, normalStores: (master.normalStores||[]).filter(s => s !== name) };
                  setData({ ...data, settings: { ...data.settings, storeMaster: newMaster } });
                  toast(`🗑️ 「${name}」を削除しました`);
                };
                const delYahoo = (name) => {
                  const newMaster = { ...master, yahooStores: (master.yahooStores||[]).filter(s => s !== name) };
                  setData({ ...data, settings: { ...data.settings, storeMaster: newMaster } });
                  toast(`🗑️ 「${name}」を削除しました`);
                };
                const sortedNormal = [...(master.normalStores||[])].sort((a,b) => a.localeCompare(b,'ja'));
                const sortedYahoo  = [...(master.yahooStores||[])].sort((a,b) => a.localeCompare(b,'ja'));
                return (
                  <>
                    <div style={{fontWeight:700,fontSize:13,color:'#555',marginBottom:6}}>🏪 店舗仕入れ ({sortedNormal.length}件)</div>
                    {sortedNormal.length === 0
                      ? <div style={{fontSize:12,color:'#aaa',marginBottom:8}}>登録なし</div>
                      : sortedNormal.map(name => (
                        <div key={name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,background:'#f9fafb',borderRadius:8,padding:'6px 10px'}}>
                          <span style={{flex:1,fontSize:13,color:'#333'}}>{name}</span>
                          <button onClick={() => { if (window.confirm(`「${name}」を削除しますか？`)) delNormal(name); }}
                            style={{background:'none',border:'none',color:'#dc2626',fontSize:16,cursor:'pointer',padding:'0 4px',lineHeight:1}}>✕</button>
                        </div>
                      ))
                    }
                    <div style={{fontWeight:700,fontSize:13,color:'#555',marginBottom:6,marginTop:12}}>🟠 電脳仕入れ ({sortedYahoo.length}件)</div>
                    {sortedYahoo.length === 0
                      ? <div style={{fontSize:12,color:'#aaa',marginBottom:8}}>登録なし</div>
                      : sortedYahoo.map(name => (
                        <div key={name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,background:'#f9fafb',borderRadius:8,padding:'6px 10px'}}>
                          <span style={{flex:1,fontSize:13,color:'#333'}}>{name}</span>
                          <button onClick={() => { if (window.confirm(`「${name}」を削除しますか？`)) delYahoo(name); }}
                            style={{background:'none',border:'none',color:'#dc2626',fontSize:16,cursor:'pointer',padding:'0 4px',lineHeight:1}}>✕</button>
                        </div>
                      ))
                    }
                    <div style={{fontSize:11,color:'#aaa',marginTop:10}}>※ 店舗・電脳それぞれの登録画面の「＋ その他」から新規追加できます</div>
                  </>
                );
              })()}
            </div>

            {/* ── データクリーンアップ（ストア名正規化） ── */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🔧 データクリーンアップ</div>
              <div style={{fontSize:12,color:'#999',marginBottom:10}}>OCRミスや表記ゆれで登録されたストア名を自動修正します</div>
              {(() => {
                // 修正対象を集計
                const targets = data.inventory.filter(i => {
                  const fixed = normalizeStoreName(i.purchaseStore);
                  return fixed && fixed !== i.purchaseStore;
                });
                const preview = targets.slice(0, 3).map(i =>
                  `「${i.purchaseStore}」→「${normalizeStoreName(i.purchaseStore)}」`
                );
                return (
                  <>
                    <div style={{fontSize:12,color:'#555',marginBottom:10,background:'#f8f8f8',borderRadius:8,padding:'8px 10px'}}>
                      <div style={{fontWeight:700,marginBottom:4}}>修正ルール:</div>
                      {CONFIG.STORE_NAME_ALIASES.map((a,i) => (
                        <div key={i} style={{marginBottom:2}}>• 末尾「さん」／{a.pattern.toString().replace(/\//g,'')} → <b>{a.correct}</b></div>
                      ))}
                    </div>
                    {targets.length > 0 ? (
                      <>
                        <div style={{fontSize:12,color:'#dc2626',fontWeight:700,marginBottom:6}}>
                          修正対象: {targets.length}件
                        </div>
                        {preview.map((p,i) => (
                          <div key={i} style={{fontSize:11,color:'#666',marginBottom:2}}>• {p}</div>
                        ))}
                        {targets.length > 3 && <div style={{fontSize:11,color:'#aaa'}}>…他{targets.length-3}件</div>}
                        <button
                          onClick={() => {
                            if (!window.confirm(`${targets.length}件のストア名を自動修正します。よろしいですか？`)) return;
                            const newInventory = data.inventory.map(i => {
                              const fixed = normalizeStoreName(i.purchaseStore);
                              return (fixed && fixed !== i.purchaseStore) ? {...i, purchaseStore: fixed} : i;
                            });
                            setData({...data, inventory: newInventory});
                          }}
                          style={{width:'100%',marginTop:10,padding:'12px',borderRadius:10,border:'none',
                            background:'#dc2626',color:'white',
                            fontWeight:700,fontSize:14,cursor:'pointer',
                            WebkitTapHighlightColor:'transparent'}}>
                          今すぐ修正する
                        </button>
                      </>
                    ) : (
                      <div style={{fontSize:13,color:'#16a34a',fontWeight:700,textAlign:'center',padding:'8px 0'}}>
                        ✅ 修正が必要なデータはありません
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* ── ストア名一括変更 ── */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>✏️ ストア名一括変更</div>
              <div style={{fontSize:12,color:'#999',marginBottom:12}}>仕入データに保存された仕入れ先名をまとめて書き換えます</div>
              <div style={{marginBottom:8}}>
                <label className="field-label">変更前のストア名</label>
                <input className="input-field" style={{fontSize:13}}
                  value={storeRenameForm.from}
                  onChange={e => setStoreRenameForm(f => ({...f, from: e.target.value}))}
                  placeholder="例: オークション代行ウィックドゥ さん"/>
              </div>
              <div style={{marginBottom:12}}>
                <label className="field-label">変更後のストア名</label>
                <input className="input-field" style={{fontSize:13}}
                  value={storeRenameForm.to}
                  onChange={e => setStoreRenameForm(f => ({...f, to: e.target.value}))}
                  placeholder="例: オークション代行クイックドゥ"/>
              </div>
              {(() => {
                const matchCount = data.inventory.filter(i => i.purchaseStore === storeRenameForm.from.trim()).length;
                return (
                  <>
                    {storeRenameForm.from.trim() && (
                      <div style={{fontSize:12,color:'#666',marginBottom:8}}>
                        対象: <b>{matchCount}件</b>の仕入データ
                      </div>
                    )}
                    <button
                      disabled={!storeRenameForm.from.trim() || !storeRenameForm.to.trim() || matchCount === 0}
                      onClick={() => {
                        const from = storeRenameForm.from.trim();
                        const to   = storeRenameForm.to.trim();
                        if (!from || !to || matchCount === 0) return;
                        if (!window.confirm(`「${from}」→「${to}」に${matchCount}件変更します。よろしいですか？`)) return;
                        const newInventory = data.inventory.map(i =>
                          i.purchaseStore === from ? {...i, purchaseStore: to} : i
                        );
                        setData({...data, inventory: newInventory});
                        setStoreRenameForm({ from: '', to: '' });
                      }}
                      style={{width:'100%',padding:'12px',borderRadius:10,border:'none',
                        background: (!storeRenameForm.from.trim()||!storeRenameForm.to.trim()||matchCount===0) ? '#e5e7eb' : 'var(--color-primary)',
                        color: (!storeRenameForm.from.trim()||!storeRenameForm.to.trim()||matchCount===0) ? '#aaa' : 'white',
                        fontWeight:700,fontSize:14,cursor: matchCount>0 ? 'pointer' : 'default',
                        WebkitTapHighlightColor:'transparent',transition:'all 0.15s'}}>
                      一括変更する
                    </button>
                  </>
                );
              })()}
            </div>

            {/* ── まとめ仕入れデータ一括補正 ── */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>📦 まとめ仕入れデータ補正</div>
              <div style={{fontSize:12,color:'#999',marginBottom:12}}>
                まとめ仕入れで分割登録された商品の出品日・ブランドを一括リセットします。<br/>
                ブランド・出品日はあとから各商品ページで個別入力できます。
              </div>
              {(() => {
                const bundleInvItems = data.inventory.filter(i => i.bundleGroup);
                const needsFix = bundleInvItems.filter(i => i.brand || i.listDate);
                const alreadyDone = bundleInvItems.length > 0 && needsFix.length === 0;
                return (
                  <>
                    <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{color:'#555'}}>まとめ仕入れ由来の商品</span>
                        <b>{bundleInvItems.length}件</b>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{color: needsFix.length > 0 ? '#d97706' : '#16a34a'}}>
                          {needsFix.length > 0 ? '⚠️ 補正対象' : '✅ 補正済み'}
                        </span>
                        <b style={{color: needsFix.length > 0 ? '#d97706' : '#16a34a'}}>
                          {needsFix.length > 0 ? `${needsFix.length}件` : `${bundleInvItems.length}件`}
                        </b>
                      </div>
                    </div>
                    {needsFix.length > 0 && (
                      <div style={{fontSize:11,color:'#888',marginBottom:10,lineHeight:1.6}}>
                        補正内容：<br/>
                        · ブランド → 空欄にリセット<br/>
                        · 出品日 → 空欄にリセット<br/>
                        <span style={{color:'#bbb'}}>（bundleGroupを持つ商品が対象）</span>
                      </div>
                    )}
                    <button
                      disabled={needsFix.length === 0}
                      onClick={() => {
                        if (!window.confirm(
                          `まとめ仕入れ由来の商品 ${needsFix.length}件の\n` +
                          `「ブランド」と「出品日」を空欄にリセットします。\n\n` +
                          `この操作は元に戻せません。よろしいですか？`
                        )) return;
                        const newInventory = data.inventory.map(i =>
                          i.bundleGroup ? { ...i, brand: '', listDate: '' } : i
                        );
                        setData({ ...data, inventory: newInventory });
                        toast(`✅ ${needsFix.length}件のブランド・出品日をリセットしました`);
                      }}
                      style={{width:'100%',padding:'12px',borderRadius:10,border:'none',fontWeight:700,
                        fontSize:14,WebkitTapHighlightColor:'transparent',transition:'all 0.15s',
                        cursor: needsFix.length > 0 ? 'pointer' : 'default',
                        background: needsFix.length > 0 ? '#d97706' : '#e5e7eb',
                        color: needsFix.length > 0 ? 'white' : '#aaa'}}>
                      {needsFix.length > 0
                        ? `🔧 ${needsFix.length}件を一括補正する`
                        : alreadyDone ? '✅ すべて補正済み' : '補正対象なし'}
                    </button>
                  </>
                );
              })()}
            </div>

            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>🎯 目標・ご褒美設定</div>
              <div style={{marginBottom:10}}>
                <label className="field-label">目標月利 (円)</label>
                <input type="number" className="input-field"
                  value={userProfile?.monthlyGoal || 100000}
                  onChange={e => setUserProfile({ monthlyGoal: Number(e.target.value) })}
                  placeholder="100000"/>
              </div>
              <div style={{marginBottom:10}}>
                <label className="field-label">ご褒美予算（月利の何%）</label>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="number" className="input-field" style={{flex:1}}
                    value={userProfile?.rewardPercent || 10}
                    onChange={e => setUserProfile({ rewardPercent: Number(e.target.value) })}
                    min="1" max="100"/>
                  <span style={{fontSize:14}}>%</span>
                </div>
              </div>
              <div style={{fontWeight:600,fontSize:13,marginBottom:8,marginTop:4}}>🏆 達成ご褒美</div>
              {(userProfile?.milestones || []).map((m, i) => (
                <div key={m.id} style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
                  <input className="input-field" style={{flex:2,fontSize:12}} value={m.label}
                    onChange={e => {
                      const ms = [...(userProfile?.milestones || [])];
                      ms[i] = { ...ms[i], label: e.target.value };
                      setUserProfile({ milestones: ms });
                    }} placeholder="ご褒美の内容"/>
                  <input type="number" className="input-field" style={{flex:1,fontSize:12}} value={m.targetAmount}
                    onChange={e => {
                      const ms = [...(userProfile?.milestones || [])];
                      ms[i] = { ...ms[i], targetAmount: Number(e.target.value) };
                      setUserProfile({ milestones: ms });
                    }} placeholder="達成額"/>
                  <input type="number" className="input-field" style={{width:48,fontSize:12}} value={m.targetCount||1}
                    onChange={e => {
                      const ms = [...(userProfile?.milestones || [])];
                      ms[i] = { ...ms[i], targetCount: Number(e.target.value) };
                      setUserProfile({ milestones: ms });
                    }} placeholder="回数"/>
                  <span style={{fontSize:11,color:'#888'}}>回</span>
                  <button onClick={() => {
                    const ms = (userProfile?.milestones || []).filter((_,j)=>j!==i);
                    setUserProfile({ milestones: ms });
                  }} style={{background:'none',border:'none',color:'#dc2626',fontSize:18,cursor:'pointer',padding:'0 4px'}}>×</button>
                </div>
              ))}
              <button className="btn-secondary" style={{width:'100%',marginTop:4,fontSize:13}}
                onClick={() => {
                  const ms = [...(userProfile?.milestones || []), { id: Date.now().toString(), label: '', targetAmount: 1000000, targetCount: 5 }];
                  setUserProfile({ milestones: ms });
                }}>＋ ご褒美を追加</button>
            </div>

            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>🔑 Anthropic APIキー</div>
              <input className="input-field" type="password" value={settings.apiKey}
                onChange={e => setSetting('apiKey', e.target.value)}
                placeholder="sk-ant-api..."/>
              <div style={{fontSize:11,color:'#999',marginTop:6}}>キーはlocalStorageに保存されます</div>
            </div>

            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>✂️ Remove.bg APIキー</div>
              <div style={{fontSize:12,color:'#666',marginBottom:10}}>
                白抜きツールに使用。
                <a href="https://www.remove.bg/api" target="_blank" rel="noreferrer"
                  style={{color:'#2563eb'}}>remove.bg</a>
                で無料取得（月50枚）
              </div>
              <input className="input-field" type="password" value={settings.removeBgApiKey||''}
                onChange={e => setSetting('removeBgApiKey', e.target.value)}
                placeholder="xxxxxxxxxx（remove.bg API Key）"/>
              <div style={{fontSize:11,color:'#999',marginTop:6}}>キーはlocalStorageに保存されます</div>
            </div>

            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📋 管理番号フォーマット</div>
              <div style={{marginBottom:12}}>
                <label className="field-label">PRICE_SPLIT_DIVISOR（デフォルト: 100）</label>
                <input type="number" className="input-field" value={settings.priceSplitDivisor}
                  onChange={e => setSetting('priceSplitDivisor', Number(e.target.value))}/>
              </div>
              <div style={{background:'#f8f8f8',borderRadius:8,padding:10,fontSize:12,fontFamily:'monospace'}}>
                プレビュー: {generateMgmtNo('2026-03-26','2026-03-29',10296,settings.priceSplitDivisor)}
              </div>
            </div>

            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>💴 プラットフォーム手数料</div>
              {Object.entries(settings.platformFees || CONFIG.PLATFORM_FEES).map(([p, r]) => (
                <div key={p} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <label style={{flex:1,fontSize:14,fontWeight:600}}>{p}</label>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <input type="number" step="0.1" style={{width:70,padding:'8px 10px',border:'1.5px solid #e0e0e0',borderRadius:8,fontSize:14}}
                      value={(r * 100).toFixed(1)} onChange={e => setPlatformFee(p, e.target.value)}/>
                    <span style={{fontSize:14}}>%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📝 商品説明テンプレート</div>
              <textarea className="input-field" value={settings.descriptionTemplate || CONFIG.DESCRIPTION_TEMPLATE}
                onChange={e => setSetting('descriptionTemplate', e.target.value)}
                style={{minHeight:200,fontSize:12,fontFamily:'monospace'}}/>
              <div style={{fontSize:11,color:'#999',marginTop:6}}>変数: {'{brand}, {category}, {color}, {condition_detail}, {size}, {management_number}'}</div>
            </div>

            <div className="card" style={{padding:16,marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>#️⃣ ハッシュタグ</div>
              <textarea className="input-field" value={settings.hashtags || ''}
                onChange={e => setSetting('hashtags', e.target.value)}
                style={{minHeight:80}} placeholder="#のびSHOP"/>
            </div>

            <button className="btn-primary" style={{width:'100%',marginBottom:12}} onClick={saveSettings}>
              💾 設定を保存
            </button>

            {/* バックアップ */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>💾 データバックアップ</div>
              <div style={{fontSize:12,color:'#666',marginBottom:10}}>テキストデータ（商品情報・売上記録）のバックアップ。写真は含まれません。</div>
              <button className="btn-primary" style={{width:'100%',marginBottom:8}} onClick={downloadBackup}>
                📥 バックアップをダウンロード
              </button>
              <button className="btn-secondary" style={{width:'100%'}} onClick={() => restoreFileRef.current?.click()}>
                📤 バックアップから復元
              </button>
              <input ref={restoreFileRef} type="file" accept=".json" onChange={handleRestore} style={{display:'none'}}/>
              <div style={{fontSize:11,color:'#f59e0b',marginTop:8,background:'#fffbeb',borderRadius:6,padding:'6px 8px'}}>
                ⚠️ 写真は端末のIndexedDBに保存されています。定期的なバックアップを推奨します。
              </div>
            </div>

            {/* ストレージ使用状況 */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📊 ストレージ使用状況</div>
              <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:13}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'#666'}}>商品数</span>
                  <span style={{fontWeight:600}}>{data.inventory.length}件</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'#666'}}>写真枚数（IndexedDB）</span>
                  <span style={{fontWeight:600}}>{photoCount}枚</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'#666'}}>推定サイズ</span>
                  <span style={{fontWeight:600}}>約 {(photoCount * 200 / 1024).toFixed(1)}MB</span>
                </div>
              </div>
              <div style={{fontSize:11,color:'#999',marginTop:8}}>
                ※ iOSのプライベートブラウジングではIndexedDBの容量が制限される場合があります
              </div>
            </div>

            {/* データ整合性チェック */}
            {(() => {
              const invIds = new Set((data.inventory||[]).map(i => i.id));
              const orphans = (data.sales||[]).filter(s => s.inventoryId && !invIds.has(s.inventoryId));
              return (
                <div className="card" style={{padding:16,marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🔍 データ整合性チェック</div>
                  <div style={{fontSize:12,color:'#666',marginBottom:12}}>
                    在庫に存在しない商品の売上記録（孤立データ）を検出して削除します。
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'10px 12px',borderRadius:10,
                    background: orphans.length > 0 ? '#fff7ed' : '#f0fdf4',
                    border: `1px solid ${orphans.length > 0 ? '#fed7aa' : '#bbf7d0'}`,
                    marginBottom: orphans.length > 0 ? 12 : 0}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color: orphans.length > 0 ? '#92400e' : '#065f46'}}>
                        {orphans.length > 0 ? `⚠️ 孤立した売上データ: ${orphans.length}件` : '✅ 問題なし'}
                      </div>
                      <div style={{fontSize:11,color:'#888',marginTop:2}}>
                        在庫 {(data.inventory||[]).length}件 / 売上 {(data.sales||[]).length}件
                      </div>
                    </div>
                  </div>
                  {orphans.length > 0 && (
                    <button
                      onClick={() => {
                        if (!confirm(`在庫に存在しない売上データ ${orphans.length}件を削除しますか？\nこの操作は元に戻せません。`)) return;
                        // ★ トゥームストーン: 孤立売上IDを記録し、クラウドとのマージで復活しないようにする
                        const _now = new Date().toISOString();
                        const _newDeletedIds = { ...(data.settings?._deletedIds || {}) };
                        orphans.forEach(s => { _newDeletedIds[s.id] = _now; });
                        const cleanedSales = (data.sales||[]).filter(s => !s.inventoryId || invIds.has(s.inventoryId));
                        setData({ ...data, sales: cleanedSales, settings: { ...data.settings, _deletedIds: _newDeletedIds } });
                        toast(`🗑️ 孤立した売上データ ${orphans.length}件を削除しました`);
                      }}
                      style={{width:'100%',padding:12,borderRadius:12,border:'1px solid #fed7aa',
                        background:'#fff7ed',color:'#c2410c',fontWeight:700,cursor:'pointer',fontSize:14,minHeight:44}}>
                      🧹 孤立データを一括削除（{orphans.length}件）
                    </button>
                  )}
                </div>
              );
            })()}

            {/* データリセット */}
            <button onClick={() => {
              if (confirm('全データをリセットしますか？この操作は取り消せません。')) {
                setData(getInitialData());
                toast('🗑️ データをリセットしました');
              }
            }} style={{width:'100%',padding:12,borderRadius:12,border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontWeight:600,cursor:'pointer',minHeight:44}}>
              ⚠️ 全データをリセット
            </button>
          </div>
        )}

        {/* DB設定 */}
        {activeSection === 'db' && (
          <div>
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>☁️ DB接続状態</div>
              <div style={{fontSize:13,padding:'8px 12px',borderRadius:8,
                background: dbStatus==='ok'||dbStatus==='migrated' ? '#d1fae5' : dbStatus==='setup' ? '#ede9fe' : dbStatus==='error' ? '#fee2e2' : '#f3f4f6',
                color: dbStatus==='ok'||dbStatus==='migrated' ? '#065f46' : dbStatus==='setup' ? '#5b21b6' : dbStatus==='error' ? '#991b1b' : '#6b7280',
                fontWeight:600}}>
                {dbStatus==='ok' ? '✅ Supabase接続済み' :
                 dbStatus==='migrated' ? '✅ クラウド移行完了' :
                 dbStatus==='setup' ? '🔧 テーブル未作成' :
                 dbStatus==='error' ? '❌ 接続エラー' :
                 dbStatus==='offline' ? '📴 オフライン（env未設定）' : '⏳ 初期化中'}
              </div>
              {dbError ? (
                <div style={{marginTop:8,fontSize:11,background:'#1e1e1e',color:'#fca5a5',borderRadius:8,padding:'8px 10px',fontFamily:'monospace',wordBreak:'break-all'}}>
                  {dbError}
                </div>
              ) : null}
            </div>

            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🗄️ Supabaseテーブル作成SQL</div>
              <div style={{fontSize:12,color:'#666',marginBottom:10}}>
                Supabase → SQL Editor で以下を実行してください
              </div>
              <div style={{background:'#1e1e1e',color:'#e2e8f0',borderRadius:10,padding:12,fontSize:11,fontFamily:'monospace',lineHeight:1.6,overflowX:'auto',whiteSpace:'pre'}}>
{`-- テーブル作成
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- RLS有効化
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ポリシー（既存なら無視）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory' AND policyname='allow_all_inventory') THEN
    CREATE POLICY "allow_all_inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sales' AND policyname='allow_all_sales') THEN
    CREATE POLICY "allow_all_sales" ON sales FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='allow_all_settings') THEN
    CREATE POLICY "allow_all_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- anon ロールへの権限付与（重要）
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO authenticated;`}
              </div>
              <button className="btn-secondary" style={{width:'100%',marginTop:10}}
                onClick={() => {
                  const sql = `-- テーブル作成\nCREATE TABLE IF NOT EXISTS inventory (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\nCREATE TABLE IF NOT EXISTS sales (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\nCREATE TABLE IF NOT EXISTS app_settings (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL\n);\n\n-- RLS有効化\nALTER TABLE inventory ENABLE ROW LEVEL SECURITY;\nALTER TABLE sales ENABLE ROW LEVEL SECURITY;\nALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;\n\n-- ポリシー\nDO $$ BEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory' AND policyname='allow_all_inventory') THEN\n    CREATE POLICY "allow_all_inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);\n  END IF;\n  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sales' AND policyname='allow_all_sales') THEN\n    CREATE POLICY "allow_all_sales" ON sales FOR ALL USING (true) WITH CHECK (true);\n  END IF;\n  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='allow_all_settings') THEN\n    CREATE POLICY "allow_all_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);\n  END IF;\nEND $$;\n\n-- anon ロールへの権限付与（重要）\nGRANT SELECT, INSERT, UPDATE, DELETE ON inventory TO anon;\nGRANT SELECT, INSERT, UPDATE, DELETE ON sales TO anon;\nGRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO anon;\nGRANT SELECT, INSERT, UPDATE, DELETE ON inventory TO authenticated;\nGRANT SELECT, INSERT, UPDATE, DELETE ON sales TO authenticated;\nGRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO authenticated;`;
                  navigator.clipboard.writeText(sql).then(() => alert('✅ SQLをコピーしました！\nSupabase → SQL Editor に貼り付けて実行してください'));
                }}>
                📋 SQLをコピー（既存テーブルに適用可）
              </button>
            </div>

            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>🔄 DB再接続</div>
              <div style={{fontSize:12,color:'#666',marginBottom:10}}>
                SQLを実行後、再接続ボタンを押してください
              </div>
              <button className="btn-primary" style={{width:'100%'}}
                onClick={() => window.location.reload()}>
                🔄 アプリを再読み込み
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// メインApp
// ============================================================
const App = () => {
  const [fullData, setFullDataRaw] = React.useState(loadData);   // 全ユーザーの全データ
  const [tab, setTab]            = React.useState('inventory');
  const [editingItem, setEditingItem] = React.useState(null);
  const [pendingSaleItemId, setPendingSaleItemId] = React.useState(null); // 売上記録を促すinventoryId
  const [pendingEditSaleId, setPendingEditSaleId] = React.useState(null); // エクスポート画面から売上編集
  const [pendingReturnTab, setPendingReturnTab] = React.useState(null); // 保存後に戻るタブ
  const [pendingReturnSection, setPendingReturnSection] = React.useState(null); // 保存後にOtherTabで表示するセクション
  // 在庫タブ: 編集から戻った時にフィルター（未出品/出品中/売却済）とスクロール位置を復元するため保存
  const [pendingInventoryFilter, setPendingInventoryFilter] = React.useState(null);
  const [pendingInventoryScrollY, setPendingInventoryScrollY] = React.useState(null);
  const [dbStatus, setDbStatus]  = React.useState('init');
  const [dbError,  setDbError]   = React.useState('');
  const dataRef = React.useRef(fullData);

  const currentUser = fullData.currentUser || 'self';
  const userProfiles = fullData.userProfiles || getInitialData().userProfiles;
  const userProfile = userProfiles[currentUser] || userProfiles.self;

  // 現在のユーザーでフィルタリングされたデータ（子コンポーネントはこれを使う）
  const data = React.useMemo(() => ({
    ...fullData,
    inventory: (fullData.inventory || []).filter(i => (i.userId || 'self') === currentUser),
    sales:     (fullData.sales     || []).filter(s => (s.userId || 'self') === currentUser),
  }), [fullData, currentUser]);

  // setData: 子から受け取ったフィルタ済みデータを全データにマージして保存
  const setData = React.useCallback((newActiveData) => {
    setFullDataRaw(prev => {
      const user = prev.currentUser || 'self';
      const oldFull = dataRef.current;
      const otherInventory = (prev.inventory || []).filter(i => (i.userId || 'self') !== user);
      const otherSales     = (prev.sales     || []).filter(s => (s.userId || 'self') !== user);
      const mergedInventory = [...otherInventory, ...newActiveData.inventory];
      const mergedSales     = [...otherSales,     ...newActiveData.sales];
      // 孤立売上の自動クリーンアップ（inventoryIdがあるが在庫に存在しない売上を削除）
      const allInvIds = new Set(mergedInventory.map(i => i.id));
      const cleanedSales = mergedSales.filter(s => !s.inventoryId || allInvIds.has(s.inventoryId));
      const newFull = {
        ...newActiveData,
        currentUser:  prev.currentUser,
        userProfiles: prev.userProfiles,
        inventory: mergedInventory,
        sales:     cleanedSales,
      };
      dataRef.current = newFull;
      // ★ 非同期保存（setTimeoutで主スレッドをブロックしない。終了時はpagehide/visibilitychangeで同期保存）
      saveData(newFull);
      // ★ syncToSupabaseをsetTimeout(0)で非同期化：
      //    JSON.stringify比較（在庫件数×2回）がstateアップデーター内で同期実行されるとレンダリングをブロックするため、
      //    次のマクロタスクに遅延させUIスレッドのブロックを防止する
      const _oldFull = oldFull;
      const _newFull = newFull;
      setTimeout(() => syncToSupabase(_oldFull, _newFull), 0);
      return newFull;
    });
  }, []);

  // ユーザー切り替え
  const switchUser = React.useCallback((user) => {
    setFullDataRaw(prev => {
      const newFull = { ...prev, currentUser: user };
      dataRef.current = newFull;
      saveData(newFull);
      return newFull;
    });
  }, []);

  // ユーザープロフィール更新（目標・ご褒美設定）
  const setUserProfile = React.useCallback((updates) => {
    setFullDataRaw(prev => {
      const user = prev.currentUser || 'self';
      const oldFull = dataRef.current;
      const newFull = {
        ...prev,
        userProfiles: {
          ...prev.userProfiles,
          [user]: { ...(prev.userProfiles?.[user] || {}), ...updates },
        },
      };
      dataRef.current = newFull;
      saveData(newFull);
      syncToSupabase(oldFull, newFull);
      return newFull;
    });
  }, []);

  // ★★★ iOS Safari タッチ不能バグ 全域対策 ★★★
  // input/textarea blur 時に window.scrollTo(0,scrollY) 強制リフロー
  // → ブランド・商品名など全フィールドのキーボード閉じ後に座標をリセット
  // PurchaseTab内でも同様に行っているが、App全体でも保険として実行
  React.useEffect(() => {
    const reflow = () => { try { window.scrollTo(0, window.scrollY); } catch(_) {} };
    const onFocusOut = (e) => {
      const tag = e.target?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
      reflow();
      setTimeout(reflow, 80);
      setTimeout(reflow, 200);
      setTimeout(reflow, 400);
    };
    document.addEventListener('focusout', onFocusOut, { passive: true, capture: true });
    return () => document.removeEventListener('focusout', onFocusOut, { capture: true });
  }, []);

  // ── アプリ終了・バックグラウンド移行時に同期保存（データ消失防止）──
  React.useEffect(() => {
    const forceSave = () => {
      // ★ バックグラウンド移行時のみ保存（前面復帰時は不要＆大量データでブロックを避ける）
      if (!document.hidden) return;
      try {
        // ★ thumbDataUrl（base64画像）を除外して保存（iOS Safariの5MB上限＋同期書き込みフリーズ防止）
        const stripped = stripPhotosForStorage(dataRef.current);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
      } catch(e) {}
    };
    // visibilitychange: タブ切り替え・ホームボタンなどでバックグラウンドに入るとき
    document.addEventListener('visibilitychange', forceSave);
    // pagehide: ページ遷移・アプリ終了（iOS Safariで確実）
    window.addEventListener('pagehide', forceSave);
    // beforeunload: デスクトップブラウザのタブ閉じ・リロード
    window.addEventListener('beforeunload', forceSave);
    return () => {
      document.removeEventListener('visibilitychange', forceSave);
      window.removeEventListener('pagehide', forceSave);
      window.removeEventListener('beforeunload', forceSave);
    };
  }, []);

  // ── クラウドデータ読み込み（/api/data 経由・iOS Safari対応）──
  React.useEffect(() => {
    (async () => {
      try {
        // /api/data はサーバー側でSupabaseに接続するため CORS問題なし
        const cloudData = await fetchSupabaseData();

        // 接続エラー詳細あり
        if (cloudData?._connError) {
          setDbError(cloudData._connError);
          setDbStatus('error');
          return;
        }

        // サーバー側でenv未設定の場合
        if (!cloudData) { setDbStatus('offline'); return; }

        // initSupabase で cloudEnabled フラグを立てる（url/keyはサーバーが持つ）
        initSupabase('server', 'server');

        const localData = dataRef.current;
        const hasLocal = localData.inventory.length > 0 || localData.sales.length > 0;
        const hasCloud = cloudData.inventory.length > 0 || cloudData.sales.length > 0;

        // 孤立売上クリーンアップ（起動時に一度実行）
        const cleanOrphans = (d) => {
          const invIds = new Set((d.inventory||[]).map(i => i.id));
          const cleaned = (d.sales||[]).filter(s => !s.inventoryId || invIds.has(s.inventoryId));
          return cleaned.length !== (d.sales||[]).length ? { ...d, sales: cleaned } : d;
        };

        if (hasLocal && !hasCloud) {
          // ローカルにデータあり・クラウド空 → 移行
          const cleanedLocal = cleanOrphans(localData);
          await migrateLocalToSupabase(cleanedLocal);
          dataRef.current = cleanedLocal;
          setFullDataRaw(cleanedLocal);
          saveData(cleanedLocal);
          setDbStatus('migrated');
        } else {
          // ★ last-write-wins マージ（以前は「クラウド常に勝つ」でローカル保存が消えるバグがあった）
          // アイテム単位で updatedAt / createdAt を比較し、新しい方を採用する
          const mergeByLastWrite = (localArr, cloudArr, deletedIds) => {
            const deleted   = deletedIds || {};
            const localMap  = new Map((localArr  || []).map(i => [i.id, i]));
            const cloudMap  = new Map((cloudArr  || []).map(i => [i.id, i]));
            const allIds    = new Set([...localMap.keys(), ...cloudMap.keys()]);
            const result    = [];
            for (const id of allIds) {
              // ★ トゥームストーン: 意図的に削除されたIDはクラウドに残っていても復活させない
              if (deleted[id]) continue;
              const l = localMap.get(id);
              const c = cloudMap.get(id);
              if (!l) { result.push(c); continue; }
              if (!c) { result.push(l); continue; }
              // updatedAt（なければ createdAt）で比較 → 新しい方を採用
              const lt = new Date(l.updatedAt || l.createdAt || 0).getTime();
              const ct = new Date(c.updatedAt || c.createdAt || 0).getTime();
              const winner = lt >= ct ? l : c;
              const loser  = lt >= ct ? c : l;
              // ★ 勝者のthumbDataUrlがnullでも、敗者のthumbDataUrlで補完する
              // （ローカル/クラウドどちらかにthumbDataUrlがあれば必ず保持）
              const loserPhotoMap = new Map((loser.photos || []).map(p => [p.id, p]));
              const mergedPhotos = (winner.photos || []).map(p => ({
                ...p,
                thumbDataUrl: p.thumbDataUrl || loserPhotoMap.get(p.id)?.thumbDataUrl || null,
              }));
              result.push({ ...winner, photos: mergedPhotos });
            }
            return result;
          };

          // 設定: フィールド単位でマージ（空欄よりも入力済みを優先）
          // ローカルが持つ値はローカル優先、ローカルが空の場合はクラウドを使用
          const mergeSettings = (local, cloud) => {
            const base = { ...(cloud || {}), ...(local || {}) };
            // 空欄のフィールドはクラウド側の値で補完
            for (const [k, v] of Object.entries(cloud || {})) {
              if (base[k] === undefined || base[k] === null || base[k] === '') base[k] = v;
            }
            // ★ _deletedIds はユニオンマージ（ローカル・クラウド両方の削除記録を保持）
            base._deletedIds = { ...(cloud?._deletedIds || {}), ...(local?._deletedIds || {}) };
            return base;
          };
          // ★ 削除トゥームストーンをローカル・クラウド双方からマージしてmergeByLastWriteに渡す
          const mergedDeletedIds = {
            ...(localData.settings?._deletedIds || {}),
            ...(cloudData.settings?._deletedIds || {}),
          };
          const mergedData = {
            ...cloudData,
            inventory: mergeByLastWrite(localData.inventory, cloudData.inventory, mergedDeletedIds),
            sales:     mergeByLastWrite(localData.sales,     cloudData.sales,     mergedDeletedIds),
            settings:  mergeSettings(localData.settings, cloudData.settings),
          };
          const cleanedMerged = normalizeStores(cleanOrphans(mergedData));
          dataRef.current = cleanedMerged;
          setFullDataRaw(cleanedMerged);
          saveData(cleanedMerged);
          // マージ結果（ローカル優先分）をクラウドへ反映
          const invChanged  = JSON.stringify(cleanedMerged.inventory) !== JSON.stringify(cloudData.inventory);
          const salesChanged = JSON.stringify(cleanedMerged.sales)    !== JSON.stringify(cloudData.sales);
          if (invChanged || salesChanged || cleanedMerged !== mergedData) {
            syncToSupabase(cloudData, cleanedMerged);
          }
          setDbStatus('ok');
        }
      } catch(e) {
        const msg = e?.message || String(e);
        console.error('[App] DB init error:', msg);
        setDbError(msg);
        setDbStatus('error');
      }
    })();
  }, []);

  // ── 写真データ移行（旧 base64 → IndexedDB） ────────────────
  React.useEffect(() => {
    (async () => {
      try {
        const currentData = loadData();
        let needsSave = false;
        const updatedInventory = await Promise.all(currentData.inventory.map(async (item) => {
          if (!item.photos || item.photos.length === 0) return item;
          // photos[0]がstringならbase64形式（旧データ）
          if (typeof item.photos[0] === 'string') {
            const newPhotos = [];
            for (let i = 0; i < item.photos.length; i++) {
              const dataUrl = item.photos[i];
              const ts = Date.parse(item.createdAt) || Date.now();
              const photoId = `photo_${ts}_${i}`;
              const thumbId = `thumb_${ts}_${i}`;
              try {
                // base64をBlobに変換
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                // サムネ生成
                const thumbBlob = await compressImage(new File([blob], 'img.jpg', { type: blob.type }), 300, 0.6);
                await Promise.all([savePhoto(photoId, blob), savePhoto(thumbId, thumbBlob)]);
                newPhotos.push({ id: photoId, thumbId });
              } catch(e) {
                console.warn('Migration failed for photo:', e);
              }
            }
            needsSave = true;
            return { ...item, photos: newPhotos };
          }
          return item;
        }));
        if (needsSave) {
          const migratedData = { ...currentData, inventory: updatedInventory };
          setFullDataRaw(migratedData);
          saveData(migratedData);
          console.log('写真データをIndexedDBに移行しました');
        }
      } catch(e) {
        console.error('Migration error:', e);
      }
    })();
  }, []);

  // iOS: バックグラウンド復帰時のタッチフリーズ解除
  React.useEffect(() => {
    const fix = () => {
      if (!document.hidden) {
        document.body.style.pointerEvents = 'none';
        requestAnimationFrame(() => { document.body.style.pointerEvents = ''; });
      }
    };
    document.addEventListener('visibilitychange', fix);
    window.addEventListener('focus', fix);
    return () => {
      document.removeEventListener('visibilitychange', fix);
      window.removeEventListener('focus', fix);
    };
  }, []);

  const NAV_ICONS = {
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    purchase: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    inventory: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    sales: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    other: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  };
  const tabs = [
    { id: 'home',      label: 'ホーム' },
    { id: 'inventory', label: '在庫'   },
    { id: 'sales',     label: '売上'   },
    { id: 'other',     label: 'その他' },
  ];

  // APIキー未設定時のバナー
  const showApiWarning = !data.settings?.apiKey && tab !== 'other';

  // ── ナビバッジ用集計 ──
  const navBadgeInventory = (data.inventory||[]).filter(i => i.status === 'unlisted').length;
  const _soldNavIds = new Set((data.inventory||[]).filter(i => i.status === 'sold').map(i => i.id));
  const _recordedNavIds = new Set((data.sales||[]).map(s => s.inventoryId).filter(Boolean));
  const navBadgeSales = [..._soldNavIds].filter(id => !_recordedNavIds.has(id)).length;

  return (
    <AppContext.Provider value={{ data, setData, tab, setTab, editingItem, setEditingItem, dbStatus, dbError, currentUser, switchUser, userProfile, setUserProfile, pendingSaleItemId, setPendingSaleItemId, pendingEditSaleId, setPendingEditSaleId, pendingReturnTab, setPendingReturnTab, pendingReturnSection, setPendingReturnSection, pendingInventoryFilter, setPendingInventoryFilter, pendingInventoryScrollY, setPendingInventoryScrollY }}>
      <ToastProvider>
        <div style={{minHeight:'100vh',background:'#f5f5f5'}}>

          {/* ── DBステータスバナー ── */}
          {dbStatus === 'init' && (
            <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#1a1a2e',color:'white',
                         textAlign:'center',padding:'6px 16px',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <span className="spinner" style={{width:14,height:14,borderWidth:2}}/> クラウドデータ読み込み中...
            </div>
          )}
          {dbStatus === 'migrated' && (
            <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#16a34a',color:'white',
                         textAlign:'center',padding:'6px 16px',fontSize:12}}
                 onClick={() => setDbStatus('ok')}>
              ✅ ローカルデータをクラウドに移行しました！タップで閉じる
            </div>
          )}
          {dbStatus === 'error' && (
            <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#dc2626',color:'white',
                         textAlign:'center',padding:'6px 16px',fontSize:11,cursor:'pointer'}}
                 onClick={() => setTab('other')}>
              ⚠️ DB接続エラー（ローカル保存中）{dbError ? ` → ${dbError.slice(0,60)}` : ''} → DBタブを確認
            </div>
          )}
          {dbStatus === 'setup' && (
            <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#7c3aed',color:'white',
                         textAlign:'center',padding:'6px 16px',fontSize:12,cursor:'pointer'}}
                 onClick={() => { setTab('other'); }}>
              🔧 テーブル未作成 → その他 → DBタブでSQLを実行してください
            </div>
          )}
          {dbStatus === 'offline' && (
            <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#92400e',color:'white',
                         textAlign:'center',padding:'6px 16px',fontSize:12}}
                 onClick={() => setTab('other')}>
              ☁️ Supabase未設定。ローカル保存中 → 設定画面へ
            </div>
          )}

          {/* ユーザー切り替え */}
          <div style={{display:'flex',background:'white',borderBottom:'1px solid #f0f0f0',padding:'6px 14px',gap:6,alignItems:'center'}}>
            <span style={{fontSize:11,color:'#ccc',marginRight:2,fontWeight:700,letterSpacing:'0.04em'}}>USER</span>
            {['self','girlfriend'].map(u => {
              const profile = (fullData.userProfiles || getInitialData().userProfiles)[u];
              return (
                <button key={u} onClick={() => switchUser(u)}
                  style={{padding:'5px 14px',borderRadius:99,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,
                    background: currentUser===u ? 'var(--color-primary)' : '#f3f4f6',
                    color: currentUser===u ? 'white' : '#888',
                    boxShadow: currentUser===u ? '0 2px 8px rgba(232,64,64,0.25)' : 'none',
                    transition:'all 0.2s', letterSpacing:'0.01em'}}>
                  {profile?.name || u}
                </button>
              );
            })}
          </div>

          {/* メインコンテンツ */}
          <div className="main-content">
            {showApiWarning && (
              <div style={{background:'#fff7ed',borderBottom:'1px solid #fed7aa',padding:'10px 16px',display:'flex',alignItems:'center',gap:8,fontSize:13}}
                onClick={() => setTab('other')}>
                <span>⚠️ APIキーが未設定です。</span>
                <span style={{color:'var(--color-primary)',fontWeight:700,textDecoration:'underline'}}>設定画面へ →</span>
              </div>
            )}

            {tab === 'home' && <HomeTab />}
            {tab === 'purchase' && <PurchaseTab />}
            {tab === 'inventory' && <InventoryTab />}
            {tab === 'sales' && <SalesTab />}
{tab === 'other' && <OtherTab />}
          </div>

          {/* ボトムナビ */}
          <nav className="bottom-nav">
            {tabs.map(t => {
              const badge = t.id === 'inventory' ? navBadgeInventory
                          : t.id === 'sales'     ? navBadgeSales
                          : 0;
              return (
                <div key={t.id} className={`bottom-nav-item ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}>
                  {tab === t.id && <div className="nav-icon-bg"/>}
                  <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
                    <div className="nav-icon">{NAV_ICONS[t.id]}</div>
                    {badge > 0 && (
                      <div style={{
                        position:'absolute',top:-4,right:-6,
                        background: t.id === 'sales' ? '#f97316' : '#2563eb',
                        color:'white',borderRadius:99,
                        fontSize:9,fontWeight:700,
                        minWidth:14,height:14,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        padding:'0 3px',lineHeight:1,
                        border:'1.5px solid white',
                      }}>{badge > 99 ? '99+' : badge}</div>
                    )}
                  </div>
                  <div className="nav-label">{t.label}</div>
                </div>
              );
            })}
          </nav>
        </div>
      </ToastProvider>
    </AppContext.Provider>
  );
};

// レンダリング
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Service Worker 登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}

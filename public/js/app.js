// ============================================================
// CONFIG - 変更しやすい設定値を集約
// ============================================================
const CONFIG = {
  ANTHROPIC_API_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-haiku-4-5',            // 速度優先（Claude 4.5 Haiku）
  MODEL_HEAVY: 'claude-opus-4-5',       // 高精度が必要な場合用（現在未使用）
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
  TAG_PRICE_PROMPT: `この写真の値札・価格タグ・価格シールに書かれた金額を読み取ってください。
【重要】数字が多少不鮮明でも、見えている桁数や文脈から最もありえる価格を推定して回答してください。「読めない」ではなく必ずベストの数値を出してください。
・税込/税抜どちらでも可。¥や円記号は不要（数値のみ）
・例：「8,800」「¥8,800」「8800円（税込）」→ price: 8800
JSONのみで回答（説明・前置き一切不要）：
{"price": 8800, "tax_type": "税込 または 税抜 または 不明", "confidence": "high または low", "notes": "読み取り内容の補足"}
完全に価格の存在が確認できない場合のみ price を null にしてください。`,
  AUCTION_PRICE_PROMPT: `この写真はオークションまたはフリマアプリの落札・注文確認画面です。
落札価格と送料を読み取ってください。
JSONのみで回答してください（説明不要）：
{"bid_price": 8000, "shipping": 800, "total": 8800, "platform": "ヤフオク", "notes": "補足"}
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

const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialData();
    return JSON.parse(raw);
  } catch { return getInitialData(); }
};

const saveData = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.error(e); }
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
const syncToSupabase = async (oldData, newData) => {
  if (!_cloudEnabled) return;
  try {
    const invOld   = new Map((oldData?.inventory || []).map(i => [i.id, i]));
    const invNew   = new Map((newData?.inventory || []).map(i => [i.id, i]));
    const salesOld = new Map((oldData?.sales     || []).map(s => [s.id, s]));
    const salesNew = new Map((newData?.sales     || []).map(s => [s.id, s]));

    const invUpsert = [], invDelete = [], salesUpsert = [], salesDelete = [];
    for (const [id, item] of invNew) {
      if (JSON.stringify(invOld.get(id)) !== JSON.stringify(item)) invUpsert.push({ id, data: item });
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
  },
});

// ============================================================
// ユーティリティ
// ============================================================
const formatMoney = (n) => n?.toLocaleString('ja-JP') ?? '0';
const today = () => new Date().toISOString().split('T')[0];

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
const readPriceFromImage = async (file, prompt, apiKey) => {
  // 値札の小さい数字を読むため1200px・quality0.9に引き上げ
  const blob = await compressImage(file, 1200, 0.9);
  const base64 = await blobToBase64(blob);
  const imageDataList = [{ mimeType: 'image/jpeg', data: base64 }];
  const text = await analyzeImagesWithClaude(imageDataList, apiKey, prompt, 200);
  // JSONを抽出（AIが余分なテキストを返しても対応）
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error(`応答が不正: ${text.slice(0, 60)}`);
  return JSON.parse(match[0]);
};

const PRODUCT_ANALYSIS_PROMPT = `商品の写真を分析して以下のJSON形式で回答してください（JSONのみ、説明文なし）：
{
  "product_name": "商品名（日本語、40文字以内、メルカリ出品用。ブランド＋型名/モデル名＋カラー＋サイズ）",
  "english_title": "メルカリ英語タイトル（英語、40文字以内、SEO最適化。Brand＋ModelName＋Category＋Color例: Louis Vuitton Musette Salsa Monogram Shoulder Bag）",
  "brand": "ブランド名（英語正式表記）",
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
  "brand_reading": "ブランド名の読み仮名または英語表記",
  "category_keywords": "メルカリSEO用キーワード。半角スペース区切り5〜8語",
  "color_display": "カラー表記。日本語カタカナ＋漢字（例：ブラック 黒）"
}

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
  "items": [{"name": "商品名", "price": 価格}]
}`;

const MERCARI_SS_PROMPT = `メルカリの取引画面のスクリーンショットを読み取ってください。JSONのみで回答（説明不要）：
{
  "product_name": "商品名（全文）",
  "sale_price": 商品代金（数値のみ、¥や,不要）,
  "platform_fee": 販売手数料（数値のみ）,
  "shipping": 配送料（数値のみ）,
  "sale_date": "売却日・購入日時（YYYY-MM-DD形式。画面の購入日時から変換）",
  "product_id": "商品ID（例: m46193847261。画面下部に表示）",
  "platform": "メルカリ"
}
読み取れない値はnullにしてください。`;

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
const HomeTab = () => {
  const { data, setTab, currentUser, userProfile, setUserProfile } = React.useContext(AppContext);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── 月次データ ──
  const monthlySales = data.sales.filter(s => s.saleDate?.startsWith(currentMonth));
  const totalProfit = monthlySales.reduce((a, s) => a + (s.profit || 0), 0);
  const inventoryCount = data.inventory.filter(i => i.status !== 'sold').length;

  const monthlyGoal = userProfile?.monthlyGoal || 100000;
  const rewardPercent = userProfile?.rewardPercent || 10;
  const milestones = userProfile?.milestones || [];

  const progressPct = monthlyGoal > 0 ? Math.min(100, Math.round(totalProfit / monthlyGoal * 100)) : 0;
  const remaining = Math.max(0, monthlyGoal - totalProfit);
  const rewardBudget = Math.round(totalProfit * rewardPercent / 100);

  // ── 週次データ ──
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // 今週の月曜日を求める（日=0→-6, 月=1→0, ...）
  const dow = now.getDay(); // 0=日
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  // 今週の日曜日
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const weeklySales = data.sales.filter(s => s.saleDate >= weekStartStr && s.saleDate <= weekEndStr);
  const weeklyProfit = weeklySales.reduce((a, s) => a + (s.profit || 0), 0);

  // 1週間あたりの目標（月目標 ÷ 月の日数 × 7）
  const weeklyTarget = Math.ceil(monthlyGoal * 7 / daysInMonth);
  const weeklyRemaining = Math.max(0, weeklyTarget - weeklyProfit);
  const weeklyPct = weeklyTarget > 0 ? Math.min(100, Math.round(weeklyProfit / weeklyTarget * 100)) : 0;
  const weeklyAchieved = weeklyProfit >= weeklyTarget;

  // ── 旅行ゲーム ──
  const currentSpot = [...TRAVEL_SPOTS].reverse().find(s => totalProfit >= s.min) || TRAVEL_SPOTS[0];
  const nextSpot = TRAVEL_SPOTS.find(s => s.min > totalProfit);
  const toNextSpot = nextSpot ? nextSpot.min - totalProfit : 0;

  // ── マイルストーン ──
  const getSalesByMonth = () => {
    const byMonth = {};
    data.sales.forEach(s => {
      const m = s.saleDate?.slice(0,7);
      if (m) byMonth[m] = (byMonth[m] || 0) + (s.profit || 0);
    });
    return byMonth;
  };
  const monthlyProfits = getSalesByMonth();
  const getAchievedCount = (milestone) => {
    if (!milestone.targetAmount) return 0;
    return Object.values(monthlyProfits).filter(p => p >= milestone.targetAmount).length;
  };
  const nextMilestone = milestones.find(m => getAchievedCount(m) < (m.targetCount || 1));

  // ── 目標編集モーダル ──
  const [editingGoal, setEditingGoal] = React.useState(false);
  const [goalInput, setGoalInput] = React.useState('');

  const openGoalEdit = () => { setGoalInput(String(monthlyGoal)); setEditingGoal(true); };
  const saveGoal = () => {
    const v = Number(goalInput);
    if (v > 0) setUserProfile({ monthlyGoal: v });
    setEditingGoal(false);
  };

  const C = {
    card:    { background:'white', borderRadius:16, padding:16, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
    cardSub: { background:'#f5f5f5', borderRadius:10, padding:'8px 12px' },
  };

  return (
    <div className="fade-in" style={{background:'#f5f5f5',minHeight:'100vh'}}>

      {/* ── ヘッダー ── */}
      <div style={{
        background:'#E84040',
        padding:'16px 20px 14px',
        paddingTop:'calc(16px + env(safe-area-inset-top))',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:'-0.5px',color:'white'}}>SalesLog</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.75)',marginTop:1}}>売上管理アプリ</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>{now.getFullYear()}年{now.getMonth()+1}月</div>
          </div>
        </div>
      </div>

      <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>

        {/* ── 今月の目標進捗 ── */}
        <div style={C.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:12,color:'#999',fontWeight:600}}>今月の目標月利</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontSize:12,color:'#E84040',fontWeight:700}}>{progressPct}%</div>
              <button onClick={openGoalEdit}
                style={{fontSize:11,color:'#E84040',background:'#fff0f0',border:'1px solid #fca5a5',borderRadius:6,padding:'2px 8px',cursor:'pointer',fontWeight:600}}>
                変更
              </button>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:4}}>
            <div style={{fontSize:28,fontWeight:800,letterSpacing:'-1px',color: remaining===0?'#16a34a':'#1a1a1a'}}>
              {remaining === 0 ? '達成 🎉' : `¥${formatMoney(remaining)}`}
            </div>
            <div style={{fontSize:11,color:'#999',textAlign:'right',lineHeight:1.6}}>
              <div>目標 <span style={{color:'#333',fontWeight:600}}>¥{formatMoney(monthlyGoal)}</span></div>
              <div>利益 <span style={{color:'#16a34a',fontWeight:600}}>¥{formatMoney(totalProfit)}</span></div>
            </div>
          </div>
          <div style={{background:'#f0f0f0',borderRadius:99,height:7,overflow:'hidden',marginTop:4}}>
            <div style={{
              height:'100%', borderRadius:99,
              background: progressPct>=100 ? '#16a34a' : '#E84040',
              width:`${progressPct}%`,
              transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }}/>
          </div>
        </div>

        {/* ── 今週の進捗 ── */}
        <div style={{...C.card, border: weeklyAchieved ? '1px solid #bbf7d0' : '1px solid #f0f0f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:12,color:'#999',fontWeight:600}}>今週の進捗</div>
            {weeklyAchieved
              ? <span style={{fontSize:11,background:'#d1fae5',color:'#065f46',borderRadius:20,padding:'2px 8px',fontWeight:700}}>✅ 達成！</span>
              : <span style={{fontSize:11,background:'#fff0f0',color:'#dc2626',borderRadius:20,padding:'2px 8px',fontWeight:700}}>あと ¥{formatMoney(weeklyRemaining)}</span>
            }
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,color:'#999',marginBottom:4}}>今週の目標</div>
              <div style={{fontSize:16,fontWeight:700,color:'#333'}}>¥{formatMoney(weeklyTarget)}</div>
            </div>
            <div style={{textAlign:'center',borderLeft:'1px solid #f0f0f0',borderRight:'1px solid #f0f0f0'}}>
              <div style={{fontSize:10,color:'#999',marginBottom:4}}>今週の利益</div>
              <div style={{fontSize:16,fontWeight:700,color: weeklyProfit>=weeklyTarget?'#16a34a':'#E84040'}}>¥{formatMoney(weeklyProfit)}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,color:'#999',marginBottom:4}}>達成率</div>
              <div style={{fontSize:16,fontWeight:700,color: weeklyAchieved?'#16a34a':'#333'}}>{weeklyPct}%</div>
            </div>
          </div>
          <div style={{background:'#f0f0f0',borderRadius:99,height:6,overflow:'hidden'}}>
            <div style={{
              height:'100%', borderRadius:99,
              background: weeklyAchieved ? '#16a34a' : '#E84040',
              width:`${weeklyPct}%`,
              transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }}/>
          </div>
          <div style={{fontSize:10,color:'#bbb',marginTop:6,textAlign:'right'}}>
            {weekStartStr} 〜 {weekEndStr}
          </div>
        </div>

        {/* ── 今月の利益 / 在庫数 ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={C.card}>
            <div style={{fontSize:11,color:'#999',marginBottom:6,fontWeight:600}}>今月の利益</div>
            <div style={{fontSize:24,fontWeight:800,letterSpacing:'-0.5px',color:totalProfit>=0?'#16a34a':'#E84040'}}>
              ¥{formatMoney(totalProfit)}
            </div>
          </div>
          <div style={C.card}>
            <div style={{fontSize:11,color:'#999',marginBottom:6,fontWeight:600}}>在庫数</div>
            <div style={{fontSize:24,fontWeight:800,letterSpacing:'-0.5px',color:'#1a1a1a'}}>
              {inventoryCount}<span style={{fontSize:13,color:'#999',marginLeft:2}}>件</span>
            </div>
          </div>
        </div>

        {/* ── ご褒美 ── */}
        <div style={{...C.card,background:'#fffbeb',border:'1px solid #fde68a'}}>
          <div style={{fontSize:11,color:'#b45309',fontWeight:600,marginBottom:6}}>🎁 ご褒美予算</div>
          <div style={{fontSize:24,fontWeight:800,color:'#d97706',letterSpacing:'-0.5px'}}>¥{formatMoney(rewardBudget)}</div>
          <div style={{fontSize:11,color:'#92400e',marginTop:2}}>利益の{rewardPercent}%</div>
          {nextMilestone && (
            <div style={{background:'#fef3c7',borderRadius:8,padding:'7px 10px',marginTop:8,fontSize:11,color:'#b45309'}}>
              🏆 {nextMilestone.label}まで あと{(nextMilestone.targetCount||1)-getAchievedCount(nextMilestone)}回
            </div>
          )}
        </div>

        {/* ── 旅行ゲーム ── */}
        <div style={{...C.card,background:'#eff6ff',border:'1px solid #bfdbfe'}}>
          <div style={{fontSize:11,color:'#2563eb',fontWeight:600,marginBottom:10}}>✈️ 次の旅行</div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{fontSize:40,lineHeight:1}}>{currentSpot.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:800,color:'#1e3a5f',letterSpacing:'-0.3px'}}>{currentSpot.name}</div>
              <div style={{fontSize:11,color:'#3b82f6',marginTop:3}}>{currentSpot.desc}</div>
            </div>
          </div>
          {nextSpot && (
            <div style={{background:'#dbeafe',borderRadius:8,padding:'7px 10px',marginTop:10,fontSize:11,color:'#1d4ed8'}}>
              {nextSpot.emoji} 次: {nextSpot.name}まで ¥{formatMoney(toNextSpot)}
            </div>
          )}
        </div>

        {/* ── 仕入れボタン ── */}
        <button className="btn-primary" style={{width:'100%',fontSize:16,padding:'15px',marginTop:2}}
          onClick={() => setTab('purchase')}>
          ＋ 新規仕入れ登録
        </button>

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
            <div style={{fontSize:11,color:'#999',marginBottom:16}}>
              週あたりの目標：¥{formatMoney(Math.ceil(Number(goalInput||0) * 7 / daysInMonth))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
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
// 仕入れ登録タブ
// ============================================================
const PurchaseTab = () => {
  const { data, setData, editingItem, setEditingItem, currentUser } = React.useContext(AppContext);
  const toast = useToast();
  const [step, setStep] = React.useState(1); // 1:写真, 2:AI解析, 3:入力
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
  });
  const [generatedDesc, setGeneratedDesc] = React.useState('');
  const [showDesc, setShowDesc] = React.useState(false);
  const [purchaseType, setPurchaseType] = React.useState('store'); // 'store' | 'online'
  const [purchaseStoreIsCustom, setPurchaseStoreIsCustom] = React.useState(false); // 仕入れ先「その他」モード
  const [purchaseIsYahoo, setPurchaseIsYahoo] = React.useState(false);             // ヤフオクストアモード
  const [yahooSubStoreIsCustom, setYahooSubStoreIsCustom] = React.useState(false); // ヤフオク手入力モード
  const [tagReading, setTagReading] = React.useState(false);
  const [tagReadResult, setTagReadResult] = React.useState(null);
  const [seoCategoryInput, setSeoCategoryInput] = React.useState('');
  const cameraInputRef = React.useRef();
  const libraryInputRef = React.useRef();
  const multiInputRef = React.useRef();
  const tagPhotoRef = React.useRef();

  // コンポーネントアンマウント時にObjectURLを解放
  React.useEffect(() => {
    return () => {
      photos.forEach(p => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
      });
    };
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
    });
    setPurchaseType(editingItem.purchaseType || 'store');
    // ヤフオクストア判定
    const isYahoo = editingItem.purchaseStoreType === 'yahoo';
    setPurchaseIsYahoo(isYahoo);
    if (isYahoo) {
      const yahooStores = data.settings?.yahooStores || [];
      const knownYahoo = yahooStores.find(s => s.storeName === editingItem.purchaseStore);
      setYahooSubStoreIsCustom(!knownYahoo && !!editingItem.purchaseStore);
      setPurchaseStoreIsCustom(false);
    } else {
      const isKnownStore = CONFIG.PURCHASE_STORES.filter(s => s !== 'ヤフオクストア').includes(editingItem.purchaseStore);
      setPurchaseStoreIsCustom(!isKnownStore && !!editingItem.purchaseStore);
    }
    // 保存済み説明文を復元
    if (editingItem.descriptionText) {
      setGeneratedDesc(editingItem.descriptionText);
      setShowDesc(true);
    }
    // 写真をIndexedDBからロード
    (async () => {
      const loaded = [];
      for (const ref of (editingItem.photos || [])) {
        try {
          const [fullBlob, thumbBlob] = await Promise.all([getPhoto(ref.id), getPhoto(ref.thumbId)]);
          loaded.push({
            id: ref.id,
            thumbId: ref.thumbId,
            previewUrl: fullBlob ? blobToURL(fullBlob) : (ref.thumbDataUrl || null),
            thumbUrl:   thumbBlob ? blobToURL(thumbBlob) : (ref.thumbDataUrl || null),
            thumbDataUrl: ref.thumbDataUrl || null,
          });
        } catch(e) {
          loaded.push({ id: ref.id, thumbId: ref.thumbId, previewUrl: ref.thumbDataUrl||null, thumbUrl: ref.thumbDataUrl||null, thumbDataUrl: ref.thumbDataUrl||null });
        }
      }
      setPhotos(loaded);
    })();
    setStep(3);
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
        const blob = await getPhoto(photo.id);
        if (!blob) continue;
        const compressed = await compressImage(new File([blob], 'photo.jpg', {type:'image/jpeg'}), 400, 0.6);
        const b64 = await blobToBase64(compressed);
        imageDataList.push({ mimeType: 'image/jpeg', data: b64 });
      }
      if (imageDataList.length === 0) throw new Error('画像の取得に失敗しました');
      const text = await analyzeImagesWithClaude(imageDataList, apiKey, PRODUCT_ANALYSIS_PROMPT, 1500);
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
        productName: result.product_name || '',
        englishTitle: result.english_title ? result.english_title.slice(0, 40) : (prev.englishTitle || ''),
        brand: result.brand || '',
        category: result.category || '',
        color: result.color || '',
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
        }
      }
      setStep(3);
      toast('✅ AI解析完了！');
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

  // 仕入れ合計（税込・税抜）
  const totalPurchaseTaxIn = purchaseType === 'store'
    ? (Number(form.itemPriceTaxIn) || 0)
    : (Number(form.itemPriceTaxIn) || 0)
      + (Number(form.shippingTaxIn) || 0)
      + (form.showOptionalFee ? (Number(form.optionalFeeTaxIn) || 0) : 0);

  const totalPurchaseTaxEx = purchaseType === 'store'
    ? calcTaxEx(form.itemPriceTaxIn, form.itemTaxRate)
    : calcTaxEx(form.itemPriceTaxIn, form.itemTaxRate)
      + calcTaxEx(form.shippingTaxIn, form.shippingTaxRate)
      + (form.showOptionalFee ? calcTaxEx(form.optionalFeeTaxIn, form.optionalTaxRate) : 0);

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
      const result = await readPriceFromImage(file, CONFIG.AUCTION_PRICE_PROMPT, apiKey);
      const bidPrice = result.bid_price || 0;
      const shipping = result.shipping || 0;
      const total = result.total || (bidPrice + shipping);
      if (total > 0) {
        setForm(prev => ({
          ...prev,
          itemPriceTaxIn: bidPrice || total,
          shippingTaxIn: shipping > 0 ? shipping : '',
        }));
        setTagReadResult({ type: 'online', ...result, total });
        toast(`✅ 読み取り成功: 合計¥${total.toLocaleString()}`);
      } else {
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
      conditionText,
      '中古品のため多少の使用感ありますが、目立った傷や汚れなどはなく今後もご愛用できる商品です！',
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
    photos.forEach(p => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
    });
    setStep(1); setPhotos([]); setAiResult(null); setGeneratedDesc(''); setShowDesc(false);
    setAiTypeDetection(null); setPurchaseTypeSource('manual'); setPurchaseStoreIsCustom(false);
    setPurchaseIsYahoo(false); setYahooSubStoreIsCustom(false);
    setSeoCategoryInput(''); setEditingItem(null);
    setForm({
      productName: '', brand: '', category: '', color: '',
      brandReading: '', categoryKeywords: '', colorDisplay: '',
      condition: 'A', conditionDetail: '',
      sizeTag: '', sizeM1: '', sizeM2: '', sizeM3: '', sizeM4: '', sizeConfidence: 'medium', material: '',
      purchaseDate: today(), purchaseStore: '', sellerLicense: '',
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

  const handleSave = () => {
    if (!form.productName) { toast('商品名を入力してください'); return; }
    if (!totalPurchaseTaxIn) { toast('仕入れ価格を入力してください'); return; }
    // photos配列: IDとbase64サムネイルを保存（IndexedDB消失時もSupabaseから復元可能）
    const photoRefs = photos.map(p => ({ id: p.id, thumbId: p.thumbId, thumbDataUrl: p.thumbDataUrl || null }));
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
    };

    if (editingItem) {
      // ---- 編集モード: 既存アイテムを上書き ----
      const updatedItem = {
        ...editingItem,   // id, mgmtNo, createdAt, status など元データを保持
        ...form,
        size: computedSize,
        purchasePrice: totalPurchaseTaxIn,
        purchaseCost,
        purchaseType,
        purchaseTypeSource,
        purchaseStoreType: purchaseIsYahoo ? 'yahoo' : 'normal',
        aiTypeDetection: aiTypeDetection || editingItem.aiTypeDetection || null,
        listPrice: Number(form.listPrice) || 0,
        photos: photoRefs,
        descriptionText: generatedDesc || form.descriptionText || '',
        updatedAt: new Date().toISOString(),
      };
      const updated = data.inventory.map(i => i.id === editingItem.id ? updatedItem : i);
      setData({ ...data, inventory: updated });
      toast('✅ 商品情報を更新しました！');
      resetForm();
      return;
    }

    // ---- 新規登録 ----
    const newItem = {
      id: Date.now().toString(),
      ...form,
      userId: currentUser,
      size: computedSize,
      purchasePrice: totalPurchaseTaxIn,
      purchaseCost,
      purchaseType,
      purchaseTypeSource,
      purchaseStoreType: purchaseIsYahoo ? 'yahoo' : 'normal',
      aiTypeDetection: aiTypeDetection || null,
      listPrice: Number(form.listPrice) || 0,
      photos: photoRefs,
      mgmtNo,
      status: 'unlisted',
      profit,
      descriptionText: generatedDesc || '',
      createdAt: new Date().toISOString(),
    };
    setData({ ...data, inventory: [...data.inventory, newItem] });
    toast('✅ 仕入れを登録しました！');
    resetForm();
  };

  const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fade-in">
      <div className="header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h1 style={{margin:0}}>{editingItem ? '✏️ 商品を編集' : '📦 仕入れ登録'}</h1>
        {editingItem && (
          <button onClick={resetForm}
            style={{background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.5)',borderRadius:8,padding:'4px 12px',fontSize:13,cursor:'pointer'}}>
            ✕ キャンセル
          </button>
        )}
      </div>

      {/* ステップインジケーター */}
      <div className="step-indicator" style={{paddingTop:12}}>
        {[1,2,3].map(s => (
          <div key={s} className={`step ${s < step ? 'done' : s === step ? 'active' : ''}`}/>
        ))}
      </div>

      <div style={{padding:'0 16px 16px'}}>
        {/* Step 1: 写真 */}
        {step >= 1 && (
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Step 1: 写真を追加（最大5枚）</div>
            <div style={{fontSize:12,color:'#999',marginBottom:12}}>1枚目がトップ画像になります</div>

            {/* 写真追加ボタン */}
            {photos.length < 5 && (
              <div style={{marginBottom:12}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <button className="btn-secondary" style={{padding:'10px 8px',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}
                    onClick={() => cameraInputRef.current?.click()}>
                    📷 カメラで撮影
                  </button>
                  <button className="btn-secondary" style={{padding:'10px 8px',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}
                    onClick={() => libraryInputRef.current?.click()}>
                    🖼 フォトライブラリ
                  </button>
                </div>
                <button className="btn-secondary" style={{width:'100%',padding:'10px 8px',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}
                  onClick={() => multiInputRef.current?.click()}>
                  📁 複数写真を選択（最大{5 - photos.length}枚）
                </button>
              </div>
            )}

            {/* hidden file inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhotoSelect} style={{display:'none'}}/>
            <input ref={libraryInputRef} type="file" accept="image/*"
              onChange={handlePhotoSelect} style={{display:'none'}}/>
            <input ref={multiInputRef} type="file" accept="image/*" multiple
              onChange={handlePhotoSelect} style={{display:'none'}}/>

            {/* サムネイルプレビュー */}
            {photos.length > 0 && (
              <div className="photo-grid" style={{marginBottom:12}}>
                {photos.map((p, i) => (
                  <div key={p.id} className="photo-item">
                    <img src={p.thumbUrl || p.previewUrl} alt={`photo${i}`}/>
                    {i === 0 && <div style={{position:'absolute',top:4,left:4,background:'var(--color-primary)',color:'white',fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:700}}>TOP</div>}
                    <button onClick={() => removePhoto(i)}
                      style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.5)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14}}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{display:'flex',gap:8,marginTop:4}}>
              {photos.length > 0 && step === 1 && (
                <button className="btn-primary" style={{flex:1}}
                  onClick={() => setStep(2)}>次へ → AI解析</button>
              )}
              {step === 1 && (
                <button className="btn-secondary" style={{flex: photos.length > 0 ? '0 0 auto' : 1}}
                  onClick={() => setStep(3)}>
                  {photos.length > 0 ? 'スキップ' : '📝 写真なしで手動入力'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: AI解析 */}
        {step >= 2 && (
          <div className="card" style={{padding:16,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Step 2: AI解析</div>
            {!apiKey && (
              <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:8,padding:12,marginBottom:12,fontSize:13,color:'#92400e'}}>
                ⚠️ APIキー未設定。設定タブで入力してください。
              </div>
            )}
            <button className="btn-primary" style={{width:'100%'}}
              onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <><span className="spinner"/><span>解析中...</span></> : '🤖 AI解析する'}
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
              <label className="field-label">商品名（日本語）<span style={{color:form.productName.length>40?'red':form.productName.length>30?'orange':'#999'}}>({form.productName.length}/40)</span></label>
              <input className="input-field" value={form.productName}
                onChange={e => setF('productName', e.target.value.slice(0,40))} placeholder="例: ノースフェイス ダウンジャケット ブラック L"/>
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
              <input className={`input-field${form.englishTitle.length > 40 ? ' highlight' : ''}`}
                value={form.englishTitle}
                onChange={e => setF('englishTitle', e.target.value)}
                placeholder="AI解析で自動入力。例: Louis Vuitton Musette Salsa Shoulder Bag"/>
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
                <input className="input-field" value={form.color} onChange={e => setF('color', e.target.value)} placeholder="カラー"/>
              </div>
              <div>
                <label className="field-label">状態ランク</label>
                <select className="input-field" value={form.condition} onChange={e => setF('condition', e.target.value)}>
                  {['S','A','B','C'].map(c => <option key={c} value={c}>{c}ランク</option>)}
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

            {/* 仕入れ情報 */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label className="field-label">仕入れ日</label>
                <input type="date" className="input-field" value={form.purchaseDate}
                  onChange={e => setF('purchaseDate', e.target.value)}/>
              </div>
              <div>
                <label className="field-label">仕入れ先</label>
                {/* ── メイン仕入れ先選択 ── */}
                <select className="input-field"
                  value={purchaseIsYahoo ? 'ヤフオクストア' : (purchaseStoreIsCustom ? 'その他' : (form.purchaseStore || ''))}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'ヤフオクストア') {
                      setPurchaseIsYahoo(true);
                      setPurchaseStoreIsCustom(false);
                      setYahooSubStoreIsCustom(false);
                      setF('purchaseStore', '');
                      setF('sellerLicense', '');
                    } else if (val === 'その他') {
                      setPurchaseIsYahoo(false);
                      setPurchaseStoreIsCustom(true);
                      setF('purchaseStore', '');
                      setF('sellerLicense', '');
                    } else {
                      setPurchaseIsYahoo(false);
                      setPurchaseStoreIsCustom(false);
                      setF('purchaseStore', val);
                      const license = (data.settings?.storeLicenses || {})[val] || '';
                      setF('sellerLicense', license);
                    }
                  }}>
                  <option value="">選択してください</option>
                  {CONFIG.PURCHASE_STORES.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="その他">その他（手入力）</option>
                </select>

                {/* ── 通常店舗：手入力 ── */}
                {purchaseStoreIsCustom && (
                  <input className="input-field" style={{marginTop:6}}
                    value={form.purchaseStore}
                    onChange={e => setF('purchaseStore', e.target.value)}
                    placeholder="店舗名を入力"/>
                )}

                {/* ── ヤフオクストア：サブ選択 ── */}
                {purchaseIsYahoo && (() => {
                  const yahooStores = data.settings?.yahooStores || [];
                  return (
                    <div style={{marginTop:6,background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:10}}>
                      <div style={{fontSize:11,color:'#c2410c',fontWeight:600,marginBottom:6}}>🏪 ヤフオクストア選択</div>
                      <select className="input-field"
                        value={yahooSubStoreIsCustom ? '__custom__' : (form.purchaseStore || '')}
                        onChange={e => {
                          if (e.target.value === '__custom__') {
                            setYahooSubStoreIsCustom(true);
                            setF('purchaseStore', '');
                            setF('sellerLicense', '');
                          } else {
                            setYahooSubStoreIsCustom(false);
                            const found = yahooStores.find(s => s.storeName === e.target.value);
                            setF('purchaseStore', e.target.value);
                            setF('sellerLicense', found?.license || '');
                          }
                        }}>
                        <option value="">ストアを選択...</option>
                        {yahooStores.map(s => (
                          <option key={s.id} value={s.storeName}>{s.storeName}{s.companyName ? ` (${s.companyName})` : ''}</option>
                        ))}
                        <option value="__custom__">その他（手入力）</option>
                      </select>
                      {yahooSubStoreIsCustom && (
                        <input className="input-field" style={{marginTop:6}}
                          value={form.purchaseStore}
                          onChange={e => setF('purchaseStore', e.target.value)}
                          placeholder="ストア名を入力"/>
                      )}
                    </div>
                  );
                })()}

                {/* 許可証番号は設定画面で管理（フォームには表示しない） */}
              </div>
            </div>

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
                    onClick={() => { setPurchaseType(type); setPurchaseTypeSource('manual'); setTagReadResult(null); }}
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
                  <div style={{marginTop:6,padding:'8px 12px',background:'#f0fdf4',borderRadius:8,fontSize:13,color:'#166534'}}>
                    ✅ {tagReadResult.platform && <span style={{marginRight:6}}>{tagReadResult.platform}</span>}
                    落札¥{(tagReadResult.bid_price||0).toLocaleString()} + 送料¥{(tagReadResult.shipping||0).toLocaleString()}
                    <span style={{fontWeight:700,marginLeft:8}}>= ¥{tagReadResult.total?.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 費用内訳入力（税込・税抜対応） */}
            <div style={{background:'#fafafa',borderRadius:10,padding:12,marginBottom:12,border:'1px solid #ebebeb'}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'#333'}}>
                {purchaseType === 'store' ? '🏪 仕入れ費用（税込入力）' : '💻 仕入れ費用内訳（税込入力）'}
              </div>

              {/* 商品価格 */}
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

              {/* 合計表示 */}
              {totalPurchaseTaxIn > 0 && (
                <div style={{borderTop:'1px solid #e4e4e4',paddingTop:10,marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                  <span style={{fontWeight:700,fontSize:13,color:'#333'}}>仕入れ合計</span>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700,fontSize:20,color:'var(--color-primary)'}}>¥{totalPurchaseTaxIn.toLocaleString()}<span style={{fontSize:12,color:'#999',fontWeight:400}}> 税込</span></div>
                    <div style={{fontSize:11,color:'#999'}}>税抜 ¥{totalPurchaseTaxEx.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{marginBottom:12}}>
              <label className="field-label">決済方法</label>
              <select className="input-field" value={form.paymentMethod} onChange={e => setF('paymentMethod', e.target.value)}>
                {['現金','クレカ','PayPay','メルペイ','その他'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label className="field-label">出品予定日</label>
                <input type="date" className="input-field" value={form.listDate}
                  onChange={e => setF('listDate', e.target.value)}/>
              </div>
              <div>
                <label className="field-label">出品予定価格 (円)</label>
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

            <button className="btn-primary" style={{width:'100%',marginTop:4,padding:16,fontSize:17}}
              onClick={handleSave}>{editingItem ? '💾 更新保存する' : '💾 仕入れを登録する'}</button>
          </div>
        )}
      </div>
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
  const { data, setData, setTab, setEditingItem } = React.useContext(AppContext);
  const toast = useToast();
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(null);

  const filtered = data.inventory.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const statusLabel = { unlisted: '未出品', listed: '出品中', sold: '売却済' };
  const statusClass = { unlisted: 'tag-unlisted', listed: 'tag-active', sold: 'tag-sold' };

  const markAsSold = (item) => {
    const updated = data.inventory.map(i => i.id === item.id ? { ...i, status: 'sold' } : i);
    setData({ ...data, inventory: updated });
    setSelected(null);
    toast('✅ 売却済みに変更しました。売上記録タブで詳細を登録してください。');
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
    const updated = data.inventory.filter(i => i.id !== item.id);
    setData({ ...data, inventory: updated });
    setSelected(null);
    toast('🗑️ 削除しました');
  };

  return (
    <div className="fade-in">
      <div className="header">
        <h1>📋 在庫一覧</h1>
      </div>

      {/* フィルター */}
      <div style={{display:'flex',gap:8,padding:'12px 16px',background:'white',borderBottom:'1px solid #e5e5e5',overflowX:'auto'}}>
        {[['all','全て'],['unlisted','未出品'],['listed','出品中'],['sold','売却済']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{flexShrink:0,padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,
              background: filter === v ? 'var(--color-primary)' : '#f0f0f0',
              color: filter === v ? 'white' : '#666'}}>
            {l} ({v === 'all' ? data.inventory.length : data.inventory.filter(i => i.status === v).length})
          </button>
        ))}
      </div>

      <div style={{padding:'12px 16px'}}>
        {filtered.length === 0 ? (
          <div className="card" style={{padding:24,textAlign:'center',color:'#999'}}>
            {filter === 'all' ? '在庫がありません' : `${statusLabel[filter]}の商品がありません`}
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {filtered.map(item => (
              <div key={item.id} className="card" style={{padding:14,display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}
                onClick={() => setSelected(item)}>
                <ItemThumbnail thumbId={item.photos?.[0]?.thumbId} thumbDataUrl={item.photos?.[0]?.thumbDataUrl} size={70} fallback="📦" />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:'#999',marginBottom:2}}>{item.brand}</div>
                  <div style={{fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.productName}</div>
                  <div style={{display:'flex',gap:6,marginTop:5,alignItems:'center'}}>
                    {conditionTag(item.condition)}
                    <span className={`tag ${statusClass[item.status] || 'tag-unlisted'}`}>{statusLabel[item.status] || '未出品'}</span>
                  </div>
                  <div style={{fontSize:12,color:'#666',marginTop:4}}>仕入れ ¥{formatMoney(item.purchasePrice)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:17}}>商品詳細</div>
              <button onClick={() => setSelected(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#666'}}>×</button>
            </div>

            {/* 写真スライド（IndexedDBから取得） */}
            {selected.photos?.length > 0 && (
              <div style={{display:'flex',gap:8,overflowX:'auto',marginBottom:16,paddingBottom:4}}>
                {selected.photos.map((p, i) => (
                  <PhotoSlide key={p.id || i} photoRef={p} />
                ))}
              </div>
            )}

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
                <div style={{fontSize:12,color:'#999'}}>出品予定価格</div>
                <div style={{fontWeight:600}}>¥{formatMoney(selected.listPrice)}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'#999'}}>仕入れ日</div>
                <div>{selected.purchaseDate}</div>
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

            {/* コピーボタン */}
            {(selected.englishTitle || selected.descriptionText) && (
              <div style={{display:'flex',gap:8,marginTop:12}}>
                {selected.englishTitle && (
                  <button onClick={() => copyToClipboard(selected.englishTitle).then(ok => toast(ok ? '📋 タイトルをコピーしました' : 'コピー失敗'))}
                    style={{flex:1,padding:'10px 8px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:13,fontWeight:600,cursor:'pointer',color:'#333'}}>
                    📋 タイトルコピー
                  </button>
                )}
                {selected.descriptionText && (
                  <button onClick={() => copyToClipboard(selected.descriptionText).then(ok => toast(ok ? '📋 説明文をコピーしました' : 'コピー失敗'))}
                    style={{flex:1,padding:'10px 8px',borderRadius:10,border:'1.5px solid #e0e0e0',background:'white',fontSize:13,fontWeight:600,cursor:'pointer',color:'#333'}}>
                    📋 説明文コピー
                  </button>
                )}
              </div>
            )}

            {/* アクションボタン */}
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
              {/* 編集ボタン */}
              <button className="btn-secondary" style={{width:'100%'}}
                onClick={() => { setEditingItem(selected); setTab('purchase'); setSelected(null); }}>
                ✏️ 編集
              </button>

              {selected.status !== 'sold' && (
                <button className="btn-primary" style={{width:'100%'}}
                  onClick={() => markAsSold(selected)}>
                  🎉 売れた！
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
  const { data, setData, currentUser, setEditingItem, setTab } = React.useContext(AppContext);
  const toast = useToast();
  const [showForm, setShowForm] = React.useState(false);
  const [editingSale, setEditingSale] = React.useState(null);
  const emptyForm = { inventoryId: '', platform: 'メルカリ', salePrice: '', feeRate: 0.10, shipping: CONFIG.ESTIMATED_SHIPPING.toString(), saleDate: today(), platformId: '' };
  const [form, setForm] = React.useState(emptyForm);
  const [ssReading, setSsReading] = React.useState(false);
  const [ssCandidate, setSsCandidate] = React.useState(null); // {item, extracted}
  const ssInputRef = React.useRef();
  const apiKey = data.settings?.apiKey || '';

  // 商品名マッチング（AI読み取り結果 vs 在庫リスト）
  const findBestMatch = (aiName, items) => {
    const norm = s => (s || '').toLowerCase()
      .replace(/[・\-\/\s　（）()【】「」]+/g, ' ')
      .replace(/\(推定\)/g, '').trim();
    const tokens = s => norm(s).split(' ').filter(t => t.length >= 2);
    const aiTokens = tokens(aiName);
    if (aiTokens.length === 0) return null;
    let best = null, bestScore = 0;
    for (const item of items) {
      const str = `${item.brand||''} ${item.productName||''} ${item.modelNumber||''}`;
      const itemTokens = tokens(str);
      let hit = 0;
      for (const t of aiTokens) {
        if (itemTokens.some(it => it.includes(t) || t.includes(it))) hit++;
      }
      const score = hit / aiTokens.length;
      if (score > bestScore) { bestScore = score; best = item; }
    }
    return bestScore >= 0.25 ? best : null;
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
      const text = await analyzeImagesWithClaude([{mimeType:'image/jpeg', data:b64}], apiKey, MERCARI_SS_PROMPT, 400);
      const stripped = text.replace(/```(?:json)?\s*/gi,'').replace(/```/g,'');
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('読み取り失敗');
      const result = JSON.parse(jsonMatch[0]);
      if (!result.product_name) throw new Error('商品名を読み取れませんでした');
      const userItems = data.inventory.filter(i => i.userId === currentUser);
      const matched = findBestMatch(result.product_name, userItems);
      if (!matched) {
        toast('❌ 登録済みの商品から一致するものが見つかりませんでした');
        return;
      }
      setSsCandidate({ item: matched, extracted: result });
    } catch(err) {
      toast('❌ ' + err.message);
    } finally {
      setSsReading(false);
    }
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
    setShowForm(true);
  };

  const openEdit = (sale) => {
    setEditingSale(sale);
    setForm({
      inventoryId: sale.inventoryId || '',
      platform: sale.platform || 'メルカリ',
      salePrice: String(sale.salePrice || ''),
      feeRate: sale.feeRate ?? 0.10,
      shipping: String(sale.shipping ?? CONFIG.ESTIMATED_SHIPPING),
      saleDate: sale.saleDate || today(),
      platformId: sale.platformId || '',
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingSale(null); setForm(emptyForm); };

  const selectedItem = data.inventory.find(i => i.id === form.inventoryId);
  const profit = selectedItem
    ? Math.round(Number(form.salePrice) * (1 - form.feeRate) - Number(form.shipping) - selectedItem.purchasePrice)
    : 0;

  const handleSave = () => {
    if (!form.inventoryId) { toast('商品を選択してください'); return; }
    if (!form.salePrice) { toast('販売価格を入力してください'); return; }

    if (editingSale) {
      // ── 編集 ──
      const updated = {
        ...editingSale,
        ...form,
        salePrice: Number(form.salePrice),
        shipping: Number(form.shipping),
        profit,
        platformId: form.platformId || '',
        updatedAt: new Date().toISOString(),
      };
      setData({ ...data, sales: data.sales.map(s => s.id === editingSale.id ? updated : s) });
      toast('✅ 売上を更新しました');
    } else {
      // ── 新規 ──
      const newSale = {
        id: Date.now().toString(),
        ...form,
        userId: currentUser,
        salePrice: Number(form.salePrice),
        shipping: Number(form.shipping),
        profit,
        platformId: form.platformId || '',
        createdAt: new Date().toISOString(),
      };
      setData({ ...data, sales: [...data.sales, newSale] });
      toast('✅ 売上を記録しました');
    }
    closeForm();
  };

  const handleDelete = (saleId) => {
    if (!window.confirm('この売上記録を削除しますか？')) return;
    setData({ ...data, sales: data.sales.filter(s => s.id !== saleId) });
    closeForm();
    toast('🗑️ 売上記録を削除しました');
  };

  // 月次サマリー
  const salesByMonth = {};
  data.sales.forEach(s => {
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
      <div className="header">
        <h1>💰 売上記録</h1>
      </div>

      <div style={{padding:'12px 16px'}}>
        {unrecordedSold.length > 0 && (
          <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:12,marginBottom:12,fontSize:13}}>
            <div style={{fontWeight:700,color:'#92400e',marginBottom:4}}>⚠️ 売上未記録の商品が{unrecordedSold.length}件あります</div>
            <div style={{color:'#92400e'}}>「売上登録」から記録してください</div>
          </div>
        )}

        <button className="btn-primary" style={{width:'100%',marginBottom:16}}
          onClick={openNew}>
          ＋ 売上を登録する
        </button>

        {/* 月次サマリー */}
        {months.length > 0 && (
          <>
            <div style={{fontWeight:700,fontSize:15,marginBottom:10,color:'#333'}}>月次サマリー</div>
            {months.map(m => {
              const mData = salesByMonth[m];
              const mProfitRate = mData.revenue > 0 ? Math.round(mData.profit / mData.revenue * 100) : 0;
              const platformEntries = Object.entries(mData.platforms).sort((a,b) => b[1]-a[1]);
              return (
                <div key={m} className="card" style={{padding:16,marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:10,color:'#333'}}>{m.replace('-','年')}月</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:8}}>
                    <div>
                      <div style={{fontSize:11,color:'#999'}}>売上</div>
                      <div style={{fontWeight:700,fontSize:14}}>¥{formatMoney(mData.revenue)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:'#999'}}>純利益</div>
                      <div style={{fontWeight:700,fontSize:14,color: mData.profit >= 0 ? '#16a34a' : '#dc2626'}}>¥{formatMoney(mData.profit)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:'#999'}}>利益率</div>
                      <div style={{fontWeight:700,fontSize:14,color: mProfitRate >= 0 ? '#16a34a' : '#dc2626'}}>{mProfitRate}%</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:'#999'}}>件数</div>
                      <div style={{fontWeight:700,fontSize:14}}>{mData.count}件</div>
                    </div>
                  </div>
                  {platformEntries.length > 0 && (
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {platformEntries.map(([p,cnt]) => (
                        <span key={p} style={{fontSize:11,background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 8px',fontWeight:600}}>{p} {cnt}件</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* 売上一覧 */}
        {data.sales.length > 0 && (
          <>
            <div style={{fontWeight:700,fontSize:15,margin:'16px 0 10px',color:'#333'}}>売上履歴</div>
            {[...data.sales].reverse().map(s => {
              const item = data.inventory.find(i => i.id === s.inventoryId);
              const sProfitRate = s.salePrice > 0 ? Math.round((s.profit || 0) / s.salePrice * 100) : 0;
              return (
                <div key={s.id} className="card" style={{padding:14,marginBottom:8,display:'flex',gap:10,alignItems:'center',cursor:'pointer'}}
                  onClick={() => openEdit(s)}>
                  <ItemThumbnail thumbId={item?.photos?.[0]?.thumbId} thumbDataUrl={item?.photos?.[0]?.thumbDataUrl} size={50} fallback="💰" />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item?.brand} {item?.productName || '商品'}</div>
                    <div style={{fontSize:12,color:'#999',marginTop:2}}>{s.saleDate} · <span style={{fontWeight:600,color:'#555'}}>{s.platform}</span></div>
                    <div style={{fontSize:13,marginTop:3,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{fontWeight:700}}>¥{formatMoney(s.salePrice)}</span>
                      <span style={{color: s.profit >= 0 ? '#16a34a' : '#dc2626',fontWeight:600}}>利益 ¥{formatMoney(s.profit)}</span>
                      <span style={{fontSize:11,color: sProfitRate >= 0 ? '#16a34a' : '#dc2626',background: sProfitRate >= 0 ? '#f0fdf4' : '#fef2f2',borderRadius:10,padding:'1px 6px',fontWeight:600}}>{sProfitRate}%</span>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:'#bbb',flexShrink:0}}>✏️</div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* スクショ確認モーダル */}
      {ssCandidate && (
        <div className="modal-overlay" onClick={() => setSsCandidate(null)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>📸 この商品でいいですか？</div>

            {/* マッチした商品 */}
            <div style={{background:'#f8f8f8',borderRadius:10,padding:'10px 12px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
              <ItemThumbnail thumbId={ssCandidate.item.photos?.[0]?.thumbId} thumbDataUrl={ssCandidate.item.photos?.[0]?.thumbDataUrl} size={50} fallback="📦"/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ssCandidate.item.brand} {ssCandidate.item.productName}</div>
                <div style={{fontSize:11,color:'#999',marginTop:2}}>仕入れ ¥{formatMoney(ssCandidate.item.purchasePrice)}</div>
              </div>
            </div>

            {/* 読み取り結果 */}
            <div style={{marginBottom:16}}>
              {[
                ['販売価格', ssCandidate.extracted.sale_price != null ? `¥${formatMoney(ssCandidate.extracted.sale_price)}` : null],
                ['販売手数料', ssCandidate.extracted.platform_fee != null ? `¥${formatMoney(ssCandidate.extracted.platform_fee)}` : null],
                ['配送料', ssCandidate.extracted.shipping != null ? `¥${formatMoney(ssCandidate.extracted.shipping)}` : null],
                ['売却日', ssCandidate.extracted.sale_date],
                ['商品ID', ssCandidate.extracted.product_id],
              ].map(([k, v]) => v && (
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f0f0f0',fontSize:14}}>
                  <span style={{color:'#666'}}>{k}</span>
                  <span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button style={{background:'#f0f0f0',border:'none',borderRadius:10,padding:'12px',fontWeight:600,cursor:'pointer',fontSize:14}}
                onClick={() => setSsCandidate(null)}>キャンセル</button>
              <button className="btn-primary" onClick={() => {
                const ex = ssCandidate.extracted;
                const platform = ex.platform || 'メルカリ';
                const fees = data.settings?.platformFees || CONFIG.PLATFORM_FEES;
                const feeRate = (ex.sale_price && ex.platform_fee)
                  ? Math.round(ex.platform_fee / ex.sale_price * 1000) / 1000
                  : (fees[platform] ?? 0.10);
                setForm({
                  inventoryId: ssCandidate.item.id,
                  platform,
                  salePrice: String(ex.sale_price || ''),
                  feeRate,
                  shipping: String(ex.shipping != null ? ex.shipping : CONFIG.ESTIMATED_SHIPPING),
                  saleDate: ex.sale_date || today(),
                  platformId: ex.product_id || '',
                });
                setSsCandidate(null);
                setShowForm(true);
              }}>OK・入力する</button>
            </div>
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
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:17}}>{editingSale ? '✏️ 売上を編集' : '売上登録'}</div>
              <button onClick={closeForm} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#666'}}>×</button>
            </div>

            {/* 編集時：商品写真の変更リンク */}
            {editingSale && (() => {
              const linkedItem = data.inventory.find(i => i.id === editingSale.inventoryId);
              if (!linkedItem) return null;
              return (
                <div style={{background:'#f8f8f8',borderRadius:12,padding:'10px 12px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
                  <ItemThumbnail thumbId={linkedItem.photos?.[0]?.thumbId} thumbDataUrl={linkedItem.photos?.[0]?.thumbDataUrl} size={44} fallback="📦" />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{linkedItem.brand} {linkedItem.productName}</div>
                    <div style={{fontSize:11,color:'#999',marginTop:1}}>仕入れ ¥{formatMoney(linkedItem.purchasePrice)}</div>
                  </div>
                  <button style={{background:'#E84040',color:'white',border:'none',borderRadius:8,padding:'6px 10px',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}
                    onClick={() => { closeForm(); setEditingItem(linkedItem); setTab('purchase'); }}>
                    写真を変更
                  </button>
                </div>
              );
            })()}

            {/* スクショから自動読み込み */}
            <button style={{width:'100%',marginBottom:14,background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:12,padding:'12px',fontSize:14,fontWeight:600,cursor:'pointer',color:'#0369a1',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}
              onClick={() => ssInputRef.current?.click()} disabled={ssReading}>
              {ssReading ? <><span className="spinner"/><span>読み取り中...</span></> : '📸 メルカリのスクショから自動入力'}
            </button>

            <div style={{marginBottom:12}}>
              <label className="field-label">商品選択</label>
              <select className="input-field" value={form.inventoryId} onChange={e => setF('inventoryId', e.target.value)}>
                <option value="">商品を選択...</option>
                {data.inventory.filter(i => i.userId === currentUser).map(i => {
                  const statusLabels = { unlisted:'未出品', listed:'出品中', sold:'売却済' };
                  return <option key={i.id} value={i.id}>{i.brand} {i.productName}（{statusLabels[i.status]||i.status}）</option>;
                })}
              </select>
            </div>

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

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
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

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label className="field-label">販売日</label>
                <input type="date" className="input-field" value={form.saleDate}
                  onChange={e => setF('saleDate', e.target.value)}/>
              </div>
              <div>
                <label className="field-label">商品ID</label>
                <input type="text" className="input-field" value={form.platformId}
                  onChange={e => setF('platformId', e.target.value)} placeholder="m46193847261" style={{fontSize:12}}/>
              </div>
            </div>

            {form.salePrice && selectedItem && (() => {
              const profitRate = Number(form.salePrice) > 0 ? Math.round(profit / Number(form.salePrice) * 100) : 0;
              return (
                <div style={{background: profit >= 0 ? '#f0fdf4' : '#fef2f2',border:`1px solid ${profit >= 0 ? '#bbf7d0' : '#fecaca'}`,borderRadius:10,padding:12,marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontSize:12,color:'#666',marginBottom:4}}>純利益</div>
                      <div style={{fontSize:22,fontWeight:700,color: profit >= 0 ? '#16a34a' : '#dc2626'}}>¥{formatMoney(profit)}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:12,color:'#666',marginBottom:4}}>利益率</div>
                      <div style={{fontSize:22,fontWeight:700,color: profit >= 0 ? '#16a34a' : '#dc2626'}}>{profitRate}%</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:'#999',marginTop:6}}>仕入れ ¥{formatMoney(selectedItem.purchasePrice)} / 手数料 ¥{Math.round(Number(form.salePrice) * form.feeRate).toLocaleString()} / 送料 ¥{Number(form.shipping).toLocaleString()}</div>
                </div>
              );
            })()}

            <button className="btn-primary" style={{width:'100%'}} onClick={handleSave}>
              💾 {editingSale ? '売上を更新する' : '売上を記録する'}
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
    </div>
  );
};

// ============================================================
// その他タブ（設定・レシート・エクスポート）
// ============================================================
const OtherTab = () => {
  const { data, setData, dbStatus, dbError, userProfile, setUserProfile } = React.useContext(AppContext);
  const toast = useToast();
  const [activeSection, setActiveSection] = React.useState('receipts');
  const [receiptAnalyzing, setReceiptAnalyzing] = React.useState(false);
  const [settings, setSettings] = React.useState({ ...getInitialData().settings, ...data.settings });
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
      // 古物商番号・ヤフオクストア設定は即時保存（保存ボタン不要）
      if (key === 'storeLicenses' || key === 'yahooStores') {
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
          ...result,
          imageData: dataUrl,
          createdAt: new Date().toISOString(),
        };
        setData(prev => ({ ...prev, receipts: [...(prev.receipts || []), newReceipt] }));
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
        // settings（ローカル）を優先し、未保存の変更にも対応
        const storeLicensesMap = settings.storeLicenses || data.settings?.storeLicenses || {};
        const license = item.sellerLicense || storeLicensesMap[item.purchaseStore] || '';
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
    { id: 'export', label: 'エクスポート', icon: '📊' },
    { id: 'settings', label: '設定', icon: '⚙️' },
    { id: 'db', label: 'DB', icon: '🗄️' },
  ];

  return (
    <div className="fade-in">
      <div className="header">
        <h1>⚙️ その他</h1>
      </div>

      {/* サブナビ */}
      <div style={{display:'flex',background:'white',borderBottom:'1px solid #e5e5e5'}}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{flex:1,padding:'12px 4px',border:'none',background:'none',cursor:'pointer',
              fontWeight:600,fontSize:13,borderBottom:`2px solid ${activeSection === s.id ? 'var(--color-primary)' : 'transparent'}`,
              color: activeSection === s.id ? 'var(--color-primary)' : '#666'}}>
            {s.icon} {s.label}
          </button>
        ))}
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
        {activeSection === 'receipts' && (
          <div>
            <button className="btn-primary" style={{width:'100%',marginBottom:16}}
              onClick={() => receiptFileRef.current?.click()} disabled={receiptAnalyzing}>
              {receiptAnalyzing ? <><span className="spinner"/>読み取り中...</> : '📷 レシートを撮影・選択'}
            </button>
            <input ref={receiptFileRef} type="file" accept="image/*" capture="environment"
              onChange={handleReceiptPhoto} style={{display:'none'}}/>

            {(data.receipts || []).length === 0 ? (
              <div className="card" style={{padding:24,textAlign:'center',color:'#999'}}>レシートがありません</div>
            ) : (
              [...(data.receipts || [])].reverse().map(r => (
                <div key={r.id} className="card" style={{padding:14,marginBottom:10,display:'flex',gap:12}}>
                  {r.imageData && <img src={r.imageData} alt="" style={{width:60,height:80,objectFit:'cover',borderRadius:8,flexShrink:0}}/>}
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{r.store_name || '店舗名不明'}</div>
                    <div style={{fontSize:12,color:'#666',marginTop:2}}>{r.purchase_date || '-'}</div>
                    <div style={{fontSize:15,fontWeight:600,marginTop:4}}>¥{formatMoney(r.total_amount)}</div>
                    <div style={{fontSize:12,color:'#999',marginTop:2}}>{r.payment_method || '-'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* エクスポート */}
        {activeSection === 'export' && (() => {
          const salesPreview = [...data.sales].sort((a,b)=>(a.saleDate||'')>(b.saleDate||'')?1:-1);
          // 古物台帳プレビュー: 在庫を仕入日順・1商品1行
          const kobotsuPreview = [...data.inventory]
            .sort((a,b)=>(a.purchaseDate||'')>(b.purchaseDate||'')?1:-1)
            .map(item => {
              const sale = data.sales.find(s=>s.inventoryId===item.id);
              return { item, sale };
            });
          const thStyle = {padding:'5px 7px',textAlign:'left',fontSize:11,color:'#888',fontWeight:700,borderBottom:'1px solid #eee',whiteSpace:'nowrap'};
          const tdStyle = (extra={}) => ({padding:'6px 7px',whiteSpace:'nowrap',...extra});
          return (
            <div>
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
                  <button className="btn-secondary" style={{padding:'7px 14px',fontSize:13}} onClick={exportCSV}>CSVのみ</button>
                </div>
                {salesPreview.length === 0 ? (
                  <div style={{textAlign:'center',color:'#bbb',padding:'16px 0',fontSize:13}}>売上記録がありません</div>
                ) : (
                  <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                    <table style={{fontSize:12,borderCollapse:'collapse',minWidth:520}}>
                      <thead>
                        <tr style={{background:'#f8f8f8'}}>
                          {['仕入日','仕入先','仕入単価','出品日','販売日','販路','売上','手数料','送料','販売利益','純利益','利益率'].map(h=>(
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {salesPreview.slice(0,10).map(s => {
                          const item = data.inventory.find(i=>i.id===s.inventoryId)||{};
                          const sp   = s.salePrice||0;
                          const fee  = Math.round(sp*(s.feeRate||0));
                          const ship = s.shipping||0;
                          const sProfit = sp - fee - ship;
                          const nProfit = sProfit - (item.purchasePrice||0);
                          const rate = sp>0 ? Math.round(nProfit/sp*100) : 0;
                          return (
                            <tr key={s.id} style={{borderBottom:'1px solid #f3f3f3'}}>
                              <td style={tdStyle({color:'#777'})}>{item.purchaseDate}</td>
                              <td style={tdStyle({maxWidth:90,overflow:'hidden',textOverflow:'ellipsis'})}>{item.purchaseStore}</td>
                              <td style={tdStyle({fontWeight:600})}>¥{formatMoney(item.purchasePrice)}</td>
                              <td style={tdStyle({color:'#777'})}>{item.listDate||'−'}</td>
                              <td style={tdStyle({color:'#555'})}>{s.saleDate}</td>
                              <td style={tdStyle()}>{s.platform}</td>
                              <td style={tdStyle({fontWeight:700})}>¥{formatMoney(sp)}</td>
                              <td style={tdStyle({color:'#888'})}>¥{formatMoney(fee)}</td>
                              <td style={tdStyle({color:'#888'})}>¥{formatMoney(ship)}</td>
                              <td style={tdStyle({fontWeight:600,color:sProfit>=0?'#2563eb':'#dc2626'})}>¥{formatMoney(sProfit)}</td>
                              <td style={tdStyle({fontWeight:700,color:nProfit>=0?'#16a34a':'#dc2626'})}>¥{formatMoney(nProfit)}</td>
                              <td style={tdStyle({fontWeight:700,color:rate>=0?'#16a34a':'#dc2626'})}>{rate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {salesPreview.length > 10 && <div style={{fontSize:11,color:'#aaa',textAlign:'center',marginTop:6}}>…他 {salesPreview.length-10}件（CSVに全件含まれます）</div>}
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
                        </tr>
                        <tr style={{background:'#f8f8f8'}}>
                          {['仕入年月日','品目','品名（特徴）','仕入単価','仕入先','許可証番号','売却年月日','売却単価','販路'].map(h=>(
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {kobotsuPreview.slice(0,10).map(({item,sale},i) => (
                          <tr key={item.id} style={{borderBottom:'1px solid #f3f3f3',background: i%2===0?'white':'#fafafa'}}>
                            <td style={tdStyle({color:'#555'})}>{item.purchaseDate}</td>
                            <td style={tdStyle()}>{item.category||'−'}</td>
                            <td style={tdStyle({maxWidth:130,overflow:'hidden',textOverflow:'ellipsis'})}>{item.brand} {item.productName}</td>
                            <td style={tdStyle({fontWeight:600})}>¥{formatMoney(item.purchasePrice)}</td>
                            <td style={tdStyle({color:'#555',fontSize:11,maxWidth:70,overflow:'hidden',textOverflow:'ellipsis'})}>{item.purchaseStore||'−'}</td>
                            <td style={tdStyle({color:'#777',fontSize:10,maxWidth:80,overflow:'hidden',textOverflow:'ellipsis'})}>{(() => {
                              const lic = item.sellerLicense || (settings.storeLicenses||{})[item.purchaseStore] || '';
                              return lic || '未設定';
                            })()}</td>
                            <td style={tdStyle({color: sale?'#16a34a':'#bbb'})}>{sale?.saleDate||'−'}</td>
                            <td style={tdStyle({fontWeight: sale?700:400,color:sale?'#16a34a':'#bbb'})}>{sale ? `¥${formatMoney(sale.salePrice)}` : '−'}</td>
                            <td style={tdStyle({color:sale?'#555':'#bbb'})}>{sale?.platform||'−'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {kobotsuPreview.length > 10 && <div style={{fontSize:11,color:'#aaa',textAlign:'center',marginTop:6}}>…他 {kobotsuPreview.length-10}件（CSVに全件含まれます）</div>}
                  </div>
                )}
              </div>
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

            {/* ── ヤフオクストア一覧管理 ── */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🟠 ヤフオクストア管理</div>
              <div style={{fontSize:12,color:'#999',marginBottom:12}}>ストアごとに古物商番号が違うため別管理します</div>
              {(settings.yahooStores || []).map((store, i) => (
                <div key={store.id} style={{background:'#f9f9f9',borderRadius:10,padding:10,marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#555'}}>ストア {i+1}</div>
                    <button onClick={() => {
                      const updated = (settings.yahooStores||[]).filter((_,j) => j !== i);
                      setSetting('yahooStores', updated);
                    }} style={{background:'none',border:'none',color:'#dc2626',fontSize:16,cursor:'pointer',padding:'0 4px'}}>×</button>
                  </div>
                  <div style={{marginBottom:6}}>
                    <label className="field-label">ストア名</label>
                    <input className="input-field" style={{fontSize:13}}
                      value={store.storeName}
                      onChange={e => {
                        const updated = [...(settings.yahooStores||[])];
                        updated[i] = { ...updated[i], storeName: e.target.value };
                        setSetting('yahooStores', updated);
                      }}
                      placeholder="例: ブランドオフ 楽天市場店"/>
                  </div>
                  <div style={{marginBottom:6}}>
                    <label className="field-label">古物商許可証番号</label>
                    <input className="input-field" style={{fontSize:13}}
                      value={store.license}
                      onChange={e => {
                        const updated = [...(settings.yahooStores||[])];
                        updated[i] = { ...updated[i], license: e.target.value };
                        setSetting('yahooStores', updated);
                      }}
                      placeholder="例: 東京都公安委員会 第123456789号"/>
                  </div>
                  <div>
                    <label className="field-label">法人名（任意）</label>
                    <input className="input-field" style={{fontSize:13}}
                      value={store.companyName || ''}
                      onChange={e => {
                        const updated = [...(settings.yahooStores||[])];
                        updated[i] = { ...updated[i], companyName: e.target.value };
                        setSetting('yahooStores', updated);
                      }}
                      placeholder="例: 株式会社○○"/>
                  </div>
                </div>
              ))}
              <button className="btn-secondary" style={{width:'100%',fontSize:13}}
                onClick={() => {
                  const newStore = { id: Date.now().toString(), storeName: '', license: '', companyName: '' };
                  setSetting('yahooStores', [...(settings.yahooStores||[]), newStore]);
                }}>
                ＋ ヤフオクストアを追加
              </button>
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
  const [tab, setTab]            = React.useState('home');
  const [editingItem, setEditingItem] = React.useState(null);
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
      const newFull = {
        ...newActiveData,
        currentUser:  prev.currentUser,
        userProfiles: prev.userProfiles,
        inventory: [...otherInventory, ...newActiveData.inventory],
        sales:     [...otherSales,     ...newActiveData.sales],
      };
      dataRef.current = newFull;
      saveData(newFull);
      syncToSupabase(oldFull, newFull);
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

        if (hasLocal && !hasCloud) {
          // ローカルにデータあり・クラウド空 → 移行
          await migrateLocalToSupabase(localData);
          setDbStatus('migrated');
        } else {
          // クラウドのデータで画面を更新
          dataRef.current = cloudData;
          setFullDataRaw(cloudData);
          saveData(cloudData);
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

  const tabs = [
    { id: 'home', label: 'ホーム', icon: '🏠' },
    { id: 'purchase', label: '仕入れ', icon: '📦' },
    { id: 'inventory', label: '在庫', icon: '📋' },
    { id: 'sales', label: '売上', icon: '💰' },
    { id: 'other', label: 'その他', icon: '⚙️' },
  ];

  // APIキー未設定時のバナー
  const showApiWarning = !data.settings?.apiKey && tab !== 'other';

  return (
    <AppContext.Provider value={{ data, setData, tab, setTab, editingItem, setEditingItem, dbStatus, dbError, currentUser, switchUser, userProfile, setUserProfile }}>
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
          <div style={{display:'flex',background:'white',borderBottom:'1px solid #eee',padding:'6px 12px',gap:8,alignItems:'center'}}>
            <span style={{fontSize:11,color:'#888',marginRight:4}}>ユーザー：</span>
            {['self','girlfriend'].map(u => {
              const profile = (fullData.userProfiles || getInitialData().userProfiles)[u];
              return (
                <button key={u} onClick={() => switchUser(u)}
                  style={{padding:'5px 14px',borderRadius:99,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,
                    background: currentUser===u ? 'var(--color-primary)' : '#f3f4f6',
                    color: currentUser===u ? 'white' : '#555',
                    transition:'all 0.2s'}}>
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
            {tabs.map(t => (
              <div key={t.id} className={`bottom-nav-item ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}>
                <div className="nav-icon">{t.icon}</div>
                <div className="nav-label">{t.label}</div>
              </div>
            ))}
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

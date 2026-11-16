#!/usr/bin/env python3
"""ヤフオク「今日終了・ストア出品のみ」から、過去の売上実績で利益1万円以上が見込める商品を探す（読み取り専用）。

使い方:
    python3 tools/yahoo_profit_finder.py
    python3 tools/yahoo_profit_finder.py --min-profit 8000 --limit-requests 80

やること:
  1. 売上アプリのクラウドを1回だけ読む（cloud_get。?full=1は使わない）
  2. 売上実績の大きかった商品から、毛皮の種類・ブランド名を自動で拾って検索語（最大30語）を作る
  3. ヤフオクをストア出品のみ(abatch=1)・終了が近い順で検索。今日(JST)終了分だけ見る
  4. 似た売上（ブランド＋品目＋毛皮の種類が一致、丈が近い）が2件以上あるものだけ売値を推定
     利益 = 推定売値(保守的:2〜3件は最小/4件以上は下位25%)x0.9 - 販売送料850 - 現在価格(税込) - 仕入れ送料(不明は850)
  5. 利益見込みが基準以上の上位は商品ページを開いて状態・ウォッチ数・ストア名を確認
  6. 結果を ~/Documents/nobushop_mail/yahoo_finder/result_YYMMDD.json に保存し、要約を表示

並び順: 初めてのストア(仕入れ履歴に無い)を優先、ウォッチ数が少ないほど上。いつものストアは後ろ。
入札・ログイン・ウォッチ・クラウド書き込みは一切しません。個人出品は除外します。
オプション: --min-profit N(既定10000)  --limit-requests N(既定100)  --detail-max N(既定25)
"""
import argparse, datetime, json, os, re, statistics, sys, time, unicodedata
import urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloud_get

UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
JST = datetime.timezone(datetime.timedelta(hours=9))
INTERVAL = 1.6
FEE = 0.10
SELL_SHIP = 850
DEFAULT_BUY_SHIP = 850
OUT_DIR = os.path.expanduser('~/Documents/nobushop_mail/yahoo_finder')


def nz(s):
    return unicodedata.normalize('NFKC', s or '').lower()


# ---------- 特徴抽出 ----------
# 毛皮: (キー, 検索語, 系統, 正規表現) 優先順
FURS = [
    ('デミバフ', 'デミバフ', 'mink', r'デミ\s*バフ|demi\s*buff'),
    ('パールミンク', 'パールミンク', 'mink', r'パール\s*ミンク|pearl\s*mink'),
    ('ブラックグラマ', 'ブラックグラマ', 'mink', r'ブラック\s*グラマ|black\s*glama'),
    ('シェアードミンク', 'シェアードミンク', 'mink', r'シェアード(?!\s*(?:ヌートリア|ビーバー|ラクーン|フォックス|ラビット|セーブル))|sheared\s*mink'),
    ('サガミンク', 'サガミンク', 'mink', r'(?=.*(?:ミンク|mink))(?=.*(?:サガ|saga))'),
    ('ヌートリア', 'ヌートリア', 'nutria', r'ヌートリア|nutria'),
    ('ビーバー', 'ビーバー', 'beaver', r'ビーバー|beaver'),
    ('ミンク', 'ミンク', 'mink', r'ミンク|mink'),
    ('サガフォックス', 'サガフォックス', 'fox', r'(?=.*(?:フォックス|fox))(?=.*(?:サガ|saga))'),
    ('フォックス', 'フォックス', 'fox', r'フォックス|\bfox\b'),
    ('チンチラ', 'チンチラ', 'chinchilla', r'チンチラ|chinchilla'),
    ('セーブル', 'セーブル', 'sable', r'セーブル|sable'),
    ('ウィーゼル', 'ウィーゼル', 'weasel', r'ウィーゼル|ウェーゼル|weasel'),
    ('レッキス', 'レッキスラビット', 'rex', r'レッキス|rex\s*rabbit'),
    ('ムートン', 'ムートン', 'mouton', r'ムートン|mouton'),
    ('ラクーン', 'ラクーン', 'raccoon', r'ラクーン|raccoon'),
    ('カラクール', 'カラクール', 'karakul', r'カラクール|karakul'),
]
# ブランド: (キー, 検索語, 正規表現)
BRANDS = [
    ('ルイヴィトン', 'ルイヴィトン', r'ルイ\s*[・･]?\s*ヴィトン|louis\s*vuitton|ヴィトン'),
    ('オールドグッチ', 'オールドグッチ', r'オールド\s*グッチ|old\s*gucci'),
    ('グッチ', 'グッチ', r'グッチ|gucci'),
    ('プラダスポーツ', 'プラダスポーツ', r'プラダ\s*スポーツ|prada\s*sport|linea\s*rossa'),
    ('プラダ', 'プラダ', r'プラダ|prada'),
    ('ミュウミュウ', 'ミュウミュウ', r'ミュウミュウ|miu\s*miu'),
    ('バーバリーブルーレーベル', 'バーバリーブルーレーベル', r'(?:バーバリー|burberry).{0,6}(?:ブルーレーベル|blue\s*label)|ブルーレーベル'),
    ('バーバリーブラックレーベル', 'バーバリーブラックレーベル', r'ブラックレーベル|black\s*label'),
    ('バーバリーロンドン', 'バーバリーロンドン', r'(?:バーバリー|burberry)\s*(?:ロンドン|london)'),
    ('バーバリーズ', 'バーバリーズ', r'バーバリーズ|burberrys'),
    ('バーバリー', 'バーバリー', r'バーバリー|burberry'),
    ('シャネル', 'シャネル', r'シャネル|chanel'),
    ('セリーヌ', 'セリーヌ', r'セリーヌ|celine|céline'),
    ('カルティエ', 'カルティエ', r'カルティエ|cartier'),
    ('エルメス', 'エルメス', r'エルメス|hermes'),
    ('ディオール', 'ディオール', r'ディオール|\bdior\b'),
    ('sacai', 'sacai', r'sacai|サカイ'),
    ('フェンディ', 'フェンディ', r'フェンディ|fendi'),
    ('シーバイクロエ', 'シーバイクロエ', r'シー\s*バイ\s*クロエ|see\s*by\s*chlo'),
    ('クロエ', 'クロエ', r'クロエ|chloe'),
    ('ヴィヴィアンレッドレーベル', 'ヴィヴィアンレッドレーベル', r'レッドレーベル|red\s*label'),
    ('ヴィヴィアンウエストウッド', 'ヴィヴィアンウエストウッド', r'ヴィヴィアン|vivienne'),
    ('サンローラン', 'サンローラン', r'サンローラン|saint\s*laurent|\bysl\b|イヴ\s*サン'),
    ('MCM', 'MCM', r'\bmcm\b|エムシーエム'),
    ('コーチ', 'コーチ', r'コーチ|\bcoach\b'),
    ('ボッテガヴェネタ', 'ボッテガヴェネタ', r'ボッテガ|bottega'),
    ('ロエベ', 'ロエベ', r'ロエベ|loewe'),
    ('バルマン', 'バルマン', r'バルマン|balmain'),
    ('モンクレール', 'モンクレール', r'モンクレール|moncler'),
    ('マイケルコース', 'マイケルコース', r'マイケル\s*コース|michael\s*kors'),
    ('ブルガリ', 'ブルガリ', r'ブルガリ|bvlgari|bulgari'),
    ('ジバンシィ', 'ジバンシィ', r'ジバンシ|givenchy'),
    ('ヴァレンティノ', 'ヴァレンティノ', r'ヴァレンティノ|valentino'),
    ('フェラガモ', 'フェラガモ', r'フェラガモ|ferragamo'),
    ('ポールスミス', 'ポールスミス', r'ポール\s*スミス|paul\s*smith'),
    ('ケイトスペード', 'ケイトスペード', r'ケイト\s*スペード|kate\s*spade'),
    ('ダイアン', 'ダイアン', r'ダイアン\s*フォン|diane\s*von'),
]
# 品目: (キー, 正規表現)  ダウンは別扱い
TYPES = [
    ('ダウン', r'ダウン'),
    ('ポンチョ', r'ポンチョ|ケープ'),
    ('ベスト', r'ベスト|vest'),
    ('コート', r'コート|coat'),
    ('ジャケット', r'ジャケット|ブルゾン|ジャンパー|ライダース|jacket'),
    ('ストール', r'ストール|マフラー|ショール|襟巻|ティペット'),
    ('ショルダー', r'ショルダー|shoulder|斜め掛け|クロスボディ'),
    ('トート', r'トート|tote'),
    ('ハンド', r'ハンドバッグ|ハンドバック|ミニバッグ|handbag'),
    ('ボストン', r'ボストン|ダッフル|boston'),
    ('リュック', r'リュック|バックパック|backpack'),
    ('クラッチ', r'クラッチ|セカンドバッグ'),
    ('ポーチ', r'ポーチ|pouch'),
    ('財布', r'財布|ウォレット|コインケース|カードケース|wallet'),
    ('シューズ', r'パンプス|スニーカー|ブーツ|サンダル|ローファー|シューズ|靴|ミュール|ローカット|ハイカット'),
    ('ワンピース', r'ワンピ'),
    ('ニット', r'ニット|セーター'),
]
CLOTH_TYPES = {'コート', 'ジャケット', 'ベスト', 'ポンチョ', 'ダウン', 'ニット', 'ワンピース'}
BAG_TYPES = {'ショルダー', 'トート', 'ハンド', 'ボストン', 'リュック', 'クラッチ', 'ポーチ', 'バッグ'}
BAD_TITLE = re.compile(
    r'ジャンク|訳あり|難あり|ワケあり|(?<!や)傷や汚れあり|状態が悪い|専用|まとめ|福袋|材料用|ハギレ|リメイク|'
    r'パーツ|ボタン|ファスナー|ストラップ|単品|ケースのみ|箱のみ|保存袋|ハンガー|ショッパー|紙袋|カタログ|空箱|'
    r'ダメージ|破れ|穴あき|カビ|臭い|においあり|シミあり|欠品')
BAD_DESC = re.compile(r'ジャンク|訳あり|難あり|ワケあり|状態が悪い|カビ臭|ひどい')
BAD_COND = re.compile(r'ジャンク|(?<!や)や?傷や汚れあり|状態が悪い')


def features(text):
    t = nz(text)
    f = {'brands': set(), 'fur': None, 'furfam': None, 'types': set(), 'len': None, 'go': None}
    for key, _w, fam, rx in FURS:
        if re.search(rx, t, re.S):
            f['fur'], f['furfam'] = key, fam
            break
    for key, _w, rx in BRANDS:
        if re.search(rx, t):
            f['brands'].add(key)
    # バーバリーの下位ブランドは、親ブランドと分けて扱う
    for sub, par in (('バーバリーロンドン', 'バーバリー'), ('バーバリーズ', 'バーバリー'), ('オールドグッチ', 'グッチ'),
                     ('プラダスポーツ', 'プラダ'), ('ヴィヴィアンレッドレーベル', 'ヴィヴィアンウエストウッド')):
        if sub in f['brands']:
            f['brands'].discard(par)
    if 'バーバリーズ' in f['brands']:
        f['brands'].discard('バーバリーロンドン')
    if 'シーバイクロエ' in f['brands']:
        f['brands'].discard('クロエ')
    if f['brands'] & {'バーバリーブルーレーベル', 'バーバリーブラックレーベル'}:
        f['brands'].discard('バーバリー')
    for key, rx in TYPES:
        if re.search(rx, t):
            f['types'].add(key)
            if key == 'ダウン':
                break
    if 'ダウン' in f['types']:
        f['types'] = {'ダウン'}
    if not f['types'] and re.search(r'バッグ|バック|\bbag\b|鞄|カバン', t):
        f['types'].add('バッグ')
    f['fabric'] = bool(re.search(r'ウール|カシミ|ナイロン|コットン|ツイード|ポリエステル|デニム|アンゴラ|ニット|キルティング', t))
    f['mat'] = '革' if re.search(r'レザー|革|leather|パテント|エナメル', t) else ('布' if re.search(r'キャンバス|ナイロン|pvc|帆布|コーデュロイ|ツイード|ウール|コットン', t) else None)
    m = (re.search(r'(?:総丈|着丈|全長|丈)\s*[:：]?\s*(?:約)?(\d{2,3})(?!\d)', t)
         or re.search(r'(\d{2,3})\s*(?:cm|センチ)\s*丈', t)
         or re.search(r'(\d{2,3})\s*cm丈', t))
    if m and 30 <= int(m.group(1)) <= 160:
        f['len'] = int(m.group(1))
    m = re.search(r'(?<!\d)(\d{1,2})\s*号', t)
    if m:
        f['go'] = int(m.group(1))
    return f


def types_compatible(a, b):
    if not a or not b:
        return False
    if a & b:
        return True
    return ('バッグ' in a and bool(b & BAG_TYPES)) or ('バッグ' in b and bool(a & BAG_TYPES))


# ---------- 売上実績 ----------
def build_sales(d):
    out = []
    inv = {i.get('id'): i for i in d.get('inventory', [])}
    for s in d.get('sales', []):
        price = s.get('salePrice')
        if not isinstance(price, (int, float)) or price <= 0:
            continue
        parts = []
        for k in ('mailTitle', 'productName'):
            v = s.get(k)
            if v and v not in parts:
                parts.append(v)
        iv = inv.get(s.get('inventoryId'))
        if iv and iv.get('productName') and iv['productName'] not in parts:
            parts.append(iv['productName'])
        title = ' '.join(parts)
        if not title or re.search(r'専用|様|欠品|ジャンク|訳あり', title):
            continue
        f = features(title + ' ' + (s.get('brand') or ''))
        out.append({'title': parts[0] if parts else title, 'text': title, 'price': int(price),
                    'profit': s.get('profit') if isinstance(s.get('profit'), (int, float)) else 0,
                    'date': s.get('saleDate') or '', 'platform': s.get('platform') or '', 'f': f})
    return out


def make_keywords(sales, maxn=30):
    score = {}
    for s in sales:
        if not (s['price'] >= 15000 or s['profit'] >= 8000):
            continue
        f = s['f']
        w = max(s['profit'], 1000)
        if f['fur']:
            word = next(x[1] for x in FURS if x[0] == f['fur'])
            score[word] = score.get(word, 0) + w
        for b in f['brands']:
            word = next(x[1] for x in BRANDS if x[0] == b)
            score[word] = score.get(word, 0) + w
    return [k for k, _ in sorted(score.items(), key=lambda kv: -kv[1])][:maxn], score


def estimate(sales, cf):
    """似た売上を探して推定売値を返す。2件未満なら None"""
    if not types_compatible(cf['types'], cf['types']) or not cf['types']:
        return None
    if not cf['brands'] and not cf['fur']:
        return None
    cands = []
    for s in sales:
        sf = s['f']
        if cf['brands']:
            if not (cf['brands'] & sf['brands']):
                continue
        elif sf['brands']:
            continue
        if (cf['furfam'] or None) != (sf['furfam'] or None):
            continue
        if cf['furfam'] and cf['fabric'] != sf['fabric']:
            continue
        if not types_compatible(cf['types'], sf['types']):
            continue
        if cf['mat'] and sf['mat'] and cf['mat'] != sf['mat'] and not cf['furfam']:
            continue
        if cf['len'] and sf['len'] and abs(cf['len'] - sf['len']) > 10:
            continue
        if cf['go'] and sf['go'] and abs(cf['go'] - sf['go']) > 2:
            continue
        tier = 1 if (cf['fur'] == sf['fur']) else 2
        cands.append((tier, s))
    cloth = bool(cf['types'] & CLOTH_TYPES) and not cf['furfam']
    need = 3 if cloth else 2
    t1 = [s for t, s in cands if t == 1]
    if len(t1) >= need:
        use, tier = t1, 1
    elif len(cands) >= need and cf['fur']:
        use, tier = [s for _, s in cands], 2
    else:
        return None
    ps = [s['price'] for s in use]
    if max(ps) > 2.0 * min(ps):
        return None  # 売値のばらつきが大きすぎて推定できない
    ps.sort()
    med = ps[0] if len(ps) <= 3 else ps[int((len(ps) - 1) * 0.25)]  # 保守的: 2〜3件は最小、4件以上は下位25%点
    use_sorted = sorted(use, key=lambda s: s['date'], reverse=True)
    return {'est': med, 'n': len(use), 'tier': tier, 'refs': use_sorted[:3]}


# ---------- ストア名 ----------
STORE_NOISE = re.compile(r'ヤフーショップ|ヤフーshop|ヤフオク!?ショップ|ヤフオク!?店|ヤフー店|オークションストア|ヤフオク|yahoo|ショップ|shop|ストア|store|店|[!！\s　・･\-－ー]')


def norm_store(s):
    t = nz(s)
    t = STORE_NOISE.sub('', t)
    return t


def known_stores(d):
    ks = set()
    for i in d.get('inventory', []):
        n = norm_store(i.get('purchaseStore'))
        if len(n) >= 3:
            ks.add(n)
    return ks


def is_usual(name, ks):
    n = norm_store(name)
    if len(n) < 3:
        return False
    for k in ks:
        if n == k or k in n or (len(n) >= 4 and n in k):
            return True
    return False


# ---------- 通信 ----------
class Net:
    def __init__(self, limit):
        self.limit, self.count, self.last = limit, 0, 0.0
        self.stop_reason = None

    def left(self):
        return self.limit - self.count

    def get(self, url):
        if self.count >= self.limit or self.stop_reason:
            return None
        wait = INTERVAL - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        self.last = time.time()
        self.count += 1
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'ja'})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code in (403, 429, 503):
                self.stop_reason = f'ヤフオクが {e.code} を返したため中断'
            return None
        except Exception:
            return None


def next_data(html):
    if not html:
        return None
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except ValueError:
        return None


def search(net, kw, page, n=100):
    q = urllib.parse.urlencode({'p': kw, 'abatch': 1, 's1': 'end', 'o1': 'a', 'n': n, 'b': 1 + n * page})
    d = next_data(net.get('https://auctions.yahoo.co.jp/search/search?' + q))
    try:
        return d['props']['pageProps']['initialState']['search']['items']['listing']['items']
    except (TypeError, KeyError):
        return None


def detail(net, aid):
    d = next_data(net.get('https://auctions.yahoo.co.jp/jp/auction/' + aid))
    try:
        return d['props']['pageProps']['initialState']['item']['detail']['item']
    except (TypeError, KeyError):
        return None


def strip_html(h):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h or ''))


def short(t, n=34):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t if len(t) <= n else t[:n - 1] + '…'


def fmt_time(iso):
    return iso[11:16] if iso else '?'


# ---------- 本体 ----------
def main():
    ap = argparse.ArgumentParser(description='ヤフオク 今日終了ストア出品の利益見込み探索（読み取り専用）')
    ap.add_argument('--min-profit', type=int, default=10000)
    ap.add_argument('--limit-requests', type=int, default=100)
    ap.add_argument('--detail-max', type=int, default=25)
    a = ap.parse_args()
    t0 = time.time()
    now = datetime.datetime.now(JST)
    today = now.strftime('%Y-%m-%d')
    limit = min(a.limit_requests, 100)

    cd = cloud_get.get_cloud(max_age=600)
    sales = build_sales(cd)
    ks = known_stores(cd)
    kws, kwscore = make_keywords(sales)
    net = Net(limit)
    detail_reserve = min(a.detail_max, max(limit // 4, 0))
    search_budget = limit - detail_reserve

    cands = {}
    stats = {'items_seen': 0, 'non_store': 0, 'not_today': 0, 'bad': 0}
    for kw in kws:
        for page in range(3):
            if net.count >= search_budget or net.stop_reason:
                break
            items = search(net, kw, page)
            if not items:
                break
            reached_tomorrow = False
            for it in items:
                stats['items_seen'] += 1
                end = it.get('endTime') or ''
                if end[:10] != today:
                    stats['not_today'] += 1
                    if end[:10] > today:
                        reached_tomorrow = True
                    continue
                sel = it.get('seller') or {}
                if not sel.get('isStore') or it.get('isFleamarketItem'):
                    stats['non_store'] += 1
                    continue
                aid = it.get('auctionId')
                if aid in cands:
                    cands[aid]['kw'].append(kw)
                    continue
                cands[aid] = {'it': it, 'kw': [kw]}
            if reached_tomorrow or len(items) < 100:
                break
        if net.count >= search_budget or net.stop_reason:
            break

    results = []
    for aid, c in cands.items():
        it = c['it']
        title = it.get('title') or ''
        if BAD_TITLE.search(nz(title)) or it.get('itemCondition') in ('USED60', 'USED80'):
            stats['bad'] += 1
            continue
        cf = features(title)
        if it.get('isFixedPrice') is False and it.get('leftTime') is not None and it['leftTime'] <= 0:
            continue
        est = estimate(sales, cf)
        if not est:
            continue
        fee = it.get('currentPriceShippingFee')
        ship_known = isinstance(fee, (int, float))
        buy_ship = int(fee) if ship_known else DEFAULT_BUY_SHIP
        price = int(it.get('price') or 0)
        profit = int(est['est'] * (1 - FEE) - SELL_SHIP - price - buy_ship)
        results.append({'aid': aid, 'it': it, 'cf': cf, 'est': est, 'price': price, 'buy_ship': buy_ship,
                        'ship_known': ship_known, 'profit': profit})
    results = [r for r in results if r['profit'] >= a.min_profit]
    results.sort(key=lambda r: -r['profit'])
    n_pre = len(results)

    # 商品ページで確認
    final, unchecked, dropped = [], [], []
    for idx, r in enumerate(results):
        it = r['it']
        r['watch'] = it.get('watchCount') if isinstance(it.get('watchCount'), int) else None
        r['store'] = None
        r['usual'] = None
        if idx >= a.detail_max or net.left() <= 0 or net.stop_reason:
            unchecked.append(r)
            continue
        dt = detail(net, r['aid'])
        if not dt:
            unchecked.append(r)
            continue
        sel = dt.get('seller') or {}
        if not sel.get('isStore'):
            dropped.append((r, '個人出品'))
            continue
        r['store'] = sel.get('displayName')
        r['usual'] = is_usual(r['store'], ks)
        cond = dt.get('conditionName') or ''
        desc = strip_html(dt.get('descriptionHtml') or '')
        if BAD_COND.search(cond) or BAD_DESC.search(desc):
            dropped.append((r, '状態: ' + (cond or '説明に難あり表記')))
            continue
        if isinstance(dt.get('watchListNum'), int):
            r['watch'] = dt['watchListNum']
        r['cond'] = cond
        r['bids'] = dt.get('bids', it.get('bidCount'))
        r['end'] = dt.get('endTime') or it.get('endTime')
        # 着丈が説明にあれば、照合し直す
        m = re.search(r'着丈\s*[:：]\s*(\d{2,3})', nz(desc))
        if m and not r['cf']['len']:
            cf2 = dict(r['cf'])
            cf2['len'] = int(m.group(1))
            est2 = estimate(sales, cf2)
            if not est2:
                dropped.append((r, f'着丈{cf2["len"]}cmで照合すると似た売上が2件未満'))
                continue
            r['est'] = est2
            r['profit'] = int(est2['est'] * (1 - FEE) - SELL_SHIP - r['price'] - r['buy_ship'])
            if r['profit'] < a.min_profit:
                dropped.append((r, f'着丈{cf2["len"]}cmで再計算すると利益{r["profit"]}円'))
                continue
        final.append(r)

    for r in final + unchecked:
        r.setdefault('bids', r['it'].get('bidCount'))
        r.setdefault('end', r['it'].get('endTime'))
        r.setdefault('cond', '')

    def prio(r):
        w = r['watch'] if r['watch'] is not None else 3
        return (1 if r['usual'] else 0, -(r['profit'] - 800 * w))
    final.sort(key=prio)

    def rec(r):
        it = r['it']
        return {
            'auctionId': r['aid'], 'url': 'https://page.auctions.yahoo.co.jp/jp/auction/' + r['aid'],
            'title': it.get('title'), 'store': r['store'], 'usualStore': r['usual'],
            'price': r['price'], 'bids': r.get('bids', it.get('bidCount')), 'watch': r['watch'],
            'fixedPrice': bool(it.get('isFixedPrice')), 'endTime': r.get('end', it.get('endTime')), 'condition': r.get('cond', ''),
            'buyShipping': r['buy_ship'], 'buyShippingKnown': r['ship_known'],
            'estimatedSale': r['est']['est'], 'similarCount': r['est']['n'], 'matchTier': r['est']['tier'],
            'profit': r['profit'], 'maxBidForMinProfit': r['price'] + r['profit'] - a.min_profit,
            'basis': [{'title': short(s['title'], 50), 'price': s['price'], 'date': s['date'], 'platform': s['platform']}
                      for s in r['est']['refs']],
        }

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, 'result_' + now.strftime('%y%m%d') + '.json')
    elapsed = time.time() - t0
    out = {
        'generatedAt': now.isoformat(), 'minProfit': a.min_profit, 'keywords': kws,
        'requests': net.count, 'seconds': round(elapsed, 1), 'stopReason': net.stop_reason,
        'stats': dict(stats, candidates=len(cands), profit_ok_before_check=n_pre),
        'results': [rec(r) for r in final],
        'unchecked_results': [rec(r) for r in unchecked],
        'dropped_after_check': [dict(rec(r), reason=why) for r, why in dropped],
    }
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)

    # 要約
    L = [f'ヤフオク今日終了(ストア)・利益{a.min_profit:,}円以上 {now.strftime("%m/%d %H:%M")}']
    if net.stop_reason:
        L.append('注意: ' + net.stop_reason)
    if not final and not unchecked:
        L.append('今日は利益1万円以上の見込みはありませんでした' if a.min_profit == 10000
                 else f'今日は利益{a.min_profit:,}円以上の見込みはありませんでした')
    for i, r in enumerate(final, 1):
        it = r['it']
        mark = 'いつものストア' if r['usual'] else '初めてのストア'
        wt = f'ウォッチ{r["watch"]}件' if r['watch'] is not None else 'ウォッチ不明'
        kind = '定額' if it.get('isFixedPrice') else f'入札{r["bids"]}'
        refs = '・'.join(f'{s["price"]:,}' for s in r['est']['refs'])
        L.append('')
        L.append(f'{i}. [{mark}] {short(it.get("title"))}')
        L.append(f'  {r["store"] or ""} / {wt}')
        L.append(f'  現在{r["price"]:,}円({kind}) 終了{fmt_time(r["end"])}')
        sh = '' if r['ship_known'] else '(送料850円仮)'
        L.append(f'  利益見込み+{r["profit"]:,}円{sh} 上限入札{r["price"] + r["profit"] - a.min_profit:,}円まで')
        tier = '' if r['est']['tier'] == 1 else '(毛皮ゆるめ照合)'
        L.append(f'  根拠 似た売上{r["est"]["n"]}件 推定売値{r["est"]["est"]:,}円(保守){tier} 直近:{refs}')
        L.append('  https://page.auctions.yahoo.co.jp/jp/auction/' + r['aid'])
    if unchecked:
        L.append('')
        L.append(f'商品ページ未確認の候補が{len(unchecked)}件あります(JSONのunchecked_results)')
    L.append('')
    L.append(f'検索{len(kws)}語 / 今日終了{len(cands)}件 / 通信{net.count}回 / {elapsed:.0f}秒')
    L.append('保存: ' + path)
    print('\n'.join(L))


if __name__ == '__main__':
    main()

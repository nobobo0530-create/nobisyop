#!/usr/bin/env python3
"""出品中の一覧を突き合わせて「売れたのに出品中」「仕入れが無い出品」を洗い出す（読み取り専用）。
メルカリ/ラクマ/ヤフオクには一切書き込まない。クラウドDB(Supabase)にも書き込まない（get_cloud 1回だけ）。

使い方:
  python3 tools/listings_audit.py              # ラクマ・ヤフオクを取得してから照合
  python3 tools/listings_audit.py --no-yahoo   # ヤフオクはキャッシュ(yahoo_items.json)をそのまま使う
  python3 tools/listings_audit.py --no-fetch   # 何も取りに行かず手元のスナップショットだけで照合
出力: ~/Documents/nobushop_mail/listings/audit_<YYMMDD>.json と、日本語の要約（標準出力）

■ データの取り方
  ラクマ : tools/rakuma_snapshot.py を先に実行（このスクリプトが自動で呼ぶ。--no-fetch なら呼ばない）。
           ~/Documents/nobushop_mail/rakuma_snap/items.json の missing / soldSeen でない物が「出品中」。
  ヤフオク: 出品者ページ(seller/DqF1YQ...)をページ送りで取得し、各商品ページの説明文から管理番号を読む。
           yahoo_items.json に保存し、2回目以降は新しい出品だけ取りに行く。
  メルカリ: ログインなしでも見えるが JS 描画のため、スクリプト単体では取れない（無人実行不可）。
           組み込みブラウザ(mcp__Claude_Browser__*)で下の手順を行い、
           ~/Documents/nobushop_mail/listings/mercari_items.json を作り直す。
           形式: {"scannedAt":"2026-11-12 12:30","items":{"m123...":{"title":"..","price":19800,"mgmt":"261029-1111-36-90","tail":""}}}
           mgmt は説明文の「管理番号：」の後ろ（無ければ null、tail に説明文の末尾90文字）。
  [メルカリ更新の手順（ブラウザ）]
   1. 出品中の件数は https://jp.mercari.com/user/profile/349187028?status=on_sale で分かる（「販売中のみ表示」）。
      検索結果は1条件につき最大120件しか出ないので、価格帯で割って 1帯 ≦120件にする:
      https://jp.mercari.com/search?seller_id=349187028&status=on_sale&price_min=A&price_max=B
      （帯の合計がプロフィールの件数と一致することを確認）
   2. 各帯のページを開き、本物のマウスホイールで1回スクロール（computer の scroll）→ すぐ
      document.body.style.zoom='0.12' にして3秒待つ（一覧は画面内の物しか描画されないので、
      縮小して全件を画面内に入れる）。[data-testid="item-cell"] の a[href^="/item/"] から id、
      innerText から価格(¥…)とタイトルを sessionStorage に貯める。
   3. 各商品の説明文は /item/<id> を非表示 iframe に読み込んで
      contentDocument.querySelector('[data-testid="description"]').textContent を取る
      （同一オリジンなので可。3並列・1件ごとに1秒空ける程度に。メルカリ側の負荷に注意）。
      説明文から /管理番号\\s*[：:]?\\s*([0-9A-Za-z\\-]+)/ の最後の一致を mgmt にする。
   4. 結果を mercari_items.json に保存。既に mgmt のある id は次回から取り直さなくてよい（出品中の id 一覧だけ更新）。
   ※ ブラウザ操作は無人では動かない。Claude に「メルカリの出品中一覧を更新して」と頼むこと。

■ 判定
  管理番号 "261030-1104-107-50" = 仕入れ日 26/10/30・出品日 11/04・仕入れ価格 ¥10,750（107*100+50）。
  在庫の purchaseDate+purchasePrice と一致すれば同じ現物。日付だけ（"260905"）の場合は日付だけで照合。
  (A) 売れたのに出品中: 出品中の管理番号(日付+価格)が
        ・在庫の status='sold' の現物 / 直近60日の売上(d['sales'], どのプラットフォームでも) と一致、
        ・または売上のタイトルとほぼ同一（NFKC正規化・記号絵文字除去・類似度）で、管理番号が矛盾しない
      台数を数えて判定: 同じ管理番号の現物が N 台・売れた台数が S 台なら、そのプラットフォームで
      出品中の件数が (N-S) を超えた分だけを「重複出品」として挙げる（同じ物を別の台で売る場合の誤検知を避ける）。
  (B) 仕入れが無い出品: 日付+価格が完全な管理番号なのに在庫に該当が無い／日付だけで在庫にその仕入れ日が無い。
      価格だけ違う（同じ日の在庫はある）は B2 に分けて弱い扱いにする。管理番号が無い・読めない出品は「判定不能」に数だけ出す。
"""
import argparse, difflib, html, json, os, re, subprocess, sys, time, unicodedata, urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cloud_get  # noqa: E402
import photo_match as pmatch  # noqa: E402

BASE = os.path.expanduser('~/Documents/nobushop_mail')
LDIR = os.path.join(BASE, 'listings')
MERCARI_JSON = os.path.join(LDIR, 'mercari_items.json')
YAHOO_JSON = os.path.join(LDIR, 'yahoo_items.json')
RAKUMA_JSON = os.path.join(BASE, 'rakuma_snap', 'items.json')
YAHOO_SELLER = 'https://auctions.yahoo.co.jp/seller/DqF1YQ5WsN4qqGJmm6UU9Xsc74Ydh'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
      '(KHTML, like Gecko) Version/17.4 Safari/605.1.15')
SALE_WINDOW_DAYS = 60
TITLE_SIM = 0.90          # 売上タイトルとの類似度（管理番号が一致しない場合の最低ライン）
MGMT_RE = re.compile(r'管理番号\s*[：:】]*\s*[Dd]?([0-9][0-9A-Za-z\-]*)')


# ---------- 共通部品 ----------
def http(url, retries=3, sleep=1.0):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read().decode('utf-8', 'replace')
            time.sleep(sleep)
            return data
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3 * (i + 1))
    raise last


def norm_title(s):
    """NFKC→小文字→文字と数字だけ残す（空白・記号・絵文字・◎✨【】などを除去）"""
    s = unicodedata.normalize('NFKC', s or '').lower()
    return ''.join(ch for ch in s if unicodedata.category(ch)[0] in 'LN')


def title_sim(a, b):
    a, b = norm_title(a), norm_title(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    short, long_ = (a, b) if len(a) <= len(b) else (b, a)
    if len(short) >= 15 and long_.startswith(short):   # 片方が途中で切れているだけ
        return 0.97
    return difflib.SequenceMatcher(None, a, b).ratio()


def parse_mgmt(s):
    """管理番号の文字列 → {'raw','pdate'(YYMMDD),'price'(円 or None),'kind'} / 読めなければ None
    kind: full(日付+価格) / date(日付のみ) / odd(読めない形)"""
    if not s:
        return None
    raw = s.strip().strip('-')
    t = raw.split('-')
    if not re.fullmatch(r'\d{6}', t[0]):
        return {'raw': raw, 'pdate': None, 'price': None, 'kind': 'odd'}
    try:
        datetime.strptime('20' + t[0], '%Y%m%d')
    except ValueError:
        return {'raw': raw, 'pdate': None, 'price': None, 'kind': 'odd'}
    pd_ = t[0]
    rest = t[1:]
    # 先頭が出品日(4桁)なら捨てる。出品日が無い形(YYMMDD-価格-下2桁)もある
    if rest and re.fullmatch(r'\d{4}', rest[0]) and len(rest) >= 3 and re.fullmatch(r'\d{1,4}', rest[1]):
        price_t = rest[1:3]
    elif len(rest) == 2 and re.fullmatch(r'\d{1,3}', rest[0]) and re.fullmatch(r'\d{2}', rest[1]):
        price_t = rest
    elif not rest or (len(rest) == 1 and re.fullmatch(r'\d{4}', rest[0])):
        return {'raw': raw, 'pdate': pd_, 'price': None, 'kind': 'date'}
    else:
        return {'raw': raw, 'pdate': pd_, 'price': None, 'kind': 'odd'}
    if len(price_t) == 2 and re.fullmatch(r'\d{2}', price_t[1]):
        return {'raw': raw, 'pdate': pd_, 'price': int(price_t[0]) * 100 + int(price_t[1]), 'kind': 'full'}
    return {'raw': raw, 'pdate': pd_, 'price': None, 'kind': 'odd'}


def extract_mgmt(text):
    m = MGMT_RE.findall(text or '')
    return m[-1] if m else None


def inv_key(it):
    pd_ = (it.get('purchaseDate') or '').replace('-', '')[2:]
    return pd_, it.get('purchasePrice')


# ---------- 出品の読み込み ----------
def load_mercari():
    try:
        with open(MERCARI_JSON) as f:
            j = json.load(f)
    except (OSError, ValueError):
        print('メルカリの一覧(mercari_items.json)がありません。README の手順でブラウザから作ってください', file=sys.stderr)
        return [], None
    out = []
    for iid, v in j.get('items', {}).items():
        out.append({'platform': 'メルカリ', 'id': iid, 'url': 'https://jp.mercari.com/item/' + iid,
                    'title': v.get('title') or '', 'price': v.get('price'), 'mgmt': v.get('mgmt'),
                    'tail': v.get('tail', '')})
    return out, j.get('scannedAt')


def load_rakuma(fetch):
    if fetch:
        print('ラクマ巡回中…', file=sys.stderr)
        subprocess.run([sys.executable, os.path.join(HERE, 'rakuma_snapshot.py')], check=False,
                       stdout=sys.stderr, stderr=sys.stderr)
    with open(RAKUMA_JSON) as f:
        d = json.load(f)
    out = []
    for h, v in d.items():
        if v.get('missing') or v.get('soldSeen'):
            continue
        out.append({'platform': 'ラクマ', 'id': h, 'url': v.get('url') or 'https://item.fril.jp/' + h,
                    'title': v.get('title') or '', 'price': v.get('price'),
                    'mgmt': extract_mgmt(v.get('description') or '') or v.get('mgmtNo') or None,
                    'tail': ''})
    return out


def next_data(page):
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page, re.S)
    return json.loads(m.group(1)) if m else None


def load_yahoo(fetch):
    try:
        with open(YAHOO_JSON) as f:
            cache = json.load(f)
    except (OSError, ValueError):
        cache = {'items': {}}
    items = cache.setdefault('items', {})
    if fetch:
        print('ヤフオク取得中…', file=sys.stderr)
        listing = {}
        b = 1
        while True:
            url = YAHOO_SELLER + ('?fixed=0&b=%d&n=50&select=23&mode=3' % b if b > 1 else '')
            nd = next_data(http(url))
            lst = nd['props']['pageProps']['initialState']['search']['items']['listing']
            for it in lst['items']:
                listing[it['auctionId']] = {'title': it['title'], 'price': it.get('buyNowPrice') or it.get('price')}
            if len(lst['items']) < 50 or b + 50 > lst.get('totalResultsAvailable', 0):
                break
            b += 50
        for aid, v in listing.items():
            if aid in items and items[aid].get('mgmt_checked'):
                items[aid].update(v)
                continue
            try:
                nd = next_data(http('https://page.auctions.yahoo.co.jp/jp/auction/' + aid))
                desc = nd['props']['pageProps']['initialState']['item']['detail']['item'].get('descriptionHtml', '')
                text = html.unescape(re.sub(r'<[^>]+>', '\n', desc))
                v['mgmt'] = extract_mgmt(text)
                v['tail'] = re.sub(r'\s+', ' ', text)[-90:]
                v['mgmt_checked'] = True
            except Exception as e:  # noqa: BLE001
                print('  ヤフオク取得失敗', aid, e, file=sys.stderr)
                v['mgmt'] = None
            items[aid] = {**items.get(aid, {}), **v}
        cache['items'] = {k: v for k, v in items.items() if k in listing}
        cache['scannedAt'] = datetime.now().strftime('%Y-%m-%d %H:%M')
        os.makedirs(LDIR, exist_ok=True)
        with open(YAHOO_JSON, 'w') as f:
            json.dump(cache, f, ensure_ascii=False, indent=1)
        items = cache['items']
    out = []
    for aid, v in items.items():
        out.append({'platform': 'ヤフオク', 'id': aid, 'url': 'https://page.auctions.yahoo.co.jp/jp/auction/' + aid,
                    'title': v.get('title') or '', 'price': v.get('price'), 'mgmt': v.get('mgmt'),
                    'tail': v.get('tail', '')})
    return out


# ---------- 写真照合 ----------
def photo_section(listings, recent_sales, A):
    """出品中 × 直近売上 を写真(知覚ハッシュ)で照合。既に (A) に出た出品は除く。
    売上側の写真: メルカリ=商品ID、ヤフオク=オークションID(ページ og:image)、ラクマ=スナップショットのタイトル近似。取れなければ飛ばす"""
    done = {(a['platform'], a['id']) for a in A}
    sale_ph = []
    for s in recent_sales:
        pf = s.get('platform')
        ph = pmatch.sale_photos(pf, s.get('platformId') or '', s.get('mailTitle') or s.get('productName') or '', 2)
        hs = [h for h in (pmatch.hashes(*(u if isinstance(u, tuple) else (u, None))) for u in ph) if h]
        if hs:
            sale_ph.append((s, hs))
    pmatch.save()
    print('写真照合: 売上%d件中 写真あり%d件' % (len(recent_sales), len(sale_ph)), file=sys.stderr)
    out = []
    for L in listings:
        if (L['platform'], L['id']) in done:
            continue
        lp = pmatch.listing_photos(L['platform'], L['id'], 1)
        lh = [h for h in (pmatch.hashes(*(u if isinstance(u, tuple) else (u, None))) for u in lp) if h]
        if not lh:
            continue
        best = None
        for s, hs in sale_ph:
            if s.get('platform') == L['platform'] and s.get('platformId') == L['id']:
                continue
            sc = max(pmatch.pair_score(a, b) for a in hs for b in lh)
            if sc >= pmatch.THRESHOLD and (best is None or sc > best[0]):
                best = (sc, s)
        if best:
            out.append({'platform': L['platform'], 'title': L['title'], 'url': L['url'], 'id': L['id'], 'price': L['price'],
                        'mgmt': (L.get('pm') or {}).get('raw'), 'score': round(best[0], 3),
                        'sale': {'platform': best[1].get('platform'), 'saleDate': best[1].get('saleDate'), 'saleId': best[1].get('id'),
                                 'platformId': best[1].get('platformId'), 'title': best[1].get('mailTitle') or best[1].get('productName'),
                                 'salePrice': best[1].get('salePrice'), 'inventoryId': best[1].get('inventoryId')}})
    pmatch.save()
    return sorted(out, key=lambda x: -x['score'])


# ---------- 照合 ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-fetch', action='store_true', help='ラクマ・ヤフオクを取りに行かない')
    ap.add_argument('--no-yahoo', action='store_true', help='ヤフオクだけ取りに行かない')
    ap.add_argument('--out', help='出力先JSON（既定: listings/audit_<YYMMDD>.json）')
    args = ap.parse_args()

    d = cloud_get.get_cloud(max_age=600)
    inv = [x for x in d['inventory'] if x.get('userId') != 'girlfriend']
    sales = [x for x in d['sales'] if x.get('userId') != 'girlfriend']
    today = date.today()
    cutoff = (today - timedelta(days=SALE_WINDOW_DAYS)).isoformat()

    mer, mer_at = load_mercari()
    rak = load_rakuma(not args.no_fetch)
    yah = load_yahoo(not args.no_fetch and not args.no_yahoo)
    listings = mer + rak + yah
    scanned = {'メルカリ': len(mer), 'ラクマ': len(rak), 'ヤフオク': len(yah)}

    # 在庫の索引
    inv_by_key = defaultdict(list)
    inv_by_date = defaultdict(list)
    for it in inv:
        k = inv_key(it)
        if k[0]:
            inv_by_key[k].append(it)
            inv_by_date[k[0]].append(it)
    inv_by_id = {it['id']: it for it in inv}
    # 価格の別表記（税抜・mgmtNo内の価格）でも同じ現物とみなすための索引
    alt_keys = set()
    for it in inv:
        pd_ = (it.get('purchaseDate') or '').replace('-', '')[2:]
        pc = it.get('purchaseCost') or {}
        prices = {it.get('purchasePrice'), pc.get('totalTaxEx'), pc.get('totalTaxIn'), pc.get('itemPriceTaxIn'), pc.get('itemPriceTaxEx')}
        pm_ = parse_mgmt(it.get('mgmtNo') or '')
        if pm_ and pm_['kind'] == 'full':
            prices.add(pm_['price'])
            alt_keys.add((pm_['pdate'], pm_['price']))
        for p in prices:
            if pd_ and p:
                alt_keys.add((pd_, p))

    # 売上の索引（管理番号キー）。売上自身の purchaseDate/Price か listingMgmtNo/listingNote から作る
    def sale_key(s):
        pm = parse_mgmt(s.get('listingMgmtNo') or '') or parse_mgmt(extract_mgmt(s.get('listingNote') or '') or '')
        if pm and pm['kind'] == 'full':
            return pm['pdate'], pm['price']
        pd_ = (s.get('purchaseDate') or '').replace('-', '')[2:]
        if pd_ and s.get('purchasePrice') and not s.get('noStock'):
            return pd_, s['purchasePrice']
        it = inv_by_id.get(s.get('inventoryId'))
        if it:
            return inv_key(it)
        return None

    sold_inv_by_key = defaultdict(list)
    for it in inv:
        if it.get('status') == 'sold':
            sold_inv_by_key[inv_key(it)].append(it)
    recent_sales_by_key = defaultdict(list)
    recent_sales = []
    for s in sales:
        if (s.get('saleDate') or '') < cutoff:
            continue
        if str(s.get('mailStatus') or '').lower() in ('cancel', 'cancelled', 'canceled', 'returned'):
            continue
        recent_sales.append(s)
        k = sale_key(s)
        if k and k[0]:
            recent_sales_by_key[k].append(s)

    def model_tokens(t):
        return set(re.findall(r'[a-z]*\d[a-z\d]{3,}', unicodedata.normalize('NFKC', t or '').lower()))

    def title_hit(t):
        """在庫(全ステータス)の中に、型番が共通または題名がかなり似た商品があるか"""
        mt = model_tokens(t)
        for it in inv:
            nm = it.get('productName') or ''
            if (mt and mt & model_tokens(nm)) or title_sim(t, nm) >= 0.7:
                return {'id': it['id'], 'name': nm[:40]}
        return None

    A, B, B2, nomgmt = [], [], [], []
    by_key_platform = defaultdict(list)
    for L in listings:
        pm = parse_mgmt(L['mgmt'])
        L['pm'] = pm
        if pm and pm['kind'] == 'full':
            by_key_platform[(pm['pdate'], pm['price'], L['platform'])].append(L)

    sale_title_by_inv = {}
    for s_ in sales:
        if s_.get('inventoryId') and s_.get('mailTitle'):
            sale_title_by_inv[s_['inventoryId']] = s_['mailTitle']

    def pdate_ok(pm, sale_date):
        """売上日が仕入れ日より前なら同じ現物ではあり得ない"""
        if not pm or not pm.get('pdate') or not sale_date:
            return True
        return sale_date >= '20' + pm['pdate'][:2] + '-' + pm['pdate'][2:4] + '-' + pm['pdate'][4:6]

    def sale_brief(s):
        return {'platform': s.get('platform'), 'saleDate': s.get('saleDate'), 'saleId': s.get('id'),
                'platformId': s.get('platformId'), 'title': s.get('mailTitle') or s.get('productName'),
                'salePrice': s.get('salePrice'), 'inventoryId': s.get('inventoryId')}

    for L in listings:
        pm = L['pm']
        if not pm or pm['kind'] == 'odd':
            nomgmt.append(L)
            continue
        evidence = []
        verdict = None
        if pm['kind'] == 'full':
            key = (pm['pdate'], pm['price'])
            units = inv_by_key.get(key, [])
            n_inv = len(units)
            sold_units = sold_inv_by_key.get(key, [])
            rsales = recent_sales_by_key.get(key, [])
            n_sold = max(len(sold_units), len(rsales))
            same_listings = by_key_platform[(key[0], key[1], L['platform'])]
            if n_inv == 0 and not rsales and key not in alt_keys:
                # (B) 完全な管理番号が在庫に無い
                near = inv_by_date.get(key[0], [])
                entry = {'platform': L['platform'], 'title': L['title'], 'url': L['url'], 'id': L['id'],
                         'mgmt': pm['raw'], 'price': L['price']}
                if near:
                    entry['reason'] = '同じ仕入れ日(%s)の在庫は%d件あるが価格 %s 円と一致しない' % (key[0], len(near), '{:,}'.format(key[1]))
                    entry['sameDateInventory'] = [{'id': x['id'], 'name': x.get('productName'), 'price': x.get('purchasePrice'),
                                                   'status': x.get('status')} for x in near[:5]]
                    B2.append(entry)
                else:
                    entry['reason'] = '仕入れ日 %s・価格 %s 円の在庫が無い（その仕入れ日の在庫自体が無い）' % (key[0], '{:,}'.format(key[1]))
                    B.append(entry)
                continue
            if n_sold > 0:
                free = max((n_inv or n_sold) - n_sold, 0)
                pos = same_listings.index(L)
                if pos >= free:   # このプラットフォームでの出品が、残りの現物数を超えている分
                    verdict = 'managed'
                    for it in sold_units:
                        t_ = sale_title_by_inv.get(it['id'])
                        if t_ and title_sim(L['title'], t_) < 0.5:
                            continue   # 管理番号が同じでも題名が全く違う＝まとめ仕入れの按分で番号が被っただけ
                        evidence.append({'type': '在庫が売却済み', 'inventoryId': it['id'], 'name': it.get('productName'),
                                         'soldAt': it.get('soldAt')})
                    for s in rsales:
                        if s.get('mailTitle') and title_sim(L['title'], s['mailTitle']) < 0.5:
                            continue
                        evidence.append({'type': '直近60日の売上', **sale_brief(s)})
                    # 同じ出品そのものの売上(同プラットフォーム・同ID)は除外
                    evidence = [e for e in evidence if e.get('platformId') != L['id']]
                    if not evidence:
                        verdict = None
                    else:
                        L['_cnt'] = {'inventory': n_inv, 'sold': n_sold, 'sameKeyListingsOnPlatform': len(same_listings)}
        # タイトル一致（管理番号が日付だけ／矛盾しない場合）
        if verdict is None and L['title']:
            best = None
            for s in recent_sales:
                if s.get('platformId') == L['id']:
                    continue
                sim = title_sim(L['title'], s.get('mailTitle') or '')
                if sim < TITLE_SIM:
                    continue
                if not pdate_ok(pm, s.get('saleDate')):
                    continue
                sk = sale_key(s)
                # 管理番号が両方そろっていて違えば別の現物
                if pm['kind'] == 'full' and sk and sk != (pm['pdate'], pm['price']):
                    continue
                if pm['kind'] == 'date' and sk and sk[0] != pm['pdate']:
                    continue
                if best is None or sim > best[0]:
                    best = (sim, s)
            if best:
                verdict = 'title'
                evidence.append({'type': '売上とタイトルがほぼ同じ(類似度%.2f)' % best[0], **sale_brief(best[1])})
        if verdict:
            A.append({'platform': L['platform'], 'title': L['title'], 'url': L['url'], 'id': L['id'], 'price': L['price'],
                      'mgmt': pm['raw'], 'basis': '管理番号' if verdict == 'managed' else 'タイトル', 'evidence': evidence,
                      'counts': L.get('_cnt')})
            continue
        if pm['kind'] == 'date':
            if not inv_by_date.get(pm['pdate']):
                tw = title_hit(L['title'])
                if tw:
                    B2.append({'platform': L['platform'], 'title': L['title'], 'url': L['url'], 'id': L['id'], 'mgmt': pm['raw'],
                               'price': L['price'], 'reason': '日付のみ(%s)で在庫に該当日なし。ただし在庫に似た商品あり: %s %s' % (pm['pdate'], tw['id'], tw['name'])})
                    continue
                B.append({'platform': L['platform'], 'title': L['title'], 'url': L['url'], 'id': L['id'],
                          'mgmt': pm['raw'], 'price': L['price'],
                          'reason': '管理番号が日付のみ(%s)で、その仕入れ日の在庫が1件も無い' % pm['pdate']})

    # (A') 写真一致: 出品中の先頭写真 vs 直近60日の売上の写真(先頭2枚)。タイトルが違っても同じ写真なら拾う
    Ap = photo_section(listings, recent_sales, A)

    result = {'generatedAt': datetime.now().strftime('%Y-%m-%d %H:%M'), 'scanned': scanned,
              'mercariScannedAt': mer_at, 'saleWindowFrom': cutoff,
              'A_soldButListed': A, 'Aprime_photoMatch': Ap, 'B_noPurchase': B, 'B2_priceMismatch': B2,
              'undecidable': [{k: v for k, v in L.items() if k in ('platform', 'title', 'url', 'id', 'mgmt', 'tail')} for L in nomgmt]}
    out = args.out or os.path.join(LDIR, 'audit_%s.json' % today.strftime('%y%m%d'))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    # ---- 要約 ----
    print('スキャン: メルカリ%d件 / ラクマ%d件 / ヤフオク%d件（メルカリ一覧の取得日時: %s）' %
          (scanned['メルカリ'], scanned['ラクマ'], scanned['ヤフオク'], mer_at or '不明'))
    print('\n(A) 売れたのに出品中: %d件' % len(A))
    for a in A:
        print('  - [%s] %s\n    %s  管理番号 %s  根拠:%s' % (a['platform'], a['title'], a['url'], a['mgmt'], a['basis']))
        for e in a['evidence'][:3]:
            if e['type'] == '在庫が売却済み':
                print('      在庫 %s は売却済み(%s)' % (e['inventoryId'], (e.get('soldAt') or '')[:10]))
            else:
                print('      売上 %s %s (%s) %s' % (e['platform'], e['saleDate'], e['saleId'], e['type']))
    print("\n(A') 写真が同じ（売上と出品中・しきい値%.2f）: %d件" % (pmatch.THRESHOLD, len(Ap)))
    for a in Ap:
        print('  - [%s] %s\n    %s  写真一致度 %.3f  管理番号 %s' % (a['platform'], a['title'], a['url'], a['score'], a['mgmt'] or '-'))
        e = a['sale']
        print('      売上 %s %s (%s) %s' % (e['platform'], e['saleDate'], e['saleId'], (e['title'] or '')[:40]))
    print('\n(B) 仕入れが無い出品: %d件（＋価格だけ不一致 B2: %d件）' % (len(B), len(B2)))
    grp = defaultdict(list)
    for b in B:
        grp[b['mgmt']].append(b)
    for mg, bs in grp.items():
        print('  - 管理番号 %s  理由:%s' % (mg, bs[0]['reason']))
        for x in bs:
            print('      [%s] %s  %s' % (x['platform'], x['title'][:50], x['url']))
    for b in B2[:15]:
        print('  - (B2)[%s] %s %s 管理番号 %s  %s' % (b['platform'], b['title'], b['url'], b['mgmt'], b['reason']))
    if len(B2) > 15:
        print('  …他 %d件は JSON 参照' % (len(B2) - 15))
    print('\n判定不能(管理番号なし/読めない): %d件' % len(nomgmt))
    print('詳細: ' + out)


if __name__ == '__main__':
    main()

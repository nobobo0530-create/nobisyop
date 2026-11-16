#!/usr/bin/env python3
"""写真(知覚ハッシュ)による同一品照合。PIL のみ。読み取り専用（公開画像をGETするだけ）。
- fetch(url): 画像をキャッシュ(~/Documents/nobushop_mail/listings/photos/)へ保存してパスを返す
- hashes(url, path=None): {'f': 全体ハッシュ, 'c': 中央85%切り出しハッシュ} を JSON キャッシュ(hashes.json)経由で返す
- similar(sale_photos, listing_photos): 0..1。写真URL(またはパス)のリスト同士の最良ペアのスコア
ハッシュ = dHash(16x16=256bit) + aHash(16x16=256bit)。スコア = 1 - (ハミング距離合計/512)。
再圧縮・多少のトリミング対策: 全体↔全体 / 全体↔中央切り出し / 中央切り出し↔全体 の最大値。
"""
import hashlib, json, os, sys, time, urllib.request

from PIL import Image, ImageOps

BASE = os.path.expanduser('~/Documents/nobushop_mail/listings')
PDIR = os.path.join(BASE, 'photos')
HJSON = os.path.join(BASE, 'photo_hashes.json')
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'}
THRESHOLD = 0.92      # 較正: 同一品(7組)=0.986-0.994 / 別物の最大=0.889(全23万ペア p99.9=0.826) → 0.92
N = 16
_H = None
_last = [0.0]


def _load():
    global _H
    if _H is None:
        try:
            with open(HJSON) as f:
                _H = json.load(f)
        except (OSError, ValueError):
            _H = {}
    return _H


def save():
    if _H is None:
        return
    os.makedirs(BASE, exist_ok=True)
    with open(HJSON + '.tmp', 'w') as f:
        json.dump(_H, f)
    os.replace(HJSON + '.tmp', HJSON)


def mercari_photo_urls(mid, n=3):
    return [f'https://static.mercdn.net/item/detail/orig/photos/{mid}_{i}.jpg' for i in range(1, n + 1)]


def yahoo_image_url(aid):
    """ヤフオクの商品ページ og:image（取得結果はハッシュJSONに保存して再取得しない）"""
    import re
    H = _load(); k = 'yimg:' + aid
    if k in H:
        return H[k] or None
    try:
        h = urllib.request.urlopen(urllib.request.Request('https://page.auctions.yahoo.co.jp/jp/auction/' + aid, headers=UA), timeout=30).read().decode('utf8', 'ignore')
        ms = re.findall(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', h)
        H[k] = ms[0] if ms else ''
    except Exception:
        return None
    time.sleep(0.7)
    return H[k] or None


def fetch(url, polite=0.5):
    """URL -> ローカルパス（失敗/404 は None。失敗も .miss で覚えて再取得しない）"""
    os.makedirs(PDIR, exist_ok=True)
    key = hashlib.sha1(url.encode()).hexdigest()
    p = os.path.join(PDIR, key + '.jpg')
    if os.path.exists(p) and os.path.getsize(p) > 500:
        return p
    if os.path.exists(p + '.miss'):
        return None
    w = polite - (time.time() - _last[0])
    if w > 0:
        time.sleep(w)
    _last[0] = time.time()
    try:
        b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
        if len(b) < 500:
            raise ValueError('tiny')
        with open(p, 'wb') as f:
            f.write(b)
        return p
    except Exception:
        open(p + '.miss', 'w').close()
        return None


def _bits(im):
    g = im.convert('L')
    a = g.resize((N, N), Image.LANCZOS)
    px = list(a.getdata()); mean = sum(px) / len(px)
    ah = 0
    for v in px:
        ah = (ah << 1) | (1 if v > mean else 0)
    d = g.resize((N + 1, N), Image.LANCZOS)
    px = list(d.getdata()); dh = 0
    for y in range(N):
        for x in range(N):
            dh = (dh << 1) | (1 if px[y * (N + 1) + x] > px[y * (N + 1) + x + 1] else 0)
    return [format(dh, 'x'), format(ah, 'x')]


def _compute(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    w, h = im.size
    cx, cy = int(w * 0.075), int(h * 0.075)
    c = im.crop((cx, cy, w - cx, h - cy))
    return {'f': _bits(im), 'c': _bits(c)}


def hashes(url, path=None):
    H = _load()
    if url in H:
        return H[url]
    path = path or fetch(url)
    if not path or not os.path.exists(path):
        return None
    try:
        H[url] = _compute(path)
    except Exception:
        return None
    return H[url]


def _dist(a, b):
    return sum(bin(int(x, 16) ^ int(y, 16)).count('1') for x, y in zip(a, b))


def pair_score(ha, hb):
    d = min(_dist(ha['f'], hb['f']), _dist(ha['f'], hb['c']), _dist(ha['c'], hb['f']))
    return 1 - d / (2 * N * N)


def similar(sale_photos, listing_photos):
    """各引数は URL か (url, ローカルパス) のリスト。最良ペアのスコアを返す（取れなければ 0.0）"""
    def hs(L):
        out = []
        for u in L:
            url, path = (u if isinstance(u, tuple) else (u, None))
            h = hashes(url, path)
            if h:
                out.append(h)
        return out
    A, B = hs(sale_photos), hs(listing_photos)
    best = 0.0
    for a in A:
        for b in B:
            best = max(best, pair_score(a, b))
    return best


# ---------------------------------------------------------------- 売上・出品の写真を集める
RAKUMA_JSON = os.path.expanduser('~/Documents/nobushop_mail/rakuma_snap/items.json')
_RS = None


def rakuma_snap():
    global _RS
    if _RS is None:
        try:
            with open(RAKUMA_JSON) as f:
                _RS = json.load(f)
        except (OSError, ValueError):
            _RS = {}
    return _RS


def rakuma_photo(h):
    """ラクマ出品(hash)の写真 -> [(url, ローカルパス)]（スナップショットは先頭1枚だけ持つ）"""
    v = rakuma_snap().get(h) or {}
    if v.get('imageUrl') and v.get('imagePath') and os.path.exists(v['imagePath']):
        return [(v['imageUrl'], v['imagePath'])]
    if v.get('imageUrl'):
        return [v['imageUrl']]
    return []


def _norm(t):
    import unicodedata
    return ''.join(c for c in unicodedata.normalize('NFKC', t or '').lower() if unicodedata.category(c)[0] in 'LN')


def rakuma_photo_by_title(title, min_ratio=0.9):
    """ラクマの売上は写真ページが消えるので、スナップショット(売却済み含む)からタイトルほぼ一致の出品写真を借りる"""
    import difflib
    a = _norm(title)
    if not a:
        return []
    best, bh = 0, None
    for h, v in rakuma_snap().items():
        b = _norm(v.get('title'))
        if not b:
            continue
        r = 1.0 if a == b else difflib.SequenceMatcher(None, a, b).ratio()
        if r > best:
            best, bh = r, h
    return rakuma_photo(bh) if bh and best >= min_ratio else []


def sale_photos(platform, ident, title='', n=3):
    """売上の写真。platform は 'mercari'/'メルカリ' 等。取れなければ []"""
    pf = {'メルカリ': 'mercari', 'ラクマ': 'rakuma', 'ヤフオク': 'yahoo'}.get(platform, platform)
    if pf == 'mercari' and ident and ident.startswith('m'):
        return mercari_photo_urls(ident, n)
    if pf == 'yahoo' and ident:
        u = yahoo_image_url(ident)
        return [u] if u else []
    if pf == 'rakuma':
        return rakuma_photo_by_title(title)
    return []


def listing_photos(platform, ident, n=1):
    """現在の出品の写真（先頭 n 枚）。platform は日本語名/英名どちらも可"""
    pf = {'メルカリ': 'mercari', 'ラクマ': 'rakuma', 'ヤフオク': 'yahoo'}.get(platform, platform)
    if pf == 'mercari':
        return mercari_photo_urls(ident, n)
    if pf == 'yahoo':
        u = yahoo_image_url(ident)
        return [u] if u else []
    if pf == 'rakuma':
        return rakuma_photo(ident)
    return []


if __name__ == '__main__':
    print(similar([sys.argv[1]], [sys.argv[2]]))

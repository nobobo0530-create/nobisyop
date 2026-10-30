#!/usr/bin/env python3
"""ラクマ出品スナップショット。ショップ一覧を巡回して 管理番号・写真・タイトルを保存し、
売れたラクマ商品（注文番号のみのメール）を タイトル一致で 管理番号/写真に結びつける。
DB(Supabase)には一切触れない。保存先: ~/Documents/nobushop_mail/rakuma_snap/ （gitに入れない）
使い方:
  python3 rakuma_snapshot.py                         # 巡回して更新
  python3 rakuma_snapshot.py --match "売れた商品のタイトル" [--date YYYY-MM-DD] [--price N]
"""
import argparse, html, json, os, re, subprocess, sys, time, unicodedata, urllib.request
from datetime import datetime

SHOP = 'https://fril.jp/shop/8bbf5a4465d9060aee401c93d10e02e9'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
      '(KHTML, like Gecko) Version/17.4 Safari/605.1.15')
DIR = os.path.expanduser('~/Documents/nobushop_mail/rakuma_snap')
STORE = os.path.join(DIR, 'items.json')
IMG = os.path.join(DIR, 'img')
SLEEP = 1.0


def http(url, binary=False):
    last = None
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = r.read()
            time.sleep(SLEEP)
            return d if binary else d.decode('utf-8', 'replace')
        except Exception as e:
            last = e
            time.sleep(3 * (i + 1))
    raise last


def load():
    try:
        with open(STORE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save(items):
    os.makedirs(IMG, exist_ok=True)
    with open(STORE + '.tmp', 'w') as f:
        json.dump(items, f, ensure_ascii=False, indent=1)
    os.replace(STORE + '.tmp', STORE)


def parse_list(page):
    out = []
    for blk in page.split('data-test="item">')[1:]:
        m = re.search(r'https://item\.fril\.jp/([0-9a-f]{32})', blk)
        if not m:
            continue
        t = re.search(r'data-rat-item_name="([^"]*)"', blk)
        p = re.search(r'data-rat-price="\[(\d+)\]"', blk)
        out.append({'hash': m.group(1),
                    'title': html.unescape(t.group(1)) if t else '',
                    'price': int(p.group(1)) if p else None,
                    'sold': 'soldout_ribbon' in blk})
    return out


def crawl():
    url, pages, seen = SHOP, 0, {}
    while url:
        page = http(url)
        pages += 1
        for it in parse_list(page):
            seen.setdefault(it['hash'], it)
        m = re.search(r'rel="next" href="([^"]+)"', page)
        url = ('https://fril.jp' + html.unescape(m.group(1))) if m else None
    return pages, seen


def meta(page, prop):
    m = re.search(r'<meta property="%s" content="([^"]*)"' % re.escape(prop), page)
    return html.unescape(m.group(1)) if m else ''


def parse_mgmt(desc):
    m = re.search(r'管理番号\s*[】:：]\s*([0-9A-Za-z][0-9A-Za-z\-_]*)', desc or '')
    return m.group(1) if m else None


def fetch_item(it):
    page = http(it['url'])
    t = meta(page, 'og:title')
    t = re.sub(r'\s*\|\s*フリマアプリ ラクマ$', '', t)
    if t:
        it['title'] = t
    desc = meta(page, 'og:description')
    it['mgmtNo'] = parse_mgmt(desc) or it.get('mgmtNo')
    it['description'] = desc[:1500]
    img = meta(page, 'og:image')
    if img:
        it['imageUrl'] = img
        path = os.path.join(IMG, it['hash'] + '.jpg')
        try:
            open(path, 'wb').write(http(img, binary=True))
            subprocess.run(['sips', '-Z', '600', path], capture_output=True)
            it['imagePath'] = path
        except Exception as e:
            print('  画像失敗', it['hash'], e, file=sys.stderr)


def run():
    t0 = time.time()
    items = load()
    for it in items.values():  # 保存済み説明文から管理番号を再抽出
        if not it.get('mgmtNo'):
            it['mgmtNo'] = parse_mgmt(it.get('description')) or None
    pages, seen = crawl()
    now = datetime.now().strftime('%Y-%m-%d %H:%M')
    new = 0
    for h, s in seen.items():
        it = items.get(h)
        if not it:
            it = items[h] = {'hash': h, 'url': 'https://item.fril.jp/' + h, 'firstSeen': now}
            new += 1
        it['title'] = it.get('title') or s['title']
        it['price'] = s['price']
        it['lastSeen'] = now
        it['soldSeen'] = bool(s['sold']) or it.get('soldSeen', False)
    for it in items.values():
        if it['hash'] not in seen:
            it['missing'] = True
        else:
            it.pop('missing', None)
    todo = [it for it in items.values() if it['hash'] in seen and
            (not it.get('mgmtNo') or not it.get('imagePath') or not os.path.exists(it.get('imagePath', '')))]
    # 管理番号なしの商品でも画像が取れていれば同日中は再取得しない
    todo = [it for it in todo if it.get('lastFetch', '')[:10] != now[:10] or not it.get('imagePath')]
    for i, it in enumerate(todo, 1):
        try:
            fetch_item(it)
            it['lastFetch'] = now
        except Exception as e:
            print('  取得失敗', it['hash'], e, file=sys.stderr)
        if i % 25 == 0:
            save(items)
            print(f'  ...{i}/{len(todo)}', file=sys.stderr)
    save(items)
    print(f'pages={pages} 一覧={len(seen)} 新規={new} 詳細取得={len(todo)} 保存合計={len(items)} '
          f'管理番号あり={sum(1 for i in items.values() if i.get("mgmtNo"))} '
          f'画像あり={sum(1 for i in items.values() if i.get("imagePath"))} '
          f'所要={time.time()-t0:.0f}秒')


def norm(s):
    s = unicodedata.normalize('NFKC', s or '')
    s = re.sub(r'[【\[][^】\]]*[】\]]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def toks(s):
    n = norm(s)
    ts = set(re.findall(r'[a-z0-9\-]+|[぀-ヿ一-鿿]{1,}', n))
    return ts


def match(title, date=None, price=None, limit=5):
    items = load()
    nt, tt = norm(title), toks(title)
    res = []
    for it in items.values():
        ni = norm(it.get('title'))
        if not ni:
            continue
        if ni == nt:
            sc = 1.0
        else:
            ti = toks(it['title'])
            if not ti or not tt:
                continue
            inter = len(tt & ti)
            sc = 0.9 * inter / max(len(tt | ti), 1)
            if nt in ni or ni in nt:
                sc = max(sc, 0.85)
        if price and it.get('price') and it['price'] == price:
            sc += 0.05
        res.append((sc, it))
    res.sort(key=lambda x: -x[0])
    return [dict(it, score=round(sc, 3)) for sc, it in res[:limit]]


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--match')
    ap.add_argument('--date')
    ap.add_argument('--price', type=int)
    a = ap.parse_args()
    if a.match:
        for r in match(a.match, a.date, a.price):
            print(f"{r['score']:.2f} | {r.get('mgmtNo') or '-'} | {r.get('imagePath') or '-'} | {r['price']} | "
                  f"{r['title'][:60]} | last={r['lastSeen']}{' (消えた)' if r.get('missing') else ''}")
    else:
        run()

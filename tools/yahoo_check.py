#!/usr/bin/env python3
"""
ヤフオク「マイオク → 落札分」のスクショから、まだ仕入れ登録していない商品を洗い出す道具。

アプリの取り込み機能とは別物。こちらは登録を一切せず、照合だけする。
スクショが縦に長すぎてそのままでは文字が読めないので、
商品の切れ目で分割して「読める大きさの見開き画像」に作り直す。

使い方:
  # ① スクショを読める大きさに分割する（画像を省略すると Downloads/Desktop の最新を使う）
  python3 tools/yahoo_check.py slice [画像パス]

  # ② 読み取った内容を items.json に書いてから照合する
  python3 tools/yahoo_check.py match items.json

items.json の形式:
  [{"id":"c1232923610","name":"BURBERRY ...","price":5896,"date":"2026-06-14"}, ...]
"""
import sys, os, json, glob, re, urllib.request

OUT_DIR = '/tmp/yahoo_check'
API_URL = 'https://nobisyop.vercel.app/api/data'
# 1枚の見開きに詰める商品数
PER_SHEET = 3
# 画面を縮小して撮ると文字が小さくなるので、1商品これくらいの高さまで拡大して読む
TARGET_ITEM_PX = 390


def newest_screenshot():
    cands = []
    for d in (os.path.expanduser('~/Downloads'), os.path.expanduser('~/Desktop')):
        for ext in ('png', 'jpg', 'jpeg', 'PNG', 'JPG'):
            cands += glob.glob(os.path.join(d, '*.' + ext))
    if not cands:
        sys.exit('画像が見つかりません。パスを指定してください')
    return max(cands, key=os.path.getmtime)


def is_line(c):
    """白でもなく暗くもない＝引かれた線の色"""
    r, g, b = c
    return 190 <= r <= 245 and abs(r - g) < 10 and abs(g - b) < 10


def card_band(im):
    """一覧の白いカードが占めるxの範囲。縮小して撮ると背景が薄いグレーになり、
    カードの外にも線と同じ色が広がるので、まず白い帯を見つけて中だけを見る"""
    W, H = im.size
    px = im.load()
    step = max(1, W // 360)
    ys = range(0, H, 7)
    cols = []
    for x in range(0, W, step):
        n = sum(1 for y in ys if min(px[x, y]) >= 249)
        cols.append((x, n))
    top = max(n for _, n in cols)
    if top == 0:
        return 0, W - 1
    xs = [x for x, n in cols if n >= top * 0.6]
    return min(xs), max(xs)


def scan_lines(px, H, xs, need):
    """横一直線に線の色が並ぶyを拾い、太さぶんをまとめて1本にする"""
    ys = []
    for y in range(H):
        n = 0
        for x in xs:
            if is_line(px[x, y]):
                n += 1
        if n >= need:
            ys.append(y)
    groups = []
    for y in ys:
        if groups and y - groups[-1][-1] <= 4:
            groups[-1].append(y)
        else:
            groups.append([y])
    seps = [g[0] for g in groups]
    # 商品1件ぶんの高さに満たない間隔は線ではないので捨てる
    if len(seps) < 3:
        return seps
    gaps = sorted(seps[i + 1] - seps[i] for i in range(len(seps) - 1))
    med = gaps[len(gaps) // 2]
    cleaned = [seps[0]]
    for y in seps[1:]:
        if y - cleaned[-1] >= med * 0.55:
            cleaned.append(y)
    return cleaned


def regularity(seps):
    """間隔がどれだけ揃っているか。商品の切れ目なら等間隔に近くなる"""
    if len(seps) < 5:
        return 0.0
    gaps = [seps[i + 1] - seps[i] for i in range(len(seps) - 1)]
    med = sorted(gaps)[len(gaps) // 2]
    if med <= 0:
        return 0.0
    return sum(1 for g in gaps if abs(g - med) <= med * 0.15) / len(gaps)


def find_separators(im):
    """商品と商品の切れ目（薄いグレーの横線）のyを返す"""
    W, H = im.size
    px = im.load()
    L, R = card_band(im)
    # 撮り方で線の見え方が変わるので2通り試し、間隔が揃っている方を採る
    # ① 等倍撮影: 一覧の右側の余白を線が横切る
    # ② 縮小撮影: カードの中を線が端から端まで横切る
    inner = list(range(L + 20, max(L + 21, R - 20), 12)) or [L]
    cands = [
        (scan_lines(px, H, [int(W * 0.90), int(W * 0.93), int(W * 0.96)], 3), 0, W - 1),
        (scan_lines(px, H, inner, max(1, int(len(inner) * 0.85))), L, R),
    ]
    best = max(cands, key=lambda c: (regularity(c[0]), len(c[0])))
    return best[0], best[1], best[2]


def content_left(im, seps, band_left, band_right):
    """一覧本体の左端。左のメニュー欄や外側の余白をここで落とす"""
    W = im.size[0]
    px = im.load()
    starts = []
    for y in seps[:5]:
        # 線の右端から左へたどり、途切れたところが一覧の左端
        # 左のメニュー欄との境目はわずかな色差しかないので、ここだけ厳しめに見る
        strict = lambda c: 195 <= c[0] <= 243 and abs(c[0] - c[1]) < 8 and abs(c[1] - c[2]) < 8
        x = min(W - 3, band_right - 2)
        while x > band_left and not strict(px[x, y]):
            x -= 1
        while x > band_left and strict(px[x - 1, y]):
            x -= 1
        starts.append(x)
    if not starts:
        return band_left
    # 見出し用の線など、一覧より広く引かれた線が混ざるので真ん中の値を採る
    starts.sort()
    return max(band_left, starts[len(starts) // 2])


def trim_bottom(part):
    """1商品ぶんの下にある余白を削る。見開きを詰めて文字を大きく見せるため"""
    w, h = part.size
    px = part.load()
    xs = range(0, w, 3)
    last = h - 1
    while last > h // 3:
        # 文字も線もない＝薄い色ばかりの行なら削ってよい
        if any(min(px[x, last]) < 190 for x in xs):
            break
        last -= 1
    return part.crop((0, 0, w, min(h, last + 4)))


def cmd_slice(path):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    W, H = im.size
    seps, band_left, band_right = find_separators(im)
    if len(seps) < 2:
        sys.exit(f'商品の切れ目が見つかりませんでした（画像 {W}x{H}）。別の撮り方を試してください')

    # 1商品ぶんの高さ。画面を縮小して撮ると小さくなるので毎回測る
    pitches = sorted(seps[i + 1] - seps[i] for i in range(len(seps) - 1))
    pitch = pitches[len(pitches) // 2]
    # 1商品ぶんを丸ごと取ってから、下にある余白だけを削る。
    # 行の高さは撮り方で変わるので、割合で決め打ちすると日付や商品IDが切れる
    # 縮小して撮った画像はそのままでは文字が読めないので拡大する
    zoom = min(3.0, max(1.0, TARGET_ITEM_PX / pitch))

    # 一覧の左端。縮小率で位置が変わるので線の始まりから割り出す
    x0 = content_left(im, seps, band_left, band_right)
    x1 = min(W, band_right + 1)
    os.makedirs(OUT_DIR, exist_ok=True)
    for f in glob.glob(os.path.join(OUT_DIR, '*.png')):
        os.remove(f)

    # 最後の線から下は商品が途中で切れているので使わない。
    # まとめ買いの注記がある行だけ高さが違うので、次の線までを1商品ぶんとする
    tops = [(seps[i], seps[i + 1]) for i in range(len(seps) - 1)]
    sheets = 0
    for i in range(0, len(tops), PER_SHEET):
        chunk = tops[i:i + PER_SHEET]
        parts = [trim_bottom(im.crop((x0, t, x1, min(b, H)))) for t, b in chunk]
        sheet = Image.new('RGB', (x1 - x0, sum(p.height for p in parts)), 'white')
        y = 0
        for p in parts:
            sheet.paste(p, (0, y))
            y += p.height
        if zoom > 1.05:
            sheet = sheet.resize((int(sheet.width * zoom), int(sheet.height * zoom)), Image.LANCZOS)
        sheets += 1
        sheet.save(os.path.join(OUT_DIR, 'sheet_%02d.png' % sheets))

    print(f'画像: {path}')
    print(f'サイズ: {W}x{H}')
    print(f'商品の切れ目: {len(seps)}本 → 読み取れる商品 {len(tops)}件')
    print(f'1商品の高さ: {pitch}px → 拡大 {zoom:.2f}倍 / 左端 x={x0}')
    print(f'見開き {sheets}枚を {OUT_DIR}/ に出しました')
    if H >= 16384:
        print('⚠️ 高さが16384pxちょうど＝フルページ撮影の上限に当たっています。')
        print('   ページの下の方が写っていない可能性があります（分けて撮ると全部入ります）')


def dice(a, b):
    n = lambda s: re.sub(r'[\s　【】（）()「」\-_・,、。．/]', '', (s or '').lower())
    na, nb = n(a), n(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    bg = lambda s: {s[i:i + 2] for i in range(len(s) - 1)}
    ba, bb = bg(na), bg(nb)
    if not ba or not bb:
        return 0.0
    return 2 * len(ba & bb) / (len(ba) + len(bb))


def fetch_inventory():
    with urllib.request.urlopen(API_URL, timeout=60) as r:
        d = json.loads(r.read().decode())
    if not d.get('ok'):
        sys.exit('クラウドからデータを取れませんでした: ' + str(d))
    out = []
    for i in d.get('inventory') or []:
        cost = i.get('purchaseCost') or {}
        out.append({
            'name': ((i.get('brand') or '') + ' ' + (i.get('productName') or '')).strip(),
            'price': int(cost.get('itemPriceTaxIn') or i.get('itemPriceTaxIn') or 0),
            'date': i.get('purchaseDate') or '',
            'store': i.get('purchaseStore') or i.get('storeName') or '',
            'auctionId': (i.get('yahooAuctionId') or '').strip().lower(),
        })
    return out


def cmd_match(items_path):
    items = json.load(open(items_path))
    inv = fetch_inventory()
    print(f'クラウドの在庫 {len(inv)}件と照合します\n')

    unreg, reg = [], []
    for it in items:
        aid = str(it.get('id') or '').strip().lower()
        price = int(it.get('price') or 0)
        # ① オークションIDが一致すれば確実に登録済み
        hit = next((v for v in inv if aid and v['auctionId'] == aid), None)
        how = 'オークションID一致'
        if not hit:
            # ② IDが無い既存データ向け: 商品名の似かたと金額で探す
            best, bs = None, 0.0
            for v in inv:
                s = dice(it.get('name'), v['name'])
                if price > 0 and v['price'] == price:
                    s += 0.5
                if it.get('date') and v['date'] == it['date']:
                    s += 0.2
                if s > bs:
                    best, bs = v, s
            # 金額が一致した上で名前もそれなりに似ている場合だけ登録済みとみなす
            if best and price > 0 and best['price'] == price and dice(it.get('name'), best['name']) >= 0.5:
                hit = best
                how = f"金額一致＋名前{int(dice(it.get('name'), best['name']) * 100)}%"
        (reg if hit else unreg).append((it, hit, how))

    print(f'■ 登録済み {len(reg)}件 / 未登録の可能性 {len(unreg)}件\n')
    if unreg:
        print('--- まだ登録されていない可能性があるもの ---')
        for it, _, _ in unreg:
            print(f"  ¥{it.get('price'):>8,}  {it.get('date')}  {it.get('id')}")
            print(f"            {it.get('name')}")
    else:
        print('すべて登録済みでした')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd = sys.argv[1]
    if cmd == 'slice':
        cmd_slice(sys.argv[2] if len(sys.argv) > 2 else newest_screenshot())
    elif cmd == 'match':
        cmd_match(sys.argv[2])
    else:
        sys.exit(__doc__)

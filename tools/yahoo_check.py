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
# 1商品あたり、上から何pxぶんを残せば「商品名・価格・日付・商品ID」が入るか
HEAD_PX = 390
# 1枚の見開きに詰める商品数
PER_SHEET = 3


def newest_screenshot():
    cands = []
    for d in (os.path.expanduser('~/Downloads'), os.path.expanduser('~/Desktop')):
        for ext in ('png', 'jpg', 'jpeg', 'PNG', 'JPG'):
            cands += glob.glob(os.path.join(d, '*.' + ext))
    if not cands:
        sys.exit('画像が見つかりません。パスを指定してください')
    return max(cands, key=os.path.getmtime)


def find_separators(im):
    """商品と商品の切れ目（薄いグレーの横線）のyを返す"""
    W, H = im.size
    px = im.load()
    # 線は一覧の右側の余白を横切るので、右寄りの3点で判定する
    xs = [int(W * 0.90), int(W * 0.93), int(W * 0.96)]
    ys = []
    for y in range(H):
        ok = True
        for x in xs:
            r, g, b = px[x, y]
            # 白でもなく暗くもない＝引かれた線
            if not (195 <= r <= 243 and abs(r - g) < 8 and abs(g - b) < 8):
                ok = False
                break
        if ok:
            ys.append(y)
    # 太さ数pxの線は1本にまとめる
    groups = []
    for y in ys:
        if groups and y - groups[-1][-1] <= 3:
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


def cmd_slice(path):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    W, H = im.size
    seps = find_separators(im)
    if len(seps) < 2:
        sys.exit(f'商品の切れ目が見つかりませんでした（画像 {W}x{H}）。別の撮り方を試してください')

    # 一覧の左端＝サムネイルが始まるあたり。左のメニュー欄を落とす
    x0 = int(W * 0.33)
    os.makedirs(OUT_DIR, exist_ok=True)
    for f in glob.glob(os.path.join(OUT_DIR, '*.png')):
        os.remove(f)

    tops = seps[:-1]  # 最後の線から下は商品が途中で切れているので使わない
    sheets = 0
    for i in range(0, len(tops), PER_SHEET):
        chunk = tops[i:i + PER_SHEET]
        parts = [im.crop((x0, t, W, min(t + HEAD_PX, H))) for t in chunk]
        sheet = Image.new('RGB', (W - x0, sum(p.height for p in parts)), 'white')
        y = 0
        for p in parts:
            sheet.paste(p, (0, y))
            y += p.height
        sheets += 1
        sheet.save(os.path.join(OUT_DIR, 'sheet_%02d.png' % sheets))

    print(f'画像: {path}')
    print(f'サイズ: {W}x{H}')
    print(f'商品の切れ目: {len(seps)}本 → 読み取れる商品 {len(tops)}件')
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

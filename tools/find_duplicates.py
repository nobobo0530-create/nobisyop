#!/usr/bin/env python3
"""在庫の重複候補を探す。仕入日・ブランド・商品名・仕入値から判定する。

使い方:
  python3 tools/find_duplicates.py            # 下見
  python3 tools/find_duplicates.py --apply    # 候補に dupCheck を付けてクラウドへ（アプリの「🔁重複候補」に出る）

判定（どれか1つ）:
  A. オークションIDが同じ（確実に重複）／1文字だけ違う（スクショの読み取りミス）
  B. 管理番号が同じ
  C. 仕入日が3日以内 ＋ ブランドが同じ ＋ 商品名の一致度90%以上
  D. 仕入日が3日以内 ＋ ブランドが同じ ＋ 仕入値（商品代）が同じ ＋ 商品名の一致度60%以上
除外: 管理番号一致でもブランドが違う（まとめ買いの伝票番号）／同じまとめ買いで商品名90%未満
      両方に別々のオークションIDがある（別の落札＝別の商品）／ユーザーが「重複ではない」にしたもの
"""
import datetime, difflib, json, re, sys, time, unicodedata, urllib.request, os
API = 'https://nobisyop.vercel.app/api/data'

def n(s): return re.sub(r'\s', '', unicodedata.normalize('NFKC', s or '').lower())
def bkey(b): return re.sub(r'[^a-z0-9ぁ-んァ-ヶ一-龠]', '', n(b)).replace('burberrys', 'burberry')
def day(s):
    try: return datetime.date.fromisoformat((s or '')[:10])
    except Exception: return None
def price(v): return (v.get('purchaseCost') or {}).get('itemPriceTaxIn') or v.get('itemPriceTaxIn') or 0
def strip_noise(t):
    t = n(t)
    t = re.sub(r'【[^】]*】|\[[^\]]*\]|1円(スタート|～|〜)?|美品|中古|送料無料', '', t)
    return t[:60]

def pairs(inv):
    live = [v for v in inv if not ((v.get('dupCheck') or {}).get('resolved'))]
    out = []
    by_date = sorted(live, key=lambda v: v.get('purchaseDate') or '')
    for i, a in enumerate(live):
        for b in live[i + 1:]:
            aa, ab = a.get('yahooAuctionId'), b.get('yahooAuctionId')
            if aa and ab:
                if aa == ab: out.append((a, b, 'オークションIDが同じ')); continue
                # スクショ読み取りで1文字だけ読み違えることがある（l→d 等。2026-09-30 D&Gデニムで発生）
                if len(aa) == len(ab) and sum(x != y for x, y in zip(aa, ab)) == 1:
                    out.append((a, b, f'オークションIDが1文字違い（{aa} / {ab}）読み取りミスの可能性')); continue
                continue                      # 別々の落札は別商品
            # 管理番号はまとめ買いの伝票番号として共有されていることがあるので、同ブランドのときだけ
            if a.get('mgmtNo') and a.get('mgmtNo') == b.get('mgmtNo') and bkey(a.get('brand')) == bkey(b.get('brand')):
                out.append((a, b, '管理番号が同じ・同ブランド')); continue
            da, db = day(a.get('purchaseDate')), day(b.get('purchaseDate'))
            if not da or not db or abs((da - db).days) > 3: continue
            if not bkey(a.get('brand')) or bkey(a.get('brand')) != bkey(b.get('brand')): continue
            sim = difflib.SequenceMatcher(None, strip_noise(a.get('productName')), strip_noise(b.get('productName'))).ratio()
            same_price = price(a) and price(a) == price(b)
            dd = abs((da - db).days)
            dtxt = '仕入日が同日' if dd == 0 else f'仕入日が{dd}日差'
            # 同じまとめ買いの中は、まとめ金額が全員に入っていて商品代が揃うので、商品名がほぼ同じときだけ
            same_bundle = a.get('bundleGroup') and a.get('bundleGroup') == b.get('bundleGroup')
            if same_bundle and sim < 0.9: continue
            if sim >= 0.9:
                out.append((a, b, f'{dtxt}・同ブランド・商品名{round(sim*100)}%一致' + ('・商品代一致' if same_price else '')))
            elif same_price and sim >= 0.6:
                out.append((a, b, f'{dtxt}・同ブランド・商品代一致・商品名{round(sim*100)}%一致'))
    return out

def groups(prs):
    parent = {}
    def f(x):
        parent.setdefault(x, x)
        while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
        return x
    reason = {}
    for a, b, r in prs:
        parent[f(a['id'])] = f(b['id'])
        reason.setdefault(a['id'], r); reason.setdefault(b['id'], r)
    g = {}
    for x in parent: g.setdefault(f(x), []).append(x)
    return list(g.values()), reason

def main():
    import cloud_get
    d = cloud_get.get_cloud()
    inv = d['inventory']; by = {v['id']: v for v in inv}
    prs = pairs(inv)
    gs, reason = groups(prs)
    gs.sort(key=lambda m: min(by[i].get('purchaseDate') or '' for i in m))
    print(f'重複候補 {len(gs)} グループ / {sum(len(m) for m in gs)} 点')
    for k, m in enumerate(gs, 1):
        print(f'── グループ{k:03d}（{len(m)}点）')
        for i in sorted(m, key=lambda i: by[i].get('purchaseDate') or ''):
            v = by[i]
            print(f"   {v.get('purchaseDate')} {v.get('status'):8} ¥{int(float(price(v) or v.get('purchasePrice') or 0)):>7,} {(v.get('brand') or '')[:14]:14} {(v.get('productName') or '')[:40]} | {reason[i]}")
    if '--apply' in sys.argv:
        json.dump(d, open(os.path.expanduser(f'~/Documents/nobushop_mail/backup_before_dupcheck_{time.strftime("%Y%m%d_%H%M%S")}.json'), 'w'), ensure_ascii=False)
        now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        rows = []
        # 既存のグループ番号は変えない。新しいグループには続きの番号を振る
        nums = [int(g[4:]) for g in ((v.get('dupCheck') or {}).get('group') or '' for v in inv) if g.startswith('dup_') and g[4:].isdigit()]
        nxt = max(nums, default=0) + 1
        for m in gs:
            olds = [(by[i].get('dupCheck') or {}).get('group') for i in m if (by[i].get('dupCheck') or {}).get('group')]
            if olds:
                g = olds[0]
            else:
                g = f'dup_{nxt:03d}'; nxt += 1
            for i in m:
                v = by[i]
                if (v.get('dupCheck') or {}).get('group'): continue   # 既に付いているものは触らない
                rows.append({'id': i, 'data': {**v, 'updatedAt': now,
                             'dupCheck': {'group': g, 'reason': reason[i], 'flaggedAt': now, 'resolved': False}}})
        sk = []
        for s in range(0, len(rows), 20):
            req = urllib.request.Request(API, data=json.dumps({'invUpsert': rows[s:s+20]}).encode(), headers={'Content-Type': 'application/json'})
            sk += json.load(urllib.request.urlopen(req, timeout=120)).get('skipped', [])
        print(f'目印を付けた {len(rows)} 点 / 捨てられた {sk}')

if __name__ == '__main__':
    main()

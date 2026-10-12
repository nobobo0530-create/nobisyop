#!/usr/bin/env python3
"""メールの購入商品のうち、台帳に存在しないものを洗い出す。

使い方:
    python3 tools/mail_match_missing.py <出力.json> <parsed1.json> [parsed2.json …]

判定の順序:
  1. オークションIDが在庫にある → 登録済み
  2. オークションID無しの在庫と、商品名の類似 or 金額の一致（±21日）で対応が取れる → 登録済み
  3. どちらも取れない → 未登録候補として出力
台帳の purchasePrice は「商品代＋送料−クーポン」なので金額比較は両方の形を見る。
"""
import json
import sys
import re
import time
import difflib
import datetime
import collections
import urllib.request

API = 'https://nobisyop.vercel.app/api/data'
NAME_THRESHOLD = 0.75
DAY_WINDOW = 21


def get_inventory():
    import cloud_get
    return cloud_get.get_cloud()['inventory']


def norm(s):
    return re.sub(r'[\s　【】\[\]◆◇○●★☆※！!・/／\-–—_,、。．.]', '', (s or '')).lower()


def as_date(s):
    try:
        return datetime.date.fromisoformat((s or '')[:10])
    except Exception:
        return None


def num(x):
    try:
        return int(float(x))
    except Exception:
        return None


def main():
    out_path = sys.argv[1]
    parsed_paths = sys.argv[2:]
    inv = get_inventory()

    known_aid = {v['yahooAuctionId'] for v in inv if v.get('yahooAuctionId')}
    pool = [[norm(v.get('productName')), as_date(v.get('purchaseDate')),
             num(v.get('purchasePrice')) or num(v.get('itemPriceTaxIn')) or 0, v]
            for v in inv if not v.get('yahooAuctionId')]

    cands = []
    for path in parsed_paths:
        for od in json.load(open(path)):
            if od.get('truncated'):
                continue
            weights = [(it['unitPrice'] or 0) * it['qty'] for it in od['items']]
            total = sum(weights) or 1
            for it, w in zip(od['items'], weights):
                ship = round((od['shipping'] or 0) * w / total)
                cands.append({'order': od, 'item': it, 'price': w, 'ship': ship})

    seen_aid = set()
    registered, missing, dup = [], [], []
    used = set()
    for c in cands:
        aid = c['item']['auctionId']
        if aid in seen_aid:
            dup.append(c)
            continue
        seen_aid.add(aid)
        if aid in known_aid:
            registered.append(c)
            continue

        n = norm(c['item']['name'])
        md = as_date(c['order']['purchasedAt'])
        best = (0.0, None)
        for i, (pn, vd, vp, v) in enumerate(pool):
            if i in used:
                continue
            gap = abs((md - vd).days) if (md and vd) else 999
            if gap > DAY_WINDOW:
                continue
            ratio = difflib.SequenceMatcher(None, n[:60], pn[:60]).ratio() if (pn and n) else 0.0
            if vp in (c['price'], c['price'] + c['ship']):
                ratio = max(ratio, 0.9)
            if ratio > best[0]:
                best = (ratio, i)
        if best[0] >= NAME_THRESHOLD:
            used.add(best[1])
            registered.append(c)
        else:
            missing.append(c)

    json.dump(missing, open(out_path, 'w'), ensure_ascii=False)
    print(f'メール商品 {len(cands)} 点 / メール内の重複 {len(dup)} 点')
    print(f'  登録済みと判定 {len(registered)} 点')
    print(f'  未登録候補     {len(missing)} 点 → {out_path}')
    print('  未登録候補の月別:',
          dict(sorted(collections.Counter((c['order']['purchasedAt'] or '?')[:7] for c in missing).items())))


if __name__ == '__main__':
    main()

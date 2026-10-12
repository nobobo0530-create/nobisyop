#!/usr/bin/env python3
"""メールにあって台帳に無いヤフオク仕入れを新規登録する。

使い方:
    python3 tools/mail_register_new.py <candidates.json> [--apply]

candidates.json は mail_match_missing.py が作る
[{'order':…, 'item':…, 'price':…, 'ship':…}, …] 形式。
既定はプレビューのみ。--apply でクラウドへ invUpsert する。
"""
import json
import os
import sys
import time
import urllib.request
import datetime

API = 'https://nobisyop.vercel.app/api/data'


def get_inventory():
    import cloud_get
    return cloud_get.get_cloud()['inventory']


def mgmt_no(purchase_date, price, divisor=100):
    pd = purchase_date.replace('-', '')[2:]
    return f'{pd}-0000-{price // divisor}-{price % divisor}'


def tax_ex(tax_in, rate=10):
    return 0 if not tax_in else round(tax_in / (1 + rate / 100))


def build(cands, inv):
    """重複を避けつつ新規レコードを組み立てる"""
    known_aid = {v['yahooAuctionId'] for v in inv if v.get('yahooAuctionId')}
    base = int(time.time() * 1000)
    now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
    recs, skipped = [], []

    for n, c in enumerate(cands):
        od, it = c['order'], c['item']
        aid = it['auctionId']
        if aid in known_aid:
            skipped.append(aid)
            continue
        known_aid.add(aid)

        price = c['price']
        ship = c['ship']
        coupon = c.get('coupon', 0)
        total = price + ship - coupon
        pdate = (od['purchasedAt'] or '')[:10]

        recs.append({
            'id': str(base + n),
            'yahooAuctionId': aid,
            'productName': (it['name'] or '').strip(),
            'purchaseDate': pdate,
            'purchaseStore': od['store'],
            'purchaseType': 'online',
            'purchaseTypeSource': 'mail',
            'itemPriceTaxIn': price,
            'itemTaxRate': 10,
            'shippingTaxIn': ship,
            'shippingTaxRate': 10,
            'couponTaxIn': coupon,
            **({'couponNote': c['couponNote']} if c.get('couponNote') else {}),
            **({k: c[k] for k in ('bundleGroup', 'bundleType', 'bundleLabel') if c.get(k)}),
            'optionalFeeTaxIn': 0,
            'optionalTaxRate': 10,
            'showOptionalFee': False,
            'purchasePrice': total,
            'purchaseCost': {
                'itemPriceTaxIn': price,
                'itemPriceTaxEx': tax_ex(price),
                'shippingTaxIn': ship,
                'shippingTaxEx': tax_ex(ship),
                **({'couponTaxIn': coupon, 'couponNote': c.get('couponNote', '')} if coupon else {}),
                'optionalFeeTaxIn': 0,
                'optionalFeeTaxEx': 0,
                'itemTaxRate': 10,
                'shippingTaxRate': 10,
                'optionalTaxRate': 10,
                'totalTaxIn': total,
                'totalTaxEx': tax_ex(price) + tax_ex(ship),
            },
            'mgmtNo': mgmt_no(pdate, total) if pdate else '',
            'status': 'unlisted',
            **({'brand': c['brand']} if c.get('brand') else {}),
            **({'category': c['category']} if c.get('category') else {}),
            'priceUnconfirmed': False,
            'photos': [],
            'listPrice': '',
            'listDate': '',
            'notes': f'メール取込 注文{od["orderId"]}',
            'createdAt': now,
            'updatedAt': now,
        })
    return recs, skipped


def main():
    path = sys.argv[1]
    apply = '--apply' in sys.argv
    cands = json.load(open(path))
    inv = get_inventory()
    recs, skipped = build(cands, inv)

    print(f'候補 {len(cands)} 点 / 新規登録 {len(recs)} 点 / 重複でスキップ {len(skipped)} 点')
    print()
    print('仕入日        オークションID   商品代     送料    合計  仕入先')
    for r in sorted(recs, key=lambda x: x['purchaseDate'])[:40]:
        print(f'{r["purchaseDate"]}  {r["yahooAuctionId"]:<12} {r["itemPriceTaxIn"]:>7} {r["shippingTaxIn"]:>7} '
              f'{r["purchasePrice"]:>7}  {r["purchaseStore"][:18]}')
    if len(recs) > 40:
        print(f'  … 他 {len(recs) - 40} 点')
    print()
    print('商品代計 ¥{:,} / 送料計 ¥{:,} / 仕入原価計 ¥{:,}'.format(
        sum(r['itemPriceTaxIn'] for r in recs),
        sum(r['shippingTaxIn'] for r in recs),
        sum(r['purchasePrice'] for r in recs)))

    if not apply:
        print('\n（プレビューのみ。反映するには --apply）')
        return

    stamp = time.strftime('%Y%m%d_%H%M%S')
    backup = (sys.argv[sys.argv.index('--backup') + 1] if '--backup' in sys.argv
              else f'/tmp/yc/backup_{stamp}.json')
    os.makedirs(os.path.dirname(backup), exist_ok=True)
    json.dump(inv, open(backup, 'w'), ensure_ascii=False)
    print('バックアップ:', backup)

    for i in range(0, len(recs), 25):
        chunk = recs[i:i + 25]
        body = json.dumps({'invUpsert': [{'id': r['id'], 'data': r} for r in chunk]}).encode()
        req = urllib.request.Request(API, data=body, headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=120).read()
        print(f'  {min(i + 25, len(recs))}/{len(recs)}')
    print(f'{len(recs)} 点を新規登録しました')


if __name__ == '__main__':
    main()

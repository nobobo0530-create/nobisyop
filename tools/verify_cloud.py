#!/usr/bin/env python3
"""クラウドのデータを点検する。修正したあとは必ずこれを2回走らせる。

  1回目: 書き込んだ直後（書いた内容がそのまま入っているか）
  2回目: 数分おいてから／iPhoneでアプリを開いてから
         （端末の古いデータに押し戻されていないか）

使い方:
  python3 tools/verify_cloud.py            # 点検だけ
  python3 tools/verify_cloud.py --wait 180 # 180秒待ってからもう一度点検（二重チェック）

問題が1つでもあれば終了コード1で終わる。
"""
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mail_apply_shipping import build_updates  # noqa: E402

API = 'https://nobisyop.vercel.app/api/data'
MAIL = os.path.expanduser('~/Documents/nobushop_mail/')
PARSED = ['new_purchase_parsed.json', 'docomo_purchase_parsed.json', 'new_delta_0930_parsed.json']

# 売上が無くても売却済みでよいと確認済みの在庫（ユーザー判断待ちのものもここに書く）
SOLD_WITHOUT_SALE_OK = {
    '1776329025545_split_0',   # バーバリー[A]（2着か重複かユーザー確認中）
}


def fetch():
    for attempt in range(5):
        try:
            with urllib.request.urlopen(API, timeout=120) as fh:
                return json.load(fh)
        except Exception as e:
            print(f'  取得リトライ {attempt + 1}: {e}', file=sys.stderr)
            time.sleep(3)
    raise SystemExit('クラウドから取得できませんでした')


def check(d):
    inv, sales = d['inventory'], d['sales']
    tomb = (d.get('settings') or {}).get('_deletedIds') or {}
    problems = []

    # 1) テスト由来のデータ
    for s in sales:
        if 'テスト' in (s.get('purchaseStore') or ''):
            problems.append(f'テスト売上が残っている: {s["id"]} {s.get("productName", "")[:20]}')
    for v in inv:
        if 'テスト仕入' in (v.get('purchaseStore') or ''):
            problems.append(f'仕入先がテスト: {v["id"]}')

    # 2) 削除済みなのに残っている
    for x in inv + sales:
        if x['id'] in tomb:
            problems.append(f'削除済みなのに残っている: {x["id"]}')

    # 3) 売却済みと売上の食い違い
    sold_ids = {s.get('inventoryId') for s in sales if s.get('inventoryId')}
    for v in inv:
        if v.get('status') == 'sold' and v['id'] not in sold_ids and v['id'] not in SOLD_WITHOUT_SALE_OK:
            problems.append(f'売上が無いのに売却済み: {v["id"]} {(v.get("productName") or "")[:25]}')
        if v['id'] in sold_ids and v.get('status') != 'sold':
            problems.append(f'売上があるのに売却済みでない: {v["id"]}')

    # 4) メールの送料・クーポン・仕入値と一致しているか
    #    手入力で登録済みだった商品（後からオークションIDだけ付けたもの）はユーザーの入力を正とするので対象外
    manual = set()
    if os.path.exists(MAIL + 'aid_linked_0930.json'):
        manual = set(json.load(open(MAIL + 'aid_linked_0930.json')))
    for f in PARSED:
        path = MAIL + f
        if not os.path.exists(path):
            continue
        ups, _u, _t = build_updates(json.load(open(path)), inv)
        for old, rec, _od, it in ups:
            if old['id'] in manual:
                continue
            if '_split_' in old['id'] or old.get('splitOrigin'):
                continue  # 分割登録された商品は内訳を按分済み（メール全額とは一致しないのが正しい）
            oc = old.get('purchaseCost') or {}
            if (old.get('purchasePrice'), old.get('shippingTaxIn'), oc.get('couponTaxIn')) != \
               (rec['purchasePrice'], rec['shippingTaxIn'], rec['purchaseCost'].get('couponTaxIn')):
                problems.append(
                    f'メールと金額が違う: {it["auctionId"]} 仕入値 {old.get("purchasePrice")}→{rec["purchasePrice"]} '
                    f'送料 {old.get("shippingTaxIn")}→{rec["shippingTaxIn"]}')

    unconfirmed = sum(1 for v in inv if v.get('priceUnconfirmed'))
    print(f'在庫 {len(inv)} 点 / 売上 {len(sales)} 件 / 送料未確定 {unconfirmed} 点 / 削除記録 {len(tomb)} 件')
    return problems


def run_once(label):
    print(f'── {label} ──')
    problems = check(fetch())
    if problems:
        print(f'✗ 問題 {len(problems)} 件')
        for p in problems[:40]:
            print('  ' + p)
    else:
        print('✓ 問題なし')
    return problems


def main():
    problems = run_once('1回目')
    if '--wait' in sys.argv:
        sec = int(sys.argv[sys.argv.index('--wait') + 1])
        print(f'{sec}秒待って押し戻しが無いか確認します…', flush=True)
        time.sleep(sec)
        problems = run_once('2回目')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()

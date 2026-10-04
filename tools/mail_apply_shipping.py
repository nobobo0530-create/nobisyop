#!/usr/bin/env python3
"""ヤフオクの購入確認メールから、台帳の「送料未確定」在庫に
送料・クーポン・仕入先を埋める。

使い方:
  python3 tools/mail_apply_shipping.py <purchase_parsed.json>          # 下見だけ
  python3 tools/mail_apply_shipping.py <purchase_parsed.json> --apply  # クラウドに反映

照合は **オークションIDだけ** で行う。メールの「購入日時」はストア出品だと
落札日から数日ズレるので、日付では絶対に突き合わせない。

まとめて取引（1注文に複数商品）の送料は均等割り、クーポンは一番高い商品1点から引く。
どちらも合計がメールの金額とぴたり合うようにしている。
"""
import json
import os
import sys
import time
import datetime
import urllib.request

API = 'https://nobisyop.vercel.app/api/data'


def get_inventory():
    for attempt in range(5):
        try:
            with urllib.request.urlopen(API, timeout=60) as fh:
                return json.load(fh)['inventory']
        except Exception as e:
            print(f'  取得リトライ {attempt + 1}: {e}', file=sys.stderr)
            time.sleep(3)
    raise SystemExit('クラウドから在庫を取得できませんでした')


def allocate(total, weights):
    """total を weights の比で分ける。端数は最後に寄せて合計を合わせる。"""
    if not weights or total == 0:
        return [0] * len(weights)
    base = sum(weights) or len(weights)
    out = [int(total * w / base) for w in weights]
    out[-1] += total - sum(out)
    return out


def split_even(total, n):
    """total を n 点に均等に分ける。1200円/2点→600,600。割り切れない端数は
    先頭から1円ずつ足す（1000円/3点→334,333,333）。
    送料は商品の値段に関係なくかかるので、金額按分ではなく均等割りにする
    （2026-09-30 ユーザー指定）"""
    if n == 0:
        return []
    base, rest = divmod(total, n)
    return [base + (1 if i < rest else 0) for i in range(n)]


def coupon_to_top(total, weights):
    """クーポンを一番高い商品1点にまとめて載せる。同額なら先に出てきた方"""
    out = [0] * len(weights)
    if weights and total:
        out[max(range(len(weights)), key=lambda i: (weights[i], -i))] = total
    return out


def build_updates(orders, inv):
    by_aid = {v['yahooAuctionId']: v for v in inv if v.get('yahooAuctionId')}
    updates, unmatched, truncated = [], [], []

    for od in orders:
        if od.get('truncated'):
            # 本文が5点で打ち切られている。送料を按分すると残りの商品の分まで
            # 載ってしまうので触らない
            truncated.append(od)
            continue
        items = od['items']
        weights = [(it['unitPrice'] or 0) * it['qty'] for it in items]
        ships = split_even(od['shipping'] or 0, len(items))
        # クーポンは注文の中で一番高い商品1点からだけ引く（2026-09-30 ユーザー指定）
        coupons = coupon_to_top(od['coupon'] or 0, weights)

        for it, ship, coupon in zip(items, ships, coupons):
            v = by_aid.get(it['auctionId'])
            if not v:
                unmatched.append((od, it))
                continue
            # 分割登録された商品は注文全額ではなく按分済み。上書きしない
            if '_split_' in str(v.get('id', '')) or v.get('splitOrigin'):
                continue
            price = (it['unitPrice'] or 0) * it['qty']
            rec = dict(v)
            rec['purchaseStore'] = od['store']
            rec['shippingTaxIn'] = ship
            rec['itemPriceTaxIn'] = price
            # アプリの仕様: purchasePrice = 商品代 + 送料 - クーポン（税込合計）
            rec['purchasePrice'] = price + ship + coupon
            rec['couponTaxIn'] = -coupon          # クーポンはメール上マイナス表記
            rec['couponNote'] = f'ヤフオククーポン {od["orderId"]}' if coupon else ''
            rec['priceUnconfirmed'] = False
            cost = dict(rec.get('purchaseCost') or {})
            cost.update({
                'itemPriceTaxIn': price,
                'shippingTaxIn': ship,
                'totalTaxIn': price + ship + coupon,
                'totalTaxEx': round((price + ship + coupon) / 1.1),
            })
            # アプリの編集画面は purchaseCost.couponTaxIn を読む。ここに無いと
            # 編集→保存したときにクーポンが消えて仕入値が値引き前に戻る
            if coupon:
                cost['couponTaxIn'] = -coupon
                cost['couponNote'] = rec['couponNote']
            else:
                cost.pop('couponTaxIn', None)
                cost.pop('couponNote', None)
            rec['purchaseCost'] = cost
            # ★ updatedAt を必ず今にする（絶対に消さない）
            # これを忘れると、アプリのマージ判定（updatedAt||createdAt の新しい方が勝つ）で
            # 端末に残っている取り込み前の古いコピーと引き分け→ローカル優先になり、
            # せっかく書いた送料・仕入先がクラウドに押し戻されて消える（2026-09-26に331点やらかした）
            rec['updatedAt'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
            updates.append((v, rec, od, it))

    return updates, unmatched, truncated


def preview(updates, unmatched, truncated):
    print(f'照合できた {len(updates)} 点 / できなかった {len(unmatched)} 点')
    if truncated:
        print(f'本文が打ち切られていて手を付けなかった注文 {len(truncated)} 件: '
              + ', '.join(o['orderId'] for o in truncated[:10]))
    print()
    print('%-12s %-9s %9s %7s %7s  %s' % ('オークションID', '仕入日', '商品代', '送料', 'クーポン', '仕入先'))
    for old, rec, od, it in updates[:80]:
        print('%-12s %-9s %9s %7s %7s  %s' % (
            it['auctionId'], old.get('purchaseDate', ''),
            f"{rec['itemPriceTaxIn']:,}", f"{rec['shippingTaxIn']:,}",
            f"{-rec['couponTaxIn']:,}" if rec['couponTaxIn'] else '',
            od['store']))
    if len(updates) > 80:
        print(f'  … 他 {len(updates) - 80} 点')
    print()
    print('送料合計   ¥{:,}'.format(sum(r['shippingTaxIn'] for _o, r, _d, _i in updates)))
    print('クーポン計 ¥{:,}'.format(sum(-r['couponTaxIn'] for _o, r, _d, _i in updates)))
    changed = sum(1 for o, r, _d, _i in updates if o.get('itemPriceTaxIn') != r['itemPriceTaxIn'])
    print(f'商品代が変わる点数 {changed}')


def apply(updates):
    ok = 0
    for _old, rec, _od, _it in updates:
        body = json.dumps({'invUpsert': [{'id': rec['id'], 'data': rec}]}).encode()
        req = urllib.request.Request(API, data=body,
                                     headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=60) as fh:
            json.load(fh)
        ok += 1
        if ok % 25 == 0:
            print(f'  {ok}/{len(updates)}', flush=True)
    print(f'{ok} 点を更新しました')


def main():
    orders = json.load(open(sys.argv[1]))
    inv = get_inventory()
    print(f'クラウド在庫 {len(inv)} 点 / 送料未確定 '
          f'{sum(1 for v in inv if v.get("priceUnconfirmed"))} 点')

    updates, unmatched, truncated = build_updates(orders, inv)
    preview(updates, unmatched, truncated)

    if '--apply' in sys.argv:
        if not updates:
            raise SystemExit('更新対象がありません')
        stamp = time.strftime('%Y%m%d_%H%M%S')
        # /tmp は揮発するので必ず永続フォルダへ
        backup = os.path.expanduser(f'~/Documents/nobushop_mail/backup_{stamp}.json')
        json.dump(inv, open(backup, 'w'), ensure_ascii=False)
        print(f'バックアップ: {backup}')
        apply(updates)


if __name__ == '__main__':
    main()

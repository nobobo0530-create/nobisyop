#!/usr/bin/env python3
"""ヤフオクの「ご購入の確認」メール本文から仕入れデータを取り出す。

使い方:
  python3 tools/mail_parse_yahoo.py <mail_purchase.json> <out.json>

1通に複数のオークションIDが並ぶ（まとめて取引）ことがある。その場合は
送料・クーポンは注文全体に1つしか載らないので、注文単位でまとめたうえで
商品ごとの行も持たせる。
"""
import json
import re
import sys

YEN = r'([\-−▲]?[\d,]+)\s*円'


def yen(s):
    if s is None:
        return None
    s = s.replace(',', '').replace('−', '-').replace('▲', '-')
    try:
        return int(s)
    except ValueError:
        return None


def grab(body, label):
    m = re.search(label + r'[　\s]*[:：][　\s]*(.*)', body)
    return m.group(1).strip() if m else ''


def grab_yen(body, label):
    m = re.search(label + r'[　\s]*[:：][　\s]*' + YEN, body, re.M)
    return yen(m.group(1)) if m else None


def parse_datetime(s):
    m = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})時(\d{1,2})分', s)
    if not m:
        return ''
    y, mo, d, h, mi = (int(x) for x in m.groups())
    return f'{y:04d}-{mo:02d}-{d:02d}T{h:02d}:{mi:02d}'


def parse(mail):
    body = (mail.get('body') or '').replace('\r\n', '\n')
    rec = {
        'mailId': mail.get('index'),
        'subject': mail.get('subject', ''),
        'store': grab(body, 'ストア名'),
        'orderId': grab(body, '注文ID'),
        'purchasedAt': parse_datetime(grab(body, '購入日時')),
        'itemTotal': grab_yen(body, '商品の合計金額'),
        'shipping': grab_yen(body, '送料'),
        'paypay': grab_yen(body, r'PayPay残高(?:等)?利用額'),
        'coupon': grab_yen(body, 'クーポン利用分'),
        'total': grab_yen(body, r'^合計金額'),
        'items': [],
    }

    # 「オークションID：xxx」→「商品情報：...」→「N,NNN円×M＝...」の繰り返し
    blocks = re.split(r'オークションID[　\s]*[:：][　\s]*', body)[1:]
    for b in blocks:
        aid = re.match(r'([A-Za-z]?\d+)', b.strip())
        if not aid:
            continue
        name = grab(b, '商品情報')
        pm = re.search(YEN + r'\s*[×x✕]\s*(\d+)', b)
        price = yen(pm.group(1)) if pm else None
        qty = int(pm.group(2)) if pm else 1
        rec['items'].append({
            'auctionId': aid.group(1),
            'name': name,
            'unitPrice': price,
            'qty': qty,
        })

    # 6点以上まとめて買うと本文は5点で打ち切られ「他 N 件」とだけ書かれる。
    # 残りの商品はメールからは分からないので、按分せず人が見る。
    hid = re.search(r'^他\s*(\d+)\s*件\s*$', body, re.M)
    rec['hiddenCount'] = int(hid.group(1)) if hid else 0
    rec['truncated'] = bool(rec['hiddenCount'])
    return rec


def main():
    mails = json.load(open(sys.argv[1]))
    if isinstance(mails, dict):
        flat = []
        for v in mails.values():
            flat.extend(v)
        mails = flat
    out = [parse(m) for m in mails]
    json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)

    n_items = sum(len(r['items']) for r in out)
    bad = [r for r in out if not r['items']]
    multi = [r for r in out if len(r['items']) > 1]
    cut = [r for r in out if r['truncated']]
    print(f'{len(out)} 通 / 商品 {n_items} 点 / まとめて取引 {len(multi)} 件 / 商品が取れなかったメール {len(bad)} 通')
    if cut:
        print(f'本文が5点で打ち切られている注文 {len(cut)} 件（隠れている商品 '
              f'{sum(r["hiddenCount"] for r in cut)} 点）— 送料の按分はできないので要手作業')


if __name__ == '__main__':
    main()

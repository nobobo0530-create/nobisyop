#!/usr/bin/env python3
"""ヤフオク仕入れを「Claudeの確認待ち」に下書き(purchaseDraft)として入れる。ユーザーがアプリで「登録する」を押すと在庫になる。
  python3 tools/yahoo_purchase_drafts.py orders.json            # ドライラン（既定）
  python3 tools/yahoo_purchase_drafts.py orders.json --apply    # 実際に投稿
orders.json = [{"aid","item","ship","coupon","store","orderId","date","category","paymentMethod","note"}, ...]
  paymentMethod は 'PayPay銀行' か 'PayPay残高'（省略時 PayPay残高）。coupon/note/category は省略可。
- 在庫に同じ yahooAuctionId がある／確認待ち(open)・登録済み(approved)の下書きにある注文はスキップ（却下・保留は触らない）
- 500が返ったら即中止。5件ずつ投稿。?full=1は使わない
"""
import sys, os, re, io, json, time, html, base64, datetime, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloud_get
import mail_register_new as R
import fill_brand_category as F
from PIL import Image

UA = {'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15'}
MAX_THUMB = 40000


def fetch(u):
    try:
        return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
    except Exception:
        return None


def og(h, prop):
    m = re.findall(r'<meta[^>]+property="og:%s"[^>]+content="([^"]+)"' % prop, h)
    return html.unescape(m[0]) if m else None


def thumb(img_bytes):
    im = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    for side, q in ((300, 60), (260, 55), (220, 50), (180, 45), (140, 40)):
        c = im.copy(); c.thumbnail((side, side), Image.LANCZOS)
        b = io.BytesIO(); c.save(b, 'JPEG', quality=q)
        uri = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
        if len(uri) <= MAX_THUMB:
            return uri
    return None


def page_info(aid):
    h = fetch(f'https://page.auctions.yahoo.co.jp/jp/auction/{aid}'); time.sleep(1)
    if not h:
        return None, None
    h = h.decode('utf8', 'ignore')
    t = og(h, 'title')
    t = t.replace(' - Yahoo!オークション', '').strip() if t else None
    img = og(h, 'image')
    b = fetch(img) if img else None
    uri = thumb(b) if b and len(b) >= 500 else None
    return t, uri


def guess_brand(t):
    try:
        b = F.guess_brand(t)
        return None if not b else (b if isinstance(b, str) else b[0])
    except Exception:
        return None


def build(o, title, thumb_uri, base, n, now):
    aid, item, ship, cpn = o['aid'], int(o['item']), int(o.get('ship') or 0), int(o.get('coupon') or 0)
    pd, store, oid = o['date'], o['store'], o['orderId']
    pay = o.get('paymentMethod') or 'PayPay残高'
    tot = item + ship - cpn
    t = title or f'ヤフオク {aid}'
    note = o.get('note') or (f'メール取込 注文{oid}／{pay}' + (f'／クーポン-{cpn}' if cpn else ''))
    draft = {
        'yahooAuctionId': aid, 'orderId': oid, 'productName': t, 'purchaseDate': pd, 'purchaseStore': store,
        'purchaseType': 'online', 'purchaseTypeSource': 'mail', 'purchaseStoreType': 'yahoo', 'paymentMethod': pay,
        'purchasePrice': tot, 'itemPriceTaxIn': item, 'itemTaxRate': 10, 'shippingTaxIn': ship, 'shippingTaxRate': 10,
        'couponTaxIn': cpn, 'optionalFeeTaxIn': 0, 'optionalTaxRate': 10, 'showOptionalFee': False,
        'purchaseCost': {'itemPriceTaxIn': item, 'itemPriceTaxEx': R.tax_ex(item), 'shippingTaxIn': ship, 'shippingTaxEx': R.tax_ex(ship),
                         'optionalFeeTaxIn': 0, 'optionalFeeTaxEx': 0, 'couponTaxIn': cpn, 'itemTaxRate': 10, 'shippingTaxRate': 10,
                         'optionalTaxRate': 10, 'totalTaxIn': tot, 'totalTaxEx': R.tax_ex(tot)},
        'mgmtNo': R.mgmt_no(pd, tot), 'status': 'unlisted', 'brand': guess_brand(t) or '', 'category': o.get('category') or '',
        'priceUnconfirmed': False, 'listPrice': '', 'listDate': '', 'notes': note,
        'photos': [{'source': 'yahoo_listing', 'thumbDataUrl': thumb_uri}] if thumb_uri else [],
    }
    return {'id': f'cp_pd_{aid}', 'type': 'purchaseDraft', 'status': 'open', 'title': t, 'confidence': '高',
            'payment': {'date': pd, 'amount': tot, 'store': store, 'method': pay}, 'note': note,
            'draft': draft, 'createdAt': now, 'updatedAt': now}


def post(body):
    for k in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(cloud_get.API, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}), timeout=180).read()[:200]
        except Exception as e:
            print('ERR', k, e)
            if '500' in str(e):
                sys.exit('500が返ったので中止しました')
            time.sleep(15 * (k + 1))
    sys.exit('投稿に失敗しました')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    apply_ = '--apply' in sys.argv
    if not args:
        sys.exit(__doc__)
    orders = json.load(open(args[0]))
    cloud = cloud_get.get_cloud(max_age=0)
    have = {str(i.get('yahooAuctionId') or '').strip().lower() for i in cloud.get('inventory', [])}
    for p in cloud.get('claudeProposals', []):
        if p.get('type') == 'purchaseDraft' and p.get('status') in ('open', 'approved', 'held'):
            have.add(str((p.get('draft') or {}).get('yahooAuctionId') or '').strip().lower())
    now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
    base = int(time.time() * 1000)
    out, seen = [], set()
    for n, o in enumerate(orders):
        a = str(o['aid']).strip().lower()
        if a in have or a in seen:
            print('スキップ（登録済み/下書き済み）', o['aid']); continue
        seen.add(a)
        title, uri = page_info(o['aid'])
        if not uri:
            print('写真なし', o['aid'])
        pr = build(o, title, uri, base, n, now)
        out.append(pr)
        d = pr['draft']
        print(('投稿' if apply_ else '下書き(ドライラン)'), o['aid'], d['purchasePrice'], d['mgmtNo'], d['brand'], d['productName'][:40], f"photo={len(uri or '')}B")
    if not out:
        print('新しい下書きはありません'); return
    if not apply_:
        print(f'ドライラン：{len(out)}件。--apply で投稿'); return
    for i in range(0, len(out), 5):
        print(post({'proposalsUpsert': out[i:i + 5]}))
    cloud_get.invalidate()
    print(f'{len(out)}件を確認待ちに入れました')


if __name__ == '__main__':
    main()

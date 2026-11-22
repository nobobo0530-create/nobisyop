#!/usr/bin/env python3
"""ヤフオクで落札された自分の出品を、メールに頼らずに見つける（読むだけ。ログイン不要）。

  python3 ~/nobushop-pwa/tools/yahoo_sold_watch.py

なぜ：2026-11-08 を最後に、ヤフオクの売上メールが Mail に届かなくなった。11/14〜11/22 の落札6点（合計 ¥172,980）が
     アプリに入らず、そのうち1点（発送済み）はメルカリとラクマに出品が残っていた（2026-11-22 にユーザーが気づいた）。
やり方：
  1. 出品者ページ（公開）から、今の出品のIDを取る。
  2. 前に見たID（listings/yahoo_seen.json）のうち、今は無い物の商品ページ（公開）を開く。
     「終了・入札1以上」＝落札、「終了・入札0」＝落札なしで終了、404＝取り消し。結果は yahoo_seen.json に残し、同じ物は二度開かない。
  3. 落札のうち、アプリの売上（platformId）に無い物を出す。同じ管理番号がラクマ・メルカリの出品記録に残っていれば、それも出す。
決まり：
  - クラウドは cloud_get.get_cloud(max_age=600) を1回（健康チェックの直後なら読み直さない）。書き込みはしない。
  - 取れなかったページはやり直さない（次の回にまた見る）。
  - メルカリの出品記録（listings/mercari_items.json）は組み込みブラウザで更新した時点の物。古い時は、その日付を出す。
  - ここで見つけた売上の登録は、手順書（ref_sales.md の「ヤフオクの売上」）のとおり。見本は ~/Documents/nobushop_mail/daily_1122/yahoo_sales_1122.py。
"""
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloud_get  # noqa: E402
import listings_audit as LA  # noqa: E402

SEEN = os.path.join(LA.LDIR, 'yahoo_seen.json')


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': LA.UA}), timeout=30) as r:
        data = r.read().decode('utf-8', 'replace')
    time.sleep(1)
    return data


def current_listing():
    out, b = {}, 1
    while True:
        nd = LA.next_data(get(LA.YAHOO_SELLER + ('?fixed=0&b=%d&n=50&select=23&mode=3' % b if b > 1 else '')))
        lst = nd['props']['pageProps']['initialState']['search']['items']['listing']
        for it in lst['items']:
            out[it['auctionId']] = {'title': it['title'], 'price': it.get('buyNowPrice') or it.get('price')}
        if len(lst['items']) < 50 or b + 50 > lst.get('totalResultsAvailable', 0):
            return out
        b += 50


def main():
    now = datetime.now().strftime('%Y-%m-%d %H:%M')
    try:
        seen = json.load(open(SEEN))
    except (OSError, ValueError):
        seen = {}
    try:
        cur = current_listing()
    except Exception as e:  # やり直さない
        sys.exit('ヤフオクの出品一覧が取れませんでした（やり直さず終了）: %s' % e)
    for aid, v in cur.items():
        s = seen.setdefault(aid, {'firstSeen': now})
        s.update(title=v['title'], price=v['price'], lastSeen=now, state='active')
    for aid, s in seen.items():
        if aid in cur or s.get('state') != 'active':
            continue
        try:
            it = LA.next_data(get('https://auctions.yahoo.co.jp/jp/auction/' + aid))['props']['pageProps']['initialState']['item']['detail']['item']
        except urllib.error.HTTPError as e:
            if e.code == 404:
                s.update(state='gone', checkedAt=now)
            else:
                print('取得できず（次の回に見る）', aid, e)
            continue
        except Exception as e:  # noqa: BLE001
            print('取得できず（次の回に見る）', aid, e)
            continue
        if it.get('status') != 'closed':
            continue  # 一覧に出ていないだけで、まだ出品中
        text = html.unescape(re.sub(r'<[^>]+>', '\n', it.get('descriptionHtml') or ''))
        s.update(state='sold' if (it.get('bids') or 0) >= 1 else 'ended', checkedAt=now, title=it.get('title') or s.get('title'),
                 soldPrice=it.get('price'), endTime=it.get('endTime'), mgmt=LA.extract_mgmt(text),
                 img=((it.get('img') or [{}])[0]).get('image'))
    with open(SEEN, 'w') as f:
        json.dump(seen, f, ensure_ascii=False, indent=1)

    d = cloud_get.get_cloud(max_age=600)
    pids = {str(s.get('platformId')) for s in d['sales']}
    sold = sorted(((a, s) for a, s in seen.items() if s.get('state') == 'sold'), key=lambda x: x[1].get('endTime') or '')
    miss = [(a, s) for a, s in sold if a not in pids]
    print('今の出品 %d 点 / 落札と分かった物 %d 点 / そのうちアプリの売上に無い物 %d 点' % (len(cur), len(sold), len(miss)))
    try:
        rk = {k: v for k, v in json.load(open(LA.RAKUMA_JSON)).items() if isinstance(v, dict) and not v.get('missing') and not v.get('soldSeen')}
    except (OSError, ValueError):
        rk = {}
    try:
        mj = json.load(open(LA.MERCARI_JSON))
    except (OSError, ValueError):
        mj = {'items': {}}
    for a, s in miss:
        print('== 未登録の落札: %s | ¥%s | %s 終了 | 管理番号 %s | %s' % (a, s.get('soldPrice'), (s.get('endTime') or '')[:16], s.get('mgmt'), s.get('title')))
        mg = s.get('mgmt')
        if not mg:
            continue
        for k, v in rk.items():
            if (v.get('mgmtNo') or '') == mg:
                print('   ラクマに同じ管理番号の出品（最後に見た %s）: ¥%s %s' % (v.get('lastSeen'), v.get('price'), v.get('title')))
        for k, v in (mj.get('items') or {}).items():
            if (v.get('mgmt') or '') == mg:
                print('   メルカリに同じ管理番号の出品（%s 時点の記録）: ¥%s %s' % (mj.get('scannedAt'), v.get('price'), v.get('title')))
    if miss:
        print('※ 管理番号が日付だけの物は、同じ日の別の出品も出る。題名と写真で同じ物か確かめてから伝える。')


if __name__ == '__main__':
    main()

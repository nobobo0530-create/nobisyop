#!/usr/bin/env python3
"""表紙サムネイルを settings 行から coverThumbs 行へ移す（一度だけ実行・2026-10-30）
手順: 1) バックアップJSONのサムネイルを coverThumbsUpsert で専用行へ書く
      2) GET ?coverThumbs=1 で全件あることを確認
      3) その後はじめて、settings(サムネイル無し)を POST して settings 行からサムネイルを外す
使い方: python3 tools/migrate_cover_thumbs.py [バックアップJSON]  （既定: ~/Documents/nobushop_mail/backup_settings_before_covers_1030.json）
  --strip を付けると手順3まで実行。付けないと手順1,2まで。
"""
import json, os, sys, time, urllib.request

API = 'https://nobisyop.vercel.app/api/data'
BK = os.path.expanduser('~/Documents/nobushop_mail/backup_settings_before_covers_1030.json')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
if args: BK = args[0]
do_strip = '--strip' in sys.argv

def req(method, url, body=None, timeout=120):
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=timeout) as fh:
        return json.load(fh)

bk = json.load(open(BK))
covers = bk['settings']['bundleCovers']
thumbs = {k: v['thumbDataUrl'] for k, v in covers.items() if isinstance(v, dict) and isinstance(v.get('thumbDataUrl'), str) and v['thumbDataUrl'].startswith('data:image')}
print(f'バックアップ: 表紙{len(covers)}件 / サムネイル{len(thumbs)}件')
assert len(thumbs) > 0

print('1) coverThumbsUpsert で書き込み...')
print('  ', req('POST', API, {'coverThumbsUpsert': thumbs}))
time.sleep(2)

print('2) GET ?coverThumbs=1 で確認...')
got = req('GET', API + '?coverThumbs=1')
ct = got.get('coverThumbs', {})
missing = [k for k, v in thumbs.items() if ct.get(k) != v]
print(f'   取得 {len(ct)}件 / 不一致・欠け {len(missing)}件 / sig={got.get("coverThumbsSig")}')
if missing:
    print('NG: 欠けがあるので settings は触りません'); sys.exit(1)
if not do_strip:
    print('OK（--strip を付けて再実行すると settings からサムネイルを外します）'); sys.exit(0)

print('3) settings(サムネイル無し)を POST して settings 行から外す...')
# バックアップの古い設定で上書きしないよう、いまのクラウドの settings(新サーバーはサムネイル無しで返す)をそのまま送る
cur = req('GET', API)['settings']
st = {**cur, 'bundleCovers': {k: ({kk: vv for kk, vv in v.items() if kk != 'thumbDataUrl'} if isinstance(v, dict) else v) for k, v in cur.get('bundleCovers', {}).items()}}
print('  ', req('POST', API, {'settings': st}))
print('完了')

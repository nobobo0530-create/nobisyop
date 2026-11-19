#!/usr/bin/env python3
"""ヤフオク仕入れの在庫に、商品ページの採寸（出品者の採寸）を入れる。

  1) 採寸の行を読む（読むだけ）
     python3 ~/nobushop-pwa/tools/yahoo_size.py lines --aids a1,b2,c3
     python3 ~/nobushop-pwa/tools/yahoo_size.py lines --since 2026-11-19     # その日以降の仕入れでサイズが空の物
  2) 読んだ内容を sizes.json に書く（人が読んで決める。機械的に拾わない）
     [{"aid":"a1","sizeTag":"11号","measure":{"length":70,"chest":50,"shoulder":40,"sleeve":58}},
      {"aid":"b2","measure":{"h":18,"w":24,"d":8,"handle":32,"strapMin":90,"strapMax":110}}]
  3) 入れる（--apply の時だけ書き込む。控えは sizes.json と同じフォルダに保存）
     python3 ~/nobushop-pwa/tools/yahoo_size.py set sizes.json [--apply]

項目（アプリの採寸シートと同じ）
  洋服・毛皮：totalLength 総丈 / length 着丈 / chest 脇下身幅 / shoulder 肩幅 / sleeve 袖丈
  バッグ・小物：h タテ / w ヨコ / d マチ / handle 持ち手 / strapMin〜strapMax ショルダー
決まり（2026-11-19）
  - すでにサイズ（表記サイズ・採寸のどれか）が入っている在庫と、売却済みは触らない。
  - 裄丈・胸回り（一周の長さ）は項目が無いので入れない。半分にして身幅にしない。
  - エルミは採寸が写真にある：商品ページの最後の写真が手書きの採寸表（①着丈 ②袖丈 ③肩幅 ④身幅 ⑤裄丈 ⑥裾幅）。
    `lines` の出力に「採寸表の写真」と出る画像を Read で見て、着丈→length・袖丈→sleeve・肩幅→shoulder・身幅→chest に入れる。
    タイトルの「○cm丈」は着丈（総丈ではない）。「○号」は表記サイズ。検算：タイトルの丈＝①着丈、胸回り÷2＝④身幅。
    字が薄くて読み切れない数字は入れずに、報告に書く。
  - まとめ売り（○点セット）は入れない。ページに記載が無い物も入れない。
  - クラウドの全件読み込みは lines で1回（10分使い回し）、set --apply で1回。書いた後は verify_cloud.py --wait 300。
"""
import datetime
import html
import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloud_get  # noqa: E402

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
PAGES = os.path.expanduser('~/Documents/nobushop_mail/yahoo_pages/')
CLOTH = ('totalLength', 'length', 'chest', 'shoulder', 'sleeve')
BAG = ('h', 'w', 'd', 'handle', 'strapMin', 'strapMax')
WORDS = r'cm|ｃｍ|㎝|センチ|丈|身幅|肩幅|袖|胸|サイズ|ｻｲｽﾞ|号|タテ|ヨコ|マチ|縦|横|高さ|幅|持ち手|ハンドル|ショルダー|ストラップ|W\s*[:：]?\s*約?\d|H\s*[:：]?\s*約?\d|D\s*[:：]?\s*約?\d'
NOISE = r'同梱|返品|発送|着払|トルソー|管理番号|古物|サイズ感|誤差|地域|^\d+サイズ$|事業所|領収書|配送'


def has_size(i):
    m = i.get('measure') or {}
    return bool(i.get('sizeTag')) or any(m.get(k) for k in CLOTH + BAG) or any(i.get('sizeM%d' % k) for k in (1, 2, 3, 4))


def page_lines(aid):
    """商品ページの題名と、説明文のうち採寸に関係しそうな行を返す。"""
    os.makedirs(PAGES, exist_ok=True)
    f = PAGES + aid + '.html'
    if not os.path.exists(f):
        with urllib.request.urlopen(urllib.request.Request('https://auctions.yahoo.co.jp/jp/auction/' + aid, headers={'User-Agent': UA}), timeout=30) as fh:
            h = fh.read().decode('utf-8', 'replace')
        with open(f, 'w') as fh:
            fh.write(h)
        time.sleep(1)
    with open(f) as fh:
        h = fh.read()
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', h, re.S)
    if not m:
        return '', []
    it = json.loads(m.group(1))['props']['pageProps']['initialState']['item']['detail']['item']
    desc = ' '.join(str(v) for k, v in it.items() if 'escription' in k and isinstance(v, (str, list)))
    txt = html.unescape(re.sub(r'<br\s*/?>|</(div|p|tr|li|td|th)>', '\n', html.unescape(desc), flags=re.I))
    txt = re.sub(r'<[^>]+>', ' ', txt)
    lines = [re.sub(r'[ \t　]+', ' ', x).strip() for x in re.split(r'[\n\r]+', txt)]
    keep = [x for x in lines if x and len(x) < 220 and not x.startswith('[') and re.search(WORDS, x) and not re.search(NOISE, x)]
    if 'エルミ' in json.dumps(it.get('seller') or {}, ensure_ascii=False) and it.get('img'):
        # エルミは最後の写真が手書きの採寸表。取っておいて、場所を行の先頭に出す
        f2 = PAGES + aid + '_sheet.jpg'
        try:
            if not os.path.exists(f2):
                urllib.request.urlretrieve(it['img'][-1]['image'], f2)
            keep.insert(0, '採寸表の写真（Read で見る）: ' + f2)
        except Exception as e:
            keep.insert(0, '採寸表の写真を取れず: %s' % e)
    return it.get('title') or '', keep


def cmd_lines(args):
    d = cloud_get.get_cloud(max_age=600)
    inv = [i for i in d['inventory'] if i.get('yahooAuctionId')]
    if '--aids' in args:
        want = set(args[args.index('--aids') + 1].split(','))
        T = [i for i in inv if i['yahooAuctionId'] in want]
        miss = want - {i['yahooAuctionId'] for i in T}
        if miss:
            print('在庫に無いID:', sorted(miss))
    else:
        since = args[args.index('--since') + 1]
        T = [i for i in inv if (i.get('purchaseDate') or '') >= since]
    n = 0
    for i in sorted(T, key=lambda i: (i.get('purchaseStore') or '', i.get('purchaseDate') or '')):
        a = i['yahooAuctionId']
        if has_size(i) or i.get('status') == 'sold':
            print('--', a, '（サイズ入力済みか売却済み。飛ばす）', (i.get('productName') or '')[:30])
            continue
        try:
            title, keep = page_lines(a)
        except Exception as e:  # やり直さない
            print('==', a, '取得できず', e)
            continue
        n += 1
        print('==', a, '|', i.get('purchaseStore'), '|', i.get('category'), '|', title[:90])
        print('    ', ' | '.join(keep[:26])[:420] or '（採寸の行なし）')
    print('読んだ', n, '件')


def cmd_set(args):
    path = os.path.abspath(args[0])
    apply = '--apply' in args
    S = json.load(open(path))
    d = cloud_get.get_cloud(max_age=0 if apply else 600)
    by = {i['yahooAuctionId']: i for i in d['inventory'] if i.get('yahooAuctionId')}
    now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
    up, bk = [], []
    for s in S:
        it = by.get(s['aid'])
        if not it or has_size(it) or it.get('status') == 'sold':
            print('飛ばす', s['aid'], '（在庫に無い・サイズ入力済み・売却済みのどれか）')
            continue
        src = s.get('measure') or {}
        bad = [k for k in src if k not in CLOTH + BAG]
        assert not bad, (s['aid'], bad)
        cloth = any(k in src for k in CLOTH) or (not src and it.get('category') in ('毛皮', '衣類', 'アウター'))
        assert not (cloth and any(k in src for k in BAG)), (s['aid'], '洋服とバッグの項目が混ざっている')
        cat = it.get('category')
        typ = ('毛皮類' if cat == '毛皮' else '洋服') if cloth else ('小物類' if cat == '小物' else 'バッグ')
        m = {'type': typ}
        for k, v in src.items():
            v = float(v)
            assert 0 < v < 250, (s['aid'], k, v)
            m[k] = '%g' % v
        v4 = [m.get('length'), m.get('chest'), m.get('shoulder'), m.get('sleeve')] if cloth else [m.get('h'), m.get('w'), m.get('d'), m.get('strapMax') or m.get('strapMin')]
        x = dict(it)
        x.update(measure=m, sizeM1=v4[0] or '', sizeM2=v4[1] or '', sizeM3=v4[2] or '', sizeM4=v4[3] or '', updatedAt=now)
        if s.get('sizeTag'):
            x['sizeTag'] = str(s['sizeTag'])
        bk.append(it)
        up.append(x)
        print(s['aid'], '|', (it.get('productName') or '')[:28], '|', s.get('sizeTag') or '-', {k: v for k, v in m.items() if k != 'type'})
    print('入れる', len(up), '件 /', len(S), '件中')
    if not apply:
        print('dry ok（--apply で書き込む）')
        return
    if not up:
        return
    with open(os.path.join(os.path.dirname(path), 'backup_' + os.path.splitext(os.path.basename(path))[0] + '.json'), 'w') as fh:
        json.dump(bk, fh, ensure_ascii=False)
    for k in range(0, len(up), 10):
        try:
            r = urllib.request.urlopen(urllib.request.Request(cloud_get.API, data=json.dumps({'invUpsert': [{'id': x['id'], 'data': x} for x in up[k:k + 10]]}).encode(),
                                                              headers={'Content-Type': 'application/json'}), timeout=180)
            print(k, r.read()[:60])
        except Exception as e:  # 500 が出たらやり直さない
            sys.exit(f'書き込み失敗: {e}')
        time.sleep(0.5)
    cloud_get.invalidate()
    print('書き込みました。verify_cloud.py --wait 300 で2回点検してください')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'lines' and ('--aids' in a or '--since' in a):
        cmd_lines(a[1:])
    elif len(a) >= 2 and a[0] == 'set':
        cmd_set(a[1:])
    else:
        raise SystemExit(__doc__)

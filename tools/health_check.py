#!/usr/bin/env python3
"""アプリの健康チェック（朝晩チェックの手順0）。

  python3 ~/nobushop-pwa/tools/health_check.py

- /api/data?sig=1 と /api/data を1回ずつ計る。やり直しはしない（重い時に追い打ちをかけないため）。
- 全件の読み込みに成功したら、cloud_get の使い回しファイルに保存する。
  このあと10分以内の get_cloud(max_age=600) は、取り直さずにこれを使う（全件読み込みを1回節約）。
- 自動実行では for や > を使うコマンドが承認待ちで止まるので、この1行で済ませる。
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cloud_get import API, CACHE_FILE  # noqa: E402

LIMIT_SEC = 10


def measure(url, timeout=60):
    t0 = time.time()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as fh:
            body = fh.read()
            code = fh.status
    except urllib.error.HTTPError as e:
        return e.code, time.time() - t0, b''
    except Exception as e:  # タイムアウト・通信エラー
        print(f'  取得できず: {e}')
        return 0, time.time() - t0, b''
    return code, time.time() - t0, body


def main():
    bad = False
    for label, url in (('軽い確認', API + '?sig=1'), ('全件', API)):
        code, sec, body = measure(url)
        print(f'{label}: 応答 {code} / {sec:.1f}秒 / {len(body):,}バイト')
        if code != 200 or sec > LIMIT_SEC:
            bad = True
            break  # 重い時は次を叩かない
        if label == '全件':
            try:
                data = json.loads(body)
                with open(CACHE_FILE + '.tmp', 'w') as fh:
                    json.dump(data, fh, ensure_ascii=False)
                os.replace(CACHE_FILE + '.tmp', CACHE_FILE)
                inv = data.get('inventory') or data.get('inv') or []
                sales = data.get('sales') or []
                print(f'在庫 {len(inv)}件 / 売上 {len(sales)}件（10分間は使い回せる）')
            except (ValueError, OSError) as e:
                print(f'  保存できず: {e}')
    if bad:
        print('判定: サーバーが重い。全件を使う作業はやめて、報告の一番上に書く。')
        sys.exit(1)
    print('判定: 正常')


if __name__ == '__main__':
    main()

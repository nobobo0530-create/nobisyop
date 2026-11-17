#!/usr/bin/env python3
"""公開ページを1つ取って、題名と、探したい言葉があるかを出す（読むだけ）。

  python3 ~/nobushop-pwa/tools/fetch_page.py <URL> [--find 言葉 ...] [--out 保存先]

例:
  python3 ~/nobushop-pwa/tools/fetch_page.py https://item.fril.jp/<hash> --find "SOLD OUT" --find 購入に進む

- 自動実行では、curl に長い引数や < | の入った grep をつなぐと承認待ちで止まる（2026-11-16 夜に止まった）。代わりにこれを使う。
- ラクマ・ヤフオクの商品ページ向け。メルカリの商品ページは中身が後から描かれるので、これでは読めない（組み込みブラウザが要る）。
- やり直しはしない。取れなかったら「取得できず」と出して終わる。
"""
import os
import re
import sys
import urllib.error
import urllib.request

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'


def main():
    args = sys.argv[1:]
    finds, out, url = [], None, None
    i = 0
    while i < len(args):
        if args[i] == '--find':
            finds.append(args[i + 1])
            i += 2
        elif args[i] == '--out':
            out = os.path.expanduser(args[i + 1])
            i += 2
        else:
            url = args[i]
            i += 1
    if not url or not url.startswith('https://'):
        raise SystemExit(__doc__)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as fh:
            code = fh.status
            html = fh.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        print(f'応答 {e.code}（ページが無い・消された可能性）')
        sys.exit(0)
    except Exception as e:
        print(f'取得できず: {e}')
        sys.exit(1)
    m = re.search(r'<title[^>]*>([^<]*)', html)
    print(f'応答 {code} / {len(html):,}文字')
    print('題名:', (m.group(1).strip() if m else '（なし）')[:200])
    m = re.search(r'property="og:image"\s+content="([^"]+)"', html)
    if m:
        print('写真:', m.group(1))
    for w in finds:
        print(f'「{w}」:', 'あり' if w.lower() in html.lower() else 'なし')
    if out:
        os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
        with open(out, 'w') as fh:
            fh.write(html)
        print('保存:', out)


if __name__ == '__main__':
    main()

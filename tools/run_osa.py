#!/usr/bin/env python3
"""AppleScript の台本を動かして、結果をファイルに保存する。

  python3 ~/nobushop-pwa/tools/run_osa.py <台本.applescript> [引数...] --out <保存先>

例:
  python3 ~/nobushop-pwa/tools/run_osa.py ~/Documents/nobushop_mail/daily_1116/list.applescript 14 \
      --out ~/Documents/nobushop_mail/daily_1116/list.txt

- `osascript 台本 > ファイル` と同じ働き。自動実行では `>` を使うコマンドが承認待ちで止まるので、これを使う。
- 行数と先頭の数行だけ画面に出す。中身は保存先を読む。
- --out を省くと、結果をそのまま画面に出す。
"""
import os
import subprocess
import sys


def main():
    args = sys.argv[1:]
    out = None
    if '--out' in args:
        i = args.index('--out')
        out = os.path.expanduser(args[i + 1])
        args = args[:i] + args[i + 2:]
    if not args:
        raise SystemExit(__doc__)
    script = os.path.expanduser(args[0])
    try:
        r = subprocess.run(['osascript', script] + args[1:], capture_output=True, text=True, timeout=900)
    except subprocess.TimeoutExpired:
        raise SystemExit('15分たっても終わらなかったので止めました（Mail が固まっている可能性）')
    if r.stderr.strip():
        print('エラー出力:', r.stderr.strip()[:1000])
    if out is None:
        print(r.stdout)
    else:
        os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
        with open(out, 'w') as fh:
            fh.write(r.stdout)
        lines = r.stdout.splitlines()
        print(f'{len(lines)}行を保存: {out}')
        for line in lines[:3]:
            print('  ' + line[:200])
    sys.exit(r.returncode)


if __name__ == '__main__':
    main()

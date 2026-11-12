#!/usr/bin/env python3
"""メール.app から指定した位置のメール本文を取り出す（AppleScript経由）。

~/Library/Mail は macOS のプライバシー保護で読めないので、メール.app に
聞く方式にしてある。メッセージは開かないので未読のままになる。

使い方:
  python3 tools/mail_fetch.py <indexファイル.json> <出力.json> [1回の件数] [アカウント名]

indexファイルは mail_scan.py の出力（{"account":..., "sel": {"ラベル": [id, ...]}}）。
**位置指定ではなくメッセージIDで引く**。位置はダウンロード中に入れ替わるため。
"""
import json
import subprocess
import sys

REC = '\x01'   # レコード区切り
FLD = '\x02'   # 項目区切り

TEMPLATE = '''
on joinList(lst, dlm)
\tset od to AppleScript's text item delimiters
\tset AppleScript's text item delimiters to dlm
\tset r to lst as text
\tset AppleScript's text item delimiters to od
\treturn r
end joinList

set idxs to {%(idxs)s}
set outv to {}
with timeout of 3600 seconds
\ttell application "Mail"
\t\tset mb to mailbox "INBOX" of account "%(account)s"
\t\trepeat with i in idxs
\t\t\tset m to (first message of mb whose id is (contents of i))
\t\t\ttry
\t\t\t\tset c to content of m
\t\t\ton error
\t\t\t\tset c to ""
\t\t\tend try
\t\t\tset end of outv to ((i as text) & (ASCII character 2) & (subject of m) & (ASCII character 2) & (sender of m) & (ASCII character 2) & ((date received of m) as text) & (ASCII character 2) & c)
\t\tend repeat
\tend tell
end timeout
return my joinList(outv, ASCII character 1)
'''


def fetch(indices, account='iCloud'):
    script = TEMPLATE % {'idxs': ', '.join(str(i) for i in indices), 'account': account}
    res = subprocess.run(['osascript', '-'], input=script, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip()[:400])
    out = []
    for chunk in res.stdout.split(REC):
        if not chunk.strip():
            continue
        parts = chunk.split(FLD)
        if len(parts) < 5:
            continue
        out.append({
            'index': int(parts[0]),
            'subject': parts[1],
            'from': parts[2],
            'date': parts[3],
            'body': FLD.join(parts[4:]),
        })
    return out


def main():
    index_path = sys.argv[1]
    out_path = sys.argv[2]
    batch = int(sys.argv[3]) if len(sys.argv) > 3 else 60

    data = json.load(open(index_path))
    sel = data.get('sel', data)
    account = sys.argv[4] if len(sys.argv) > 4 else data.get('account', 'iCloud')

    result = {}
    for label, idxs in sel.items():
        got = []
        for i in range(0, len(idxs), batch):
            part = idxs[i:i + batch]
            try:
                got.extend(fetch(part, account))
            except RuntimeError as e:
                print(f'  {label} {i}: 取得失敗 {e}', file=sys.stderr)
            print(f'  {label}: {len(got)}/{len(idxs)}', flush=True)
        result[label] = got
    json.dump(result, open(out_path, 'w'), ensure_ascii=False)
    total = sum(len(v) for v in result.values())
    print(f'{total} 通を {out_path} に書き出しました')


if __name__ == '__main__':
    main()

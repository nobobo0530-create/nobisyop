#!/usr/bin/env python3
"""メール.app の指定アカウントの INBOX を一括スキャンして、
全メッセージの「ID・件名・受信日時」を JSON に落とす。

使い方:
  python3 tools/mail_scan.py [アカウント名] [出力.json]
  例) python3 tools/mail_scan.py iCloud ~/Documents/nobushop_mail/idx_new.json

ポイント:
- 位置指定（message 1 of mb）はダウンロード中に並びが変わるので使わない。
  ここで取る **id は安定** なので、本文取得は必ずこの id を使う
- 1通ずつ取ると数時間かかる。`id of messages of mb` のように一括で取ると数分
- 区切りは ASCII 2。件名に改行が入るので改行区切りだと項目数がズレる
"""
import json
import os
import re
import subprocess
import sys
from collections import Counter

SCRIPT = '''
on joinList(lst, dlm)
\tset od to AppleScript's text item delimiters
\tset AppleScript's text item delimiters to dlm
\tset r to lst as text
\tset AppleScript's text item delimiters to od
\treturn r
end joinList

with timeout of 7200 seconds
\ttell application "Mail"
\t\tset mb to mailbox "INBOX" of account "%(account)s"
\t\tset ii to id of messages of mb
\t\tset jj to subject of messages of mb
\t\tset dd to date received of messages of mb
\tend tell
end timeout
return my joinList(ii, ASCII character 2) & (ASCII character 1) & my joinList(jj, ASCII character 2) & (ASCII character 1) & my joinList(dd, ASCII character 2)
'''

# 仕入れに使うメールの種類（件名の一部で判定）
CATEGORIES = {
    'purchase': 'ご購入の確認',       # ストア名・送料・クーポン・合計が全部入っている本命
    'cancel': 'ご購入のキャンセル',
    'wallet': 'Yahoo!ウォレット',
    'kantan': 'かんたん決済',
    'ship': '出荷通知',
}


def accounts():
    res = subprocess.run(
        ['osascript', '-e', 'tell application "Mail" to return name of accounts as text'],
        capture_output=True, text=True)
    return res.stdout.strip()


def scan(account):
    res = subprocess.run(['osascript', '-'], input=SCRIPT % {'account': account},
                         capture_output=True, text=True)
    if res.returncode != 0:
        raise SystemExit(f'スキャン失敗: {res.stderr.strip()[:400]}\n'
                         f'メール.appのアカウント: {accounts()}')
    parts = res.stdout.split('\x01')
    if len(parts) != 3:
        raise SystemExit(f'想定外の出力（区切り {len(parts)} 個）')
    ids = [int(x.strip()) for x in parts[0].split('\x02')]
    subjects = [s.replace('\n', ' ').strip() for s in parts[1].split('\x02')]
    dates = [d.strip() for d in parts[2].split('\x02')]
    if not (len(ids) == len(subjects) == len(dates)):
        raise SystemExit(f'項目数がズレた: {len(ids)}/{len(subjects)}/{len(dates)}')
    return ids, subjects, dates


def iso_month(s):
    m = re.match(r'(\d{4})年(\d{1,2})月', s)
    return '%04d-%02d' % (int(m.group(1)), int(m.group(2))) if m else '?'


def main():
    account = sys.argv[1] if len(sys.argv) > 1 else 'iCloud'
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser(
        '~/Documents/nobushop_mail/mail_idx.json')

    ids, subjects, dates = scan(account)
    sel = {k: [i for i, s in zip(ids, subjects) if hint in s]
           for k, hint in CATEGORIES.items()}

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    json.dump({'account': account, 'ids': ids, 'subjects': subjects,
               'dates': dates, 'sel': sel},
              open(out_path, 'w'), ensure_ascii=False)

    print(f'{account} / INBOX {len(ids)} 通 → {out_path}')
    for k, v in sel.items():
        print(f'  {k:9s} {len(v):5d}')
    months = Counter(iso_month(d) for i, s, d in zip(ids, subjects, dates)
                     if 'ご購入の確認' in s)
    if months:
        print('  ご購入の確認の月別:')
        for k in sorted(months):
            print(f'    {k} {months[k]}')


if __name__ == '__main__':
    main()

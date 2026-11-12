#!/usr/bin/env python3
"""macOS メール.app のローカルメール(.emlx)から Yahoo!オークション関連メールを抜き出す。

使い方:
  python3 tools/mail_yahoo.py scan            どのアカウントに何通あるか数える
  python3 tools/mail_yahoo.py dump [out.json] 本文つきで JSON に書き出す
  python3 tools/mail_yahoo.py subjects        件名の種類を集計する（パーサを書く前の下調べ用）

.emlx は「1行目=本文のバイト数 / RFC822本文 / 末尾にplist」という形式。
"""
import email
import email.header
import email.utils
import glob
import json
import os
import re
import sys
from collections import Counter

MAIL_ROOTS = sorted(glob.glob(os.path.expanduser('~/Library/Mail/V*')))

# Yahoo!オークション / Yahoo! JAPAN からの通知を拾うための手がかり
FROM_HINTS = ('yahoo.co.jp', 'yahoo-net.jp', 'mail.yahoo.co.jp')
SUBJECT_HINTS = ('オークション', 'ヤフオク', 'Yahoo!オークション', 'PayPayフリマ', 'Yahoo!フリマ')


def decode_header(raw):
    if not raw:
        return ''
    out = []
    for part, enc in email.header.decode_header(raw):
        if isinstance(part, bytes):
            out.append(part.decode(enc or 'utf-8', 'replace'))
        else:
            out.append(part)
    return ''.join(out).replace('\n', ' ').strip()


def read_emlx(path):
    """.emlx を email.message.Message にする"""
    with open(path, 'rb') as fh:
        raw = fh.read()
    nl = raw.find(b'\n')
    if nl < 0:
        return None
    try:
        length = int(raw[:nl].strip())
    except ValueError:
        # 先頭がバイト数でない形式（.partial.emlx 等）はそのまま読む
        length = len(raw) - nl - 1
    body = raw[nl + 1:nl + 1 + length]
    try:
        return email.message_from_bytes(body)
    except Exception:
        return None


def plain_text(msg):
    """本文のプレーンテキストを取り出す（HTMLしかない場合はタグを落とす）"""
    texts, htmls = [], []
    for part in msg.walk():
        if part.get_content_maintype() != 'text':
            continue
        if part.get_filename():
            continue
        try:
            payload = part.get_payload(decode=True)
        except Exception:
            continue
        if not payload:
            continue
        charset = part.get_content_charset() or 'utf-8'
        try:
            s = payload.decode(charset, 'replace')
        except LookupError:
            s = payload.decode('utf-8', 'replace')
        if part.get_content_subtype() == 'html':
            htmls.append(s)
        else:
            texts.append(s)
    if texts:
        return '\n'.join(texts)
    if htmls:
        s = re.sub(r'(?is)<(script|style).*?</\1>', '', htmls[0])
        s = re.sub(r'(?i)<br\s*/?>|</p>|</tr>|</div>', '\n', s)
        s = re.sub(r'<[^>]+>', '', s)
        return re.sub(r'\n{3,}', '\n\n', s)
    return ''


def is_yahoo_auction(sender, subject):
    s = (sender or '').lower()
    if not any(h in s for h in FROM_HINTS):
        return False
    return any(h in (subject or '') for h in SUBJECT_HINTS)


def iter_messages():
    """全アカウントの .emlx を順に返す"""
    if not MAIL_ROOTS:
        print('メール.app のデータが見つかりません（~/Library/Mail が無い）', file=sys.stderr)
        return
    for root in MAIL_ROOTS:
        for dirpath, _dirnames, filenames in os.walk(root):
            for fn in filenames:
                if not fn.endswith('.emlx'):
                    continue
                path = os.path.join(dirpath, fn)
                msg = read_emlx(path)
                if msg is None:
                    continue
                yield path, msg


def cmd_scan():
    total = 0
    hit = 0
    by_mailbox = Counter()
    for path, msg in iter_messages():
        total += 1
        sender = decode_header(msg.get('From'))
        subject = decode_header(msg.get('Subject'))
        if is_yahoo_auction(sender, subject):
            hit += 1
            m = re.search(r'/([^/]+\.mbox)/', path)
            by_mailbox[m.group(1) if m else '?'] += 1
    print(f'メール総数 {total} 通 / Yahoo!オークション関連 {hit} 通')
    for name, n in by_mailbox.most_common():
        print(f'  {n:5d}  {name}')


def cmd_subjects():
    c = Counter()
    for _path, msg in iter_messages():
        sender = decode_header(msg.get('From'))
        subject = decode_header(msg.get('Subject'))
        if not is_yahoo_auction(sender, subject):
            continue
        # 末尾の可変部分（オークションID・商品名）を落として型を数える
        key = re.sub(r'[:：].*$', '', subject).strip()
        c[key] += 1
    for name, n in c.most_common():
        print(f'{n:5d}  {name}')


def cmd_dump(out_path):
    recs = []
    for path, msg in iter_messages():
        sender = decode_header(msg.get('From'))
        subject = decode_header(msg.get('Subject'))
        if not is_yahoo_auction(sender, subject):
            continue
        date = msg.get('Date')
        try:
            dt = email.utils.parsedate_to_datetime(date)
            date_iso = dt.astimezone().isoformat()
        except Exception:
            date_iso = date or ''
        recs.append({
            'path': path,
            'from': sender,
            'to': decode_header(msg.get('To')),
            'subject': subject,
            'date': date_iso,
            'messageId': (msg.get('Message-Id') or '').strip(),
            'body': plain_text(msg),
        })
    recs.sort(key=lambda r: r['date'])
    with open(out_path, 'w') as fh:
        json.dump(recs, fh, ensure_ascii=False, indent=1)
    print(f'{len(recs)} 通を {out_path} に書き出しました')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'scan'
    if cmd == 'scan':
        cmd_scan()
    elif cmd == 'subjects':
        cmd_subjects()
    elif cmd == 'dump':
        cmd_dump(sys.argv[2] if len(sys.argv) > 2 else '/tmp/yc/mails.json')
    else:
        print(__doc__)

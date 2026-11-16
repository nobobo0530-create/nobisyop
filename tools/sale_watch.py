#!/usr/bin/env python3
"""売れた通知（のび SHOP）: Mail.app の売却メールを見て、iPhone に「他の出品を消して」リマインダーを出す。
- マーケットプレイスには一切操作しない（通知のみ）。アプリのクラウドAPIも呼ばない。
- 5分ごと実行想定。新着なしなら Mail への問い合わせ1回だけで終わる。
使い方:
  sale_watch.py                                  通常実行
  sale_watch.py --dry-run --since "YYYY-MM-DD HH:MM"   通知せず、状態も変えず、検出だけ表示
  sale_watch.py --init                           ここまでを既読にする（過去分の誤通知防止）
  sale_watch.py --test-reminder                  テスト用リマインダーを1件出す
"""
import argparse, fcntl, json, os, re, subprocess, sys, time, unicodedata
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rakuma_snapshot as rs  # noqa: E402
import photo_match as pm  # noqa: E402

DIR = os.path.expanduser('~/Documents/nobushop_mail/salewatch')
LOG = os.path.join(DIR, 'log.txt')
STATE = os.path.join(DIR, 'state.json')
LOCK = os.path.join(DIR, 'lock')
LIST_NAME = 'のびSHOP通知'
MERCARI_ME = '毛皮と鞄とお洋服 のび'          # 宛名にこれが含まれるときだけ（りこりんさん宛は無視）
YAHOO_SHOP = 'https://auctions.yahoo.co.jp/seller/DqF1YQ5WsN4qqGJmm6UU9Xsc74Ydh'
OVERLAP_MIN = 15
DEFAULT_WINDOW_H = 2
MAX_WINDOW_H = 72

# ---------------------------------------------------------------- util
def log(msg, quiet=False):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    if quiet:
        return
    try:
        os.makedirs(DIR, exist_ok=True)
        with open(LOG, 'a') as f:
            f.write(line + '\n')
    except OSError:
        pass


def trim_log(n=500):
    try:
        with open(LOG) as f:
            lines = f.readlines()
        if len(lines) > n + 100:
            with open(LOG, 'w') as f:
                f.writelines(lines[-n:])
    except OSError:
        pass


def load_state():
    try:
        with open(STATE) as f:
            s = json.load(f)
    except (OSError, ValueError):
        s = {}
    s.setdefault('seen', [])        # 通知済みメールの message-id
    s.setdefault('items', {})       # 品物キー -> 通知時刻（同じ品物の二重通知防止）
    return s


def save_state(s):
    s['seen'] = s['seen'][-800:]
    if len(s['items']) > 400:
        for k in sorted(s['items'], key=lambda k: s['items'][k])[:-300]:
            s['items'].pop(k)
    os.makedirs(DIR, exist_ok=True)
    with open(STATE + '.tmp', 'w') as f:
        json.dump(s, f, ensure_ascii=False, indent=1)
    os.replace(STATE + '.tmp', STATE)


def key_of(s):
    """タイトルの正規化キー（NFKC・記号/絵文字/空白除去）"""
    n = unicodedata.normalize('NFKC', s or '').lower()
    return re.sub(r'[^0-9a-z぀-ヿ一-鿿]', '', n)


def toks(s):
    n = unicodedata.normalize('NFKC', s or '').lower()
    return set(re.findall(r'[a-z0-9]+|[぀-ゟ]+|[゠-ヿ]+|[一-鿿]+', n))


def similar(sale_title, cand_title, strict_contain=False):
    """0..1。売れたタイトルのトークンがどれだけ候補に含まれるか／Jaccard"""
    a, b = toks(sale_title), toks(cand_title)
    if not a or not b:
        return 0.0
    ka, kb = key_of(sale_title), key_of(cand_title)
    if ka and kb and (ka == kb or (min(len(ka), len(kb)) >= 12 and (ka in kb or kb in ka))):
        return 1.0
    inter = len(a & b)
    cont = inter / len(a)
    jac = inter / len(a | b)
    if inter < 3:
        return 0.0
    return cont if strict_contain else max(jac, cont * 0.9)


def price_ok(sale_price, cand_price):
    if not sale_price or not cand_price:
        return True
    r = cand_price / sale_price
    return 0.5 <= r <= 2.0


# ---------------------------------------------------------------- Mail.app
AS = r'''
on pad2(n)
  return text -2 thru -1 of ("0" & (n as string))
end pad2
on run argv
  set secs to (item 1 of argv) as integer
  tell application "Mail"
    with timeout of 150 seconds
      set t0 to (current date) - secs
      set ms to (messages of inbox whose date received > t0 and (subject contains "の発送をお願いします" or subject contains "決済完了" or subject contains "購入されました" or subject contains "Yahoo!オークション - "))
      set out to ""
      repeat with m in ms
        set dr to date received of m
        set ds to (year of dr as string) & "-" & my pad2(month of dr as integer) & "-" & my pad2(day of dr) & " " & my pad2(hours of dr) & ":" & my pad2(minutes of dr) & ":" & my pad2(seconds of dr)
        set c to content of m as string
        if length of c > 1600 then set c to text 1 thru 1600 of c
        set out to out & "@@@MSG" & linefeed & "ID: " & (message id of m) & linefeed & "DATE: " & ds & linefeed & "FROM: " & (sender of m) & linefeed & "SUBJ: " & (subject of m) & linefeed & "@@@BODY" & linefeed & c & linefeed
      end repeat
    end timeout
  end tell
  return out
end run
'''


def mail_running():
    return subprocess.run(['pgrep', '-x', 'Mail'], capture_output=True).returncode == 0


def fetch_mail(since_dt):
    secs = max(60, int((datetime.now() - since_dt).total_seconds()))
    r = subprocess.run(['osascript', '-e', AS, str(secs)], capture_output=True, text=True, timeout=200)
    if r.returncode != 0:
        raise RuntimeError('osascript: ' + r.stderr.strip()[:300])
    msgs = []
    for blk in r.stdout.split('@@@MSG\n')[1:]:
        head, _, body = blk.partition('@@@BODY\n')
        d = {}
        for ln in head.splitlines():
            k, _, v = ln.partition(': ')
            d[k] = v
        d['BODY'] = body
        msgs.append(d)
    return msgs


def field(body, name):
    m = re.search(name + r'\s*[:：]\s*(.+)', body)
    return m.group(1).strip() if m else ''


def yen(s):
    m = re.search(r'([\d,]+)\s*円', s or '')
    return int(m.group(1).replace(',', '')) if m else None


def classify(m):
    """売却メールなら dict、そうでなければ None"""
    subj, frm, body = m.get('SUBJ', ''), m.get('FROM', ''), m['BODY']
    if 'mercari' in frm.lower() or '【メルカリ】' in subj:
        mm = re.match(r'【メルカリ】「(.*)」の発送をお願いします', subj)
        if not mm or '発送期限が本日' in subj:
            return None
        first = body.strip().splitlines()[0] if body.strip() else ''
        if MERCARI_ME not in first:
            return {'ignored': 'メルカリ別アカウント宛: ' + first[:30]}
        title = field(body, '商品名') or mm.group(1)
        return {'src': 'mercari', 'title': title, 'price': yen(field(body, '商品価格')),
                'url': 'https://jp.mercari.com/item/' + field(body, '商品ID'), 'ident': field(body, '商品ID')}
    if 'fril.jp' in frm.lower() or '楽天ラクマ' in subj:
        if not re.search(r'決済完了のお知らせ|購入されました', subj):
            return None
        title = field(body, '商品名')
        if not title:
            return None
        return {'src': 'rakuma', 'title': title, 'price': yen(field(body, '商品価格')),
                'url': '', 'ident': field(body, 'オーダーID')}
    if 'auction-master@mail.yahoo.co.jp' in frm.lower():
        mm = re.match(r'Yahoo!オークション - (支払いが完了しました。商品を発送してください|追加のお手続きが必要です)：(.*)\(([a-z]\d+)\)\s*$', subj)
        if not mm:
            return None
        aid = mm.group(3)
        title = field(body, '商品') or mm.group(2)
        return {'src': 'yahoo', 'title': title, 'price': None,
                'url': f'https://auctions.yahoo.co.jp/jp/auction/{aid}', 'ident': aid}
    return None


# ---------------------------------------------------------------- 出品照合
_cache = {}


def rakuma_listings():
    if 'rakuma' not in _cache:
        pages, seen = rs.crawl()
        _cache['rakuma'] = [dict(v, url='https://item.fril.jp/' + h) for h, v in seen.items() if not v.get('sold')]
    return _cache['rakuma']


def yahoo_listings():
    if 'yahoo' not in _cache:
        out, b, total = [], 1, None
        while True:
            page = rs.http(f'{YAHOO_SHOP}?fixed=0&b={b}&n=50&select=23&mode=3')
            m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page, re.S)
            L = json.loads(m.group(1))['props']['pageProps']['initialState']['search']['items']['listing']
            items = L.get('items') or []
            total = L.get('totalResultsAvailable') or total or 0
            for it in items:
                out.append({'title': it.get('title', ''), 'price': it.get('price') or it.get('buyNowPrice'),
                            'aid': it['auctionId'], 'url': 'https://auctions.yahoo.co.jp/jp/auction/' + it['auctionId']})
            b += 50
            if not items or b > total or b > 500:
                break
        _cache['yahoo'] = out
    return _cache['yahoo']


def find_match(sale, platform):
    """出品中の同一商品を探す。見つかれば dict、無ければ None。取得失敗は例外"""
    lst = rakuma_listings() if platform == 'rakuma' else yahoo_listings()
    strict = platform == 'yahoo'   # ヤフオクのタイトルは長いので「含まれ率」で判定
    best, bs = None, 0
    for c in lst:
        if not price_ok(sale.get('price'), c.get('price')):
            continue
        s = similar(sale['title'], c['title'], strict_contain=strict)
        if s > bs:
            best, bs = c, s
    thr = 0.8 if platform == 'yahoo' else 0.7
    return dict(best, score=round(bs, 2)) if best and bs >= thr else None


def photo_candidates(platform):
    """写真照合の対象（出品中のみ）: [(item, 写真リスト)]。ラクマ=スナップショット(売却表示は除外)＋巡回で見えた出品、ヤフオク=出品中"""
    out = []
    if platform == 'rakuma':
        snap = pm.rakuma_snap()
        for c in rakuma_listings():
            v = snap.get(c.get('hash')) or {}
            if v.get('soldSeen') or v.get('missing'):
                continue
            out.append((c, pm.rakuma_photo(c.get('hash'))))
    elif platform == 'yahoo':
        for c in yahoo_listings():
            out.append((c, pm.listing_photos('yahoo', c['aid'])))
    elif platform == 'mercari':   # 手元キャッシュ(listings/mercari_items.json)があれば使う。先頭1枚だけ
        try:
            with open(os.path.expanduser('~/Documents/nobushop_mail/listings/mercari_items.json')) as f:
                mi = json.load(f)['items']
        except (OSError, ValueError, KeyError):
            mi = {}
        for mid, v in mi.items():
            out.append(({'title': v.get('title', ''), 'price': v.get('price'),
                         'url': 'https://jp.mercari.com/item/' + mid}, pm.listing_photos('mercari', mid, 1)))
    return out


def photo_match(sale, platform):
    """売れた品の写真と、出品中の写真を照合。しきい値超えの最良を返す（無ければ None）。失敗は例外にせず None"""
    try:
        sp = pm.sale_photos(sale['src'], sale['ident'], sale['title'], 3)
        if not sp:
            return None
        best, bs = None, 0.0
        for c, lp in photo_candidates(platform):
            if sale['src'] == platform and c.get('url', '').endswith(str(sale['ident'])):
                continue
            sc = pm.similar(sp, lp) if lp else 0.0
            if sc > bs:
                best, bs = c, sc
        pm.save()
        return dict(best, score=round(bs, 2), photo=True) if best and bs >= pm.THRESHOLD else None
    except Exception as e:
        log(f'写真照合失敗 {platform}: {e}')
        return None


PNAME = {'mercari': 'メルカリ', 'rakuma': 'ラクマ', 'yahoo': 'ヤフオク'}


def cross_check(sale):
    """戻り値: (found{platform: item}, failed[platform], unchecked[platform])"""
    found, failed, unchecked = {}, [], []
    for p in ('mercari', 'rakuma', 'yahoo'):
        if p == sale['src']:
            continue
        if p == 'mercari':
            m = photo_match(sale, p) if sale['src'] != 'mercari' else None   # タイトル照合はしない。写真だけ手元キャッシュで確認
            if m:
                found[p] = m
            else:
                unchecked.append(p)
            continue
        try:
            m = find_match(sale, p)
            if m:
                found[p] = m
            else:
                m = photo_match(sale, p)      # タイトルが違っても写真が同じなら同一品
                if m:
                    found[p] = m
        except Exception as e:
            failed.append(p)
            log(f'照合失敗 {p}: {e}')
    return found, failed, unchecked


def short(t, n=22):
    t = re.sub(r'\s+', ' ', re.sub(r'[【\[][^】\]]*[】\]]', '', unicodedata.normalize('NFKC', t))).strip() or t
    return t[:n] + ('…' if len(t) > n else '')


def build_alert(sale, found, failed, unchecked):
    src = PNAME[sale['src']]
    others = [PNAME[p] for p in ('mercari', 'rakuma', 'yahoo') if p != sale['src']]
    if found:
        names = '・'.join(PNAME[p] + ('に出品中(写真一致)' if it.get('photo') else 'に出品中') for p, it in found.items())
        rest = [PNAME[p] for p in unchecked + failed]
        tail = f'{names}。消して' + (f'（{"・".join(rest)}も確認）' if rest else '')
        title = f'⚠️{src}で売れた：{short(sale["title"])} → {tail}'
    else:
        title = f'⚠️{src}で売れた：{short(sale["title"])} → {"・".join(others)}の出品を消して'
    notes = [f'売れた場所: {src}', f'商品: {sale["title"]}']
    if sale.get('price'):
        notes.append(f'価格: {sale["price"]:,}円')
    if sale.get('url'):
        notes.append(f'売れたページ: {sale["url"]}')
    for p, it in found.items():
        lbl = '写真一致' if it.get('photo') else '一致度'
        notes.append(f'{PNAME[p]}の出品: {it["url"]} ({it.get("price") or "-"}円 / {lbl}{it["score"]}) {it.get("title", "")[:30]}'.rstrip())
    if not found:
        notes.append('照合: ラクマ/ヤフオクの公開ページに同じ商品は見つからず'
                     if not failed else f'照合失敗: {"・".join(PNAME[p] for p in failed)}（手動で確認）')
    if unchecked:
        notes.append('メルカリは自動照合不可。アプリで確認')
    return title, '\n'.join(notes)


# ---------------------------------------------------------------- 通知
RS = r'''
on run argv
  set ttl to item 1 of argv
  set bdy to item 2 of argv
  tell application "Reminders"
    if not (exists list "のびSHOP通知") then
      try
        make new list at account "iCloud" with properties {name:"のびSHOP通知"}
      on error
        make new list with properties {name:"のびSHOP通知"}
      end try
    end if
    tell list "のびSHOP通知"
      make new reminder with properties {name:ttl, body:bdy, remind me date:(current date)}
    end tell
  end tell
end run
'''


def notify(title, body):
    try:
        r = subprocess.run(['osascript', '-e', RS, title, body], capture_output=True, text=True, timeout=60)
        if r.returncode == 0:
            return True
        raise RuntimeError(r.stderr.strip()[:300])
    except Exception as e:
        log(f'リマインダー失敗: {e} → 通知センターで代替')
        try:
            subprocess.run(['osascript', '-e', 'on run a\ndisplay notification (item 2 of a) with title (item 1 of a)\nend run',
                            title, body.splitlines()[0] if body else ''], capture_output=True, timeout=20)
        except Exception:
            pass
        return False


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--since')
    ap.add_argument('--init', action='store_true')
    ap.add_argument('--test-reminder', action='store_true')
    a = ap.parse_args()

    os.makedirs(DIR, exist_ok=True)
    if a.test_reminder:
        ok = notify('テスト：のびSHOP通知', 'sale_watch.py の通知テストです。削除してOK。')
        print('reminder', 'OK' if ok else 'FAILED')
        return

    lockf = open(LOCK, 'w')
    try:
        fcntl.flock(lockf, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log('前回の実行がまだ動いているのでスキップ')
        return

    st = load_state()
    now = datetime.now()
    if a.since:
        since = datetime.strptime(a.since, '%Y-%m-%d %H:%M')
    elif a.init:
        since = now - timedelta(minutes=30)
    elif st.get('last_run'):
        since = datetime.fromisoformat(st['last_run']) - timedelta(minutes=OVERLAP_MIN)
    else:
        since = now - timedelta(hours=DEFAULT_WINDOW_H)
    since = max(since, now - timedelta(hours=MAX_WINDOW_H)) if not a.since else since

    if not mail_running():
        log('Mail.app が起動していないのでスキップ')
        if a.dry_run:
            print('Mail.app not running')
        return
    t0 = time.time()
    try:
        msgs = fetch_mail(since)
    except Exception as e:
        log(f'メール取得失敗: {e}')
        if a.dry_run:
            print('mail fetch failed:', e)
        return

    seen = set(st['seen'])
    sales = []
    for m in sorted(msgs, key=lambda x: x.get('DATE', '')):
        if m.get('ID') in seen and not a.dry_run:
            continue
        c = classify(m)
        if not c:
            continue
        c['mid'], c['date'] = m.get('ID'), m.get('DATE')
        sales.append(c)

    if a.init:
        st['seen'] += [m['ID'] for m in msgs if m.get('ID')]
        st['last_run'] = now.isoformat(timespec='seconds')
        save_state(st)
        log(f'init: {len(msgs)}通を既読にした')
        print(f'init done: {len(msgs)} mails marked seen')
        return

    alerted = 0
    handled_keys = set()
    for s in sales:
        if s.get('ignored'):
            if a.dry_run:
                print(f'[無視] {s["date"]} {s["ignored"]}')
            if not a.dry_run:
                st['seen'].append(s['mid'])
            continue
        ik = f'{s["src"]}:{s["ident"] or key_of(s["title"])}'
        if (ik in st['items'] or ik in handled_keys) and not a.dry_run:
            st['seen'].append(s['mid'])
            continue
        handled_keys.add(ik)
        found, failed, unchecked = cross_check(s)
        title, body = build_alert(s, found, failed, unchecked)
        if a.dry_run:
            print(f'[{s["date"]}] {title}\n    ' + body.replace('\n', '\n    ') + '\n')
            continue
        ok = notify(title, body)
        log(f'通知{"OK" if ok else "(代替)"}: {title}')
        st['seen'].append(s['mid'])
        st['items'][ik] = now.isoformat(timespec='seconds')
        alerted += 1
        save_state(st)

    if not a.dry_run:
        st['seen'] += [m['ID'] for m in msgs if m.get('ID') and classify(m) is None]
        st['last_run'] = now.isoformat(timespec='seconds')
        save_state(st)
        if alerted or sales:
            log(f'完了: 売却メール{len(sales)}件 通知{alerted}件 ({time.time()-t0:.0f}秒)')
        trim_log()
    else:
        print(f'(dry-run) 取得{len(msgs)}通 売却検出{len(sales)}件 {time.time()-t0:.0f}秒')


if __name__ == '__main__':
    main()

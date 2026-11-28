#!/usr/bin/env python3
"""メルカリで販売中の一覧ページ（public/mercari.html）を作り直す。読むだけ・クラウドには触らない。
  python3 tools/make_mercari_page.py
もとデータ：~/Documents/nobushop_mail/listings/mercari_items.json（組み込みブラウザで読んだ販売中の一覧。作り方は listings_audit.py の先頭）
ページの中身：管理番号が古い順・仕入れ月ごとにまとめる／タイトルをコピー／メルカリでタイトル検索／写真を押すと商品ページ。
データはページの中に埋め込む（アプリの裏方がJSONを溜め込んで古いまま出すのを避けるため）。
作り直したら git add public/mercari.html → commit → push で公開。
"""
import json, os, re

SRC = os.path.expanduser('~/Documents/nobushop_mail/listings/mercari_items.json')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'mercari.html')
FUR = re.compile(r'ファー|毛皮|ミンク|フォックス|ラビット|ウィーゼル|セーブル|チンチラ|ムートン|リンクス|ラクーン|タヌキ|ヌートリア|コリンスキー|ビーバー|カラクール|フィッチ|ロシアンリス|ラム種|MINK|FOX', re.I)

NOT_FUR = re.compile(r'バッグ|チャーム|財布|ポーチ|リュック')  # ファー付きのバッグ・小物は毛皮に入れない

d = json.load(open(SRC))
# ラクマに出ていない出品の一覧（あれば「ラクマに無い物だけ」のしぼり込みに使う。作り方は Claude に「メルカリのみ・ラクマのみを調べて」と頼む）
ONLY_SRC = os.path.join(os.path.dirname(SRC), 'mercari_only.json')
only = json.load(open(ONLY_SRC)) if os.path.exists(ONLY_SRC) else {}
ONLY = set(only.get('ids') or [])
# メルカリに出ていないラクマ出品（写真・題名はラクマの出品スナップショットから）
RSNAP = os.path.expanduser('~/Documents/nobushop_mail/rakuma_snap/items.json')
rsnap = json.load(open(RSNAP)) if (only.get('rakumaOnly') and os.path.exists(RSNAP)) else {}
ritems = []
for h in only.get('rakumaOnly') or []:
    v = rsnap.get(h)
    if not v: continue
    t = re.sub(r'\s+', ' ', v.get('title') or '').strip()
    isfur = bool(FUR.search(t) and not NOT_FUR.search(t)) and 'FOXEY' not in t
    ritems.append({'h': h, 't': t, 'p': int(v.get('price') or 0), 'm': (v.get('mgmtNo') or '').strip(), 'f': 1 if isfur else 0, 'u': v.get('imageUrl') or ''})
ritems.sort(key=lambda x: (x['m'] if re.match(r'^2[4-9](0[1-9]|1[0-2])\d{2}', x['m']) else '\uffff', x['t']))
# 毛皮タブに初めて出た日の記録。base（ユーザーがラックを並べた時の版）より後に出た物に、ページで「✅ 追加」を付ける
#   2026-11-28 ユーザー：「前回から追加したものには分かりやすくチェックマークつけて。前の順番でラックにかけてたから、わかんないとその商品が抜けちゃう」
#   ラックを並べ直したと聞いたら、base をその日の版の日付に進める
HIST_SRC = os.path.join(os.path.dirname(SRC), 'mercari_fur_history.json')
hist = json.load(open(HIST_SRC)) if os.path.exists(HIST_SRC) else {'base': '', 'first': {}}
scan_day = (d.get('scannedAt') or '')[:10]
hist_changed = False
items = []
for mid, v in d['items'].items():
    t = re.sub(r'\s+', ' ', v.get('title') or '').strip()
    m = (v.get('mgmt') or '').strip()
    # 毛皮かどうか：メルカリのカテゴリ「毛皮・ファーコート」で出している物（2026-11-28 ユーザー指定）。カテゴリを読んでいない古いデータだけ、題名の言葉で決める
    isfur = bool(v['fur']) if 'fur' in v else bool(FUR.search(t) and not NOT_FUR.search(t))
    it = {'i': mid, 't': t, 'p': int(v.get('price') or 0), 'm': m, 'f': 1 if isfur else 0, 'o': 1 if mid in ONLY else 0}
    if 'ord' in v: it['k'] = int(v['ord'])   # メルカリの「新しい順」での位置（0がいちばん新しい出品）
    if isfur:
        if mid not in hist['first'] and scan_day:
            hist['first'][mid] = scan_day; hist_changed = True
        fs = hist['first'].get(mid) or ''
        if hist.get('base') and fs > hist['base']:
            it['n'] = str(int(fs[5:7])) + '/' + str(int(fs[8:10]))   # 例 '11/28'（この日の版から毛皮タブに出た）
    items.append(it)
def mkey(m):
    if re.match(r'^2[4-9]\d{3}$', m): return m[:2] + '0' + m[2:]   # 26705 → 260705（月の 0 が抜けた番号。表示は変えず、並びだけ日付の位置にする）
    return m or '￿'
items.sort(key=lambda x: (mkey(x['m']), x['t']))
if hist_changed:
    json.dump(hist, open(HIST_SRC, 'w'), ensure_ascii=False)
BASE = hist.get('base') or ''
HAS_ORD = all('k' in x for x in items)
data = json.dumps({'at': d.get('scannedAt') or '', 'onlyAt': only.get('at') or '', 'items': items, 'r': ritems, 'ord': 1 if HAS_ORD else 0, 'base': (str(int(BASE[5:7])) + '/' + str(int(BASE[8:10]))) if BASE else ''}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

HTML = r'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>メルカリ販売中</title>
<style>
:root{--bg:#f2f2f7;--card:#fff;--ink:#111;--sub:#6b7280;--line:#e5e7eb;--accent:#e84040;--chip:#fff;--chipOn:#1e293b;--chipOnInk:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#1b1e25;--ink:#f3f4f6;--sub:#9ca3af;--line:#2c313c;--chip:#1b1e25;--chipOn:#f3f4f6;--chipOnInk:#111}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;-webkit-text-size-adjust:100%}
header{position:sticky;top:0;z-index:5;background:var(--bg);padding:calc(10px + env(safe-area-inset-top)) 16px 10px;border-bottom:1px solid var(--line)}
.top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
h1{font-size:20px;margin:0}
.back{font-size:14px;color:var(--accent);text-decoration:none;font-weight:700;white-space:nowrap}
.note{font-size:12px;color:var(--sub);margin:4px 0 8px}
.chips{display:flex;gap:8px;margin-bottom:8px}
.chip{flex:1;min-height:40px;border-radius:10px;border:1.5px solid var(--line);background:var(--chip);color:var(--ink);font-size:14px;font-weight:700}
.chip.on{background:var(--chipOn);color:var(--chipOnInk);border-color:var(--chipOn)}
.chip.sort{font-size:12.5px;min-height:36px}
.new{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:800;color:#fff;background:#16a34a;border-radius:8px;padding:3px 9px;margin:0 0 6px}
.card.isnew{border:2px solid #16a34a;background:linear-gradient(0deg,rgba(22,163,74,.07),rgba(22,163,74,.07)),var(--card)}
.no{display:inline-block;min-width:1.6em;margin-right:6px;font-size:12px;font-weight:800;color:var(--sub);font-variant-numeric:tabular-nums}
#q{width:100%;min-height:42px;border-radius:10px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font-size:16px;padding:6px 12px}
main{padding:8px 16px calc(40px + env(safe-area-inset-bottom));max-width:720px;margin:0 auto}
h2{font-size:14px;margin:18px 0 8px;color:var(--sub);display:flex;justify-content:space-between}
.card{display:flex;gap:12px;background:var(--card);border-radius:14px;padding:10px;margin-bottom:10px;border:1px solid var(--line)}
.ph{flex:0 0 84px;width:84px;height:84px;border-radius:10px;overflow:hidden;background:var(--line);display:block}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.body{flex:1;min-width:0}
.t{font-size:14px;font-weight:700;line-height:1.4;word-break:break-all;-webkit-user-select:text;user-select:text}
.meta{font-size:12px;color:var(--sub);margin:4px 0 8px;display:flex;gap:10px;flex-wrap:wrap}
.meta b{color:var(--accent);font-size:14px}
.btns{display:flex;gap:8px}
.btn{flex:1;min-height:44px;border-radius:10px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;padding:4px 2px;text-align:center;white-space:nowrap}
.btn.go{border-color:#fca5a5;color:#b91c1c}
@media (prefers-color-scheme:dark){.btn.go{border-color:#7f1d1d;color:#fca5a5}}
#toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);background:rgba(17,17,17,.9);color:#fff;padding:10px 16px;border-radius:99px;font-size:14px;max-width:86vw;opacity:0;transition:opacity .2s;pointer-events:none;z-index:9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#toast.on{opacity:1}
.tag{display:inline-block;font-size:11px;font-weight:700;color:#b45309;background:#fef3c7;border-radius:6px;padding:1px 6px}
.empty{color:var(--sub);text-align:center;padding:40px 0;font-size:14px}
</style>
</head>
<body>
<header>
  <div class="top"><h1><span id="ttl">メルカリ販売中</span> <span id="cnt" style="font-size:14px;color:var(--sub);font-weight:600"></span></h1><a class="back" href="/">← アプリへ</a></div>
  <div class="note" id="note"></div>
  <div class="chips">
    <button class="chip on" data-f="fur">毛皮</button>
    <button class="chip" data-f="other">毛皮以外</button>
    <button class="chip" data-f="all">すべて</button>
  </div>
  <div class="chips" id="sortRow" style="display:none">
    <button class="chip sort" data-s="mgmt">管理番号が古い順</button>
    <button class="chip sort" data-s="month">月ごとに区切る</button>
    <button class="chip sort" data-s="old">出品が古い順</button>
  </div>
  <div class="chips" id="newRow" style="display:none"><button class="chip" id="newOnly"></button></div>
  <div class="chips" id="onlyRow" style="display:none"><button class="chip" id="only">ラクマに無い物だけ</button><button class="chip" id="ronly" style="display:none">ラクマだけの物</button></div>
  <input id="q" type="search" placeholder="タイトル・管理番号でしぼる" autocomplete="off">
</header>
<main id="list"></main>
<div id="toast"></div>
<script id="data" type="application/json">__DATA__</script>
<script>
(function(){
  var D = JSON.parse(document.getElementById('data').textContent);
  var mode = 'fur', q = '', only = false;
  // 並び：出品が古い順（既定）／新しい順／仕入れ月ごと。選んだ並びはこの端末に覚えておく
  var sortMode = 'mgmt';   // 既定は前と同じ「管理番号が古い順」（ユーザーがこの順でラックに掛けている）
  var newOnly = false, newBtn = document.getElementById('newOnly'), newN = D.items.filter(function(x){ return x.n; }).length;
  if (newN) { document.getElementById('newRow').style.display = ''; newBtn.textContent = '✅ ' + D.base + ' より後に追加した物だけ（' + newN + '点）';
    newBtn.addEventListener('click', function(){ newOnly = !newOnly; newBtn.className = 'chip' + (newOnly ? ' on' : ''); render(); window.scrollTo(0, 0); }); }
  // 開くたびに必ず「管理番号が古い順」から始める（2026-11-28：前に選んだ並びを覚えていると、ラックの順と違う並びで開いてしまう）
  try { localStorage.removeItem('mercari-sort'); } catch (e) {}
  var onlyBtn = document.getElementById('only'), onlyN = D.items.filter(function(x){ return x.o; }).length;
  var rak = false, rBtn = document.getElementById('ronly'), RL = D.r || [];
  function sync(){ onlyBtn.className = 'chip' + (only && !rak ? ' on' : ''); rBtn.className = 'chip' + (rak ? ' on' : ''); document.getElementById('ttl').textContent = rak ? 'ラクマだけの物' : 'メルカリ販売中'; render(); window.scrollTo(0, 0); }
  if (onlyN || RL.length) document.getElementById('onlyRow').style.display = '';
  if (!onlyN) onlyBtn.style.display = 'none';
  onlyBtn.addEventListener('click', function(){ only = rak ? true : !only; rak = false; sync(); });
  if (RL.length) { rBtn.style.display = ''; rBtn.addEventListener('click', function(){ rak = !rak; sync(); }); }
  var list = document.getElementById('list'), toastEl = document.getElementById('toast'), tm;
  function noteText(){ document.getElementById('note').textContent = D.at + ' 時点 ／ ' + (rak || sortMode === 'month' ? '管理番号が古い順（仕入れ月ごとに区切り）' : sortMode === 'mgmt' ? '管理番号が古い順（1番から通し）' : '出品が古い順（メルカリの並びから）') + ' ／ 毛皮＝カテゴリが毛皮・ファーコート'; }
  noteText();
  function toast(s){ toastEl.textContent = s; toastEl.className = 'on'; clearTimeout(tm); tm = setTimeout(function(){ toastEl.className = ''; }, 1800); }
  function copy(text){
    function fb(){ var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;width:1px;height:1px'; document.body.appendChild(ta); ta.focus(); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch(e){} document.body.removeChild(ta); return ok; }
    if (navigator.clipboard && navigator.clipboard.writeText) { return navigator.clipboard.writeText(text).then(function(){ return true; }, function(){ return fb(); }); }
    return Promise.resolve(fb());
  }
  function month(m){ if (/^2[4-9]\d{3}$/.test(m)) m = m.slice(0,2) + '0' + m.slice(2); var y = Number(m.slice(0,2)), mo = Number(m.slice(2,4)); if (/^\d{6}/.test(m) && y >= 24 && y <= (new Date().getFullYear() % 100) && mo >= 1 && mo <= 12) return '20' + m.slice(0,2) + '年' + mo + '月の仕入れ'; return m ? 'そのほかの管理番号' : '管理番号なし'; }
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function render(){
    var kw = q.trim().toLowerCase();
    var rows = (rak ? RL : D.items).filter(function(x){
      if (mode === 'fur' && !x.f) return false;
      if (mode === 'other' && x.f) return false;
      if (!rak && only && !x.o) return false;
      if (!rak && newOnly && !x.n) return false;
      if (kw && (x.t + ' ' + x.m).toLowerCase().indexOf(kw) < 0) return false;
      return true;
    });
    var byOrd = !rak && D.ord && sortMode === 'old';
    var flat = !rak && (byOrd || sortMode === 'mgmt');   // 見出しで区切らず、1番から通しで並べる（2026-11-28：月ごとの区切りは管理番号の通しの順として見づらい、とのユーザーの指摘）
    if (byOrd) rows = rows.slice().sort(function(a, b){ return b.k - a.k; });
    noteText();
    document.getElementById('cnt').textContent = rows.length + '点';
    list.textContent = '';
    if (!rows.length) { list.appendChild(el('div', 'empty', '当てはまる出品がありません')); return; }
    var groups = [], cur = null;
    if (flat) groups.push({ name: '', rows: rows });
    else rows.forEach(function(x){ var g = month(x.m); if (!cur || cur.name !== g) { cur = { name: g, rows: [] }; groups.push(cur); } cur.rows.push(x); });
    var seq = 0;
    var frag = document.createDocumentFragment();
    groups.forEach(function(g){
      if (g.name) { var h = el('h2'); h.appendChild(el('span', null, g.name)); h.appendChild(el('span', null, g.rows.length + '点')); frag.appendChild(h); }
      g.rows.forEach(function(x){
        var card = el('div', 'card' + (!rak && x.n ? ' isnew' : ''));
        var a = el('a', 'ph'); a.href = rak ? 'https://item.fril.jp/' + x.h : 'https://jp.mercari.com/item/' + x.i; a.target = '_blank'; a.rel = 'noopener noreferrer';
        var img = document.createElement('img'); img.loading = 'lazy'; img.alt = ''; img.src = rak ? x.u : 'https://static.mercdn.net/thumb/item/webp/' + x.i + '_1.jpg'; a.appendChild(img); card.appendChild(a);
        var body = el('div', 'body');
        if (!rak && x.n) body.appendChild(el('div', 'new', '✅ 追加（' + x.n + ' の一覧から）'));
        var tt = el('div', 't'); if (flat) { seq++; tt.appendChild(el('span', 'no', seq + '.')); } tt.appendChild(document.createTextNode(x.t)); body.appendChild(tt);
        var meta = el('div', 'meta'); var pr = el('b', null, '¥' + x.p.toLocaleString()); meta.appendChild(pr); meta.appendChild(el('span', null, x.m ? '管理番号 ' + x.m : '管理番号なし')); if (rak) meta.appendChild(el('span', 'tag', 'メルカリに無い')); else if (x.o) meta.appendChild(el('span', 'tag', 'ラクマに無い')); body.appendChild(meta);
        var btns = el('div', 'btns');
        var b1 = el('button', 'btn', '📋 タイトルコピー'); b1.addEventListener('click', function(){ copy(x.t).then(function(ok){ toast(ok ? '📋 コピーしました' : 'コピーできませんでした'); }); });
        var b2 = el('a', 'btn go', rak ? '🔎 ラクマで開く' : '🔎 メルカリ検索'); b2.href = rak ? 'https://item.fril.jp/' + x.h : 'https://jp.mercari.com/search?keyword=' + encodeURIComponent(x.t); b2.target = '_blank'; b2.rel = 'noopener noreferrer';
        btns.appendChild(b1); btns.appendChild(b2); body.appendChild(btns);
        card.appendChild(body); frag.appendChild(card);
      });
    });
    list.appendChild(frag);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.chip[data-f]'), function(c){
    c.addEventListener('click', function(){ mode = c.getAttribute('data-f'); Array.prototype.forEach.call(document.querySelectorAll('.chip[data-f]'), function(o){ o.className = 'chip' + (o === c ? ' on' : ''); }); render(); window.scrollTo(0, 0); });
  });
  var sortBtns = document.querySelectorAll('.chip.sort');
  function syncSort(){ Array.prototype.forEach.call(sortBtns, function(o){ o.className = 'chip sort' + (o.getAttribute('data-s') === sortMode ? ' on' : ''); }); }
  if (D.ord) { document.getElementById('sortRow').style.display = ''; syncSort();
    Array.prototype.forEach.call(sortBtns, function(c){ c.addEventListener('click', function(){ sortMode = c.getAttribute('data-s'); syncSort(); render(); window.scrollTo(0, 0); }); }); }
  document.getElementById('q').addEventListener('input', function(e){ q = e.target.value; render(); });
  render();
})();
</script>
</body>
</html>
'''
open(OUT, 'w').write(HTML.replace('__DATA__', data))
fur = sum(x['f'] for x in items)
print(f'{OUT} を作りました：{len(items)}点（毛皮 {fur}点・毛皮以外 {len(items) - fur}点）／{d.get("scannedAt")} 時点／{os.path.getsize(OUT):,} バイト')

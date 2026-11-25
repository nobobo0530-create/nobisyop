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
items = []
for mid, v in d['items'].items():
    t = re.sub(r'\s+', ' ', v.get('title') or '').strip()
    m = (v.get('mgmt') or '').strip()
    items.append({'i': mid, 't': t, 'p': int(v.get('price') or 0), 'm': m, 'f': 1 if (FUR.search(t) and not NOT_FUR.search(t)) else 0})
items.sort(key=lambda x: (x['m'] or '￿', x['t']))
data = json.dumps({'at': d.get('scannedAt') or '', 'items': items}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

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
.empty{color:var(--sub);text-align:center;padding:40px 0;font-size:14px}
</style>
</head>
<body>
<header>
  <div class="top"><h1>メルカリ販売中 <span id="cnt" style="font-size:14px;color:var(--sub);font-weight:600"></span></h1><a class="back" href="/">← アプリへ</a></div>
  <div class="note" id="note"></div>
  <div class="chips">
    <button class="chip on" data-f="fur">毛皮</button>
    <button class="chip" data-f="other">毛皮以外</button>
    <button class="chip" data-f="all">すべて</button>
  </div>
  <input id="q" type="search" placeholder="タイトル・管理番号でしぼる" autocomplete="off">
</header>
<main id="list"></main>
<div id="toast"></div>
<script id="data" type="application/json">__DATA__</script>
<script>
(function(){
  var D = JSON.parse(document.getElementById('data').textContent);
  var mode = 'fur', q = '';
  var list = document.getElementById('list'), toastEl = document.getElementById('toast'), tm;
  document.getElementById('note').textContent = D.at + ' 時点 ／ 管理番号が古い順（仕入れ月ごと）';
  function toast(s){ toastEl.textContent = s; toastEl.className = 'on'; clearTimeout(tm); tm = setTimeout(function(){ toastEl.className = ''; }, 1800); }
  function copy(text){
    function fb(){ var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;width:1px;height:1px'; document.body.appendChild(ta); ta.focus(); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch(e){} document.body.removeChild(ta); return ok; }
    if (navigator.clipboard && navigator.clipboard.writeText) { return navigator.clipboard.writeText(text).then(function(){ return true; }, function(){ return fb(); }); }
    return Promise.resolve(fb());
  }
  function month(m){ return /^\d{6}/.test(m) ? '20' + m.slice(0,2) + '年' + Number(m.slice(2,4)) + '月の仕入れ' : '管理番号なし'; }
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function render(){
    var kw = q.trim().toLowerCase();
    var rows = D.items.filter(function(x){
      if (mode === 'fur' && !x.f) return false;
      if (mode === 'other' && x.f) return false;
      if (kw && (x.t + ' ' + x.m).toLowerCase().indexOf(kw) < 0) return false;
      return true;
    });
    document.getElementById('cnt').textContent = rows.length + '点';
    list.textContent = '';
    if (!rows.length) { list.appendChild(el('div', 'empty', '当てはまる出品がありません')); return; }
    var groups = [], cur = null;
    rows.forEach(function(x){ var g = month(x.m); if (!cur || cur.name !== g) { cur = { name: g, rows: [] }; groups.push(cur); } cur.rows.push(x); });
    var frag = document.createDocumentFragment();
    groups.forEach(function(g){
      var h = el('h2'); h.appendChild(el('span', null, g.name)); h.appendChild(el('span', null, g.rows.length + '点')); frag.appendChild(h);
      g.rows.forEach(function(x){
        var card = el('div', 'card');
        var a = el('a', 'ph'); a.href = 'https://jp.mercari.com/item/' + x.i; a.target = '_blank'; a.rel = 'noopener noreferrer';
        var img = document.createElement('img'); img.loading = 'lazy'; img.alt = ''; img.src = 'https://static.mercdn.net/thumb/item/webp/' + x.i + '_1.jpg'; a.appendChild(img); card.appendChild(a);
        var body = el('div', 'body');
        body.appendChild(el('div', 't', x.t));
        var meta = el('div', 'meta'); var pr = el('b', null, '¥' + x.p.toLocaleString()); meta.appendChild(pr); meta.appendChild(el('span', null, x.m ? '管理番号 ' + x.m : '管理番号なし')); body.appendChild(meta);
        var btns = el('div', 'btns');
        var b1 = el('button', 'btn', '📋 タイトルコピー'); b1.addEventListener('click', function(){ copy(x.t).then(function(ok){ toast(ok ? '📋 コピーしました' : 'コピーできませんでした'); }); });
        var b2 = el('a', 'btn go', '🔎 メルカリ検索'); b2.href = 'https://jp.mercari.com/search?keyword=' + encodeURIComponent(x.t); b2.target = '_blank'; b2.rel = 'noopener noreferrer';
        btns.appendChild(b1); btns.appendChild(b2); body.appendChild(btns);
        card.appendChild(body); frag.appendChild(card);
      });
    });
    list.appendChild(frag);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.chip'), function(c){
    c.addEventListener('click', function(){ mode = c.getAttribute('data-f'); Array.prototype.forEach.call(document.querySelectorAll('.chip'), function(o){ o.className = 'chip' + (o === c ? ' on' : ''); }); render(); window.scrollTo(0, 0); });
  });
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

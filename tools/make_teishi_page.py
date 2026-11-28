#!/usr/bin/env python3
"""メルカリで「公開停止中」のまま再出品していない物の一覧ページ（public/teishi.html）を作る。読み取り専用。
元データ: ~/Documents/nobushop_mail/listings/pause_1129/（res2.pkl・order.json・judg.json）と mercari_mypage_1129.json"""
import json,os,pickle,html
B=os.path.expanduser('~/Documents/nobushop_mail/'); D=B+'listings/pause_1129/'
res=pickle.load(open(D+'res2.pkl','rb')); order=json.load(open(D+'order.json')); judg=json.load(open(D+'judg.json'))
my=json.load(open(B+'listings/mercari_mypage_1129.json')); P={x['id']:x for x in my['stopped']}
R0=json.load(open(B+'rakuma_snap/items.json'))
A=[];Bc=[];C=[];sold=0;rel=0
jd={order[int(k)]:v for k,v in judg.items()}
for i,v in res.items():
    x=P[i]; j=jd.get(i)
    if v['on'] or j=='R': rel+=1; continue
    if v['sold2'] or j=='S': sold+=1; continue
    if v['rl']:
        r=R0.get(v['rl_h']) or {}
        A.append((x,'ラクマでは販売中（¥{:,}）'.format(int(r.get('price') or 0)) if r.get('price') else 'ラクマでは販売中')); continue
    if j=='U': Bc.append((x,'写真で見比べ済み：今の出品にも売上にも見当たらない')); continue
    note={'?R':'今の出品に似た物あり（撮り直して出し直した可能性）','?S':'売れた物に似た物あり','?':'似た物が複数あり、見分けがつかない'}.get(j,'写真の見比べは未実施')
    C.append((x,note))
key=lambda t:-t[0]['price']
A.sort(key=key);Bc.sort(key=key);C.sort(key=key)
def card(x,note):
    return ('<div class="card"><span class="ph"><img loading="lazy" src="https://static.mercdn.net/thumb/item/webp/%s_1.jpg" alt=""></span>'
            '<div class="body"><div class="t">%s</div><div class="meta"><b>¥%s</b><span>%sに出品</span></div><div class="nt">%s</div></div></div>')%(x['id'],html.escape(x['title']),format(x['price'],','),html.escape(x['when']),html.escape(note))
def sec(title,rows,desc):
    return '<h2><span>%s</span><span>%d点</span></h2><p class="note">%s</p>%s'%(title,len(rows),desc,''.join(card(*r) for r in rows))
page='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><title>メルカリ 停止中の見直し</title><style>
:root{--bg:#f2f2f7;--card:#fff;--ink:#111;--sub:#6b7280;--line:#e5e7eb;--accent:#e84040}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#1b1e25;--ink:#f3f4f6;--sub:#9ca3af;--line:#2c313c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;-webkit-text-size-adjust:100%%}
header{position:sticky;top:0;z-index:5;background:var(--bg);padding:calc(10px + env(safe-area-inset-top)) 16px 10px;border-bottom:1px solid var(--line)}
h1{font-size:19px;margin:0}.note{font-size:12.5px;color:var(--sub);margin:4px 0 10px;line-height:1.5}
main{padding:8px 16px calc(40px + env(safe-area-inset-bottom));max-width:720px;margin:0 auto}
h2{font-size:15px;margin:22px 0 4px;display:flex;justify-content:space-between}
.card{display:flex;gap:12px;background:var(--card);border-radius:14px;padding:10px;margin-bottom:10px;border:1px solid var(--line)}
.ph{flex:0 0 96px;width:96px;height:96px;border-radius:10px;overflow:hidden;background:var(--line);display:block}.ph img{width:100%%;height:100%%;object-fit:cover;display:block}
.body{flex:1;min-width:0}.t{font-size:14px;font-weight:700;line-height:1.4;word-break:break-all;-webkit-user-select:text;user-select:text}
.meta{font-size:12px;color:var(--sub);margin:4px 0;display:flex;gap:10px;flex-wrap:wrap}.meta b{color:var(--accent);font-size:14px}.nt{font-size:12px;color:var(--sub)}
.sum{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;font-size:13.5px;line-height:1.7;margin-top:10px}
</style></head><body><header><h1>メルカリ 停止中の見直し</h1><div class="note">%s 時点。値段は停止した時のメルカリの値段です。</div></header><main>
<div class="sum">停止中 <b>%d件</b> の内訳<br>・売れている（消してよい）：%d件<br>・今メルカリで販売中（古い方が残っているだけ）：%d件<br>・下の①②③：%d件</div>
%s%s%s</main></body></html>'''%(my['at'],len(P),sold,rel,len(A)+len(Bc)+len(C),
 sec('① ラクマには出ている・メルカリに無い',A,'まだ売れていません。メルカリで再開してよい物です。'),
 sec('② どこにも出ていない（写真で確認）',Bc,'今の出品・売上の記録（2月以降）と写真で見比べて、見当たらなかった物です。手元にあれば再出品もれです。'),
 sec('③ まだ見分けがついていない',C,'古い出品が中心です。撮り直して出し直した物・2月より前に売れた物が混ざっています。'))
open(os.path.join(os.path.dirname(__file__),'..','public','teishi.html'),'w').write(page)
print('A',len(A),sum(x['price'] for x,_ in A),'B',len(Bc),sum(x['price'] for x,_ in Bc),'C',len(C),'sold',sold,'rel',rel,'total',len(P))
json.dump({'A':[x['id'] for x,_ in A],'B':[x['id'] for x,_ in Bc],'C':[x['id'] for x,_ in C],'sold':sold,'rel':rel},open(D+'result.json','w'))

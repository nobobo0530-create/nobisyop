'''確認待ちのヤフオク仕入れ下書き(purchaseDraft, open)を、アプリの「登録する」と同じ形で在庫に登録する。
  python3 tools/register_purchase_drafts.py                 # ドライラン（open全件）
  python3 tools/register_purchase_drafts.py --aids a,b,c    # 指定オークションIDだけ
  python3 tools/register_purchase_drafts.py ... --apply
同じ yahooAuctionId が在庫にあればスキップ。500で即中止。'''
import json,sys,time,urllib.request,datetime,random,re
sys.path.insert(0,'/Users/yoshidanoboru/nobushop-pwa/tools')
import cloud_get
now=datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
d=cloud_get.get_cloud(max_age=0); inv=d['inventory']
uid=next((i.get('userId') for i in inv if i.get('userId')),'self')
aids={str(i.get('yahooAuctionId') or '').strip().lower() for i in inv if i.get('yahooAuctionId')}
P=[p for p in d.get('claudeProposals') or [] if p.get('type')=='purchaseDraft' and p.get('status')=='open' and isinstance(p.get('draft'),dict)]
if '--aids' in sys.argv:
    want={x.strip().lower() for x in sys.argv[sys.argv.index('--aids')+1].split(',') if x.strip()}
    P=[p for p in P if str(p['draft'].get('yahooAuctionId') or '').strip().lower() in want]
items=[];props=[];ts=int(time.time()*1000)
for k,p in enumerate(P):
    dr=p['draft']; aid=str(dr.get('yahooAuctionId') or '').strip()
    t=ts+k
    if aid and aid.lower() in aids:
        print('DUP skip',aid); continue
    total=round(float(dr.get('purchasePrice') or 0))
    assert str(dr.get('productName','')).strip() and re.match(r'^\d{4}-\d{2}-\d{2}$',dr.get('purchaseDate','')) and total>0, p['id']
    ph=[x for x in (dr.get('photos') or []) if x and x.get('thumbDataUrl')][:1]
    it=dict(dr); it.update(id=f'{t}_online_{random.randint(0,999)}',userId=uid,category=dr.get('category') or '',
        photos=[dict(id=f'photo_{t}_{i}',thumbId=f'thumb_{t}_{i}',source=x.get('source') or 'yahoo_listing',thumbDataUrl=x['thumbDataUrl'],**({'medDataUrl':x['medDataUrl']} if x.get('medDataUrl') else {})) for i,x in enumerate(ph)],
        status='unlisted',createdAt=now,updatedAt=now)
    q=dict(p); q.update(status='approved',updatedAt=now,resultItemIds=[it['id']],items=[dict(x,photo=None) for x in (p.get('items') or [])],note=(p.get('note') or '')+' / 支払い額一致で自動登録')
    q.pop('alternatives',None)
    items.append(it); props.append(q); print(aid,dr['purchaseDate'],total,dr.get('purchaseStore'),dr['productName'][:40])
print('total',len(items),sum(round(float(x['purchasePrice'])) for x in items))
if '--apply' not in sys.argv: sys.exit()
def post(b):
    for t in range(3):
        try: return urllib.request.urlopen(urllib.request.Request(cloud_get.API,data=json.dumps(b).encode(),headers={'Content-Type':'application/json'}),timeout=180).read()[:80]
        except Exception as e:
            print('ERR',e)
            if '500' in str(e): sys.exit('500 stop')
            time.sleep(15*(t+1))
    sys.exit('fail')
for k in range(0,len(items),5): print(post({'invUpsert':[{'id':x['id'],'data':x} for x in items[k:k+5]]}))
for k in range(0,len(props),5): print(post({'proposalsUpsert':props[k:k+5]}))
cloud_get.invalidate()

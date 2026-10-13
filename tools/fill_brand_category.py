#!/usr/bin/env python3
"""商品名からブランドとカテゴリーを読み取って、空欄の在庫だけに入れる。
入力済みの値は絶対に上書きしない。

使い方:
  python3 tools/fill_brand_category.py --test    # 入力済みの商品で正解率を測る
  python3 tools/fill_brand_category.py           # 下見（何が入るか一覧）
  python3 tools/fill_brand_category.py --apply   # クラウドに反映

判断できないもの（複数ブランドのまとめ売り、バッグと衣類の両方に取れる等）は空欄のまま残す。
"""
import datetime
import json
import os
import re
import sys
import time
import unicodedata
import urllib.request

API = 'https://nobisyop.vercel.app/api/data'

# (表記, 読み取りキーワード) … 表記は既存データで一番多い書き方に揃えている
# 長いキーワードを先に判定するので、SAGA MINK と MINK、Burberrys と Burberry は区別される
BRANDS = [
    ('Emilio GUCCI', ['emilio gucci', 'エミリオグッチ']),   # GUCCI とは別ブランド（毛皮）
    ('jun ashida', ['jun ashida', 'ジュンアシダ']),
    ('GUCCI', ['gucci', 'グッチ']),
    ('PRADA', ['prada', 'プラダ']),
    ('Vivienne Westwood', ['vivienne westwood', 'ヴィヴィアンウエストウッド', 'ヴィヴィアン・ウエストウッド', 'ヴィヴィアン']),
    ('Burberrys', ['burberrys', 'バーバリーズ']),
    ('BURBERRY BLUE LABEL', ['burberry blue label', 'バーバリーブルーレーベル', 'バーバリー ブルーレーベル']),
    ('BURBERRY BLACK LABEL', ['burberry black label', 'バーバリーブラックレーベル', 'バーバリー ブラックレーベル']),
    ('BURBERRY', ['burberry', 'バーバリー']),
    ('Cartier', ['cartier', 'カルティエ']),
    ('FENDI', ['fendi', 'フェンディ']),
    ('SAGA MINK', ['saga mink', 'サガミンク']),
    ('SAGA FOX', ['saga fox', 'サガフォックス']),
    ('SAGA FURS', ['saga furs', 'サガファーズ']),
    ('Christian Dior', ['christian dior', 'dior', 'ディオール']),
    ('Yves Saint Laurent', ['yves saint laurent', 'イヴサンローラン', 'イブサンローラン', 'ysl']),
    ('Saint Laurent', ['saint laurent', 'サンローラン']),
    ('EMBA', ['emba', 'エンバ']),
    ('Louis Vuitton', ['louis vuitton', 'ルイヴィトン', 'ルイ・ヴィトン', 'ヴィトン']),
    ('COACH', ['coach', 'コーチ']),
    ('Chloe', ['chloe', 'chloé', 'クロエ']),
    ('Jean Paul Gaultier', ['jean paul gaultier', 'gaultier', 'ゴルチエ', 'ゴルチェ']),
    ('DIESEL', ['diesel', 'ディーゼル']),
    ('Stella McCartney', ['stella mccartney', 'ステラマッカートニー', 'ステラ・マッカートニー']),
    ('GIVENCHY', ['givenchy', 'ジバンシィ', 'ジバンシー']),
    ('PLAY COMME des GARCONS', ['play comme des garcons', 'play comme des garçons', 'play comme de garcons', 'play comme de garçons', 'play cdg', 'プレイコムデギャルソン', 'プレイ コムデギャルソン']),
    ('COMME des GARCONS', ['comme des garcons', 'comme des garçons', 'comme de garcons', 'comme de garçons', 'コムデギャルソン', 'コム・デ・ギャルソン', 'toricot', 'tricot comme', 'cdg']),
    ('Salvatore Ferragamo', ['ferragamo', 'フェラガモ']),
    ('Dolce&Gabbana', ['dolce&gabbana', 'dolce & gabbana', 'ドルチェ&ガッバーナ', 'ドルチェアンドガッバーナ', 'ドルガバ']),
    ('CELINE', ['celine', 'céline', 'セリーヌ']),
    ('MCM', ['mcm']),
    ('Paul Smith', ['paul smith', 'ポールスミス']),
    ('Y-3', ['y-3', 'y－3']),
    ('Polo Ralph Lauren', ['ralph lauren', 'ラルフローレン', 'polo by ralph']),
    ('CHANEL', ['chanel', 'シャネル']),
    ('HERMES', ['hermes', 'hermès', 'エルメス']),
    ('BALENCIAGA', ['balenciaga', 'バレンシアガ']),
    ('BOTTEGA VENETA', ['bottega veneta', 'ボッテガ']),
    ('LOEWE', ['loewe', 'ロエベ']),
    ('MIU MIU', ['miu miu', 'miumiu', 'ミュウミュウ']),
    ('Valentino', ['valentino', 'ヴァレンティノ', 'バレンティノ']),
    ('HYSTERIC GLAMOUR', ['hysteric glamour', 'ヒステリックグラマー']),
    ('SAFURON', ['safuron', 'サフロン']),
    ('Stussy', ['stussy', 'ステューシー']),
    ('CHEVAREINE', ['chevareine', 'シュヴァレーヌ']),
    ('BONAVENTURA', ['bonaventura', 'ボナベンチュラ']),
    ("TOD'S", ["tod's", 'トッズ']),
    ('MARNI', ['marni', 'マルニ']),
    ('kate spade', ['kate spade', 'ケイトスペード']),
    ('MICHAEL KORS', ['michael kors', 'マイケルコース']),
    ('BVLGARI', ['bvlgari', 'bulgari', 'ブルガリ']),
    ('TIFFANY', ['tiffany', 'ティファニー']),
    ('Anya Hindmarch', ['anya hindmarch', 'アニヤハインドマーチ']),
    ('BALLY', ['bally', 'バリー']),
    ('AIGNER', ['aigner', 'アイグナー']),
    ('BRIEFING', ['briefing', 'ブリーフィング']),
    ('Rambulton', ['rambulton', 'ランブルトン']),
    ('PORTER', ['porter', 'ポーター']),
    ('45rpm', ['45rpm', '45r', 'フォーティファイブアールピーエム']),
    ('RRL', ['rrl', 'ダブルアールエル']),
    ("Y's", ["y's", 'y’s', 'ワイズ']),
    ('Yohji Yamamoto', ['yohji yamamoto', 'ヨウジヤマモト']),
    ('agnes b.', ['agnes b', 'agnès b', 'アニエスベー']),
    ('Patagonia', ['patagonia', 'パタゴニア']),
    ('MARC JACOBS', ['marc jacobs', 'マークジェイコブス']),
    ('VERSACE', ['versace', 'ヴェルサーチ', 'ベルサーチ']),
    ('CHROME HEARTS', ['chrome hearts', 'クロムハーツ']),
    ('Jimmy Choo', ['jimmy choo', 'ジミーチュウ']),
    ('sacai', ['sacai', 'サカイ']),
    ('ISSEY MIYAKE', ['issey miyake', 'イッセイミヤケ', 'pleats please', 'プリーツプリーズ']),
    ('WIND AND SEA', ['wind and sea', 'wind and sea']),
    ('A BATHING APE', ['bathing ape', 'アベイシングエイプ']),
    ('WACKO MARIA', ['wacko maria', 'ワコマリア']),
    ('Fred Perry', ['fred perry', 'フレッドペリー']),
    ('MACKINTOSH', ['mackintosh', 'マッキントッシュ']),
    ('THE NORTH FACE PURPLE LABEL', ['north face purple label', 'ノースフェイス パープルレーベル', 'ノースフェイスパープルレーベル']),
    ('Helen Kaminski', ['helenkaminski', 'helen kaminski', 'ヘレンカミンスキー']),
    ('Felisi', ['felisi', 'フェリージ']),
    ('Thomas Wylde', ['thomas wylde']),
    ('F.C.Real Bristol', ['f.c.real bristol', 'fcrb', 'f.c.r.b', 'ブリストル']),
]

# 英字キーワードは単語の途中に当たらないように境界を見る（例: coach が coachman に当たらない）
def _kw_hit(t, kw):
    if re.search(r'[a-z]', kw):
        return re.search(r'(?<![a-z])' + re.escape(kw) + r'(?![a-z])', t) is not None
    return kw in t


CAT_RULES = [
    # (カテゴリー, キーワード) … 上から順に強い
    ('毛皮', ['毛皮', 'ミンク', 'mink', 'フォックス', 'fox', 'セーブル', 'チンチラ', 'ウィーゼル', 'weasel',
             'ラビットファー', 'リアルファー', 'ファーコート', 'ファーベスト', 'ファージャケット', 'ファーショール',
             'コリンスキー', 'ラクーン', 'シェアード', 'saga furs', 'ファー']),
    ('小物', ['財布', 'ウォレット', 'wallet', 'コインケース', 'カードケース', 'キーケース', '名刺入れ', 'パスケース',
             '札入れ', '小銭入れ', 'キーリング', 'キーホルダー', 'シガレットケース', 'ペンケース']),
    ('バッグ', ['バッグ', 'bag', '鞄', 'かばん', 'カバン', 'トート', 'ショルダー', 'リュック', 'バックパック', 'デイパック',
              'ボストン', 'クラッチ', 'ポシェット', 'ハンドバック', 'ブリーフケース', 'ビジネスバッグ', 'ウエストポーチ',
              'ボディバッグ', 'サコッシュ', 'メッセンジャー', 'バニティ']),
    # ポーチは「バッグ」と書いてあっても小物（既存データの付け方に合わせる）。ウエストポーチは除外済み
    ('ポーチ', ['ポーチ', '小物入れ']),
    # はっきりバッグと分かる語。ポーチと併記されていてもバッグにする（例: ショルダーバッグ ミニポーチ付き）
    ('バッグ強', ['ショルダーバッグ', 'ハンドバッグ', 'トートバッグ', 'クラッチバッグ', 'セカンドバッグ', 'ボストン',
                'リュック', '2way', 'ワンショルダー', 'ガーメント']),
    # 弱い小物語: バッグの付属品として出てくる（ショルダーベルト等）のでバッグの語があればバッグ
    ('小物2', ['巾着', 'ネクタイ', 'マフラー', 'ストール', 'スカーフ', 'ベルト', '手袋', 'ハンカチ', 'サングラス',
              'メガネ', '眼鏡', 'ネックレス', 'ブレスレット', '指輪', 'ピアス', 'イヤリング', '腕時計', 'ブローチ',
              '帽子', 'キャップ', 'ハット']),
    ('衣類', ['コート', 'ジャケット', 'シャツ', 'ブラウス', 'ニット', 'セーター', 'パーカー', 'フーディ', 'ワンピース',
             'スカート', 'パンツ', 'デニム', 'ジーンズ', 'スラックス', 'ベスト', 'ジレ', 'ブルゾン', 'カーディガン',
             'スウェット', 'トレーナー', 'ダウン', 'スーツ', 'スカジャン', 'ジャンパー', 'アウター', 'トップス',
             'カットソー', 'ポロシャツ', 't-shirt', 'tシャツ', 'ロンt', 'チュニック', 'ドレス', 'セットアップ', '着物']),
    ('シューズ', ['スニーカー', 'パンプス', 'ブーツ', 'ローファー', 'サンダル', 'シューズ', 'ミュール', '革靴', '靴']),
]


def norm(s):
    return unicodedata.normalize('NFKC', s or '').lower()


def guess_brand(title):
    t = norm(title)
    if 'ノーブランド' in t or 'no brand' in t:
        return None, 'ノーブランド'
    # 「ディオール/他」「BRIEFING/他」は複数ブランドのまとめ売り
    if re.search(r'[/／・]\s*他', t):
        return None, '複数ブランド（〜/他）'
    hits = []
    for name, kws in BRANDS:
        for kw in sorted(kws, key=len, reverse=True):
            if _kw_hit(t, norm(kw)):
                hits.append(name)
                break
    # Burberrys が当たったら BURBERRY は同じブランドの別表記なので外す。Dior と Christian Dior も同様
    if 'Burberrys' in hits and 'BURBERRY' in hits:
        hits.remove('BURBERRY')
    if 'Emilio GUCCI' in hits and 'GUCCI' in hits:
        hits.remove('GUCCI')
    if 'Yves Saint Laurent' in hits and 'Saint Laurent' in hits:
        hits.remove('Saint Laurent')
    # 上位ブランド（ライン名）が当たったら親ブランドは外す
    for child, parent in (('BURBERRY BLUE LABEL', 'BURBERRY'), ('BURBERRY BLACK LABEL', 'BURBERRY'),
                          ('PLAY COMME des GARCONS', 'COMME des GARCONS'),
                          ('THE NORTH FACE PURPLE LABEL', None)):
        if child in hits and parent in hits:
            hits.remove(parent)
    # 「バーバリー」の中の「バリー」は BALLY ではない
    if 'BALLY' in hits and not _kw_hit(re.sub('バーバリー', '', t), 'バリー') and not _kw_hit(t, 'bally'):
        hits.remove('BALLY')
    # サガ（SAGA FURS 銀サガ/金サガ）: 種類で SAGA MINK / SAGA FOX に振り分け
    if not hits and 'サガ' in t:
        if 'ミンク' in t: hits.append('SAGA MINK')
        elif 'フォックス' in t or 'fox' in t: hits.append('SAGA FOX')
        else: hits.append('SAGA FURS')
    if len(hits) == 1:
        return hits[0], ''
    if not hits:
        return None, 'ブランド名なし'
    return None, '複数ブランド: ' + '/'.join(hits)


def guess_category(title):
    # 「ファー付き」は衿などにファーが付いた服なので毛皮扱いしない
    t = norm(title).replace('ウエストポーチ', 'ウエストバッグ').replace('ファー付き', '').replace('ファー付', '')
    found = []
    for cat, kws in CAT_RULES:
        if any(_kw_hit(t, norm(k)) for k in kws):
            found.append(cat)
    if not found:
        return None, 'キーワードなし'
    # まとめ売りで種類が混ざっているものは決めない（例: トートバッグ＋ポーチ 3点まとめ）
    kinds = {'小物' if c in ('ポーチ', '小物2') else ('バッグ' if c == 'バッグ強' else c) for c in found}
    if len(kinds) > 1 and re.search(r'まとめ|セット|\d+点', t):
        return None, 'まとめ売りで種類が混在'
    if '毛皮' in found:
        # ファー付きのバッグ・小物はそちらを優先
        if 'バッグ' in found:
            return None, '毛皮とバッグの両方'
        if '小物' in found or 'ポーチ' in found:
            return '小物', ''
        return '毛皮', ''
    if '小物' in found:
        return '小物', ''
    if 'ポーチ' in found and 'バッグ強' not in found:
        return '小物', ''
    if 'バッグ' in found or 'バッグ強' in found:
        if '衣類' in found:
            return None, 'バッグと衣類の両方'
        return 'バッグ', ''
    if '小物2' in found:
        return ('小物', '') if '衣類' not in found else (None, '小物と衣類の両方')
    if '衣類' in found:
        return ('衣類', '') if 'シューズ' not in found else (None, '衣類と靴の両方')
    if 'シューズ' in found:
        return 'シューズ', ''
    return None, '判定不能'


def fetch():
    import cloud_get
    return cloud_get.get_cloud()


def brand_key(b):
    return re.sub(r'[^a-z0-9]', '', norm(b))


def test(inv):
    ok = ng = 0
    miss = []
    for v in inv:
        if v.get('brand') and v['brand'] not in ('Unknown Brand',):
            g, _ = guess_brand(v.get('productName'))
            if g is None:
                continue
            if brand_key(g) == brand_key(v['brand']) or brand_key(v['brand']).startswith(brand_key(g)) \
               or brand_key(g).startswith(brand_key(v['brand'])):
                ok += 1
            else:
                ng += 1
                miss.append(('ブランド', v['brand'], g, v.get('productName', '')[:50]))
    print(f'ブランド: 一致 {ok} / 不一致 {ng}')
    ok = ng = 0
    for v in inv:
        if v.get('category'):
            g, _ = guess_category(v.get('productName'))
            if g is None:
                continue
            # 既存データは毛皮コートを「衣類」にしているものがあるので、毛皮⇔衣類は一致扱い
            if g == v['category'] or {g, v['category']} == {'毛皮', '衣類'}:
                ok += 1
            else:
                ng += 1
                miss.append(('カテゴリー', v['category'], g, v.get('productName', '')[:50]))
    print(f'カテゴリー: 一致 {ok} / 不一致 {ng}')
    for m in miss:
        print('  ✗', *m)


def plan(inv):
    changes, skipped = [], []
    for v in inv:
        name = v.get('productName') or ''
        rec = None
        if not v.get('brand') or v.get('brand') == 'Unknown Brand':
            b, why = guess_brand(name)
            if b:
                rec = dict(v); rec['brand'] = b
            else:
                skipped.append(('ブランド', why, v['id'], name[:50]))
        if not v.get('category'):
            c, why = guess_category(name)
            if c:
                rec = rec or dict(v); rec['category'] = c
            else:
                skipped.append(('カテゴリー', why, v['id'], name[:50]))
        if rec:
            changes.append((v, rec))
    return changes, skipped


def main():
    d = fetch()
    inv = d['inventory']
    if '--test' in sys.argv:
        test(inv)
        return
    changes, skipped = plan(inv)
    nb = sum(1 for o, r in changes if o.get('brand') != r.get('brand'))
    nc = sum(1 for o, r in changes if o.get('category') != r.get('category'))
    print(f'反映 {len(changes)} 点（ブランド {nb} / カテゴリー {nc}）／空欄のまま {len(skipped)} 件')
    if '--list' in sys.argv:
        for o, r in changes:
            print(f"  {r.get('brand') or '':20} {r.get('category') or '':4} | {(o.get('productName') or '')[:55]}")
    print('空欄のまま残すもの:')
    for s in skipped:
        print('  ', *s)
    if '--apply' in sys.argv and changes:
        stamp = time.strftime('%Y%m%d_%H%M%S')
        json.dump(d, open(os.path.expanduser(f'~/Documents/nobushop_mail/backup_before_brandcat_{stamp}.json'), 'w'),
                  ensure_ascii=False)
        # ★ updatedAt を今にしないとサーバーの古い書き込みガードに捨てられる／端末に押し戻される
        now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        for i in range(0, len(changes), 20):
            body = {'invUpsert': [{'id': r['id'], 'data': {**r, 'updatedAt': now}} for _o, r in changes[i:i + 20]]}
            req = urllib.request.Request(API, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            res = json.load(urllib.request.urlopen(req, timeout=120))
            if res.get('skipped'):
                print('  サーバーに捨てられた:', res['skipped'])
        print('反映完了')


if __name__ == '__main__':
    main()

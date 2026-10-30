"""クラウド取得の共通部品（Supabase転送量・Disk IOの節約）。
- 同じ実行内では1回しか GET しない（2回目以降はメモリのコピーを返す）
- 読むだけの調査は get_cloud(max_age=600) で、10分以内に誰かが取った内容をファイルから使い回せる（2026-10-30 Disk IO枯渇でUnhealthyになった対策）。
  書き込み前の重複チェックなどは既定（max_age=0＝必ず取り直す）のまま使う
- ?full=1 は絶対に使わない（既定の軽量版のみ）
- 自分で POST した後は invalidate() を呼ぶ（次の get_cloud は取り直す。ファイルの使い回しも消す）
- 失敗時は間隔をあけて最大3回まで（すぐ何度も叩くとDBに追い打ちになる）
"""
import json, os, sys, time, urllib.request

API = 'https://nobisyop.vercel.app/api/data'
CACHE_FILE = '/tmp/nobushop_cloud_cache.json'
CACHE_TTL = 600
_cache = None


def get_cloud(retries=3, timeout=120, wait=20, max_age=0):
    global _cache
    if _cache is not None:
        return _cache
    try:
        if max_age and time.time() - os.path.getmtime(CACHE_FILE) < max_age:
            with open(CACHE_FILE) as fh:
                _cache = json.load(fh)
                return _cache
    except (OSError, ValueError):
        pass
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(API, timeout=timeout) as fh:
                _cache = json.load(fh)
            try:
                with open(CACHE_FILE + '.tmp', 'w') as fh:
                    json.dump(_cache, fh, ensure_ascii=False)
                os.replace(CACHE_FILE + '.tmp', CACHE_FILE)
            except OSError:
                pass
            return _cache
        except Exception as e:
            print(f'  取得リトライ {attempt + 1}: {e}', file=sys.stderr)
            if attempt < retries - 1:
                time.sleep(wait * (attempt + 1))
    raise SystemExit('クラウドから取得できませんでした')


def invalidate():
    global _cache
    _cache = None
    try:
        os.remove(CACHE_FILE)
    except OSError:
        pass

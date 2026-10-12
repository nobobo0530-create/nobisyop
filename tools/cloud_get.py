"""クラウド取得の共通部品（Supabase転送量の節約）。
- 同じ実行内では1回しか GET しない（2回目以降はメモリのコピーを返す）
- ?full=1 は絶対に使わない（既定の軽量版のみ）
- 自分で POST した後は invalidate() を呼ぶ（次の get_cloud は取り直す）
"""
import json, sys, time, urllib.request

API = 'https://nobisyop.vercel.app/api/data'
_cache = None


def get_cloud(retries=5, timeout=120, wait=3):
    global _cache
    if _cache is not None:
        return _cache
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(API, timeout=timeout) as fh:
                _cache = json.load(fh)
                return _cache
        except Exception as e:
            print(f'  取得リトライ {attempt + 1}: {e}', file=sys.stderr)
            time.sleep(wait)
    raise SystemExit('クラウドから取得できませんでした')


def invalidate():
    global _cache
    _cache = None

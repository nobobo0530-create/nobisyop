#!/bin/bash
# app.js を事前コンパイルして public/js/app.compiled.js を作る（Node不要・macOS標準のosascriptで動く）
#   ./tools/build_app.sh          ビルドする（app.js を変えたら毎回コミット前に実行）
#   ./tools/build_app.sh --check  最新かどうかだけ調べる（古ければ終了コード1）
set -e
cd "$(dirname "$0")/.."
SRC=public/js/app.js
OUT=public/js/app.compiled.js
HASH=$(shasum -a 256 "$SRC" | cut -d' ' -f1)
if [ "$1" = "--check" ]; then
  if [ -f "$OUT" ] && head -c 100 "$OUT" | grep -q "APP_SRC_SHA256:$HASH"; then echo "app.compiled.js は最新"; exit 0; fi
  echo "app.compiled.js が古い/無い → ./tools/build_app.sh を実行してください" >&2; exit 1
fi
osascript -l JavaScript tools/build_app.js "$PWD/$SRC" "$PWD/$OUT" "$HASH"
echo "built $OUT ($(wc -c < "$OUT") bytes)"

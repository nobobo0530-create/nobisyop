# nobushop-pwa

iPhone PWA。古着販売（ラクマ/ヤフオク/メルカリ）の在庫・売上管理アプリ。

## ユーザー
日本語。非エンジニア。
危険操作（金銭/秘密情報/破壊的）以外は確認なしで進めて良い。

## 構成
- React (UMD・Babel browser) + 素のCSS
- Vercel自動デプロイ
- データ: localStorage（メイン）+ Supabase（クラウド同期）
- ローカル開発: `python3 -m http.server 3333 --directory public`

## ファイル
- `public/index.html` - シェル + Babel browser読み込み
- `public/js/app.js` - 全機能（React class/hooks）
- `public/sw.js` - Service Worker
- `public/manifest.json`
- `public/config.json` - Supabase接続設定（gitignore対象、サーバーURL/キー）
- `SALES_INVENTORY_FIX_SPEC.md` - 過去の修正仕様書

## 主要機能
- 商品登録（写真付き）
- 在庫⇔売上の紐付け（1商品1レコード方式）
- 販売手数料: ラクマ4.5% / ヤフオク10%（商品ごとに変更可） / メルカリ10%固定
- 写真クラウドバックアップ（自動: 起動時 + visibility change、5分スロットル）
- レシート同期
- アプリ更新検知（HEAD-checkでバージョン管理、削除しなくても自動更新）

## デプロイ
git push origin main → Vercel自動公開

### app.js を変えたら必ず（コミット前）
`./tools/build_app.sh` で `public/js/app.compiled.js`（事前コンパイル版）を作り直して一緒にコミットする。
`./tools/build_app.sh --check` で最新か確認（.git/hooks/pre-commit が app.js 変更時に自動チェック）。
index.html は app.js の SHA-256 と app.compiled.js 先頭の刻印を照合し、一致しなければ従来のブラウザ内Babelコンパイルに自動で戻る（壊れはしないが遅くなる）。

### クラウド取得の方針（Supabase過負荷対策）
- `/api/data` GET は常に軽量（写真base64なし・hasThumb/hasMed フラグのみ）。ツールも ?light なしで軽量
- 写真base64は `?photoIds=商品id,...`（最大20件）で必要な商品だけ。全件は `?full=1`（通常使わない・30MB）
- DBに `light` 列があればそれを読む（SQLは ~/Documents/nobushop_mail/perf_1007.md）。無ければ従来方式

## 重要な制約
- 写真データ復旧不可: 一度cloudから消えるとiPhone Photosからしか戻せない
- Supabase同期失敗時はlocalStorageが正
- Babel-compiled JSはlocalStorageキャッシュされるためバージョン管理慎重に

## 既知の注意点
- toISOString()のUTC変換ズレ
- iOSプライベートブラウジングではlocalStorage不可

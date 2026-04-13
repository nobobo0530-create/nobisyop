/**
 * SalesLog — Google OAuth 設定
 *
 * ■ 初回のみ、以下の手順でClient IDを取得して貼り付けてください：
 *
 *  1. https://console.cloud.google.com/ を開く
 *  2. 新しいプロジェクトを作成（例: "SalesLog"）
 *  3. 「APIとサービス」→「ライブラリ」→「Google Sheets API」を有効化
 *  4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
 *  5. アプリケーションの種類：「ウェブアプリケーション」を選択
 *  6. 「承認済みJavaScriptオリジン」に以下を追加：
 *       https://nobisyop.vercel.app
 *       http://localhost（ローカルテスト用）
 *  7. 作成されたクライアントIDを下の GOOGLE_CLIENT_ID に貼り付ける
 *
 * ★ Client IDはソースに含まれますが「公開情報」です。
 *   （トークン取得は承認済みオリジンからのみ可能なので安全です）
 */
window.GOOGLE_CLIENT_ID = '';  // ← ここにClient IDを貼り付け

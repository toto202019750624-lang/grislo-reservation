# LINE連携セットアップガイド

このガイドでは、LINE Botを使った予約受付機能のセットアップ方法を説明します。

## ⚠️ 重要な注意事項

GitHub Pagesは静的サイトホスティングのため、**LINE Messaging APIのWebhookを受け取ることができません**。

LINE Bot機能を実装するには、以下のいずれかが必要です：
- **Vercel / Netlify Functions**
- **AWS Lambda**
- **Google Cloud Functions**
- **Heroku / Render などのサーバー**

## 1. LINE Developersアカウントの作成

1. [LINE Developers](https://developers.line.biz/) にアクセス
2. LINEアカウントでログイン
3. 開発者登録を完了

## 2. プロバイダーの作成

1. LINE Developersコンソールにログイン
2. 「プロバイダー」→「作成」をクリック
3. プロバイダー名（例: 町のグリスロ）を入力

## 3. Messaging APIチャンネルの作成

1. プロバイダーを選択
2. 「チャンネル設定」→「Messaging API」を選択
3. 必要な情報を入力：
   - チャンネル名: 町のグリスロ予約
   - チャンネル説明: グリスロの予約受付
   - 大業種: 交通
   - 小業種: タクシー

## 4. チャンネル設定

### 基本設定
- **チャンネルアイコン**: グリスロのロゴ画像をアップロード
- **あいさつメッセージ**: ON（カスタムメッセージを設定）
- **応答メッセージ**: ON

### Webhook設定
1. 「Messaging API設定」タブを開く
2. 「Webhook設定」で以下を設定：
   - Webhook URL: `https://your-server.com/webhook/line`
   - Webhookの利用: ON
3. 「チャンネルアクセストークン」を発行

## 5. 応答メッセージの設定例

```
【グリスロ予約】

ご利用ありがとうございます！

📅 予約する　→「予約」と送信
🔍 予約確認　→「確認」と送信
❌ キャンセル→「キャンセル」と送信

または、Webサイトからもご予約いただけます：
https://your-site.github.io/yoyaku_recieve/
```

## 6. リッチメニューの設定（推奨）

LINE公式アカウントマネージャーで、タップしやすいメニューを作成：

1. [LINE公式アカウントマネージャー](https://manager.line.biz/) にログイン
2. 「リッチメニュー」→「作成」
3. メニュー項目を追加：
   - 予約する
   - 予約確認
   - キャンセル
   - Webサイト

## 7. サーバーサイド実装（参考）

LINE Botのバックエンド実装例（Node.js）:

```javascript
// webhook.js
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: 'YOUR_CHANNEL_SECRET'
};

const client = new line.Client(config);

async function handleMessage(event) {
  const text = event.message.text;
  
  if (text === '予約') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '予約ページはこちら: https://your-site.github.io/yoyaku_recieve/'
    });
  }
  
  // ... 他のコマンド処理
}
```

## 参考リンク

- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)
- [LINE Bot SDK (Node.js)](https://github.com/line/line-bot-sdk-nodejs)
- [LINE 公式アカウントマネージャー](https://manager.line.biz/)

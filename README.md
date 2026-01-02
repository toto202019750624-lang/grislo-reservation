# 🚐 グリスロ予約システム

町のグリスロ（小型電動モビリティ）のWeb予約システムです。

## ✨ 機能

### ユーザー向け
- 📅 カレンダーから予約日を選択
- 🕐 時間帯の選択
- ✍️ 予約フォームで情報を入力
- 🔍 予約番号で予約確認・キャンセル

### 管理者向け
- 📊 ダッシュボード（統計情報）
- 📋 予約一覧・管理
- 📅 運行日程の登録
- 📍 乗車場所の管理
- 💾 データのエクスポート

## 🚀 使い方

### ローカルで実行

1. このリポジトリをクローン
```bash
git clone https://github.com/your-username/yoyaku_recieve.git
cd yoyaku_recieve
```

2. ローカルサーバーを起動
```bash
# Python 3の場合
python -m http.server 8000

# または VS Code の Live Server 拡張機能を使用
```

3. ブラウザでアクセス
- 予約ページ: http://localhost:8000/
- 管理者ページ: http://localhost:8000/admin.html

### GitHub Pages でデプロイ

1. GitHubにリポジトリを作成
2. コードをプッシュ
3. Settings > Pages > Source で `main` ブランチを選択
4. 数分後にURLが発行されます

## 📁 ファイル構成

```
yoyaku_recieve/
├── index.html          # 予約ページ
├── admin.html          # 管理者ページ
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── app.js          # 予約機能
│   └── admin.js        # 管理者機能
├── data/
│   ├── config.json     # システム設定
│   ├── schedule.json   # 運行日程
│   ├── reservations.json # 予約（初期値）
│   └── pickupLocations.json # 乗車場所
└── docs/
    └── LINE_SETUP.md   # LINE連携ガイド
```

## ⚙️ 設定

### 管理者パスワード
初期パスワード: `admin123`

管理者ページでパスワードを変更できます。

### 運行日程の登録
1. 管理者ページにログイン
2. 「運行日程」メニューを選択
3. 日付と時間帯を選択して追加

### 乗車場所の登録
1. 管理者ページにログイン
2. 「乗車場所」メニューを選択
3. 場所名と住所を入力して追加

## 📝 データ保存について

このシステムはブラウザの**localStorage**を使用してデータを保存します。

- 予約データ: `grislo_reservations`
- 運行日程: `grislo_schedule`
- 乗車場所: `grislo_locations`

> ⚠️ **注意**: localStorageはブラウザごとに独立しています。
> 本番環境では、バックエンドサーバーやデータベースの導入を検討してください。

## 🔗 LINE連携（オプション）

LINE Botで予約を受け付けるには、別途サーバーサイドの実装が必要です。
詳細は `docs/LINE_SETUP.md` を参照してください。

## 📧 メール連携（オプション）

EmailJSを使用してメール通知を送信できます。
`data/config.json` でEmailJSの設定を行ってください。

## ライセンス

MIT License

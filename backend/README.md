# Slack Clone Backend

FastAPI + WebSocket + MySQL を使用したSlackクローンのバックエンドAPI

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd backend
pip install -r requirements.txt
```

### 2. MySQLのセットアップ

#### macOSの場合:
```bash
# MySQLインストール（Homebrewを使用）
brew install mysql

# MySQLサービス開始
brew services start mysql

# セキュリティ設定（パスワードは空でOK）
mysql_secure_installation
```

#### その他OS:
- Windows: [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)をダウンロード
- Linux: `sudo apt-get install mysql-server` または `sudo yum install mysql-server`

### 3. データベース初期化

```bash
python setup_local_db.py
```

### 4. サーバー起動

```bash
python run.py
```

サーバーは `http://localhost:8000` で起動します。

## 🧪 テスト

### WebSocketテスト
1. ブラウザで `test_websocket.html` を開く
2. 複数タブで異なるUser IDを入力して接続
3. リアルタイムメッセージングをテスト

### API仕様
- **WebSocket**: `ws://localhost:8000/ws/{user_id}`
- **REST API**: `http://localhost:8000/docs` (FastAPI自動ドキュメント)

## 📡 API エンドポイント

### WebSocket メッセージ形式

#### 送信メッセージ:
```json
{
  "type": "message",
  "content": "Hello!",
  "channel_id": "general"
}
```

#### タイピング通知:
```json
{
  "type": "typing",
  "channel_id": "general",
  "is_typing": true
}
```

#### 受信メッセージ:
```json
{
  "type": "message",
  "user_id": "alice",
  "channel_id": "general",
  "content": "Hello!",
  "timestamp": 1640995200.0
}
```

## 🗃️ データベーススキーマ

### テーブル構成:
- `users` - ユーザー情報
- `channels` - チャンネル情報
- `channel_members` - チャンネルメンバーシップ
- `messages` - メッセージ
- `reactions` - メッセージリアクション

### サンプルユーザー:
- admin@example.com / admin
- alice@example.com / alice  
- bob@example.com / bob

## 🔧 設定

設定は `app/core/config.py` で管理されています:

```python
database_url = "mysql+pymysql://root@localhost:3306/slack_clone"
secret_key = "your-secret-key"
access_token_expire_minutes = 30
```

## 📁 プロジェクト構造

```
backend/
├── app/
│   ├── main.py              # FastAPIアプリケーション
│   ├── models/              # Pydanticモデル
│   │   ├── user.py
│   │   ├── message.py
│   │   └── channel.py
│   ├── routers/             # APIルーター
│   ├── database/            # データベース設定
│   └── core/               # アプリケーション設定
├── requirements.txt         # Python依存関係
├── setup_local_db.py       # DB初期化スクリプト
├── run.py                  # サーバー起動スクリプト
└── test_websocket.html     # WebSocketテストページ
```
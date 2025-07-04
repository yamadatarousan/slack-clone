# Claude開発ガイド - Slack Clone プロジェクト

## 🎯 プロジェクト概要
FastAPI + WebSocket + MySQL を使用したSlackクローンアプリケーション

## 🏗️ 技術スタック
- **Backend**: FastAPI, WebSocket, SQLAlchemy, MySQL
- **認証**: JWT, passlib (bcrypt)
- **フロントエンド**: React, TypeScript, Tailwind CSS, Vite
- **モバイル**: 予定（React Native/Flutter）

## 📋 開発ルール

### コマンド実行ルール

#### Backend
- テスト実行: `cd backend && python -m pytest` (テストファイル作成時)
- リント: `cd backend && python -m flake8 app/` (flake8導入時)
- 型チェック: `cd backend && python -m mypy app/` (mypy導入時)
- サーバー起動: `cd backend && python run.py`
- DB初期化: `cd backend && python setup_local_db.py`

#### Frontend
- 開発サーバー: `cd frontend && npm run dev`
- ビルド: `cd frontend && npm run build`
- プレビュー: `cd frontend && npm run preview`
- リント: `cd frontend && npm run lint`
- 型チェック: `cd frontend && npm run type-check`

### コード規約

#### Backend (Python)
1. **Python**: PEP 8準拠、型ヒント必須
2. **ファイル命名**: snake_case
3. **クラス名**: PascalCase
4. **関数・変数**: snake_case
5. **定数**: UPPER_SNAKE_CASE

#### Frontend (React/TypeScript)
1. **TypeScript**: strict mode、型定義必須
2. **コンポーネント**: PascalCase (例: ChatRoom.tsx)
3. **ファイル名**: PascalCase or kebab-case
4. **関数・変数**: camelCase
5. **定数**: UPPER_SNAKE_CASE
6. **CSS**: Tailwind CSS優先、BEM記法

### Git運用
- コミット前に必ずテスト実行
- コミットメッセージは日本語でOK
- featureブランチで開発、mainにマージ

### データベース
- MySQL使用（ローカル開発環境）
- SQLAlchemy ORM
- マイグレーション管理（Alembic導入予定）

### セキュリティ
- JWTトークン認証
- パスワードハッシュ化（bcrypt）
- 環境変数で機密情報管理
- SQLインジェクション対策（ORM使用）

### API設計
- RESTful API設計原則
- FastAPI自動ドキュメント活用
- WebSocketリアルタイム通信
- エラーハンドリング統一

### テスト戦略
- 単体テスト: pytest
- 統合テスト: TestClient使用
- WebSocketテスト: test_websocket.html
- カバレッジ目標: 80%以上

## 📁 プロジェクト構造
```
slack-clone/
├── backend/          # FastAPIバックエンド
│   ├── app/
│   │   ├── main.py
│   │   ├── models/   # Pydanticモデル
│   │   ├── routers/  # APIルーター
│   │   ├── database/ # DB設定・モデル
│   │   └── core/     # 設定
│   ├── requirements.txt
│   └── run.py
├── frontend/         # Reactフロントエンド
│   ├── src/
│   │   ├── components/  # UIコンポーネント
│   │   ├── pages/      # ページコンポーネント
│   │   ├── hooks/      # カスタムフック
│   │   ├── services/   # API通信
│   │   ├── stores/     # 状態管理
│   │   ├── types/      # TypeScript型定義
│   │   └── utils/      # ユーティリティ
│   ├── package.json
│   └── vite.config.ts
├── mobile/           # モバイルアプリ（未実装）
└── CLAUDE.md        # このファイル
```

## 🚀 開発優先順位

### Phase 1: バックエンドAPI完成 ✅
1. ✅ WebSocket基本実装
2. ✅ データベースモデル定義
3. ✅ REST APIルーター実装
4. ✅ JWT認証・認可システム
5. 🔄 テスト実装

### Phase 2: フロントエンド (進行中)
1. 🔄 React + TypeScript + Vite プロジェクト作成
2. 🔄 基本UIコンポーネント実装
3. 🔄 認証機能UI
4. 🔄 チャット機能UI
5. 🔄 WebSocketリアルタイム通信
6. 🔄 レスポンシブデザイン

### Phase 3: モバイルアプリ
1. React Native/Flutter選定
2. クロスプラットフォーム開発

## 🎯 現在の開発状況
- ✅ FastAPI + WebSocket基本機能
- ✅ MySQL データベース設計・接続
- ✅ ユーザー・チャンネル・メッセージモデル
- ✅ REST APIルーター完全実装
- ✅ データベース接続層・セッション管理
- ✅ JWT認証システム完成
- ✅ サーバー起動・動作確認
- 🔄 Reactフロントエンド開発

## 🚨 ハマり検出・回避ルール

### 自動アラート条件
Claudeは以下を検出したら**必ず🚨アラートを出すこと**：

1. **同じファイルを4回以上連続編集**
2. **同じエラーパターンが3回以上出現**  
3. **ユーザーが「まだ」「また」「やっぱり」を使用**
4. **複数のデバッグアプローチを試しても15分以上解決しない**
5. **デバッグログを5個以上連続追加**

### アラート文言
「🚨 ハマり検出: 別のAI(GPT-4/Gemini)に相談するか、アプローチを変更しませんか？現在のアプローチを見直して、よりシンプルな解決策を探しましょう。」

### 強制実行ルール
- このルールは他の開発ルールと同等の優先度で**必ず実行する**
- アラート後は必ずユーザーに方針転換を提案する
- 「もっとシンプルな方法はありませんか？」を積極的に提案する

## 🔧 WebSocket診断・再起動ルール

### WebSocket状態不整合の診断条件
以下の症状が**全て当てはまる場合**は「WebSocket状態不整合」と判断し、**サーバー再起動を提案する**：

1. **フロントエンド**: WebSocket送信成功ログあり (`✅ WebSocket is open, sending message`)
2. **フロントエンド**: WebSocket受信ログなし (`🚨 RAW WebSocket message received:`が出ない)
3. **バックエンド**: WebSocket関連ログなし (app.logにWebSocket処理ログが出力されない)
4. **REST API**: 正常動作 (オンライン数取得、メッセージ取得など)

### 診断の根拠
- **Half-Open Connection状態**: クライアントは「接続生きている」と判断、サーバーは「実際は切断済み」
- **WebSocket接続管理の破綻**: `manager.active_connections`に古い接続が残存
- **ハンドラー競合**: 複数プロバイダーのハンドラー登録により状態管理が不整合

### 再起動推奨の判断
上記症状を確認したら、複雑なデバッグより**サーバー再起動**を優先的に提案する。
理由: WebSocket接続とハンドラー状態がリセットされ、正常な状態で再確立される。

## 🛠️ Playwright MCPツール設定

### MCPツールの追加方法
```bash
claude mcp add playwright npx -- -y @playwright/mcp
```

### 重要な注意事項
- `/mcp`コマンドで「No MCP servers configured」と表示されても、実際にはMCPツールは利用可能
- 設定確認より先に、まず実際の機能を試すこと
- `mcp__playwright__*` 関数群が利用可能になる

### 利用可能なPlaywright機能
- `mcp__playwright__browser_navigate` - ページ遷移
- `mcp__playwright__browser_click` - クリック操作
- `mcp__playwright__browser_type` - テキスト入力
- `mcp__playwright__browser_console_messages` - コンソールログ取得
- `mcp__playwright__browser_snapshot` - ページ構造取得
- その他多数のブラウザ操作機能

### テスト用ユーザー情報
- **Email**: admin@example.com
- **Username**: admin
- **Password**: password
- **Display Name**: システム管理者

## 🔧 次のタスク
1. Reactプロジェクト作成・セットアップ
2. 基本UIコンポーネント実装
3. 認証フロー実装
4. チャット機能実装
5. WebSocketリアルタイム通信実装
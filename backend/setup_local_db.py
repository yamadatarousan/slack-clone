#!/usr/bin/env python3
"""
ローカルMySQL用のデータベース・テーブル作成スクリプト
"""

import pymysql
import sys

def create_database_and_tables():
    """データベースとテーブルを作成"""
    
    # MySQLサーバーに接続（データベース指定なし）
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='',  # パスワードなし
            charset='utf8mb4'
        )
        print("✅ MySQLサーバーに接続しました")
    except Exception as e:
        print(f"❌ MySQLサーバーへの接続に失敗: {e}")
        print("💡 MySQLがインストールされているか確認してください")
        print("   macOS: brew install mysql && brew services start mysql")
        sys.exit(1)
    
    cursor = connection.cursor()
    
    try:
        # データベース作成
        cursor.execute("CREATE DATABASE IF NOT EXISTS slack_clone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print("✅ データベース 'slack_clone' を作成しました")
        
        # データベース選択
        cursor.execute("USE slack_clone")
        
        # テーブル作成
        
        # 1. ユーザーテーブル
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(50) UNIQUE NOT NULL,
            display_name VARCHAR(100),
            password_hash VARCHAR(255) NOT NULL,
            avatar_url TEXT,
            status ENUM('active', 'away', 'busy', 'offline') DEFAULT 'active',
            is_online BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_username (username),
            INDEX idx_status (status)
        )
        """)
        print("✅ usersテーブルを作成しました")
        
        # 2. チャンネルテーブル
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS channels (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            description TEXT,
            channel_type ENUM('public', 'private', 'dm') DEFAULT 'public',
            is_archived BOOLEAN DEFAULT FALSE,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_name (name),
            INDEX idx_type (channel_type),
            INDEX idx_archived (is_archived)
        )
        """)
        print("✅ channelsテーブルを作成しました")
        
        # 3. チャンネルメンバーテーブル
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS channel_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            channel_id INT NOT NULL,
            user_id INT NOT NULL,
            role ENUM('owner', 'admin', 'member') DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_channel_user (channel_id, user_id),
            INDEX idx_channel (channel_id),
            INDEX idx_user (user_id)
        )
        """)
        print("✅ channel_membersテーブルを作成しました")
        
        # 4. メッセージテーブル
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            content TEXT NOT NULL,
            message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
            channel_id INT NOT NULL,
            user_id INT NOT NULL,
            thread_id INT NULL,
            edited BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (thread_id) REFERENCES messages(id) ON DELETE CASCADE,
            INDEX idx_channel (channel_id),
            INDEX idx_user (user_id),
            INDEX idx_created_at (created_at),
            INDEX idx_thread (thread_id)
        )
        """)
        print("✅ messagesテーブルを作成しました")
        
        # 5. リアクションテーブル
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            message_id INT NOT NULL,
            user_id INT NOT NULL,
            emoji VARCHAR(10) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_message_user_emoji (message_id, user_id, emoji),
            INDEX idx_message (message_id)
        )
        """)
        print("✅ reactionsテーブルを作成しました")
        
        # サンプルデータ投入
        insert_sample_data(cursor)
        
        connection.commit()
        print("🎉 データベースセットアップが完了しました！")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        connection.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        connection.close()

def insert_sample_data(cursor):
    """サンプルデータを投入"""
    
    # サンプルユーザー
    cursor.execute("""
    INSERT IGNORE INTO users (email, username, display_name, password_hash) VALUES
    ('admin@example.com', 'admin', 'システム管理者', '$2b$12$dummyhash1'),
    ('alice@example.com', 'alice', 'Alice Smith', '$2b$12$dummyhash2'),
    ('bob@example.com', 'bob', 'Bob Johnson', '$2b$12$dummyhash3')
    """)
    
    # サンプルチャンネル
    cursor.execute("""
    INSERT IGNORE INTO channels (name, description, channel_type, created_by) VALUES
    ('general', '一般的な議論用チャンネル', 'public', 1),
    ('random', '雑談用チャンネル', 'public', 1),
    ('dev-team', '開発チーム専用', 'private', 1)
    """)
    
    # チャンネルメンバー
    cursor.execute("""
    INSERT IGNORE INTO channel_members (channel_id, user_id, role) VALUES
    (1, 1, 'owner'),
    (1, 2, 'member'),
    (1, 3, 'member'),
    (2, 1, 'owner'),
    (2, 2, 'member'),
    (3, 1, 'owner'),
    (3, 2, 'admin')
    """)
    
    # サンプルメッセージ
    cursor.execute("""
    INSERT IGNORE INTO messages (content, channel_id, user_id) VALUES
    ('Slack Cloneへようこそ！', 1, 1),
    ('こんにちは、皆さん！', 1, 2),
    ('よろしくお願いします 👋', 1, 3),
    ('開発頑張りましょう！', 3, 1)
    """)
    
    print("✅ サンプルデータを投入しました")

if __name__ == "__main__":
    print("🚀 Slack Clone データベースセットアップを開始します...")
    create_database_and_tables()
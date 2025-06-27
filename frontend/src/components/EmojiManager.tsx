import { useState, useEffect } from 'react';

interface CustomEmoji {
  id: string;
  name: string;
  url: string;
  creator: string;
}

interface EmojiManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmojiManager({ isOpen, onClose }: EmojiManagerProps) {
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [newEmojiName, setNewEmojiName] = useState('');
  const [newEmojiFile, setNewEmojiFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomEmojis();
    }
  }, [isOpen]);

  const loadCustomEmojis = () => {
    // Load from localStorage for now
    const saved = localStorage.getItem('customEmojis');
    if (saved) {
      setCustomEmojis(JSON.parse(saved));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        return;
      }
      
      // Validate file size (max 1MB)
      if (file.size > 1024 * 1024) {
        alert('ファイルサイズは1MB以下にしてください');
        return;
      }
      
      setNewEmojiFile(file);
    }
  };

  const handleUpload = async () => {
    if (!newEmojiName.trim() || !newEmojiFile) {
      alert('絵文字名とファイルを指定してください');
      return;
    }

    // Validate emoji name
    if (!/^[a-zA-Z0-9_-]+$/.test(newEmojiName)) {
      alert('絵文字名は英数字、アンダースコア、ハイフンのみ使用できます');
      return;
    }

    // Check if name already exists
    if (customEmojis.some(emoji => emoji.name === newEmojiName)) {
      alert('この名前の絵文字は既に存在します');
      return;
    }

    try {
      setUploading(true);
      
      // Convert file to base64 URL for demo purposes
      // In a real app, you would upload to a server
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        
        const newEmoji: CustomEmoji = {
          id: Date.now().toString(),
          name: newEmojiName,
          url: url,
          creator: 'current_user' // In real app, get from auth context
        };

        const updatedEmojis = [...customEmojis, newEmoji];
        setCustomEmojis(updatedEmojis);
        localStorage.setItem('customEmojis', JSON.stringify(updatedEmojis));
        
        // Reset form
        setNewEmojiName('');
        setNewEmojiFile(null);
        const fileInput = document.getElementById('emoji-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        setUploading(false);
      };
      reader.readAsDataURL(newEmojiFile);
      
    } catch (error) {
      console.error('Failed to upload emoji:', error);
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('この絵文字を削除しますか？')) {
      const updatedEmojis = customEmojis.filter(emoji => emoji.id !== id);
      setCustomEmojis(updatedEmojis);
      localStorage.setItem('customEmojis', JSON.stringify(updatedEmojis));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            カスタム絵文字管理
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Upload Form */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
            新しい絵文字を追加
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                絵文字名
              </label>
              <input
                type="text"
                value={newEmojiName}
                onChange={(e) => setNewEmojiName(e.target.value)}
                placeholder="例: custom_smile"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                英数字、アンダースコア、ハイフンのみ使用可能
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                画像ファイル
              </label>
              <input
                id="emoji-file"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                1MB以下の画像ファイル
              </p>
            </div>
            
            <button
              onClick={handleUpload}
              disabled={uploading || !newEmojiName.trim() || !newEmojiFile}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'アップロード中...' : '追加'}
            </button>
          </div>
        </div>

        {/* Emoji List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
            カスタム絵文字一覧 ({customEmojis.length})
          </h3>
          
          {customEmojis.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>カスタム絵文字がありません</p>
              <p className="text-sm mt-1">上のフォームから追加してください</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {customEmojis.map((emoji) => (
                <div key={emoji.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    className="w-8 h-8 object-contain"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      :{emoji.name}:
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      作成者: {emoji.creator}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(emoji.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
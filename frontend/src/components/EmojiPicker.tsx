import { useState, useEffect } from 'react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  position?: { top?: number; left?: number; right?: number; bottom?: number };
}

interface EmojiCategory {
  name: string;
  label: string;
  emojis: string[];
}

const emojiCategories: EmojiCategory[] = [
  {
    name: 'smileys',
    label: '😀 顔文字',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧'
    ]
  },
  {
    name: 'gestures',
    label: '👋 ジェスチャー',
    emojis: [
      '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌', '🤞', '🤟',
      '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝', '👍', '👎',
      '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'
    ]
  },
  {
    name: 'activities',
    label: '⚽ アクティビティ',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🪀',
      '🏓', '🏸', '🥅', '🏒', '🏑', '🥍', '🏏', '⛳', '🪁', '🏹',
      '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿'
    ]
  },
  {
    name: 'objects',
    label: '💻 オブジェクト',
    emojis: [
      '💻', '🖥', '🖨', '⌨', '🖱', '🖲', '💽', '💾', '💿', '📀',
      '📱', '📞', '☎', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛',
      '⏱', '⏲', '⏰', '🕰', '⏳', '⌛', '📡', '🔋', '🔌', '💡'
    ]
  },
  {
    name: 'food',
    label: '🍎 食べ物',
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
      '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
      '🥬', '🥒', '🌶', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔'
    ]
  },
  {
    name: 'travel',
    label: '🚗 旅行',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐',
      '🚚', '🚛', '🚜', '🏍', '🛵', '🚲', '🛴', '🛹', '🚁', '✈',
      '🛩', '🛫', '🛬', '🪂', '💺', '🚀', '🛸', '🚊', '🚝', '🚄'
    ]
  }
];

interface CustomEmoji {
  id: string;
  name: string;
  url: string;
  creator: string;
}

export default function EmojiPicker({ isOpen, onClose, onEmojiSelect, position = {} }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    // Load custom emojis and recent emojis
    const customEmojisData = JSON.parse(localStorage.getItem('customEmojis') || '[]');
    const recentEmojisData = JSON.parse(localStorage.getItem('recentEmojis') || '["👍", "😀", "❤️", "😂", "😊", "🔥", "👏", "✨"]');
    setCustomEmojis(customEmojisData);
    setRecentEmojis(recentEmojisData);
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery) {
      // Simple search by category name or emoji
      const allEmojis = emojiCategories.flatMap(cat => cat.emojis);
      setFilteredEmojis(allEmojis.filter(() => {
        // You could implement more sophisticated search here
        return true; // For now, show all emojis
      }));
    } else if (selectedCategory === 'custom') {
      setFilteredEmojis([]);
    } else {
      const category = emojiCategories.find(cat => cat.name === selectedCategory);
      setFilteredEmojis(category?.emojis || []);
    }
  }, [selectedCategory, searchQuery, customEmojis]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    
    // Add to recent emojis
    const newRecent = [emoji, ...recentEmojis.filter((e: string) => e !== emoji)].slice(0, 8);
    setRecentEmojis(newRecent);
    localStorage.setItem('recentEmojis', JSON.stringify(newRecent));
    
    onClose();
  };

  const handleCustomEmojiClick = (customEmoji: CustomEmoji) => {
    onEmojiSelect(`:${customEmoji.name}:`);
    onClose();
  };

  if (!isOpen) return null;

  // Calculate position to ensure picker stays within viewport
  const calculatePosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const pickerWidth = 320; // w-80 = 320px
    const pickerHeight = 384; // h-96 = 384px
    
    const finalPosition = { ...position };
    
    // Adjust horizontal position if it would go off-screen
    if (position.left !== undefined) {
      if (position.left + pickerWidth > viewportWidth) {
        finalPosition.left = viewportWidth - pickerWidth - 10;
      }
      if (position.left < 10) {
        finalPosition.left = 10;
      }
    }
    
    // Adjust vertical position if it would go off-screen
    if (position.top !== undefined) {
      if (position.top + pickerHeight > viewportHeight) {
        finalPosition.top = position.top - pickerHeight - 10;
        // If still off-screen, position at bottom of viewport
        if (finalPosition.top < 10) {
          finalPosition.top = viewportHeight - pickerHeight - 10;
        }
      }
      if (position.top < 10) {
        finalPosition.top = 10;
      }
    }
    
    return finalPosition;
  };

  const positionStyle = calculatePosition();

  return (
    <div 
      className="fixed inset-0 z-50" 
      onClick={onClose}
    >
      <div 
        className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 h-96"
        style={positionStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              絵文字を選択
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          
          <input
            type="text"
            placeholder="絵文字を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Categories */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {emojiCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`
                px-3 py-2 text-xs whitespace-nowrap transition-colors
                ${selectedCategory === category.name
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {category.label}
            </button>
          ))}
          <button
            onClick={() => setSelectedCategory('custom')}
            className={`
              px-3 py-2 text-xs whitespace-nowrap transition-colors
              ${selectedCategory === 'custom'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            🎨 カスタム
          </button>
        </div>

        {/* Recent Emojis */}
        {!searchQuery && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">最近使った絵文字</div>
            <div className="grid grid-cols-8 gap-1">
              {recentEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Emoji Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {selectedCategory === 'custom' ? (
            <div>
              {customEmojis.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>カスタム絵文字がありません</p>
                  <p className="text-sm mt-1">設定から追加できます</p>
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-1">
                  {customEmojis.map((customEmoji) => (
                    <button
                      key={customEmoji.id}
                      onClick={() => handleCustomEmojiClick(customEmoji)}
                      className="w-8 h-8 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"
                      title={`:${customEmoji.name}:`}
                    >
                      <img
                        src={customEmoji.url}
                        alt={customEmoji.name}
                        className="w-6 h-6 object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
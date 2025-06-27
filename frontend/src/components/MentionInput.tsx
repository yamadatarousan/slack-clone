import { useState, useRef, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  display_name?: string;
}

interface MentionInputProps {
  users: User[];
  onMention: (user: User) => void;
  isVisible: boolean;
  position: { top: number; left: number };
  query: string;
}

export default function MentionInput({ users, onMention, isVisible, position, query }: MentionInputProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter users based on query
  const filteredUsers = users.filter(user => {
    const name = user.display_name || user.username;
    return name.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 8); // Limit to 8 suggestions

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filteredUsers.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || filteredUsers.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onMention(filteredUsers[selectedIndex]);
          }
          break;
        case 'Escape':
          // Handle escape in parent component
          break;
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, filteredUsers, selectedIndex, onMention]);

  if (!isVisible || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-w-xs"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          メンションするユーザーを選択
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => onMention(user)}
              className={`
                w-full text-left px-3 py-2 rounded text-sm transition-colors
                ${index === selectedIndex
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                }
              `}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-xs">
                    {(user.display_name || user.username)[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {user.display_name || user.username}
                  </div>
                  {user.display_name && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{user.username}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
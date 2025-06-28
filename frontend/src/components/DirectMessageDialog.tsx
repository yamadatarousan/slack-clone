import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Channel } from '../types';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';

interface User {
  id: number;
  username: string;
  display_name?: string;
  is_online: boolean;
  avatar_url?: string;
}

interface DirectMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDMCreated: (dmChannel: Channel) => void;
}

export default function DirectMessageDialog({ isOpen, onClose, onDMCreated }: DirectMessageDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isUserOnline } = useOnlineStatus();

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await apiService.getUsersForDM();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDM = async (userId: number) => {
    try {
      setLoading(true);
      const dmChannel = await apiService.createOrGetDMChannel(userId);
      onDMCreated(dmChannel);
      onClose();
    } catch (error) {
      console.error('Failed to create DM:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.display_name && user.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-primary">ダイレクトメッセージを開始</h2>
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary text-2xl"
            >
              ×
            </button>
          </div>

          {/* Search input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="ユーザーを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-primary rounded-md bg-primary text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Users list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-secondary">
                ユーザーを読み込み中...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-secondary">
                {searchTerm ? 'ユーザーが見つかりません' : 'ユーザーがいません'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleCreateDM(user.id)}
                    disabled={loading}
                    className="w-full flex items-center space-x-3 p-3 rounded-md hover:bg-secondary transition-colors text-left disabled:opacity-50"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm">
                          {(user.display_name || user.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-primary ${
                        isUserOnline(user.id.toString()) ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-primary">
                        {user.display_name || user.username}
                      </div>
                      {user.display_name && (
                        <div className="text-sm text-secondary">
                          @{user.username}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-secondary">
                      {isUserOnline(user.id.toString()) ? 'オンライン' : 'オフライン'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
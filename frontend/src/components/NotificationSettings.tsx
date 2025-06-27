import { useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const { requestPermission } = useNotifications();
  const [settings, setSettings] = useState({
    browserNotifications: false,
    soundEnabled: true,
    mentionOnly: false,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission();
      if (granted) {
        updateSetting('browserNotifications', true);
      }
    } else {
      updateSetting('browserNotifications', false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            通知設定
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Settings */}
        <div className="p-4 space-y-4">
          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ブラウザ通知
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ウィンドウが非アクティブ時に通知を表示
              </p>
            </div>
            <button
              onClick={() => handleBrowserNotificationToggle(!settings.browserNotifications)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.browserNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.browserNotifications ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                音による通知
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                新しいメッセージで音を再生
              </p>
            </div>
            <button
              onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Mention Only */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                メンション時のみ
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @メンションされた時のみ通知
              </p>
            </div>
            <button
              onClick={() => updateSetting('mentionOnly', !settings.mentionOnly)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.mentionOnly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.mentionOnly ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  サイレント時間
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  指定した時間帯は通知を無効化
                </p>
              </div>
              <button
                onClick={() => updateSetting('quietHours', !settings.quietHours)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${settings.quietHours ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${settings.quietHours ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {settings.quietHours && (
              <div className="flex items-center space-x-2 text-sm">
                <input
                  type="time"
                  value={settings.quietStart}
                  onChange={(e) => updateSetting('quietStart', e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
                <span className="text-gray-500 dark:text-gray-400">から</span>
                <input
                  type="time"
                  value={settings.quietEnd}
                  onChange={(e) => updateSetting('quietEnd', e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
                <span className="text-gray-500 dark:text-gray-400">まで</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';

interface FileMessageProps {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
}

export default function FileMessage({ fileName, fileUrl, fileSize }: FileMessageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getFileIcon = (extension: string) => {
    const iconMap: Record<string, string> = {
      // Images
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
      // Documents
      'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📄',
      // Spreadsheets
      'xls': '📊', 'xlsx': '📊', 'csv': '📊',
      // Presentations
      'ppt': '📊', 'pptx': '📊',
      // Archives
      'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️',
      // Code
      'js': '📜', 'ts': '📜', 'html': '📜', 'css': '📜', 'py': '📜',
      // Audio/Video
      'mp3': '🎵', 'wav': '🎵', 'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
    };
    
    return iconMap[extension] || '📎';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (extension: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  };

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('ファイルのダウンロードに失敗しました');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Download failed:', err);
      setError('ダウンロードに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const extension = getFileExtension(fileName);
  const icon = getFileIcon(extension);
  const isImageFile = isImage(extension);

  return (
    <div className="max-w-sm">
      {error && (
        <div className="text-red-500 text-xs mb-2">{error}</div>
      )}
      
      {isImageFile ? (
        // Image preview
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-64 object-contain"
            onError={() => setError('画像の読み込みに失敗しました')}
          />
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-lg">{icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {fileName}
                  </p>
                  {fileSize && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileSize)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDownload}
                disabled={isLoading}
                className="ml-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '...' : 'DL'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // File attachment
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <span className="text-2xl">{icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {fileName}
                </p>
                {fileSize && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(fileSize)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={isLoading}
              className="ml-3 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'ダウンロード中...' : 'ダウンロード'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
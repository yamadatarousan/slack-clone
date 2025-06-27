import { useAuth } from '../hooks/useAuth';

interface MentionTextProps {
  content: string;
}

export default function MentionText({ content }: MentionTextProps) {
  const { user: currentUser } = useAuth();

  // Parse mentions in the text
  const parseMentions = (text: string) => {
    // Match @username or @"display name" patterns
    const mentionRegex = /@(\w+|"[^"]+"|'[^']+')/g;
    const parts = [];
    let lastIndex = 0;

    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      // Extract username (remove quotes if present)
      let username = match[1];
      if ((username.startsWith('"') && username.endsWith('"')) || 
          (username.startsWith("'") && username.endsWith("'"))) {
        username = username.slice(1, -1);
      }

      // Check if it's mentioning current user
      const isMentioningMe = currentUser && (
        username === currentUser.username || 
        username === currentUser.display_name
      );

      parts.push({
        type: 'mention',
        content: match[0],
        username,
        isMentioningMe,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return parts;
  };

  const parts = parseMentions(content);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <span
              key={index}
              className={`
                inline-block px-1 rounded font-medium
                ${part.isMentioningMe
                  ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                }
              `}
              title={`メンション: ${part.username}`}
            >
              {part.content}
            </span>
          );
        }
        return part.content;
      })}
    </span>
  );
}
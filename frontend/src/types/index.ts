export interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  is_direct_message: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  member_count?: number;
  unread_count?: number;
}

export interface Message {
  id: number;
  content: string;
  channel_id: number;
  sender_id: number;
  is_edited: boolean;
  is_deleted: boolean;
  message_type?: string;
  parent_message_id?: number;
  created_at: string;
  updated_at: string;
  sender?: User;
  reactions?: Reaction[];
  reply_count?: number;
}

export interface Reaction {
  id: number;
  emoji: string;
  message_id: number;
  user_id: number;
  created_at: string;
  user?: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'user_connected' | 'user_disconnected';
  user_id?: string;
  channel_id?: string;
  content?: string;
  is_typing?: boolean;
  timestamp?: number;
}

export interface ApiError {
  detail: string;
}
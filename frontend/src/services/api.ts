import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { User, Channel, Message, LoginCredentials, RegisterData, AuthResponse } from '../types';

const API_BASE_URL = 'http://localhost:8000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/auth';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('API: Attempting login request to', `${API_BASE_URL}/auth/token`);
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      console.log('API: Login successful');
      return response.data;
    } catch (error) {
      console.error('API: Login request failed', error);
      throw error;
    }
  }

  async register(data: RegisterData): Promise<User> {
    console.log('API: Attempting registration request to', `${API_BASE_URL}/auth/register`);
    try {
      const response: AxiosResponse<User> = await this.api.post('/auth/register', data);
      console.log('API: Registration successful');
      return response.data;
    } catch (error) {
      console.error('API: Registration request failed', error);
      throw error;
    }
  }

  async getMe(): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get('/auth/me');
    return response.data;
  }

  // Channels
  async getChannels(): Promise<Channel[]> {
    const response: AxiosResponse<Channel[]> = await this.api.get('/channels/');
    return response.data;
  }

  async getChannel(id: number): Promise<Channel> {
    const response: AxiosResponse<Channel> = await this.api.get(`/channels/${id}`);
    return response.data;
  }

  async createChannel(data: { name: string; description?: string; is_private?: boolean }): Promise<Channel> {
    const response: AxiosResponse<Channel> = await this.api.post('/channels/', data);
    return response.data;
  }

  async joinChannel(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.post(`/channels/${id}/join`);
    return response.data;
  }

  async leaveChannel(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.post(`/channels/${id}/leave`);
    return response.data;
  }

  async getAllPublicChannels(): Promise<Channel[]> {
    const response: AxiosResponse<Channel[]> = await this.api.get('/channels/public');
    return response.data;
  }

  // Messages
  async getChannelMessages(channelId: number, skip = 0, limit = 50): Promise<Message[]> {
    const response: AxiosResponse<Message[]> = await this.api.get(
      `/messages/channel/${channelId}?skip=${skip}&limit=${limit}`
    );
    return response.data;
  }

  async sendMessage(data: { content: string; channel_id: number; parent_message_id?: number }): Promise<Message> {
    const response: AxiosResponse<Message> = await this.api.post('/messages/', data);
    return response.data;
  }

  async updateMessage(id: number, data: { content: string }): Promise<Message> {
    const response: AxiosResponse<Message> = await this.api.put(`/messages/${id}`, data);
    return response.data;
  }

  async deleteMessage(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.delete(`/messages/${id}`);
    return response.data;
  }

  async addReaction(messageId: number, emoji: string): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.post(`/messages/${messageId}/reactions`, { emoji });
    return response.data;
  }

  async updateUserStatus(status: string, isOnline: boolean = true): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.put(`/auth/me/status?status=${status}&is_online=${isOnline}`);
    return response.data;
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<{ file_url: string }> = await this.api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.file_url;
  }

  async searchMessages(query: string, channelId?: number | null): Promise<Message[]> {
    let url = `/search/messages?q=${encodeURIComponent(query)}`;
    if (channelId) {
      url += `&channel_id=${channelId}`;
    }
    const response: AxiosResponse<Message[]> = await this.api.get(url);
    return response.data;
  }

  async getMessageThread(messageId: number): Promise<Message[]> {
    const response: AxiosResponse<Message[]> = await this.api.get(`/messages/${messageId}/thread`);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response: AxiosResponse<{ status: string }> = await this.api.get('/health');
    return response.data;
  }

  // オンラインユーザー状態を取得
  async getOnlineUsers(): Promise<{ online_users: any[], count: number }> {
    const response: AxiosResponse<{ online_users: any[], count: number }> = await this.api.get('/online-users');
    return response.data;
  }
}

export const apiService = new ApiService();

// Export individual functions for convenience with proper binding
export const login = (credentials: LoginCredentials) => apiService.login(credentials);
export const register = (data: RegisterData) => apiService.register(data);
export const getMe = () => apiService.getMe();
export const getChannels = () => apiService.getChannels();
export const getChannel = (id: number) => apiService.getChannel(id);
export const createChannel = (data: { name: string; description?: string; is_private?: boolean }) => apiService.createChannel(data);
export const joinChannel = (id: number) => apiService.joinChannel(id);
export const leaveChannel = (id: number) => apiService.leaveChannel(id);
export const getChannelMessages = (channelId: number, skip = 0, limit = 50) => apiService.getChannelMessages(channelId, skip, limit);
export const sendMessage = (data: { content: string; channel_id: number; parent_message_id?: number }) => apiService.sendMessage(data);
export const updateMessage = (id: number, data: { content: string }) => apiService.updateMessage(id, data);
export const deleteMessage = (id: number) => apiService.deleteMessage(id);
export const addReaction = (messageId: number, emoji: string) => apiService.addReaction(messageId, emoji);
export const uploadFile = (file: File) => apiService.uploadFile(file);
export const searchMessages = (query: string, channelId?: number | null) => apiService.searchMessages(query, channelId);
export const getMessageThread = (messageId: number) => apiService.getMessageThread(messageId);
export const healthCheck = () => apiService.healthCheck();
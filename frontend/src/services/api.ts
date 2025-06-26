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
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  }

  async register(data: RegisterData): Promise<User> {
    const response: AxiosResponse<User> = await this.api.post('/auth/register', data);
    return response.data;
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
    const response: AxiosResponse<{ message: string }> = await this.api.post(
      `/messages/${messageId}/reactions`,
      { emoji }
    );
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response: AxiosResponse<{ status: string }> = await this.api.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
import axios from 'axios';
import { User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email,
      password,
    });
    return response.data;
  },
};
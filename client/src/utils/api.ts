import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { QueryFunctionContext } from '@tanstack/react-query';

// URL cơ sở cho API
const API_BASE_URL = 'http://localhost:5000';

// Lấy JWT token từ localStorage
const getAuthToken = () => localStorage.getItem('authToken');

// Lấy địa chỉ ví từ localStorage
const getWalletAddress = () => localStorage.getItem('walletAddress');

// Hàm gọi API
export const apiRequest = async (
  endpoint: string,
  options: AxiosRequestConfig = {}
) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Thêm Authorization header với JWT token nếu có
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config: AxiosRequestConfig = {
    ...options,
    url,
    headers,
  };
  
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      // Xử lý lỗi 401 Unauthorized - có thể là token hết hạn
      if (error.response.status === 401) {
        console.error('Authentication error:', error.response.data);
        // Có thể thêm logic để disconnect wallet ở đây
      }
      
      throw {
        status: error.response.status,
        message: error.response.data.error || 'API request failed',
        details: error.response.data.details,
      };
    }
    throw error;
  }
};

// Hàm kết nối ví và xác thực
export const connectWallet = async (walletAddress: string): Promise<{ token: string, user: any }> => {
  const response = await apiRequest('/api/auth/connect', {
    method: 'POST',
    data: { walletAddress }
  });
  
  // Lưu token và ví vào localStorage
  localStorage.setItem('authToken', response.token);
  localStorage.setItem('walletAddress', walletAddress);
  
  return response;
};

// Hàm ngắt kết nối ví
export const disconnectWallet = async (): Promise<void> => {
  try {
    await apiRequest('/api/auth/disconnect', {
      method: 'POST'
    });
  } finally {
    // Xóa token và ví khỏi localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('walletAddress');
  }
};

// Hàm tạo query function cho react-query
export const getQueryFn = <T>(endpoint: string, config?: AxiosRequestConfig) => {
  return async ({ queryKey }: QueryFunctionContext): Promise<T> => {
    const [actualEndpoint] = queryKey as [string];
    return apiRequest(actualEndpoint, config) as Promise<T>;
  };
}; 
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 30000, // Tăng timeout lên 30 giây vì việc phân tích ECG có thể mất nhiều thời gian
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server trả về response với status code lỗi
      switch (error.response.status) {
        case 401:
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 404:
          error.message = 'Không tìm thấy API endpoint. Vui lòng kiểm tra cấu hình server.';
          break;
        case 500:
          error.message = 'Lỗi server. Vui lòng thử lại sau.';
          break;
        default:
          error.message = error.response.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      }
    } else if (error.request) {
      // Request được gửi nhưng không nhận được response
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout. Vui lòng kiểm tra kết nối mạng và thử lại.';
      } else {
        error.message = 'Không thể kết nối tới server. Vui lòng kiểm tra kết nối mạng.';
      }
    } else {
      // Lỗi khi setup request
      error.message = 'Có lỗi xảy ra khi gửi request. Vui lòng thử lại.';
    }
    return Promise.reject(error);
  }
);

export default api;

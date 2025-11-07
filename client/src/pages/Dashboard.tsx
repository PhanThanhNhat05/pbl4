import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Favorite as HeartIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';

interface Stats {
  totalMeasurements: number;
  anomalyMeasurements: number;
  recentMeasurements: number;
  avgHeartRate: number;
  predictionStats: Array<{ _id: string; count: number }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/users/stats');
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Dashboard stats error:', err);
      setError('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const getPredictionLabel = (prediction: string) => {
    const labels: { [key: string]: string } = {
      'Normal': 'Bình thường',
      'Supraventricular': 'Bất thường trên thất',
      'Ventricular': 'Bất thường thất',
      'Paced': 'Được điều chỉnh',
      'Other': 'Khác'
    };
    return labels[prediction] || prediction;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Chào mừng, {user?.name}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Theo dõi sức khỏe tim mạch của bạn
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Stats Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 48%', md: '1 1 23%' } }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <HeartIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Tổng số lần đo</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {stats?.totalMeasurements || 0}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 48%', md: '1 1 23%' } }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <WarningIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Bất thường</Typography>
                </Box>
                <Typography variant="h4" color="error">
                  {stats?.anomalyMeasurements || 0}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 48%', md: '1 1 23%' } }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Nhịp tim TB</Typography>
                </Box>
                <Typography variant="h4" color="success">
                  {Math.round(stats?.avgHeartRate || 0)} BPM
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 48%', md: '1 1 23%' } }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <HistoryIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Tuần này</Typography>
                </Box>
                <Typography variant="h4" color="info">
                  {stats?.recentMeasurements || 0}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Quick Actions and Prediction Stats */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: { xs: '1', md: '1' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Thao tác nhanh
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<HeartIcon />}
                    onClick={() => navigate('/measurement')}
                    size="large"
                  >
                    Đo nhịp tim
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => navigate('/history')}
                    size="large"
                  >
                    Xem lịch sử
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1', md: '1' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Thống kê dự đoán
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {stats?.predictionStats.map((item) => (
                    <Chip
                      key={item._id}
                      label={`${getPredictionLabel(item._id)}: ${item.count}`}
                      color={item._id === 'Normal' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Recent Activity */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hoạt động gần đây
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats?.recentMeasurements === 0 
                  ? 'Chưa có hoạt động nào. Hãy bắt đầu đo nhịp tim!'
                  : `Bạn đã thực hiện ${stats?.recentMeasurements} lần đo trong tuần này.`
                }
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;

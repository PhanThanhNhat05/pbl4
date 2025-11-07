import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  IconButton,
  MenuItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  phone: string;
  role: string;
  createdAt: string;
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users/profile');
      
      const userData = response.data.data;
      setProfile(userData);
      setFormData({
        name: userData.name || '',
        age: userData.age?.toString() || '',
        gender: userData.gender || '',
        phone: userData.phone || '',
      });
    } catch (err: any) {
      console.error('Profile fetch error:', err);
      setError('Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: profile?.name || '',
      age: profile?.age?.toString() || '',
      gender: profile?.gender || '',
      phone: profile?.phone || '',
    });
    setError('');
    setSuccess('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.put('/api/users/profile', formData);

      setSuccess('Cập nhật thông tin thành công');
      setEditing(false);
      fetchProfile();
    } catch (err: any) {
      setError('Không thể cập nhật thông tin: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    alert('Tính năng đổi mật khẩu sẽ được thêm trong phiên bản tiếp theo');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Hồ sơ cá nhân
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Profile Info */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
          <Paper elevation={3}>
            <Box p={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Thông tin cá nhân
                </Typography>
                {!editing ? (
                  <IconButton onClick={handleEdit} color="primary">
                    <EditIcon />
                  </IconButton>
                ) : (
                  <Box>
                    <IconButton onClick={handleSave} color="primary" disabled={saving}>
                      <SaveIcon />
                    </IconButton>
                    <IconButton onClick={handleCancel} disabled={saving}>
                      <CancelIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%' } }}>
                  <TextField
                    fullWidth
                    label="Họ và tên"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%' } }}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profile?.email || ''}
                    disabled
                    helperText="Email không thể thay đổi"
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%' } }}>
                  <TextField
                    fullWidth
                    label="Tuổi"
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%' } }}>
                  <TextField
                    fullWidth
                    label="Giới tính"
                    name="gender"
                    select
                    value={formData.gender}
                    onChange={handleSelectChange}
                    disabled={!editing}
                  >
                    <MenuItem value="">Chọn giới tính</MenuItem>
                    <MenuItem value="male">Nam</MenuItem>
                    <MenuItem value="female">Nữ</MenuItem>
                    <MenuItem value="other">Khác</MenuItem>
                  </TextField>
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <TextField
                    fullWidth
                    label="Số điện thoại"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                </Box>
              </Box>

              {editing && (
                <Box mt={3} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Hủy
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Profile Summary */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                <Avatar sx={{ width: 80, height: 80, mb: 2 }}>
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h6">
                  {profile?.name || 'Người dùng'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Thông tin tài khoản
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Email:</strong> {profile?.email}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Tham gia:</strong> {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                </Typography>
                {profile?.age && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Tuổi:</strong> {profile.age}
                  </Typography>
                )}
                {profile?.gender && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Giới tính:</strong> {
                      profile.gender === 'male' ? 'Nam' :
                      profile.gender === 'female' ? 'Nữ' : 'Khác'
                    }
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleChangePassword}
                  sx={{ mb: 1 }}
                >
                  Đổi mật khẩu
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={logout}
                >
                  Đăng xuất
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
};

export default Profile;

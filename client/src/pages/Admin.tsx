import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Pagination,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { processECGForDisplay } from '../utils/firebase';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  BarChart as StatsIcon,
  Download as DownloadIcon,
  ShowChart as ChartIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';

interface User {
  _id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminMeasurement {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  heartRate: number;
  prediction: string;
  confidence: number;
  riskLevel: string;
  isAnomaly: boolean;
  createdAt: string;
  symptoms?: string;
  notes?: string;
  ecgData?: number[];
}

interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
  };
  measurements: {
    total: number;
    anomalies: number;
    recent: number;
    avgHeartRate: number;
  };
  predictions: Record<string, number>;
  riskLevels: Record<string, number>;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'users' | 'measurements' | 'stats'>('users');
  
  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openUserEditDialog, setOpenUserEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [openCreateUserDialog, setOpenCreateUserDialog] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    age: '',
    gender: '',
    phone: '',
    deviceId: ''
  });

  // Measurements
  const [measurements, setMeasurements] = useState<AdminMeasurement[]>([]);
  const [measurementPage, setMeasurementPage] = useState(1);
  const [measurementTotalPages, setMeasurementTotalPages] = useState(1);
  const [measurementLoading, setMeasurementLoading] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<AdminMeasurement | null>(null);
  const [openMeasurementDialog, setOpenMeasurementDialog] = useState(false);
  const [openMeasurementEditDialog, setOpenMeasurementEditDialog] = useState(false);
  const [measurementFilters, setMeasurementFilters] = useState<{
    prediction?: string;
    riskLevel?: string;
    isAnomaly?: string;
  }>({});
  const [selectedPlotMeasurement, setSelectedPlotMeasurement] = useState<AdminMeasurement | null>(null);
  const [openPlotDialog, setOpenPlotDialog] = useState(false);

  // Statistics
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Edit forms
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: 'user',
    age: '',
    gender: '',
    phone: '',
    deviceId: ''
  });

  const [editMeasurementForm, setEditMeasurementForm] = useState({
    symptoms: '',
    notes: '',
    riskLevel: '',
    isAnomaly: false,
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    
    if (tab === 'users') {
      fetchUsers();
    } else if (tab === 'measurements') {
      fetchMeasurements();
    } else if (tab === 'stats') {
      fetchStats();
    }
  }, [page, search, tab, measurementPage, measurementFilters, user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await api.get(`/api/users?${params}`);
      setUsers(response.data.data || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeasurements = async () => {
    try {
      setMeasurementLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: measurementPage.toString(),
        limit: '10',
        ...(measurementFilters.prediction && { prediction: measurementFilters.prediction }),
        ...(measurementFilters.riskLevel && { riskLevel: measurementFilters.riskLevel }),
        ...(measurementFilters.isAnomaly && { isAnomaly: measurementFilters.isAnomaly }),
      });

      const res = await api.get(`/api/admin/measurements?${params}`);
      
      if (res.data.success) {
        setMeasurements(res.data.data || []);
        setMeasurementTotalPages(res.data.pagination?.pages || 1);
      } else {
        setError(res.data.message || 'Không thể tải lịch sử đo');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Không thể tải lịch sử đo';
      setError(errorMsg);
      
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập. Vui lòng đăng nhập bằng tài khoản admin.');
      }
    } finally {
      setMeasurementLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setError('');
      const res = await api.get('/api/admin/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      setError('Không thể tải thống kê');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(true);
      await api.put(`/api/users/${userId}/status`, { isActive: !currentStatus });
      setSuccess(`Đã ${!currentStatus ? 'kích hoạt' : 'khóa'} tài khoản thành công`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể thay đổi trạng thái người dùng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.delete(`/api/users/${userId}`);
      setSuccess('Xóa người dùng thành công');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa người dùng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setOpenUserDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age?.toString() || '',
      gender: user.gender || '',
      phone: user.phone || '',
      deviceId: (user as any).deviceId || ''
    });
    setOpenUserEditDialog(true);
  };

  const handleSaveUser = async () => {
    try {
      setActionLoading(true);
      setError(''); // Clear previous errors
      
      // Validation
      if (!editUserForm.name || !editUserForm.name.trim()) {
        setError('Tên người dùng không được để trống');
        return;
      }
      
      if (!editUserForm.email || !editUserForm.email.trim()) {
        setError('Email không được để trống');
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editUserForm.email)) {
        setError('Email không hợp lệ');
        return;
      }
      
      const updateData: any = {
        name: editUserForm.name.trim(),
        email: editUserForm.email.trim().toLowerCase(),
        role: editUserForm.role,
      };
      
      if (editUserForm.age && editUserForm.age.trim()) {
        const ageNum = parseInt(editUserForm.age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
          setError('Tuổi phải là số từ 1 đến 120');
          return;
        }
        updateData.age = ageNum;
      } else {
        updateData.age = undefined; // Allow clearing age
      }
      
      if (editUserForm.gender) {
        updateData.gender = editUserForm.gender;
      } else {
        updateData.gender = undefined; // Allow clearing gender
      }
      
      if (editUserForm.phone && editUserForm.phone.trim()) {
        updateData.phone = editUserForm.phone.trim();
      } else {
        updateData.phone = undefined; // Allow clearing phone
      }
      
      if (editUserForm.deviceId && editUserForm.deviceId.trim()) {
        updateData.deviceId = editUserForm.deviceId.trim();
      } else {
        updateData.deviceId = undefined;
      }

      const response = await api.put(`/api/users/${editingUser?._id}`, updateData);
      
      if (response.data.success) {
        setSuccess('Cập nhật thông tin người dùng thành công');
        setOpenUserEditDialog(false);
        fetchUsers();
      } else {
        setError(response.data.message || 'Không thể cập nhật thông tin người dùng');
      }
    } catch (err: any) {
      console.error('Update user error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Không thể cập nhật thông tin người dùng';
      setError(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewMeasurement = async (measurementId: string) => {
    try {
      const res = await api.get(`/api/admin/measurements/${measurementId}`);
      if (res.data.success) {
        setSelectedMeasurement(res.data.data);
        setOpenMeasurementDialog(true);
      }
    } catch (err: any) {
      setError('Không thể tải chi tiết bản ghi');
    }
  };

  const handleViewPlot = async (measurementId: string) => {
    try {
      const res = await api.get(`/api/admin/measurements/${measurementId}`);
      if (res.data.success) {
        setSelectedPlotMeasurement(res.data.data);
        setOpenPlotDialog(true);
      }
    } catch (err: any) {
      setError('Không thể tải dữ liệu đồ thị');
    }
  };

  const handleEditMeasurement = (measurement: AdminMeasurement) => {
    setSelectedMeasurement(measurement);
    setEditMeasurementForm({
      symptoms: measurement.symptoms || '',
      notes: measurement.notes || '',
      riskLevel: measurement.riskLevel,
      isAnomaly: measurement.isAnomaly,
    });
    setOpenMeasurementEditDialog(true);
  };

  const handleSaveMeasurement = async () => {
    try {
      setActionLoading(true);
      await api.put(`/api/admin/measurements/${selectedMeasurement?.id}`, editMeasurementForm);
      setSuccess('Cập nhật bản ghi thành công');
      setOpenMeasurementEditDialog(false);
      fetchMeasurements();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể cập nhật bản ghi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMeasurement = async (measurementId: string) => {
    if (!window.confirm('Xóa bản ghi này?')) return;
    try {
      await api.delete(`/api/admin/measurements/${measurementId}`);
      setSuccess('Xóa bản ghi thành công');
      fetchMeasurements();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa bản ghi');
    }
  };

  const handleExport = async (type: 'users' | 'measurements') => {
    try {
      let url = '';
      if (type === 'users') {
        url = `/api/users?limit=1000&${search ? `search=${search}` : ''}`;
      } else {
        const params = new URLSearchParams({
          limit: '1000',
          ...(measurementFilters.prediction && { prediction: measurementFilters.prediction }),
          ...(measurementFilters.riskLevel && { riskLevel: measurementFilters.riskLevel }),
          ...(measurementFilters.isAnomaly && { isAnomaly: measurementFilters.isAnomaly }),
        });
        url = `/api/admin/measurements?${params}`;
      }
      
      const res = await api.get(url);
      const data = type === 'users' ? res.data.data : res.data.data;
      
      // Convert to CSV
      const headers = type === 'users' 
        ? ['Tên', 'Email', 'Vai trò', 'Tuổi', 'Giới tính', 'SĐT', 'Trạng thái', 'Ngày tạo']
        : ['Người dùng', 'Email', 'Kết quả', 'Nhịp tim', 'Rủi ro', 'Bất thường', 'Thời gian'];
      
      const rows = data.map((item: any) => {
        if (type === 'users') {
          return [
            item.name,
            item.email,
            item.role === 'admin' ? 'Quản trị' : 'Người dùng',
            item.age || '',
            getGenderLabel(item.gender),
            item.phone || '',
            item.isActive ? 'Hoạt động' : 'Bị khóa',
            new Date(item.createdAt).toLocaleString('vi-VN')
          ];
        } else {
          return [
            item.userName,
            item.userEmail,
            item.prediction,
            item.heartRate || '',
            '', // confidence hidden in UI/export
            item.riskLevel,
            item.isAnomaly ? 'Có' : 'Không',
            new Date(item.createdAt).toLocaleString('vi-VN')
          ];
        }
      });
      
      const csv = [headers.join(','), ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${type === 'users' ? 'users' : 'measurements'}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      setSuccess(`Đã xuất ${data.length} bản ghi`);
    } catch (err: any) {
      setError('Không thể xuất dữ liệu');
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'other': return 'Khác';
      default: return 'Không xác định';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (user?.role !== 'admin') {
    return (
      <Container maxWidth="md">
        <Alert severity="error">
          Bạn không có quyền truy cập trang này
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <AdminIcon sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h4">
            Quản trị hệ thống
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        message={success}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab label="Người dùng" value="users" />
        <Tab label="Lịch sử đo" value="measurements" />
        <Tab label="Thống kê" value="stats" icon={<StatsIcon />} iconPosition="start" />
      </Tabs>

      {/* Statistics Cards */}
      {tab === 'users' && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
          <Card sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%', md: '1 1 25%' } }}>
            <CardContent>
              <Typography variant="h6" color="primary">
                Tổng người dùng
              </Typography>
              <Typography variant="h4">
                {users.length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%', md: '1 1 25%' } }}>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Đang hoạt động
              </Typography>
              <Typography variant="h4">
                {users.filter(u => u.isActive).length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%', md: '1 1 25%' } }}>
            <CardContent>
              <Typography variant="h6" color="error.main">
                Bị khóa
              </Typography>
              <Typography variant="h4">
                {users.filter(u => !u.isActive).length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%', md: '1 1 25%' } }}>
            <CardContent>
              <Typography variant="h6" color="info.main">
                Quản trị viên
              </Typography>
              <Typography variant="h4">
                {users.filter(u => u.role === 'admin').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab: Quản lý người dùng */}
      {tab === 'users' && (
        <Paper elevation={3}>
          <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Danh sách người dùng
              </Typography>
              <Box display="flex" gap={2}>
                <TextField
                  size="small"
                  placeholder="Tìm kiếm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOpenCreateUserDialog(true)}
                  >
                    Tạo người dùng
                  </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('users')}
                >
                  Xuất CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchUsers}
                >
                  Làm mới
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Người dùng</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Thông tin</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell>Ngày tạo</TableCell>
                        <TableCell>Hành động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              Không có người dùng nào
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u._id}>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2">
                                  {u.name}
                                </Typography>
                                <Chip
                                  label={u.role === 'admin' ? 'Quản trị' : 'Người dùng'}
                                  color={u.role === 'admin' ? 'primary' : 'default'}
                                  size="small"
                                />
                              </Box>
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {u.age && `${u.age} tuổi`}
                                {u.gender && ` • ${getGenderLabel(u.gender)}`}
                              </Typography>
                            { (u as any).deviceId && (
                              <Typography variant="body2" color="text.secondary">
                                {/* Device: {(u as any).deviceId} */}
                              </Typography>
                            ) }
                              {u.phone && (
                                <Typography variant="body2" color="text.secondary">
                                  {u.phone}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={u.isActive ? 'Hoạt động' : 'Bị khóa'}
                                color={u.isActive ? 'success' : 'error'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{formatDate(u.createdAt)}</TableCell>
                            <TableCell>
                              <Tooltip title="Xem chi tiết">
                                <IconButton
                                  onClick={() => handleViewUser(u)}
                                  color="primary"
                                  size="small"
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Chỉnh sửa">
                                <IconButton
                                  onClick={() => handleEditUser(u)}
                                  color="info"
                                  size="small"
                                  disabled={actionLoading}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={u.isActive ? 'Khóa' : 'Kích hoạt'}>
                                <IconButton
                                  onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                                  color={u.isActive ? 'error' : 'success'}
                                  size="small"
                                  disabled={actionLoading}
                                >
                                  {u.isActive ? <BlockIcon fontSize="small" /> : <CheckIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa">
                                <IconButton
                                  onClick={() => handleDeleteUser(u._id)}
                                  color="error"
                                  size="small"
                                  disabled={actionLoading || (user && u._id === (user as any)._id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* Tab: Lịch sử đo */}
      {tab === 'measurements' && (
        <Paper elevation={3}>
          <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Lịch sử đo của tất cả người dùng
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Loại kết quả</InputLabel>
                  <Select
                    label="Loại kết quả"
                    value={measurementFilters.prediction || ''}
                    onChange={(e) =>
                      setMeasurementFilters((f) => ({
                        ...f,
                        prediction: e.target.value || undefined,
                      }))
                    }
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="Normal">Bình thường</MenuItem>
                    <MenuItem value="Supraventricular">Supraventricular</MenuItem>
                    <MenuItem value="Ventricular">Ventricular</MenuItem>
                    <MenuItem value="Paced">Paced</MenuItem>
                    <MenuItem value="Other">Khác</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Mức rủi ro</InputLabel>
                  <Select
                    label="Mức rủi ro"
                    value={measurementFilters.riskLevel || ''}
                    onChange={(e) =>
                      setMeasurementFilters((f) => ({
                        ...f,
                        riskLevel: e.target.value || undefined,
                      }))
                    }
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Bất thường</InputLabel>
                  <Select
                    label="Bất thường"
                    value={measurementFilters.isAnomaly || ''}
                    onChange={(e) =>
                      setMeasurementFilters((f) => ({
                        ...f,
                        isAnomaly: e.target.value || undefined,
                      }))
                    }
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="true">Chỉ bất thường</MenuItem>
                    <MenuItem value="false">Chỉ bình thường</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('measurements')}
                >
                  Xuất CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchMeasurements}
                >
                  Làm mới
                </Button>
              </Box>
            </Box>

            {measurementLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Người dùng</TableCell>
                        <TableCell>Kết quả</TableCell>
                        {/* Confidence column removed */}
                        <TableCell>Rủi ro</TableCell>
                        <TableCell>Thời gian</TableCell>
                        <TableCell>Hành động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {measurements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              Không có dữ liệu đo nào
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        measurements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2">{m.userName}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {m.userEmail}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={m.prediction}
                                color={m.prediction === 'Normal' ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                            {/* confidence hidden */}
                            <TableCell>
                              <Chip
                                label={m.riskLevel}
                                size="small"
                                color={
                                  m.riskLevel === 'High'
                                    ? 'error'
                                    : m.riskLevel === 'Medium'
                                    ? 'warning'
                                    : 'success'
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(m.createdAt).toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Xem chi tiết">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleViewMeasurement(m.id)}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xem đồ thị">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleViewPlot(m.id)}
                                >
                                  <ChartIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Chỉnh sửa">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => handleEditMeasurement(m)}
                                  disabled={actionLoading}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa bản ghi">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteMeasurement(m.id)}
                                  disabled={measurementLoading}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={measurementTotalPages}
                    page={measurementPage}
                    onChange={(_, p) => setMeasurementPage(p)}
                    color="primary"
                  />
                </Box>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* Tab: Thống kê */}
      {tab === 'stats' && (
        <Paper elevation={3}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Thống kê hệ thống
            </Typography>
            {statsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : stats ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Người dùng
                    </Typography>
                    <Typography>Tổng: {stats.users.total}</Typography>
                    <Typography color="success.main">Hoạt động: {stats.users.active}</Typography>
                    <Typography color="error.main">Bị khóa: {stats.users.inactive}</Typography>
                    <Typography color="primary">Quản trị: {stats.users.admins}</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Đo lường
                    </Typography>
                    <Typography>Tổng: {stats.measurements.total}</Typography>
                    <Typography color="error.main">Bất thường: {stats.measurements.anomalies}</Typography>
                    <Typography color="info.main">7 ngày qua: {stats.measurements.recent}</Typography>
                    
                  </CardContent>
                </Card>
                <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Phân loại kết quả
                    </Typography>
                    {Object.entries(stats.predictions).map(([key, value]) => (
                      <Typography key={key}>
                        {key}: {value}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
                <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' } }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Mức rủi ro
                    </Typography>
                    {Object.entries(stats.riskLevels).map(([key, value]) => (
                      <Typography key={key}>
                        {key}: {value}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Alert severity="info">Không có dữ liệu thống kê</Alert>
            )}
          </Box>
        </Paper>
      )}

      {/* User Detail Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi tiết người dùng</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Họ và tên</Typography>
                <Typography variant="body1">{selectedUser.name}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{selectedUser.email}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Tuổi</Typography>
                <Typography variant="body1">{selectedUser.age || 'Không xác định'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Giới tính</Typography>
                <Typography variant="body1">{getGenderLabel(selectedUser.gender)}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Số điện thoại</Typography>
                <Typography variant="body1">{selectedUser.phone || 'Không có'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Vai trò</Typography>
                <Chip
                  label={selectedUser.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                  color={selectedUser.role === 'admin' ? 'primary' : 'default'}
                />
              </Box>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Trạng thái</Typography>
                <Chip
                  label={selectedUser.isActive ? 'Hoạt động' : 'Bị khóa'}
                  color={selectedUser.isActive ? 'success' : 'error'}
                />
              </Box>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Ngày tạo</Typography>
                <Typography variant="body1">{formatDate(selectedUser.createdAt)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openUserEditDialog} onClose={() => setOpenUserEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Họ và tên"
              fullWidth
              value={editUserForm.name}
              onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={editUserForm.email}
              onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={editUserForm.role}
                label="Vai trò"
                onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
              >
                <MenuItem value="user">Người dùng</MenuItem>
                <MenuItem value="admin">Quản trị viên</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Tuổi"
              fullWidth
              type="number"
              value={editUserForm.age}
              onChange={(e) => setEditUserForm({ ...editUserForm, age: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Giới tính</InputLabel>
              <Select
                value={editUserForm.gender}
                label="Giới tính"
                onChange={(e) => setEditUserForm({ ...editUserForm, gender: e.target.value })}
              >
                <MenuItem value="">Không chọn</MenuItem>
                <MenuItem value="male">Nam</MenuItem>
                <MenuItem value="female">Nữ</MenuItem>
                <MenuItem value="other">Khác</MenuItem>
              </Select>
            </FormControl>
              <TextField
                label="Device ID"
                fullWidth
                value={editUserForm.deviceId}
                onChange={(e) => setEditUserForm({ ...editUserForm, deviceId: e.target.value })}
              />
            <TextField
              label="Số điện thoại"
              fullWidth
              value={editUserForm.phone}
              onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserEditDialog(false)}>Hủy</Button>
          <Button onClick={handleSaveUser} variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={24} /> : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={openCreateUserDialog} onClose={() => setOpenCreateUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tạo người dùng mới</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Họ và tên"
              fullWidth
              value={createUserForm.name}
              onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={createUserForm.email}
              onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
            />
            <TextField
              label="Mật khẩu"
              fullWidth
              type="password"
              value={createUserForm.password}
              onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
            />
            <TextField
              label="Device ID"
              fullWidth
              value={createUserForm.deviceId || ''}
              onChange={(e) => setCreateUserForm({ ...createUserForm, deviceId: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={createUserForm.role}
                label="Vai trò"
                onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
              >
                <MenuItem value="user">Người dùng</MenuItem>
                <MenuItem value="admin">Quản trị viên</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Tuổi"
              fullWidth
              type="number"
              value={createUserForm.age}
              onChange={(e) => setCreateUserForm({ ...createUserForm, age: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Giới tính</InputLabel>
              <Select
                value={createUserForm.gender}
                label="Giới tính"
                onChange={(e) => setCreateUserForm({ ...createUserForm, gender: e.target.value })}
              >
                <MenuItem value="">Không chọn</MenuItem>
                <MenuItem value="male">Nam</MenuItem>
                <MenuItem value="female">Nữ</MenuItem>
                <MenuItem value="other">Khác</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Số điện thoại"
              fullWidth
              value={createUserForm.phone}
              onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateUserDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                setActionLoading(true);
                const payload: any = {
                  name: createUserForm.name,
                  email: createUserForm.email,
                  password: createUserForm.password,
                  role: createUserForm.role,
                };
                if (createUserForm.age) payload.age = parseInt(createUserForm.age);
                if (createUserForm.gender) payload.gender = createUserForm.gender;
                if (createUserForm.deviceId) payload.deviceId = createUserForm.deviceId;
                if (createUserForm.phone) payload.phone = createUserForm.phone;
                const res = await api.post('/api/users', payload);
                if (res.data.success) {
                  setSuccess('Tạo người dùng thành công');
                  setOpenCreateUserDialog(false);
                  fetchUsers();
                } else {
                  setError(res.data.message || 'Không thể tạo người dùng');
                }
              } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Không thể tạo người dùng');
              } finally {
                setActionLoading(false);
              }
            }}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Tạo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Measurement Detail Dialog */}
      <Dialog open={openMeasurementDialog} onClose={() => setOpenMeasurementDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Chi tiết bản ghi đo</DialogTitle>
        <DialogContent>
          {selectedMeasurement && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Người dùng</Typography>
                <Typography variant="body1">{selectedMeasurement.userName}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedMeasurement.userEmail}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 50%' }}>
                <Typography variant="subtitle2" color="text.secondary">Kết quả</Typography>
                <Chip label={selectedMeasurement.prediction} color={selectedMeasurement.prediction === 'Normal' ? 'success' : 'warning'} />
              </Box>
              {/* confidence removed from UI */}
              <Box sx={{ flex: '1 1 50%' }}>
                <Typography variant="subtitle2" color="text.secondary">Mức rủi ro</Typography>
                <Chip
                  label={selectedMeasurement.riskLevel}
                  color={
                    selectedMeasurement.riskLevel === 'High'
                      ? 'error'
                      : selectedMeasurement.riskLevel === 'Medium'
                      ? 'warning'
                      : 'success'
                  }
                />
              </Box>
              <Box sx={{ flex: '1 1 50%' }}>
                <Typography variant="subtitle2" color="text.secondary">Bất thường</Typography>
                <Chip
                  label={selectedMeasurement.isAnomaly ? 'Có' : 'Không'}
                  color={selectedMeasurement.isAnomaly ? 'error' : 'success'}
                />
              </Box>

              {/* ECG plot if ecgData exists */}
              {selectedMeasurement.ecgData && selectedMeasurement.ecgData.length > 0 && (
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">Tín hiệu ECG</Typography>
                  <Box height={300} mb={2}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={selectedMeasurement.ecgData.slice(0, 1000).map((value: number, index: number) => ({
                          time: index / 360,
                          value
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#1976d2"
                          strokeWidth={1}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              )}

              {selectedMeasurement.symptoms && (
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">Triệu chứng</Typography>
                  <Typography variant="body1">{selectedMeasurement.symptoms}</Typography>
                </Box>
              )}
              {selectedMeasurement.notes && (
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">Ghi chú</Typography>
                  <Typography variant="body1">{selectedMeasurement.notes}</Typography>
                </Box>
              )}
              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" color="text.secondary">Thời gian</Typography>
                <Typography variant="body1">{new Date(selectedMeasurement.createdAt).toLocaleString('vi-VN')}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMeasurementDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* ECG Plot Dialog */}
      <Dialog open={openPlotDialog} onClose={() => setOpenPlotDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Biểu đồ ECG</DialogTitle>
        <DialogContent>
          {selectedPlotMeasurement && selectedPlotMeasurement.ecgData && selectedPlotMeasurement.ecgData.length > 0 ? (
            <Box sx={{ height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(() => {
                    try {
                      // Process raw ECG to remove baseline / scale similar to Measurement page
                      const raw = selectedPlotMeasurement.ecgData || [];
                      const processed = processECGForDisplay(raw);
                      const MAX_POINTS = 1000;
                      const SAMPLE_RATE = 250;
                      const TARGET_POINTS = 500;
                      if (processed.length <= TARGET_POINTS) {
                        return processed.map((v: number, i: number) => ({ time: i / SAMPLE_RATE, value: v }));
                      }
                      // Bin-averaging resample to TARGET_POINTS to get even distribution over full duration
                      const step = processed.length / TARGET_POINTS;
                      const sampled: { time: number; value: number }[] = [];
                      const durationSec = processed.length / SAMPLE_RATE;
                      for (let i = 0; i < TARGET_POINTS; i++) {
                        const start = Math.floor(i * step);
                        const end = Math.floor((i + 1) * step);
                        const sliceStart = Math.min(start, processed.length - 1);
                        const sliceEnd = Math.min(Math.max(end, sliceStart + 1), processed.length);
                        let sum = 0;
                        let count = 0;
                        for (let j = sliceStart; j < sliceEnd; j++) {
                          sum += processed[j];
                          count++;
                        }
                        const avg = count > 0 ? sum / count : processed[sliceStart];
                        const t = (i / (TARGET_POINTS - 1)) * durationSec;
                        sampled.push({ time: t, value: avg });
                      }
                      return sampled;
                    } catch (e) {
                      // Fallback to simple slicing if processing fails
                      const fallback = selectedPlotMeasurement.ecgData!.slice(0, 1000).map((v: number, i: number) => ({ time: i / 360, value: v }));
                      return fallback;
                    }
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 800]} />
                  <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={1} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Box>
              <Typography>Không có dữ liệu ECG để hiển thị</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPlotDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Measurement Dialog */}
      <Dialog open={openMeasurementEditDialog} onClose={() => setOpenMeasurementEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chỉnh sửa bản ghi đo</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Triệu chứng"
              fullWidth
              multiline
              rows={3}
              value={editMeasurementForm.symptoms}
              onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, symptoms: e.target.value })}
            />
            <TextField
              label="Ghi chú"
              fullWidth
              multiline
              rows={3}
              value={editMeasurementForm.notes}
              onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, notes: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Mức rủi ro</InputLabel>
              <Select
                value={editMeasurementForm.riskLevel}
                label="Mức rủi ro"
                onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, riskLevel: e.target.value })}
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Bất thường</InputLabel>
              <Select
                value={editMeasurementForm.isAnomaly ? 'true' : 'false'}
                label="Bất thường"
                onChange={(e) => setEditMeasurementForm({ ...editMeasurementForm, isAnomaly: e.target.value === 'true' })}
              >
                <MenuItem value="false">Không</MenuItem>
                <MenuItem value="true">Có</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMeasurementEditDialog(false)}>Hủy</Button>
          <Button onClick={handleSaveMeasurement} variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={24} /> : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Admin;

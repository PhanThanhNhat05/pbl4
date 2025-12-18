import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
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
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'users' | 'measurements'>('users');
  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Measurements (admin view)
  const [measurements, setMeasurements] = useState<AdminMeasurement[]>([]);
  const [measurementPage, setMeasurementPage] = useState(1);
  const [measurementTotalPages, setMeasurementTotalPages] = useState(1);
  const [measurementLoading, setMeasurementLoading] = useState(false);
  const [measurementFilters, setMeasurementFilters] = useState<{
    prediction?: string;
    riskLevel?: string;
    isAnomaly?: string;
  }>({});

  useEffect(() => {
    if (user?.role !== 'admin') return;
    if (tab === 'users') {
      fetchUsers();
    } else {
      fetchMeasurements();
    }
  }, [page, search, tab, measurementPage, measurementFilters, user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await api.get(`/api/users?${params}`);

      setUsers(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (err: any) {
      setError('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeasurements = async () => {
    try {
      setMeasurementLoading(true);
      const params = new URLSearchParams({
        page: measurementPage.toString(),
        limit: '10',
        ...(measurementFilters.prediction && { prediction: measurementFilters.prediction }),
        ...(measurementFilters.riskLevel && { riskLevel: measurementFilters.riskLevel }),
        ...(measurementFilters.isAnomaly && { isAnomaly: measurementFilters.isAnomaly }),
      });

      const res = await api.get(`/api/admin/measurements?${params}`);
      setMeasurements(res.data.data || []);
      setMeasurementTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
      setError('Không thể tải lịch sử đo');
    } finally {
      setMeasurementLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(true);
      await api.put(`/api/users/${userId}/status`, 
        { isActive: !currentStatus }
      );
      
      fetchUsers();
    } catch (err: any) {
      setError('Không thể thay đổi trạng thái người dùng');
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
      
      fetchUsers();
    } catch (err: any) {
      setError('Không thể xóa người dùng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setOpenDialog(true);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box display="flex" alignItems="center" mb={3}>
        <AdminIcon sx={{ mr: 1, fontSize: 32 }} />
        <Typography variant="h4">
          Quản trị hệ thống
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab label="Người dùng" value="users" />
        <Tab label="Lịch sử đo" value="measurements" />
      </Tabs>

      {/* Thống kê chung (theo users) */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%', md: '1 1 25%' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Tổng người dùng
              </Typography>
              <Typography variant="h4">
                {users.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%', md: '1 1 25%' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Đang hoạt động
              </Typography>
              <Typography variant="h4">
                {users.filter(u => u.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%', md: '1 1 25%' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                Bị khóa
              </Typography>
              <Typography variant="h4">
                {users.filter(u => !u.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%', md: '1 1 25%' } }}>
          <Card>
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
      </Box>

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
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchUsers}
              >
                Làm mới
              </Button>
            </Box>
          </Box>

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
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.name}
                        </Typography>
                        <Chip
                          label={user.role === 'admin' ? 'Quản trị' : 'Người dùng'}
                          color={user.role === 'admin' ? 'primary' : 'default'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.age && `${user.age} tuổi`}
                        {user.gender && ` • ${getGenderLabel(user.gender)}`}
                      </Typography>
                      {user.phone && (
                        <Typography variant="body2" color="text.secondary">
                          {user.phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Hoạt động' : 'Bị khóa'}
                        color={user.isActive ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewUser(user)}
                        color="primary"
                        size="small"
                      >
                        <SearchIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                        color={user.isActive ? 'error' : 'success'}
                        size="small"
                        disabled={actionLoading}
                      >
                        {user.isActive ? <BlockIcon /> : <CheckIcon />}
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteUser(user._id)}
                        color="error"
                        size="small"
                        disabled={actionLoading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
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
        </Box>
      </Paper>
      )}

      {/* Tab: Lịch sử đo toàn hệ thống */}
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
                        {/* <TableCell>Nhịp tim</TableCell> */}
                        <TableCell>Độ tin cậy</TableCell>
                        <TableCell>Rủi ro</TableCell>
                        <TableCell>Thời gian</TableCell>
                        <TableCell>Hành động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {measurements.map((m) => (
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
                          {/* <TableCell>{m.heartRate} BPM</TableCell> */}
                          <TableCell>
                            {(m.confidence * 100).toFixed(1)}%
                          </TableCell>
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
                            <Tooltip title="Xóa bản ghi">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={async () => {
                                    if (!window.confirm('Xóa bản ghi này?')) return;
                                    try {
                                      await api.delete(`/api/admin/measurements/${m.id}`);
                                      fetchMeasurements();
                                    } catch (err) {
                                      setError('Không thể xóa bản ghi');
                                    }
                                  }}
                                  disabled={measurementLoading}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
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

      {/* User Detail Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Chi tiết người dùng
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Họ và tên
                  </Typography>
                  <Typography variant="body1">
                    {selectedUser.name}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {selectedUser.email}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tuổi
                  </Typography>
                  <Typography variant="body1">
                    {selectedUser.age || 'Không xác định'}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Giới tính
                  </Typography>
                  <Typography variant="body1">
                    {getGenderLabel(selectedUser.gender)}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Số điện thoại
                  </Typography>
                  <Typography variant="body1">
                    {selectedUser.phone || 'Không có'}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Vai trò
                  </Typography>
                  <Chip
                    label={selectedUser.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                    color={selectedUser.role === 'admin' ? 'primary' : 'default'}
                  />
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Trạng thái
                  </Typography>
                  <Chip
                    label={selectedUser.isActive ? 'Hoạt động' : 'Bị khóa'}
                    color={selectedUser.isActive ? 'success' : 'error'}
                  />
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ngày tạo
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedUser.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Admin;

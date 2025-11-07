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

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [page, search, user]);

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

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, ...{ mb: 3 } }}>
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

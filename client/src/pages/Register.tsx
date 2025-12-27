import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { 
  Favorite as HeartIcon,
  Login as LoginIcon 
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Register: React.FC = () => {
  // Registration disabled — accounts are created by admin
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 6, width: '100%', textAlign: 'center' }}>
          <HeartIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h4" gutterBottom>
            Đăng ký tạm thời bị vô hiệu hóa
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Hệ thống hiện chỉ cho phép quản trị viên tạo tài khoản. Vui lòng liên hệ quản trị viên để được cấp tài khoản.
          </Typography>
          <Button variant="contained" href="/login">
            Đến trang đăng nhập
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;

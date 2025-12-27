import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { processECGForDisplay } from '../utils/firebase';
import api from '../utils/axios';

interface Measurement {
  _id: string;
  heartRate: number;
  prediction: string;
  confidence: number;
  riskLevel: string;
  isAnomaly: boolean;
  createdAt: string;
  ecgData: number[];
  symptoms: string[];
  notes: string;
}

const History: React.FC = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMeasurements();
  }, [page, filter]);

  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filter !== 'all' && { anomaly: filter })
      });

      const response = await api.get(`/api/measurements?${params}`);

      setMeasurements(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (err: any) {
      setError('Không thể tải lịch sử đo');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (measurement: Measurement) => {
    setSelectedMeasurement(measurement);
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa kết quả đo này?')) return;

    try {
      await api.delete(`/api/measurements/${id}`);
      fetchMeasurements();
    } catch (err: any) {
      setError('Không thể xóa kết quả đo');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Prepare chart data for selected measurement (process + bin-averaging)
  const chartData = useMemo(() => {
    if (!selectedMeasurement?.ecgData || selectedMeasurement.ecgData.length === 0) return [];
    try {
      const processed = processECGForDisplay(selectedMeasurement.ecgData);
      const SAMPLE_RATE = 250;
      const MAX_POINTS = 500;
      if (processed.length <= MAX_POINTS) {
        return processed.map((v: number, i: number) => ({ time: i / SAMPLE_RATE, value: v }));
      }
      const step = processed.length / MAX_POINTS;
      const sampled: { time: number; value: number }[] = [];
      const durationSec = processed.length / SAMPLE_RATE;
      for (let i = 0; i < MAX_POINTS; i++) {
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
        const t = (i / (MAX_POINTS - 1)) * durationSec;
        sampled.push({ time: t, value: avg });
      }
      return sampled;
    } catch {
      // fallback simple slice
      return selectedMeasurement.ecgData.slice(0, 500).map((v: number, i: number) => ({ time: i / 250, value: v }));
    }
  }, [selectedMeasurement]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Lịch sử đo
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Lọc</InputLabel>
            <Select
              value={filter}
              label="Lọc"
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="true">Bất thường</MenuItem>
              <MenuItem value="false">Bình thường</MenuItem>
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {measurements.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                Chưa có lịch sử đo nào
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hãy bắt đầu đo nhịp tim để xem lịch sử ở đây
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Thời gian</TableCell>
                  {/* <TableCell>Nhịp tim</TableCell> */}
                  <TableCell>Dự đoán</TableCell>
                <TableCell>Mức độ rủi ro</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {measurements.map((measurement) => (
                  <TableRow key={measurement._id}>
                    <TableCell>{formatDate(measurement.createdAt)}</TableCell>
                    <TableCell>
                      <Typography variant="h6" color="primary">
                        {measurement.heartRate} BPM
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPredictionLabel(measurement.prediction)}
                        color={measurement.prediction === 'Normal' ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={measurement.riskLevel}
                        color={getRiskLevelColor(measurement.riskLevel) as any}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewDetails(measurement)}
                        color="primary"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(measurement._id)}
                        color="error"
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
        </>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chi tiết kết quả đo
        </DialogTitle>
        <DialogContent>
          {selectedMeasurement && (
            <Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, ...{ mb: 3 } }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nhịp tim
                  </Typography>
                  <Typography variant="h6">
                    {selectedMeasurement.heartRate} BPM
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Dự đoán
                  </Typography>
                  <Chip
                    label={getPredictionLabel(selectedMeasurement.prediction)}
                    color={selectedMeasurement.prediction === 'Normal' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 50%', sm: '1 1 25%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Mức độ rủi ro
                  </Typography>
                  <Chip
                    label={selectedMeasurement.riskLevel}
                    color={getRiskLevelColor(selectedMeasurement.riskLevel) as any}
                    variant="filled"
                  />
                </Box>
                {/* confidence removed from details UI */}
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Tín hiệu ECG
              </Typography>
              <Box height={300} mb={3}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 800]} />
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

              {selectedMeasurement.symptoms.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Triệu chứng
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedMeasurement.symptoms.map((symptom, index) => (
                      <Chip key={index} label={symptom} size="small" />
                    ))}
                  </Box>
                </Box>
              )}

              {selectedMeasurement.notes && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Ghi chú
                  </Typography>
                  <Typography variant="body2">
                    {selectedMeasurement.notes}
                  </Typography>
                </Box>
              )}
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

export default History;

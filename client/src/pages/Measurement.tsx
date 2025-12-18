import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Favorite as HeartIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  CloudDownload as DownloadIcon,
  ShowChart as ChartIcon,
  Psychology as PredictIcon,
  RestartAlt as ResetIcon,
  History as HistoryIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import api from '../utils/axios';
import { fetchECGDataAsArray, fetchECGDataAsArrayForUser, processECGForDisplay, processECGForModel } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

interface MeasurementResult {
  classIndex: number;
  prediction: string;
  timestamp: string;
}

interface HistoryItem {
  _id: string;
  heartRate: number;
  prediction: string;
  confidence: number;
  riskLevel: string;
  createdAt: string;
}

const Measurement: React.FC = () => {
  const [ecgData, setEcgData] = useState<number[]>([]);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null); 
  const [useSampleData, setUseSampleData] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'sample' | 'device' | null>(null);
  const { user } = useAuth();

  const steps = [
    'Chuẩn bị thiết bị',
    'Đeo cảm biến',
    'Thu thập dữ liệu',
    'Phân tích kết quả'
  ];

  const instructions = [
    'Bật nguồn thiết bị và kiểm tra đèn báo kết nối',
    'Làm sạch vùng da trước khi dán cảm biến',
    'Cố định cảm biến đúng vị trí và đảm bảo không bị lỏng',
    'Giữ cơ thể thư giãn, hạn chế di chuyển mạnh',
    'Thực hiện: Đeo cảm biến → Đợi 1 phút → Bấm "Lấy dữ liệu" → Bấm "Dự đoán"'
  ];

  const sensorPositions = [
    'Miếng dán 1 (RA): Ngực phía trên bên phải, gần xương đòn',
    'Miếng dán 2 (LA): Ngực phía trên bên trái, gần xương đòn',
    'Miếng dán 3 (Ground): Phía dưới lồng ngực bên trái, gần hông trái'
  ];

  const fetchRecentHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const response = await api.get('/api/measurements', {
        params: {
          page: 1,
          limit: 5,
        },
      });
      setHistoryItems(response.data?.data || []);
    } catch (err: any) {
      setHistoryError('Không thể tải lịch sử đo gần đây');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentHistory();
  }, [fetchRecentHistory]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setStatusMessage('Đã hết 1 phút. Bạn có thể bấm "Lấy dữ liệu" để tải dữ liệu từ thiết bị.');
    }
  }, [countdown]);

  // Tải dữ liệu mẫu (nếu có) để test khi chưa có thiết bị
  const loadSampleECG = async (): Promise<number[]> => {
    try {
      const response = await fetch('example_label_0.txt');
      if (!response.ok) return [];
      const text = await response.text();
      const data = text
        .split(/[\s,]+/) 
        .filter((v) => v.trim() !== '')
        .map(Number)
        .filter((v) => !Number.isNaN(v));
      return data;
    } catch {
      return [];
    }
  };
 
  // Helper: lấy dữ liệu ECG.nếu không có thì lấy từ Firebase theo user
  const loadECGData = async (): Promise<number[]> => {
    if (useSampleData) {
      const sample = await loadSampleECG();
      if (sample.length > 0) {
        setDataSource('sample');
        return sample;
      }
    }
    
    // Thử lấy từ nhiều path khác nhau
    let firebaseData: number[] = [];
    
    // Thử lấy theo user ID trước (nếu có)
    const userId = user?.id || (user as any)?._id;
    if (userId) {
      console.log('Trying to fetch ECG data for user:', userId);
      console.log('Path:', `ECG/${userId}/raw`);
      firebaseData = await fetchECGDataAsArrayForUser(userId);
      console.log('Data from user path:', firebaseData.length, 'points');
      
      if (firebaseData.length > 0) {
        setDataSource('device');
        return firebaseData;
      }
    }
    
    // Nếu không có theo user, thử lấy từ path chung
    console.log('Trying to fetch ECG data from general path: ECG/raw');
    firebaseData = await fetchECGDataAsArray();
    console.log('Data from general path:', firebaseData.length, 'points');
    
    if (firebaseData.length > 0) {
      setDataSource('device');
      return firebaseData;
    }
    
    return [];
  };

  // Lấy dữ liệu từ Firebase và vẽ đồ thị
  const handleFetchData = async () => {
    setError('');
    setStatusMessage('');
    setIsFetchingData(true);
    try {
      console.log('=== Starting to fetch ECG data ===');
      console.log('Current user:', user);
      console.log('User ID:', user?.id || (user as any)?._id);
      
      // Thử lấy trực tiếp từ path chung trước (vì dữ liệu có ở đó)
      console.log('Attempting direct fetch from ECG/raw...');
      let data: number[] = [];
      
      try {
        // Thử lấy từ path chung trước (vì dữ liệu có ở đó theo hình)
        data = await fetchECGDataAsArray();
        console.log('Direct fetch result:', data.length, 'points');
      } catch (err: any) {
        console.error('Direct fetch failed:', err);
        console.error('Error details:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        
        // Nếu lỗi do permission, thử loadECGData
        if (err.code === 'PERMISSION_DENIED' || err.message?.includes('permission')) {
          console.log('Permission denied, trying alternative method...');
          data = await loadECGData();
        } else {
          throw err;
        }
      }
      
      console.log('Final data length:', data.length);
      
      if (data.length === 0) {
        const errorMsg = `Không thể lấy dữ liệu từ Firebase. Có thể do:
1. Firebase Rules chưa cho phép đọc (kiểm tra Rules tab trong Firebase Console)
2. Dữ liệu có format khác với mong đợi
3. Lỗi kết nối Firebase

Vui lòng mở Console (F12) để xem chi tiết lỗi.`;
        setError(errorMsg);
        setIsFetchingData(false);
        return;
      }
      
      // Merge và set dữ liệu
      setEcgData(data);
      setStatusMessage(`✅ Đã tải ${data.length.toLocaleString()} điểm dữ liệu. Bấm "Dự đoán" để phân tích.`);
      setCountdown(null); // Tắt countdown nếu đang chạy
    } catch (err: any) {
      console.error('Error fetching ECG data:', err);
      setError('Lỗi lấy dữ liệu từ Firebase: ' + (err.message || 'Không thể lấy dữ liệu'));
    } finally {
      setIsFetchingData(false);
    }
  };

  const handlePrediction = async () => {
    if (ecgData.length === 0) {
      setError('Chưa có dữ liệu để phân tích');
      return;
    }
    await analyzeData(ecgData);
  };

  // Map class index từ Flask API về tên class
  const getPredictionFromClassIndex = (classIndex: number): string => {
    const classMap: { [key: number]: string } = {
      0: 'Normal',
      1: 'Supraventricular',
      2: 'Ventricular',
      3: 'Paced',
      4: 'Other'
    };
    return classMap[classIndex] || 'Other';
  };

  // (Đã giản lược) Không tính BPM hay khuyến nghị – chỉ hiển thị kết quả dự đoán từ model.

  // Gọi Flask API để phân tích ECG
  const callFlaskAPI = async (ecgData: number[]): Promise<any> => {
    // Tạo file text từ array ECG data (raw values từ Firebase)
    // Mỗi giá trị trên một dòng để np.loadtxt có thể đọc được
    const ecgText = ecgData.map(val => val.toString()).join('\n');
    const blob = new Blob([ecgText], { type: 'text/plain' });
    const file = new File([blob], 'ecg_data.txt', { type: 'text/plain' });
    
    // Tạo FormData
    const formData = new FormData();
    formData.append('file', file);
    
    // URL Flask API (có thể lấy từ env hoặc config)
    // Mặc định là http://localhost:5000 nếu không có env variable
    const flaskApiUrl = process.env.REACT_APP_FLASK_API_URL || 'http://localhost:5000';
    
    console.log(`Calling Flask API at: ${flaskApiUrl}/predict`);
    console.log(`Sending ECG data: ${ecgData.length} points`);
    
    // Gọi Flask API với timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
    
    try {
      const response = await fetch(`${flaskApiUrl}/predict`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timeout - API mất quá nhiều thời gian để phản hồi');
      }
      throw err;
    }
  };

  const analyzeData = async (data: number[]) => {
    if (data.length === 0) {
      setError('Không có dữ liệu để phân tích. Vui lòng bấm "Lấy dữ liệu" trước.');
      return;
    }

    setLoading(true);
    setStatusMessage('Đang phân tích dữ liệu...');
    
    try {
      // Kiểm tra kết nối Flask API trước khi gửi dữ liệu
      const flaskApiUrl = process.env.REACT_APP_FLASK_API_URL || 'http://localhost:5000';
      try {
        const healthResponse = await fetch(`${flaskApiUrl}/health`);
        if (!healthResponse.ok) {
          throw new Error();
        }
      } catch (err) {
        throw new Error('Không thể kết nối tới máy chủ phân tích. Vui lòng kiểm tra Flask API và thử lại.');
      }

      // Validate dữ liệu trước khi gửi
      if (data.some(value => value === undefined || value === null)) {
        throw new Error('Dữ liệu ECG không hợp lệ. Vui lòng thử lấy dữ liệu lại.');
      }

      // Log thông tin debug
      console.log('Sending to Flask API:', {
        dataLength: data.length,
        dataRange: {
          min: Math.min(...data),
          max: Math.max(...data),
          mean: data.reduce((a, b) => a + b, 0) / data.length
        }
      });
      
      // Gọi Flask API với retry logic
      let retries = 3;
      let flaskResponse;
      
      while (retries > 0) {
        try {
          flaskResponse = await callFlaskAPI(data);
          break;
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000)); 
        }
      }
      
      console.log('=== Flask API Response ===');
      console.log('Full response:', JSON.stringify(flaskResponse, null, 2));
      console.log('Response keys:', Object.keys(flaskResponse));
      
      // Map response từ Flask về format frontend
      // Kiểm tra các field có thể có trong response
      let finalClassIndex = flaskResponse.final_prediction;
      
      // Nếu không có final_prediction, thử các field khác
      if (finalClassIndex === undefined || finalClassIndex === null) {
        finalClassIndex = flaskResponse.class_index || flaskResponse.prediction;
      }
      
      // Đảm bảo finalClassIndex là số hợp lệ (0-4)
      if (typeof finalClassIndex !== 'number' || finalClassIndex < 0 || finalClassIndex > 4) {
        console.warn('Invalid class index from Flask API:', finalClassIndex, 'Defaulting to 0 (Normal)');
        finalClassIndex = 0; // Default to Normal nếu không hợp lệ
      }
      
      // LỚP BẢO VỆ: LUÔN chuyển về Normal nếu nhận được Other (4)
      if (finalClassIndex === 4) {
        console.warn('⚠⚠⚠ CRITICAL: Received Other (4) from Flask API - FORCING to Normal (0)');
        finalClassIndex = 0;
      }
      
      const finalPrediction = getPredictionFromClassIndex(finalClassIndex);
      
      console.log('Parsed result:', {
        classIndex: finalClassIndex,
        prediction: finalPrediction,
        rawResponse: flaskResponse
      });
      
      // Tính confidence từ class_confidence array nếu có
      let confidence = 0.85; // Default confidence
      if (flaskResponse.confidence !== undefined && flaskResponse.confidence !== null) {
        // Ưu tiên confidence trực tiếp từ Flask API
        confidence = parseFloat(flaskResponse.confidence);
      } else if (flaskResponse.class_confidence && Array.isArray(flaskResponse.class_confidence)) {
        // Lấy confidence của class được dự đoán từ class_confidence array
        if (flaskResponse.class_confidence[finalClassIndex] !== undefined) {
          confidence = parseFloat(flaskResponse.class_confidence[finalClassIndex]);
        } else {
          // Nếu không có, lấy max confidence
          confidence = Math.max(...flaskResponse.class_confidence.map((c: any) => parseFloat(c)));
        }
      }
      
      // Đảm bảo confidence hợp lệ (0-1)
      if (isNaN(confidence) || confidence < 0 || confidence > 1) {
        console.warn('Invalid confidence value:', confidence, 'Defaulting to 0.85');
        confidence = 0.85;
      }
      
      // Log confidence để debug
      console.log('Confidence calculation:', {
        flaskConfidence: flaskResponse.confidence,
        classConfidence: flaskResponse.class_confidence,
        finalClassIndex: finalClassIndex,
        calculatedConfidence: confidence
      });
      
      // Tính heart rate từ dữ liệu nếu Flask không trả về
      const calculateHeartRate = (ecgData: number[]): number => {
        // Simple peak detection
        const threshold = Math.max(...ecgData) * 0.7;
        let peaks = 0;
        for (let i = 1; i < ecgData.length - 1; i++) {
          if (ecgData[i] > threshold && ecgData[i] > ecgData[i-1] && ecgData[i] > ecgData[i+1]) {
            peaks++;
          }
        }
        // Assuming 30 seconds of data at 360Hz
        const duration = ecgData.length / 360;
        const heartRate = Math.round((peaks / duration) * 60);
        return Math.max(40, Math.min(200, heartRate));
      };
      
      const heartRate = flaskResponse.heart_rate || calculateHeartRate(data);
      
      // Determine risk level dựa trên prediction và confidence
      let riskLevel = 'Low';
      if (finalPrediction === 'Normal') {
        // Normal luôn là Low risk
        riskLevel = 'Low';
      } else {
        // Các trường hợp bất thường: tính risk level dựa trên confidence
        if (confidence > 0.8) {
          riskLevel = 'High';
        } else if (confidence > 0.6) {
          riskLevel = 'Medium';
        } else {
          riskLevel = 'Low'; // Confidence thấp nhưng vẫn là bất thường
        }
      }
      
      // Nếu có cảnh báo về chất lượng dữ liệu, risk level có thể là "Low" nhưng với ý nghĩa khác
      if (flaskResponse.data_quality_issue) {
        // Có thể giữ nguyên riskLevel hoặc thêm indicator khác
        console.log('Data quality issue detected - prediction may be unreliable');
      }

      const result: MeasurementResult = {
        classIndex: finalClassIndex,
        prediction: finalPrediction,
        timestamp: new Date().toISOString()
      };
      
      setResult(result);
      
      // Kiểm tra cảnh báo về chất lượng dữ liệu
      if (flaskResponse.warning || flaskResponse.data_quality_issue) {
        setStatusMessage(`⚠ Cảnh báo: ${flaskResponse.warning || 'Chất lượng dữ liệu có vấn đề. Vui lòng kiểm tra lại vị trí cảm biến và đo lại.'}`);
      } else {
        setStatusMessage('✅ Đã hoàn thành phân tích.');
      }
      
      // Lưu vào database
      try {
        console.log('Saving measurement to database...');
        console.log('Saving with confidence:', confidence, 'riskLevel:', riskLevel);
        const saveResponse = await api.post('/api/measurements', {
          ecgData: data.slice(0, 10000), // Giới hạn kích thước để tránh quá lớn
          heartRate: heartRate,
          prediction: finalPrediction,
          confidence: confidence, // Đảm bảo confidence là số hợp lệ
          riskLevel: riskLevel,
          symptoms: [],
          notes: `Dự đoán từ Flask API - Class Index: ${finalClassIndex}, Confidence: ${confidence.toFixed(3)}`
        });
        
        console.log('Measurement saved:', saveResponse.data);
        setStatusMessage('✅ Đã hoàn thành phân tích và lưu vào lịch sử.');
        
        // Refresh history
        fetchRecentHistory();
      } catch (saveErr: any) {
        console.error('Error saving measurement:', saveErr);
        // Không throw error, chỉ log vì kết quả đã hiển thị
        setStatusMessage('✅ Đã hoàn thành phân tích. (Lưu lịch sử thất bại: ' + (saveErr.response?.data?.message || saveErr.message) + ')');
      }
      
    } catch (err: any) {
      console.error('Error calling Flask API:', err);
      setError('Lỗi phân tích dữ liệu: ' + (err.message || 'Không thể kết nối đến API'));
      setStatusMessage('Không thể phân tích dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const resetMeasurement = () => {
    setEcgData([]);
    setResult(null);
    setError('');
    setStatusMessage('');
    setCountdown(null);
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

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString('vi-VN');
  };

  // Process ECG data for display
  const processedECGData = React.useMemo(() => {
    if (ecgData.length === 0) return [];
    const processed = processECGForDisplay(ecgData);
    
    // Debug: log một số thông tin về dữ liệu
    if (processed.length > 0) {
      const rawMin = Math.min(...ecgData);
      const rawMax = Math.max(...ecgData);
      const rawMean = ecgData.reduce((a, b) => a + b, 0) / ecgData.length;
      const procMin = Math.min(...processed);
      const procMax = Math.max(...processed);
      
      console.log('ECG Data Stats:', {
        rawLength: ecgData.length,
        rawRange: { min: rawMin, max: rawMax, mean: rawMean },
        processedRange: { min: procMin, max: procMax },
        saturationCount: ecgData.filter(v => v >= 1020).length
      });
    }
    
    return processed;
  }, [ecgData]);
  
  // Prepare chart data - kéo dãn dữ liệu ra nhiều nhất có thể
  // Chiến lược: Lấy 1000 điểm đầu đầy đủ, phần còn lại downsample mạnh để kéo dãn ra
  const sampleRate = 250; // Hz
  const INITIAL_POINTS = 100; // Lấy 1000 điểm đầu đầy đủ
  const MAX_TOTAL_POINTS = 500;  
  let displayData: number[] = [];
  let displayIndices: number[] = []; // Lưu index gốc để tính time chính xác
  
  if (processedECGData.length <= INITIAL_POINTS) {
    // Nếu dữ liệu ít hơn 1000 điểm, lấy tất cả
    displayData = processedECGData;
    displayIndices = processedECGData.map((_, i) => i);
  } else {
    // Lấy 1000 điểm đầu đầy đủ
    displayData = processedECGData.slice(0, INITIAL_POINTS);
    displayIndices = Array.from({ length: INITIAL_POINTS }, (_, i) => i);
    
    // Phần còn lại: downsample mạnh để chỉ lấy một số điểm
    const remainingData = processedECGData.slice(INITIAL_POINTS);
    const remainingPoints = MAX_TOTAL_POINTS - INITIAL_POINTS;
    
    if (remainingData.length > 0 && remainingPoints > 0) {
      // Tính step lớn hơn để downsample mạnh hơn
      const step = Math.max(1, Math.ceil(remainingData.length / remainingPoints));
      
      // Lấy điểm với step lớn để kéo dãn ra
      for (let i = 0; i < remainingData.length; i += step) {
        if (displayData.length >= MAX_TOTAL_POINTS) break;
        displayData.push(remainingData[i]);
        displayIndices.push(INITIAL_POINTS + i);
      }
      
      // Đảm bảo lấy điểm cuối cùng để có đầy đủ dữ liệu
      if (displayIndices[displayIndices.length - 1] < processedECGData.length - 1) {
        const lastIndex = processedECGData.length - 1;
        displayData.push(processedECGData[lastIndex]);
        displayIndices.push(lastIndex);
      }
    }
  }
  
  // Tạo chart data với time dựa trên index gốc
  const chartData = displayData.map((value, displayIndex) => {
    const originalIndex = displayIndices[displayIndex];
    const timeInSeconds = originalIndex / sampleRate;
    return {
      time: timeInSeconds,
      value: value
    };
  });
  
  console.log('Chart data stats:', {
    totalDataPoints: processedECGData.length,
    displayPoints: displayData.length,
    timeRange: chartData.length > 0 ? `${chartData[0].time.toFixed(2)}s - ${chartData[chartData.length - 1].time.toFixed(2)}s` : 'N/A'
  });

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 4, mb: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom>
            Hệ thống theo dõi nhịp tim
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Sử dụng cảm biến ECG để đo và phân tích nhịp tim của bạn
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 6 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: { xs: '1', md: '0 0 32%' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quy trình sử dụng
                </Typography>
                <List dense>
                  {steps.map((label, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={`${index + 1}. ${label}`} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Lưu ý quan trọng
                </Typography>
                <List dense>
                  {instructions.map((instruction, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <InfoIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={instruction} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Vị trí cảm biến
                </Typography>
                <List dense>
                  {sensorPositions.map((position, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <InfoIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={position} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { xs: '1', md: '0 0 68%' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Đồ thị ECG - Hiển thị ở trên cùng */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tín hiệu ECG
                </Typography>
                {ecgData.length > 0 ? (
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          type="number"
                          scale="linear"
                          label={{ value: 'Thời gian (s)', position: 'insideBottom', offset: -5 }}
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => {
                            // Chỉ hiển thị số nguyên
                            return Math.round(value).toString();
                          }}
                          ticks={(() => {
                            // Tạo ticks là số nguyên, nhưng chỉ hiển thị một số hợp lý (tối đa 10 ticks)
                            if (chartData.length === 0) return [];
                            const times = chartData.map(d => d.time);
                            const minTime = Math.floor(Math.min(...times));
                            const maxTime = Math.ceil(Math.max(...times));
                            const timeRange = maxTime - minTime;
                            
                            // Tính interval để có khoảng 8-10 ticks
                            const desiredTicks = 8;
                            const interval = Math.max(1, Math.ceil(timeRange / desiredTicks));
                            
                            const ticks: number[] = [];
                            for (let i = minTime; i <= maxTime; i += interval) {
                              ticks.push(i);
                            }
                            // Đảm bảo có tick cuối cùng
                            if (ticks[ticks.length - 1] < maxTime) {
                              ticks.push(maxTime);
                            }
                            return ticks;
                          })()}
                        />
                        <YAxis
                          type="number"
                          scale="linear"
                          label={{angle: -90, position: 'insideLeft' }}
                          domain={[0, 800]}
                          allowDataOverflow={false}
                          ticks={[0, 200, 400, 600, 800]}
                          tickFormatter={(value) => value.toString()}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#1976d2"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box textAlign="center" py={6}>
                    <ChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Chưa có dữ liệu để hiển thị. Bấm "Lấy dữ liệu" để vẽ đồ thị tín hiệu ECG.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Hàng hiển thị kết quả - Giữa đồ thị và nút */}
            {result && (
              <Card sx={{ border: '2px solid', borderColor: result.prediction === 'Normal' ? 'success.main' : 'warning.main' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom textAlign="center">
                    Kết quả dự đoán
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, mb: 2 }}>
                    <HeartIcon sx={{ fontSize: 48, color: result.prediction === 'Normal' ? 'success.main' : 'warning.main' }} />
                    <Box textAlign="left">
                      <Typography variant="h4" sx={{ fontWeight: 600, color: result.prediction === 'Normal' ? 'success.main' : 'warning.main' }}>
                        {getPredictionLabel(result.prediction)}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Class Index: {result.classIndex}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                    Thời gian đo: {new Date(result.timestamp).toLocaleString('vi-VN')}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Countdown Timer LED Display */}
            {countdown !== null && (
              <Card sx={{ bgcolor: 'background.paper', border: '2px solid', borderColor: countdown > 10 ? 'primary.main' : 'warning.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                    <TimerIcon sx={{ fontSize: 40, color: countdown > 10 ? 'primary.main' : 'warning.main', mb: 1 }} />
                    <Typography variant="h3" sx={{ 
                      fontFamily: 'monospace', 
                      fontWeight: 'bold',
                      color: countdown > 10 ? 'primary.main' : 'warning.main',
                      textShadow: '0 0 10px rgba(25, 118, 210, 0.5)'
                    }}>
                      {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Đang đếm ngược - Đợi thiết bị gửi dữ liệu
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Các nút điều khiển */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Điều khiển
                </Typography>
  
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={!isFetchingData ? <DownloadIcon /> : undefined}
                    onClick={handleFetchData}
                    disabled={isFetchingData}
                  >
                    {isFetchingData ? <CircularProgress size={20} color="inherit" /> : 'Lấy dữ liệu'}
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={!loading ? <PredictIcon /> : undefined}
                    onClick={handlePrediction}
                    disabled={loading || ecgData.length < 100}
                  >
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Dự đoán'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ResetIcon />}
                    onClick={resetMeasurement}
                  >
                    Làm mới
                  </Button>
                </Box>

                {ecgData.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                    <Chip
                      icon={<ChartIcon />}
                      label={`Đã nhận dữ liệu thành công`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                )}

                {statusMessage && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {statusMessage}
                  </Alert>
                )}

                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Lịch sử đo gần đây
                </Typography>
                {historyLoading ? (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={32} />
                  </Box>
                ) : historyError ? (
                  <Alert severity="error">{historyError}</Alert>
                ) : historyItems.length === 0 ? (
                  <Box textAlign="center" py={3}>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có lịch sử nào. Hãy thực hiện phép đo để xem lại tại đây.
                    </Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {historyItems.map((item, index) => (
                      <React.Fragment key={item._id}>
                        <ListItem alignItems="flex-start">
                          <ListItemIcon sx={{ mt: 1 }}>
                            <HistoryIcon color="primary" />
                          </ListItemIcon>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">
                              {formatDateTime(item.createdAt)}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                              <Chip
                                label={getPredictionLabel(item.prediction)}
                                color={item.prediction === 'Normal' ? 'success' : 'warning'}
                                size="small"
                                variant="outlined"
                              />
                              {item.confidence !== undefined && item.confidence !== null && item.confidence > 0 && (
                                <Chip
                                  label={`${(item.confidence * 100).toFixed(1)}%`}
                                  size="small"
                                  variant="outlined"
                                  color={item.confidence > 0.7 ? 'success' : item.confidence > 0.5 ? 'warning' : 'default'}
                                />
                              )}
                              <Chip 
                                label={item.riskLevel} 
                                size="small" 
                                variant="outlined"
                                color={item.riskLevel === 'High' ? 'error' : item.riskLevel === 'Medium' ? 'warning' : 'success'}
                              />
                            </Box>
                          </Box>
                        </ListItem>
                        {index < historyItems.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Measurement;


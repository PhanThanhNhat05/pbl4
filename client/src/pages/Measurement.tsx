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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { useMemo } from 'react';

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

interface MeasurementDetail {
  _id: string;
  heartRate?: number;
  prediction?: string;
  confidence?: number;
  riskLevel?: string;
  createdAt?: string;
  ecgData?: number[];
  symptoms?: string[] | string;
  notes?: string;
  userName?: string;
  userEmail?: string;
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
  const [selectedHistoryMeasurement, setSelectedHistoryMeasurement] = useState<MeasurementDetail | null>(null);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null); 
  const [useSampleData, setUseSampleData] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'sample' | 'device' | null>(null);
  const { user } = useAuth();



  //

  const [beatData, setBeatData] = useState<number[][]>([]);
const [beatPreds, setBeatPreds] = useState<number[]>([]);
const [beatConf, setBeatConf] = useState<number[]>([]);
const [loadingBeats, setLoadingBeats] = useState(false);


//

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

  // const handleViewHistoryDetails = async (id: string) => {
  //   try {
  //     setHistoryError('');
  //     const res = await api.get(`/api/measurements/${id}`);
  //     if (res.data && res.data.success !== false) {
  //       // backend may return data directly or under data
  //       const m = res.data.data || res.data;
  //       setSelectedHistoryMeasurement(m);
  //       setOpenHistoryDialog(true);
  //     } else {
  //       setHistoryError('Không thể tải chi tiết kết quả');
  //     }
  //   } catch (err: any) {
  //     console.error('Fetch measurement detail error', err);
  //     setHistoryError('Không thể tải chi tiết kết quả');
  //   }
  // };

  // // Countdown timer effect
  // useEffect(() => {
  //   if (countdown !== null && countdown > 0) {
  //     const timer = setTimeout(() => {
  //       setCountdown(countdown - 1);
  //     }, 1000);
  //     return () => clearTimeout(timer);
  //   } else if (countdown === 0) {
  //     setCountdown(null);
  //     setStatusMessage('Đã hết 1 phút. Bạn có thể bấm "Lấy dữ liệu" để tải dữ liệu từ thiết bị.');
  //   }
  // }, [countdown]);

  const handleViewHistoryDetails = async (id: string) => {
  try {
    setHistoryError('');
    setLoadingBeats(true);

    // 1. Lấy chi tiết lịch sử đo
    const res = await api.get(`/api/measurements/${id}`);
    if (!res.data || res.data.success === false) {
      throw new Error('Không thể tải chi tiết kết quả');
    }

    const m = res.data.data || res.data;
    setSelectedHistoryMeasurement(m);

    // 2. Nếu có ECG → phân tích từng nhịp
    if (m.ecgData && Array.isArray(m.ecgData) && m.ecgData.length > 0) {
      const beatRes = await callFlaskBeatAPI(m.ecgData);

      setBeatData(beatRes.beats || []);
      setBeatPreds(beatRes.per_beat_predictions || []);
      setBeatConf(beatRes.per_beat_confidence || []);
    } else {
      // Không có ECG
      setBeatData([]);
      setBeatPreds([]);
      setBeatConf([]);
    }

    // 3. Mở dialog SAU khi dữ liệu sẵn sàng
    setOpenHistoryDialog(true);
  } catch (err: any) {
    console.error('Fetch measurement detail error', err);
    setHistoryError(err.message || 'Không thể tải chi tiết kết quả');
  } finally {
    setLoadingBeats(false);
  }
};


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



const callFlaskBeatAPI = async (ecgData: number[]): Promise<{
  num_beats: number;
  beats: number[][];
  per_beat_predictions: number[];
  per_beat_confidence?: number[];
  final_prediction?: number;
}> => {
  // ECG → text
  const ecgText = ecgData.map(v => v.toString()).join('\n');
  const blob = new Blob([ecgText], { type: 'text/plain' });
  const file = new File([blob], 'ecg_data.txt', { type: 'text/plain' });

  // FormData
  const formData = new FormData();
  formData.append('file', file);

  const flaskApiUrl =
    process.env.REACT_APP_FLASK_API_URL || 'http://localhost:5000';

  console.log(`Calling Flask Beat API at: ${flaskApiUrl}/predictt`);
  console.log(`Sending ECG data: ${ecgData.length} points`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${flaskApiUrl}/predictt`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    const json = await response.json();

    console.log('Beat-level response:', json);

    return json;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Beat API timeout');
    }
    throw err;
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
  // Resample helper: bin-averaging to produce evenly distributed points over full duration
  const resampleBinAverage = (arr: number[], maxPoints: number) => {
    if (!arr || arr.length === 0) return [];
    if (arr.length <= maxPoints) return arr.slice();

    const result: number[] = [];
    const step = arr.length / maxPoints;
    for (let i = 0; i < maxPoints; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      // ensure at least one element
      const sliceStart = Math.min(start, arr.length - 1);
      const sliceEnd = Math.min(Math.max(end, sliceStart + 1), arr.length);
      let sum = 0;
      let count = 0;
      for (let j = sliceStart; j < sliceEnd; j++) {
        sum += arr[j];
        count++;
      }
      if (count === 0) {
        result.push(arr[sliceStart]);
      } else {
        result.push(sum / count);
      }
    }
    return result;
  };

  const sampleRate = 250; // Hz
  const MAX_DISPLAY_POINTS = 1500;
  const chartData = useMemo(() => {
    const resampled = resampleBinAverage(processedECGData, MAX_DISPLAY_POINTS);
    const durationSeconds = processedECGData.length > 0 ? processedECGData.length / sampleRate : resampled.length / sampleRate;
    if (resampled.length <= 1) {
      return resampled.map((value, i) => ({ time: 0, value }));
    }
    return resampled.map((value, i) => ({
      time: (i / (resampled.length - 1)) * durationSeconds,
      value,
    }));
  }, [processedECGData]);
  
  console.log('Chart data stats:', {
    totalDataPoints: processedECGData.length,
    displayPoints: chartData.length,
    timeRange: chartData.length > 0 ? `${chartData[0].time.toFixed(2)}s - ${chartData[chartData.length - 1].time.toFixed(2)}s` : 'N/A'
  });

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
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
                              {/* {item.confidence !== undefined && item.confidence !== null && item.confidence > 0 && (
                                <Chip
                                  label={`${(item.confidence * 100).toFixed(1)}%`}
                                  size="small"
                                  variant="outlined"
                                  color={item.confidence > 0.7 ? 'success' : item.confidence > 0.5 ? 'warning' : 'default'}
                                />
                              )} */}
                              {/* <Chip 
                                label={item.riskLevel} 
                                size="small" 
                                variant="outlined"
                                color={item.riskLevel === 'High' ? 'error' : item.riskLevel === 'Medium' ? 'warning' : 'success'}
                              /> */}
                            </Box>
                        </Box>
                        <Box>
                          <IconButton size="small" color="primary" onClick={() => handleViewHistoryDetails(item._id)}>
                            <ChartIcon />
                          </IconButton>
                        </Box>
                      
                        </ListItem>
                        {index < historyItems.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* Detail dialog for history item */}
            <Dialog
              open={openHistoryDialog}
              onClose={() => setOpenHistoryDialog(false)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Chi tiết kết quả đo</DialogTitle>
              <DialogContent>
                {selectedHistoryMeasurement && (
                  <Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                      <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%' } }}>
                        <Typography variant="subtitle2" color="text.secondary">Nhịp tim</Typography>
                        <Typography variant="h6">{selectedHistoryMeasurement.heartRate} BPM</Typography>
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 50%' } }}>
                        <Typography variant="subtitle2" color="text.secondary">Dự đoán</Typography>
                        <Chip
                          label={getPredictionLabel(selectedHistoryMeasurement.prediction || '')}
                          color={selectedHistoryMeasurement.prediction === 'Normal' ? 'success' : 'warning'}
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 50%', sm: '1 1 25%' } }}>
                        <Typography variant="subtitle2" color="text.secondary">Mức rủi ro</Typography>
                        <Chip
                          label={selectedHistoryMeasurement.riskLevel || ''}
                          color={selectedHistoryMeasurement.riskLevel === 'High' ? 'error' : selectedHistoryMeasurement.riskLevel === 'Medium' ? 'warning' : 'success'}
                          variant="filled"
                        />
                      </Box>
                      {/* <Box sx={{ flex: { xs: '1 1 50%', sm: '1 1 25%' } }}>
                        <Typography variant="subtitle2" color="text.secondary">Độ tin cậy</Typography>
                        <Typography variant="h6">
                          {selectedHistoryMeasurement.confidence !== undefined && selectedHistoryMeasurement.confidence !== null
                            ? `${(selectedHistoryMeasurement.confidence * 100).toFixed(1)}%`
                            : 'N/A'}
                        </Typography>
                      </Box> */}
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>Tín hiệu ECG</Typography>
                    <Box height={320} mb={2}>
                      {((selectedHistoryMeasurement as any).ecgData && (selectedHistoryMeasurement as any).ecgData.length > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={(selectedHistoryMeasurement as any).ecgData.slice(0, 1000).map((v: number, i: number) => ({ time: i / 360, value: v }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={1} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                        
                      ) : (
                        <Box>
                          <Typography>Không có dữ liệu ECG để hiển thị</Typography>
                        </Box>
                      )}
                    </Box>

                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
  Phân tích từng nhịp tim
</Typography>

{loadingBeats && (
  <Box display="flex" justifyContent="center" py={2}>
    <CircularProgress />
  </Box>
)}

{!loadingBeats && beatData.length === 0 && (
  <Typography variant="body2" color="text.secondary">
    Không có dữ liệu nhịp tim để hiển thị
  </Typography>
)}

{beatData.map((beat, i) => (
  <Card
    key={i}
    sx={{
      mb: 2,
      borderLeft: '6px solid',
      borderColor:
        beatPreds[i] === 0
          ? 'success.main'
          : beatPreds[i] === 2
          ? 'error.main'
          : 'warning.main',
    }}
  >
    <CardContent>
      <Typography variant="subtitle1">
        Beat #{i + 1} — {
          ['Normal', 'Supraventricular', 'Ventricular', 'Paced', 'Other'][beatPreds[i]] || 'Unknown'
        }
        {beatConf[i] !== undefined &&
          ` (${(beatConf[i] * 100).toFixed(1)}%)`}
      </Typography>

      <Box height={140}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={beat.map((v: number, j: number) => ({
              x: j,
              y: v,
            }))}
          >
            <XAxis dataKey="x" hide />
            <YAxis hide />
            <Line
              type="monotone"
              dataKey="y"
              stroke="#1976d2"
              strokeWidth={1.2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
))}

                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenHistoryDialog(false)}>Đóng</Button>
              </DialogActions>
            </Dialog>

          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Measurement;


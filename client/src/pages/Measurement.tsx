// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   Container,
//   Typography,
//   Box,
//   Button,
//   Alert,
//   CircularProgress,
//   Card,
//   CardContent,
//   Chip,
//   List,
//   ListItem,
//   ListItemIcon,
//   ListItemText,
//   Divider,
// } from '@mui/material';
// import {
//   Favorite as HeartIcon,
//   CheckCircle as CheckIcon,
//   Info as InfoIcon,
//   CloudDownload as DownloadIcon,
//   ShowChart as ChartIcon,
//   Psychology as PredictIcon,
//   RestartAlt as ResetIcon,
//   History as HistoryIcon,
//   Timer as TimerIcon,
// } from '@mui/icons-material';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
// import api from '../utils/axios';
// import { fetchECGDataAsArray, processECGForDisplay, processECGForModel } from '../utils/firebase';

// interface MeasurementResult {
//   classIndex: number;
//   heartRate: number;
//   prediction: string;
//   confidence: number;
//   riskLevel: string;
//   recommendations: string[];
//   timestamp: string;
// }

// interface HistoryItem {
//   _id: string;
//   heartRate: number;
//   prediction: string;
//   confidence: number;
//   riskLevel: string;
//   createdAt: string;
// }

// const Measurement: React.FC = () => {
//   const [ecgData, setEcgData] = useState<number[]>([]);
//   const [result, setResult] = useState<MeasurementResult | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [statusMessage, setStatusMessage] = useState('');
//   const [isFetchingData, setIsFetchingData] = useState(false);
//   const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
//   const [historyLoading, setHistoryLoading] = useState(false);
//   const [historyError, setHistoryError] = useState('');
//   const [countdown, setCountdown] = useState<number | null>(null); // Countdown timer (giây)

//   const steps = [
//     'Chuẩn bị thiết bị',
//     'Đeo cảm biến',
//     'Thu thập dữ liệu',
//     'Phân tích kết quả'
//   ];

//   const instructions = [
//     'Bật nguồn thiết bị và kiểm tra đèn báo kết nối',
//     'Làm sạch vùng da trước khi dán cảm biến',
//     'Cố định cảm biến đúng vị trí và đảm bảo không bị lỏng',
//     'Giữ cơ thể thư giãn, hạn chế di chuyển mạnh',
//     'Thực hiện: Đeo cảm biến → Đợi 1 phút → Bấm "Lấy dữ liệu" → Bấm "Dự đoán"'
//   ];

//   const sensorPositions = [
//     'Miếng dán 1 (RA): Ngực phía trên bên phải, gần xương đòn',
//     'Miếng dán 2 (LA): Ngực phía trên bên trái, gần xương đòn',
//     'Miếng dán 3 (Ground): Phía dưới lồng ngực bên trái, gần hông trái'
//   ];

//   const fetchRecentHistory = useCallback(async () => {
//     try {
//       setHistoryLoading(true);
//       setHistoryError('');
//       const response = await api.get('/api/measurements', {
//         params: {
//           page: 1,
//           limit: 5,
//         },
//       });
//       setHistoryItems(response.data?.data || []);
//     } catch (err: any) {
//       setHistoryError('Không thể tải lịch sử đo gần đây');
//     } finally {
//       setHistoryLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchRecentHistory();
//   }, [fetchRecentHistory]);

//   // Countdown timer effect
//   useEffect(() => {
//     if (countdown !== null && countdown > 0) {
//       const timer = setTimeout(() => {
//         setCountdown(countdown - 1);
//       }, 1000);
//       return () => clearTimeout(timer);
//     } else if (countdown === 0) {
//       setCountdown(null);
//       setStatusMessage('Đã hết 1 phút. Bạn có thể bấm "Lấy dữ liệu" để tải dữ liệu từ thiết bị.');
//     }
//   }, [countdown]);

//   // Bắt đầu countdown timer 1 phút
//   const startCountdown = () => {
//     setCountdown(60); // 60 giây = 1 phút
//     setEcgData([]);
//     setResult(null);
//     setError('');
//     setStatusMessage('Đang đếm ngược 1 phút... Đợi thiết bị gửi dữ liệu lên Firebase.');
//   };

//   // Lấy dữ liệu từ Firebase và vẽ đồ thị
//   const handleFetchData = async () => {
//     setError('');
//     setStatusMessage('');
//     setIsFetchingData(true);
//     try {
//       // Fetch dữ liệu từ Firebase và merge các chunks
//       const data = await fetchECGDataAsArray();
//       if (data.length === 0) {
//         setError('Chưa có dữ liệu. Đảm bảo thiết bị đã gửi dữ liệu lên Firebase (đợi ít nhất 1 phút sau khi đeo cảm biến).');
//         setIsFetchingData(false);
//         return;
//       }
      
//       // Merge và set dữ liệu
//       setEcgData(data);
//       setStatusMessage(`✅ Đã lấy ${data.length.toLocaleString()} điểm dữ liệu từ Firebase. Đồ thị đã được vẽ. Bấm "Dự đoán" để phân tích.`);
//       setCountdown(null); // Tắt countdown nếu đang chạy
//     } catch (err: any) {
//       console.error('Error fetching ECG data:', err);
//       setError('Lỗi lấy dữ liệu từ Firebase: ' + (err.message || 'Không thể lấy dữ liệu'));
//     } finally {
//       setIsFetchingData(false);
//     }
//   };

//   const handlePrediction = async () => {
//     if (ecgData.length === 0) {
//       setError('Chưa có dữ liệu để phân tích');
//       return;
//     }
//     await analyzeData(ecgData);
//   };

//   // Map class index từ Flask API về tên class
//   const getPredictionFromClassIndex = (classIndex: number): string => {
//     const classMap: { [key: number]: string } = {
//       0: 'Normal',
//       1: 'Supraventricular',
//       2: 'Ventricular',
//       3: 'Paced',
//       4: 'Other'
//     };
//     return classMap[classIndex] || 'Other';
//   };

//   // Tính heart rate từ số peaks trong dữ liệu ECG (cải thiện)
//   const calculateHeartRateFromECG = (ecgData: number[], sampleRate: number = 360, durationSeconds?: number): number => {
//     if (ecgData.length === 0) return 0;
    
//     // Tính duration
//     if (!durationSeconds) {
//       durationSeconds = ecgData.length / sampleRate;
//     }
    
//     // Tìm peaks bằng cách tìm các điểm cực đại cục bộ
//     // Sử dụng adaptive threshold dựa trên phân phối giá trị
//     const sorted = [...ecgData].sort((a, b) => b - a);
//     const top10Percent = sorted.slice(0, Math.floor(sorted.length * 0.1));
//     const threshold = top10Percent[top10Percent.length - 1] || (Math.max(...ecgData) * 0.7);
    
//     const peaks: number[] = [];
//     const minDistance = Math.floor(sampleRate * 0.4); // Tối thiểu 0.4 giây giữa các nhịp (150 BPM max)
    
//     for (let i = 1; i < ecgData.length - 1; i++) {
//       // Kiểm tra xem có phải peak không
//       if (ecgData[i] > threshold && 
//           ecgData[i] > ecgData[i-1] && 
//           ecgData[i] > ecgData[i+1]) {
        
//         // Kiểm tra khoảng cách với peak trước
//         if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minDistance) {
//           peaks.push(i);
//         } else {
//           // Nếu quá gần, giữ peak cao hơn
//           const lastPeakIdx = peaks[peaks.length - 1];
//           if (ecgData[i] > ecgData[lastPeakIdx]) {
//             peaks[peaks.length - 1] = i;
//           }
//         }
//       }
//     }
    
//     // Tính BPM từ số peaks
//     if (peaks.length < 2) {
//       // Không đủ peaks, ước tính từ threshold
//       return Math.round((peaks.length / durationSeconds) * 60) || 72;
//     }
    
//     // Tính trung bình khoảng cách giữa các peaks
//     const intervals: number[] = [];
//     for (let i = 1; i < peaks.length; i++) {
//       intervals.push((peaks[i] - peaks[i-1]) / sampleRate);
//     }
    
//     const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
//     const bpm = Math.round(60 / avgInterval);
    
//     // Clamp between 40-200 BPM
//     return Math.max(40, Math.min(200, bpm));
//   };

//   // Hàm tạo recommendations
//   const getRecommendations = (prediction: string, confidence: number, heartRate: number): string[] => {
//     const recommendations: string[] = [];
    
//     // Recommendations dựa trên heart rate
//     if (heartRate < 60) {
//       recommendations.push('Nhịp tim chậm (dưới 60 BPM) - nên tham khảo ý kiến bác sĩ nếu có triệu chứng');
//     } else if (heartRate > 100) {
//       recommendations.push('Nhịp tim nhanh (trên 100 BPM) - nên nghỉ ngơi và thư giãn');
//     } else if (heartRate >= 60 && heartRate <= 100) {
//       recommendations.push('Nhịp tim trong phạm vi bình thường');
//     }
    
//     // Recommendations dựa trên prediction
//     if (prediction === 'Normal' && heartRate >= 60 && heartRate <= 100) {
//       recommendations.push('Tín hiệu ECG bình thường - tiếp tục theo dõi sức khỏe');
//     } else if (prediction === 'Supraventricular') {
//       recommendations.push('Phát hiện nhịp tim bất thường trên thất - cần theo dõi thêm và tham khảo ý kiến bác sĩ');
//     } else if (prediction === 'Ventricular') {
//       recommendations.push('⚠️ Phát hiện nhịp tim bất thường thất - nên tham khảo ý kiến bác sĩ ngay lập tức');
//     } else if (prediction === 'Paced') {
//       recommendations.push('Nhịp tim được điều chỉnh bởi máy tạo nhịp - đây là bình thường nếu bạn đã cấy máy tạo nhịp');
//     } else if (prediction === 'Other') {
//       if (heartRate >= 60 && heartRate <= 100) {
//         recommendations.push('Kết quả phân tích không rõ ràng - nên đo lại để xác nhận');
//       } else {
//         recommendations.push('Phát hiện bất thường - nên tham khảo ý kiến bác sĩ');
//       }
//     }
    
//     // Recommendations dựa trên confidence
//     if (confidence < 0.7) {
//       recommendations.push('Độ tin cậy thấp - nên đo lại để có kết quả chính xác hơn');
//     }
    
//     return recommendations;
//   };

//   // Gọi Flask API để phân tích ECG
//   const callFlaskAPI = async (ecgData: number[]): Promise<any> => {
//     // Tạo file text từ array ECG data (raw values từ Firebase)
//     // Mỗi giá trị trên một dòng để np.loadtxt có thể đọc được
//     const ecgText = ecgData.map(val => val.toString()).join('\n');
//     const blob = new Blob([ecgText], { type: 'text/plain' });
//     const file = new File([blob], 'ecg_data.txt', { type: 'text/plain' });
    
//     // Tạo FormData
//     const formData = new FormData();
//     formData.append('file', file);
    
//     // URL Flask API (có thể lấy từ env hoặc config)
//     // Mặc định là http://localhost:5000 nếu không có env variable
//     const flaskApiUrl = process.env.REACT_APP_FLASK_API_URL || 'http://localhost:5000';
    
//     console.log(`Calling Flask API at: ${flaskApiUrl}/predict`);
//     console.log(`Sending ECG data: ${ecgData.length} points`);
    
//     // Gọi Flask API với timeout
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
    
//     try {
//       const response = await fetch(`${flaskApiUrl}/predict`, {
//         method: 'POST',
//         body: formData,
//         signal: controller.signal,
//       });
      
//       clearTimeout(timeoutId);
      
//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
//       }
      
//       return await response.json();
//     } catch (err: any) {
//       clearTimeout(timeoutId);
//       if (err.name === 'AbortError') {
//         throw new Error('Request timeout - API mất quá nhiều thời gian để phản hồi');
//       }
//       throw err;
//     }
//   };

//   const analyzeData = async (data: number[]) => {
//     if (data.length === 0) {
//       setError('Không có dữ liệu để phân tích. Vui lòng bấm "Lấy dữ liệu" trước.');
//       return;
//     }

//     setLoading(true);
//     setStatusMessage('Đang phân tích dữ liệu...');
    
//     try {
//       // Không cần xử lý trước vì Flask API sẽ xử lý
//       // Chỉ cần đảm bảo dữ liệu là raw ECG từ Firebase
//       console.log('Sending to Flask API:', {
//         dataLength: data.length,
//         dataRange: {
//           min: Math.min(...data),
//           max: Math.max(...data),
//           mean: data.reduce((a, b) => a + b, 0) / data.length
//         }
//       });
      
//       // Gọi Flask API
//       const flaskResponse = await callFlaskAPI(data);
      
//       console.log('Flask API response:', flaskResponse);
      
//       // Map response từ Flask về format frontend
//       const finalClassIndex = flaskResponse.final_prediction;
//       const finalPrediction = getPredictionFromClassIndex(finalClassIndex);
//       const classConfidence = flaskResponse.class_confidence || [];
      
//       // Tính heart rate từ dữ liệu ECG (chính xác hơn)
//       const heartRate = calculateHeartRateFromECG(data);
      
//       // Confidence: Lấy từ class được dự đoán, nhưng nếu quá cao (có thể là lỗi) thì điều chỉnh
//       let confidence = classConfidence[finalClassIndex] || 0;
      
//       // Nếu Flask API trả về "Other" (class 4) nhưng heart rate bình thường (60-100 BPM)
//       // và confidence của "Normal" (class 0) cao, thì có thể là model phân tích sai
//       // Ưu tiên heart rate và logic y khoa
//       if (finalPrediction === 'Other' && heartRate >= 60 && heartRate <= 100) {
//         const normalConfidence = classConfidence[0] || 0;
//         // Nếu confidence của Normal cao hơn 0.3, ưu tiên Normal
//         if (normalConfidence > 0.3) {
//           console.log('Adjusting prediction: Other -> Normal based on heart rate and confidence');
//           const adjustedPrediction = 'Normal';
//           confidence = Math.max(normalConfidence, 0.7); // Đảm bảo confidence hợp lý
          
//           // Tạo result với prediction đã điều chỉnh
//           const result: MeasurementResult = {
//             classIndex: 0,
//             heartRate,
//             prediction: adjustedPrediction,
//             confidence: confidence,
//             riskLevel: 'Low',
//             recommendations: getRecommendations(adjustedPrediction, confidence, heartRate),
//             timestamp: new Date().toISOString()
//           };
          
//           setResult(result);
//           setStatusMessage('Đã hoàn thành phân tích. Kiểm tra ô kết quả dự đoán.');
          
//           // Save measurement
//           await api.post('/api/measurements', {
//             ecgData: data,
//             heartRate: result.heartRate,
//             prediction: result.prediction,
//             confidence: result.confidence,
//             symptoms: [],
//             notes: ''
//           });
//           fetchRecentHistory();
//           return;
//         }
//       }
      
//       // Xác định risk level dựa trên cả prediction và heart rate
//       let riskLevel = 'Low';
//       const isNormalHR = heartRate >= 60 && heartRate <= 100;
      
//       if (finalPrediction === 'Normal' && isNormalHR) {
//         riskLevel = 'Low';
//       } else if (finalPrediction === 'Normal' && !isNormalHR) {
//         // Normal prediction nhưng HR bất thường -> Medium risk
//         riskLevel = 'Medium';
//       } else if (finalPrediction !== 'Normal') {
//         // Có bất thường
//         if (confidence > 0.8 && !isNormalHR) {
//           riskLevel = 'High';
//         } else if (confidence > 0.8 && isNormalHR) {
//           // Bất thường nhưng HR bình thường -> có thể là false positive
//           riskLevel = 'Medium';
//         } else if (confidence > 0.6) {
//           riskLevel = 'Medium';
//         } else {
//           riskLevel = 'Low'; // Confidence thấp
//         }
//       }
      
      
//       // Tạo recommendations
//       const recommendations = getRecommendations(finalPrediction, confidence, heartRate);
      
//       // Tạo result object
//       const result: MeasurementResult = {
//         classIndex: finalClassIndex,
//         heartRate,
//         prediction: finalPrediction,
//         confidence: Math.min(confidence, 0.99), // Giới hạn confidence tối đa 99% để tránh hiển thị 100%
//         riskLevel,
//         recommendations,
//         timestamp: new Date().toISOString()
//       };
      
//       setResult(result);
//       setStatusMessage('✅ Đã hoàn thành phân tích. Kết quả đã được lưu vào lịch sử.');
      
//       // Save measurement ngay lập tức
//       try {
//         await api.post('/api/measurements', {
//           ecgData: data,
//           heartRate: result.heartRate,
//           prediction: result.prediction,
//           confidence: result.confidence,
//           symptoms: [],
//           notes: ''
//         });
        
//         // Refresh lịch sử ngay sau khi lưu
//         await fetchRecentHistory();
//       } catch (saveErr: any) {
//         console.error('Error saving measurement:', saveErr);
//         setError('Đã phân tích thành công nhưng không thể lưu vào lịch sử: ' + (saveErr.message || 'Lỗi không xác định'));
//       }
      
//     } catch (err: any) {
//       console.error('Error calling Flask API:', err);
//       setError('Lỗi phân tích dữ liệu: ' + (err.message || 'Không thể kết nối đến API'));
//       setStatusMessage('Không thể phân tích dữ liệu. Vui lòng thử lại.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const resetMeasurement = () => {
//     setEcgData([]);
//     setResult(null);
//     setError('');
//     setStatusMessage('');
//     setCountdown(null);
//   };

//   const getRiskLevelColor = (level: string) => {
//     switch (level) {
//       case 'High': return 'error';
//       case 'Medium': return 'warning';
//       case 'Low': return 'success';
//       default: return 'default';
//     }
//   };

//   const getPredictionLabel = (prediction: string) => {
//     const labels: { [key: string]: string } = {
//       'Normal': 'Bình thường',
//       'Supraventricular': 'Bất thường trên thất',
//       'Ventricular': 'Bất thường thất',
//       'Paced': 'Được điều chỉnh',
//       'Other': 'Khác'
//     };
//     return labels[prediction] || prediction;
//   };

//   const formatDateTime = (value: string) => {
//     return new Date(value).toLocaleString('vi-VN');
//   };

//   // Process ECG data for display
//   const processedECGData = React.useMemo(() => {
//     if (ecgData.length === 0) return [];
//     const processed = processECGForDisplay(ecgData);
    
//     // Debug: log một số thông tin về dữ liệu
//     if (processed.length > 0) {
//       const rawMin = Math.min(...ecgData);
//       const rawMax = Math.max(...ecgData);
//       const rawMean = ecgData.reduce((a, b) => a + b, 0) / ecgData.length;
//       const procMin = Math.min(...processed);
//       const procMax = Math.max(...processed);
      
//       console.log('ECG Data Stats:', {
//         rawLength: ecgData.length,
//         rawRange: { min: rawMin, max: rawMax, mean: rawMean },
//         processedRange: { min: procMin, max: procMax },
//         saturationCount: ecgData.filter(v => v >= 1020).length
//       });
//     }
    
//     return processed;
//   }, [ecgData]);
  
//   // Prepare chart data - hiển thị nhiều điểm hơn nếu có thể, nhưng tối đa 2000 điểm để đảm bảo hiệu năng
//   const maxDisplayPoints = 2000;
//   const displayData = processedECGData.length > maxDisplayPoints 
//     ? processedECGData.filter((_, i) => i % Math.ceil(processedECGData.length / maxDisplayPoints) === 0)
//     : processedECGData;
  
//   const chartData = displayData.map((value, index) => ({
//     time: (index * (processedECGData.length / displayData.length)) / 360, // Convert to seconds (assuming 360Hz sample rate)
//     value: value
//   }));

//   return (
//     <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
//       <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 4, mb: 4 }}>
//         <Container maxWidth="lg">
//           <Typography variant="h4" gutterBottom>
//             Hệ thống theo dõi nhịp tim
//           </Typography>
//           <Typography variant="body1" sx={{ opacity: 0.9 }}>
//             Sử dụng cảm biến ECG để đo và phân tích nhịp tim của bạn
//           </Typography>
//         </Container>
//       </Box>

//       <Container maxWidth="lg" sx={{ pb: 6 }}>
//         <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
//           <Box sx={{ flex: { xs: '1', md: '0 0 32%' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
//             <Card>
//               <CardContent>
//                 <Typography variant="h6" gutterBottom>
//                   Quy trình sử dụng
//                 </Typography>
//                 <List dense>
//                   {steps.map((label, index) => (
//                     <ListItem key={index}>
//                       <ListItemIcon>
//                         <CheckIcon color="primary" />
//                       </ListItemIcon>
//                       <ListItemText primary={`${index + 1}. ${label}`} />
//                     </ListItem>
//                   ))}
//                 </List>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardContent>
//                 <Typography variant="h6" gutterBottom>
//                   Lưu ý quan trọng
//                 </Typography>
//                 <List dense>
//                   {instructions.map((instruction, index) => (
//                     <ListItem key={index}>
//                       <ListItemIcon>
//                         <InfoIcon color="primary" />
//                       </ListItemIcon>
//                       <ListItemText primary={instruction} />
//                     </ListItem>
//                   ))}
//                 </List>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardContent>
//                 <Typography variant="h6" gutterBottom>
//                   Vị trí cảm biến
//                 </Typography>
//                 <List dense>
//                   {sensorPositions.map((position, index) => (
//                     <ListItem key={index}>
//                       <ListItemIcon>
//                         <InfoIcon color="primary" />
//                       </ListItemIcon>
//                       <ListItemText primary={position} />
//                     </ListItem>
//                   ))}
//                 </List>
//               </CardContent>
//             </Card>
//           </Box>

//           <Box sx={{ flex: { xs: '1', md: '0 0 68%' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
//             {/* Đồ thị ECG - Hiển thị ở trên cùng */}
//             <Card>
//               <CardContent>
//                 <Typography variant="h6" gutterBottom>
//                   Tín hiệu ECG
//                 </Typography>
//                 {ecgData.length > 0 ? (
//                   <Box height={300}>
//                     <ResponsiveContainer width="100%" height="100%">
//                       <LineChart
//                         data={chartData}
//                         margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
//                       >
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis
//                           dataKey="time"
//                           type="number"
//                           scale="linear"
//                           label={{ value: 'Thời gian (s)', position: 'insideBottom', offset: -5 }}
//                           domain={['auto', 'auto']}
//                         />
//                         <YAxis
//                           type="number"
//                           scale="linear"
//                           label={{ value: 'Điện áp (mV)', angle: -90, position: 'insideLeft' }}
//                           domain={['auto', 'auto']}
//                           allowDataOverflow={false}
//                         />
//                         <Line
//                           type="monotone"
//                           dataKey="value"
//                           stroke="#1976d2"
//                           strokeWidth={1.5}
//                           dot={false}
//                           isAnimationActive={false}
//                           connectNulls={false}
//                         />
//                       </LineChart>
//                     </ResponsiveContainer>
//                   </Box>
//                 ) : (
//                   <Box textAlign="center" py={6}>
//                     <ChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
//                     <Typography variant="body1" color="text.secondary">
//                       Chưa có dữ liệu để hiển thị. Bấm "Lấy dữ liệu" để vẽ đồ thị tín hiệu ECG.
//                     </Typography>
//                   </Box>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Hàng hiển thị kết quả - Giữa đồ thị và nút */}
//             {result && (
//               <Card sx={{ border: '2px solid', borderColor: 'primary.main' }}>
//                 <CardContent>
//                   <Typography variant="h6" gutterBottom textAlign="center">
//                     Kết quả dự đoán
//                   </Typography>
//                   <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, mb: 2 }}>
//                     <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold' }}>
//                       {result.classIndex}
//                     </Typography>
//                     <Box textAlign="left">
//                       <Typography variant="h5" sx={{ fontWeight: 600 }}>
//                         {getPredictionLabel(result.prediction)}
//                       </Typography>
//                       <Typography variant="body2" color="text.secondary">
//                         {/* Nhịp tim: {result.heartRate} BPM */}
//                       </Typography>
//                       <Typography variant="body2" color="text.secondary">
//                         {/* Độ tin cậy: {(result.confidence * 100).toFixed(1)}% */}
//                       </Typography>
//                     </Box>
//                   </Box>
//                   <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
//                     Thời gian đo: {new Date(result.timestamp).toLocaleString('vi-VN')}
//                   </Typography>
//                 </CardContent>
//               </Card>
//             )}

//             {/* Countdown Timer LED Display */}
//             {countdown !== null && (
//               <Card sx={{ bgcolor: 'background.paper', border: '2px solid', borderColor: countdown > 10 ? 'primary.main' : 'warning.main' }}>
//                 <CardContent>
//                   <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
//                     <TimerIcon sx={{ fontSize: 40, color: countdown > 10 ? 'primary.main' : 'warning.main', mb: 1 }} />
//                     <Typography variant="h3" sx={{ 
//                       fontFamily: 'monospace', 
//                       fontWeight: 'bold',
//                       color: countdown > 10 ? 'primary.main' : 'warning.main',
//                       textShadow: '0 0 10px rgba(25, 118, 210, 0.5)'
//                     }}>
//                       {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
//                     </Typography>
//                     <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
//                       Đang đếm ngược - Đợi thiết bị gửi dữ liệu
//                     </Typography>
//                   </Box>
//                 </CardContent>
//               </Card>
//             )}

//             {/* Các nút điều khiển */}
//             <Card>
//               <CardContent>
//                 <Typography variant="h6" gutterBottom>
//                   Điều khiển
//                 </Typography>
                
//                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
//                   {/* <Button
//                     variant="contained"
//                     color="primary"
//                     startIcon={<TimerIcon />}
//                     onClick={startCountdown}
//                     disabled={countdown !== null}
//                   >
//                     Bắt đầu đếm ngược
//                   </Button> */}
//                   <Button
//                     variant="contained"
//                     color="secondary"
//                     startIcon={!isFetchingData ? <DownloadIcon /> : undefined}
//                     onClick={handleFetchData}
//                     disabled={isFetchingData}
//                   >
//                     {isFetchingData ? <CircularProgress size={20} color="inherit" /> : 'Lấy dữ liệu'}
//                   </Button>
//                   <Button
//                     variant="contained"
//                     color="success"
//                     startIcon={!loading ? <PredictIcon /> : undefined}
//                     onClick={handlePrediction}
//                     disabled={loading || ecgData.length < 100}
//                   >
//                     {loading ? <CircularProgress size={20} color="inherit" /> : 'Dự đoán'}
//                   </Button>
//                   <Button
//                     variant="outlined"
//                     startIcon={<ResetIcon />}
//                     onClick={resetMeasurement}
//                   >
//                     Làm mới
//                   </Button>
//                 </Box>

//                 {ecgData.length > 0 && (
//                   <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
//                     <Chip
//                       icon={<ChartIcon />}
//                       label={`Đã nhận ${ecgData.length.toLocaleString()} điểm dữ liệu`}
//                       color="primary"
//                       variant="outlined"
//                     />
//                   </Box>
//                 )}

//                 {statusMessage && (
//                   <Alert severity="info" sx={{ mb: 2 }}>
//                     {statusMessage}
//                   </Alert>
//                 )}

//                 {error && (
//                   <Alert severity="error">
//                     {error}
//                   </Alert>
//                 )}
//               </CardContent>
//             </Card>

//             <Card>
//               <CardContent>
//                 <Typography variant="h6" gutterBottom>
//                   Lịch sử đo gần đây
//                 </Typography>
//                 {historyLoading ? (
//                   <Box display="flex" justifyContent="center" py={3}>
//                     <CircularProgress size={32} />
//                   </Box>
//                 ) : historyError ? (
//                   <Alert severity="error">{historyError}</Alert>
//                 ) : historyItems.length === 0 ? (
//                   <Box textAlign="center" py={3}>
//                     <Typography variant="body2" color="text.secondary">
//                       Chưa có lịch sử nào. Hãy thực hiện phép đo để xem lại tại đây.
//                     </Typography>
//                   </Box>
//                 ) : (
//                   <List disablePadding>
//                     {historyItems.map((item, index) => (
//                       <React.Fragment key={item._id}>
//                         <ListItem alignItems="flex-start">
//                           <ListItemIcon sx={{ mt: 1 }}>
//                             <HistoryIcon color="primary" />
//                           </ListItemIcon>
//                           <Box sx={{ flex: 1 }}>
//                             <Typography variant="subtitle2">
//                               {formatDateTime(item.createdAt)}
//                             </Typography>
//                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
//                               <Chip
//                                 label={`${item.heartRate} BPM`}
//                                 color="primary"
//                                 size="small"
//                                 variant="outlined"
//                               />
//                               <Chip
//                                 label={getPredictionLabel(item.prediction)}
//                                 color={item.prediction === 'Normal' ? 'success' : 'warning'}
//                                 size="small"
//                                 variant="outlined"
//                               />
//                               <Chip
//                                 label={`${(item.confidence * 100).toFixed(1)}%`}
//                                 size="small"
//                                 variant="outlined"
//                               />
//                               <Chip
//                                 label={item.riskLevel}
//                                 color={getRiskLevelColor(item.riskLevel) as any}
//                                 size="small"
//                               />
//                             </Box>
//                           </Box>
//                         </ListItem>
//                         {index < historyItems.length - 1 && <Divider component="li" />}
//                       </React.Fragment>
//                     ))}
//                   </List>
//                 )}
//               </CardContent>
//             </Card>

//           </Box>
//         </Box>
//       </Container>
//     </Box>
//   );
// };

// export default Measurement;

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
import { fetchECGDataAsArray, processECGForDisplay, processECGForModel } from '../utils/firebase';

interface MeasurementResult {
  classIndex: number;
  heartRate: number;
  prediction: string;
  confidence: number;
  riskLevel: string;
  recommendations: string[];
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
  const [countdown, setCountdown] = useState<number | null>(null); // Countdown timer (giây)

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

  // Bắt đầu countdown timer 1 phút
  const startCountdown = () => {
    setCountdown(60); // 60 giây = 1 phút
    setEcgData([]);
    setResult(null);
    setError('');
    setStatusMessage('Đang đếm ngược 1 phút... Đợi thiết bị gửi dữ liệu lên Firebase.');
  };

  // Lấy dữ liệu từ Firebase và vẽ đồ thị
  const handleFetchData = async () => {
    setError('');
    setStatusMessage('');
    setIsFetchingData(true);
    try {
      // Fetch dữ liệu từ Firebase và merge các chunks
      const data = await fetchECGDataAsArray();
      if (data.length === 0) {
        setError('Chưa có dữ liệu. Đảm bảo thiết bị đã gửi dữ liệu lên Firebase (đợi ít nhất 1 phút sau khi đeo cảm biến).');
        setIsFetchingData(false);
        return;
      }
      
      // Merge và set dữ liệu
      setEcgData(data);
      setStatusMessage(`✅Đồ thị đã được vẽ. Bấm "Dự đoán" để phân tích.`);
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

  // Tính heart rate từ số peaks trong dữ liệu ECG (cải thiện)
  const calculateHeartRateFromECG = (ecgData: number[], sampleRate: number = 360, durationSeconds?: number): number => {
    if (ecgData.length === 0) return 0;
    
    // Tính duration
    if (!durationSeconds) {
      durationSeconds = ecgData.length / sampleRate;
    }
    
    // Tìm peaks bằng cách tìm các điểm cực đại cục bộ
    // Sử dụng adaptive threshold dựa trên phân phối giá trị
    const sorted = [...ecgData].sort((a, b) => b - a);
    const top10Percent = sorted.slice(0, Math.floor(sorted.length * 0.1));
    const threshold = top10Percent[top10Percent.length - 1] || (Math.max(...ecgData) * 0.7);
    
    const peaks: number[] = [];
    const minDistance = Math.floor(sampleRate * 0.4); // Tối thiểu 0.4 giây giữa các nhịp (150 BPM max)
    
    for (let i = 1; i < ecgData.length - 1; i++) {
      // Kiểm tra xem có phải peak không
      if (ecgData[i] > threshold && 
          ecgData[i] > ecgData[i-1] && 
          ecgData[i] > ecgData[i+1]) {
        
        // Kiểm tra khoảng cách với peak trước
        if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minDistance) {
          peaks.push(i);
        } else {
          // Nếu quá gần, giữ peak cao hơn
          const lastPeakIdx = peaks[peaks.length - 1];
          if (ecgData[i] > ecgData[lastPeakIdx]) {
            peaks[peaks.length - 1] = i;
          }
        }
      }
    }
    
    // Tính BPM từ số peaks
    if (peaks.length < 2) {
      // Không đủ peaks, ước tính từ threshold
      return Math.round((peaks.length / durationSeconds) * 60) || 72;
    }
    
    // Tính trung bình khoảng cách giữa các peaks
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push((peaks[i] - peaks[i-1]) / sampleRate);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60 / avgInterval);
    
    // Clamp between 40-200 BPM
    return Math.max(40, Math.min(200, bpm));
  };

  // Hàm tạo recommendations
  const getRecommendations = (prediction: string, confidence: number, heartRate: number): string[] => {
    const recommendations: string[] = [];
    
    // Recommendations dựa trên heart rate
    if (heartRate < 60) {
      recommendations.push('Nhịp tim chậm (dưới 60 BPM) - nên tham khảo ý kiến bác sĩ nếu có triệu chứng');
    } else if (heartRate > 100) {
      recommendations.push('Nhịp tim nhanh (trên 100 BPM) - nên nghỉ ngơi và thư giãn');
    } else if (heartRate >= 60 && heartRate <= 100) {
      recommendations.push('Nhịp tim trong phạm vi bình thường');
    }
    
    // Recommendations dựa trên prediction
    if (prediction === 'Normal' && heartRate >= 60 && heartRate <= 100) {
      recommendations.push('Tín hiệu ECG bình thường - tiếp tục theo dõi sức khỏe');
    } else if (prediction === 'Supraventricular') {
      recommendations.push('Phát hiện nhịp tim bất thường trên thất - cần theo dõi thêm và tham khảo ý kiến bác sĩ');
    } else if (prediction === 'Ventricular') {
      recommendations.push('⚠️ Phát hiện nhịp tim bất thường thất - nên tham khảo ý kiến bác sĩ ngay lập tức');
    } else if (prediction === 'Paced') {
      recommendations.push('Nhịp tim được điều chỉnh bởi máy tạo nhịp - đây là bình thường nếu bạn đã cấy máy tạo nhịp');
    } else if (prediction === 'Other') {
      if (heartRate >= 60 && heartRate <= 100) {
        recommendations.push('Kết quả phân tích không rõ ràng - nên đo lại để xác nhận');
      } else {
        recommendations.push('Phát hiện bất thường - nên tham khảo ý kiến bác sĩ');
      }
    }
    
    // Recommendations dựa trên confidence
    if (confidence < 0.7) {
      recommendations.push('Độ tin cậy thấp - nên đo lại để có kết quả chính xác hơn');
    }
    
    return recommendations;
  };

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
          await new Promise(resolve => setTimeout(resolve, 1000)); // Đợi 1s trước khi thử lại
        }
      }
      
      console.log('Flask API response:', flaskResponse);
      
      // Map response từ Flask về format frontend
      const finalClassIndex = flaskResponse.final_prediction;
      const finalPrediction = getPredictionFromClassIndex(finalClassIndex);
      const classConfidence = flaskResponse.class_confidence || [];
      
      // Tính heart rate từ dữ liệu ECG (chính xác hơn)
      const heartRate = calculateHeartRateFromECG(data);
      
      // Confidence: Lấy từ class được dự đoán, nhưng nếu quá cao (có thể là lỗi) thì điều chỉnh
      let confidence = classConfidence[finalClassIndex] || 0;
      
      // Nếu Flask API trả về "Other" (class 4) nhưng heart rate bình thường (60-100 BPM)
      // và confidence của "Normal" (class 0) cao, thì có thể là model phân tích sai
      // Ưu tiên heart rate và logic y khoa
      if (finalPrediction === 'Other' && heartRate >= 60 && heartRate <= 100) {
        const normalConfidence = classConfidence[0] || 0;
        // Nếu confidence của Normal cao hơn 0.3, ưu tiên Normal
        if (normalConfidence > 0.3) {
          console.log('Adjusting prediction: Other -> Normal based on heart rate and confidence');
          const adjustedPrediction = 'Normal';
          confidence = Math.max(normalConfidence, 0.7); // Đảm bảo confidence hợp lý
          
          // Tạo result với prediction đã điều chỉnh
          const result: MeasurementResult = {
            classIndex: 0,
            heartRate,
            prediction: adjustedPrediction,
            confidence: confidence,
            riskLevel: 'Low',
            recommendations: getRecommendations(adjustedPrediction, confidence, heartRate),
            timestamp: new Date().toISOString()
          };
          
          setResult(result);
          setStatusMessage('Đã hoàn thành phân tích. Kiểm tra ô kết quả dự đoán.');
          
          // Save measurement
          await api.post('/api/measurements', {
            ecgData: data,
            heartRate: result.heartRate,
            prediction: result.prediction,
            confidence: result.confidence,
            symptoms: [],
            notes: ''
          });
          fetchRecentHistory();
          return;
        }
      }
      
      // Xác định risk level dựa trên cả prediction và heart rate
      let riskLevel = 'Low';
      const isNormalHR = heartRate >= 60 && heartRate <= 100;
      
      if (finalPrediction === 'Normal' && isNormalHR) {
        riskLevel = 'Low';
      } else if (finalPrediction === 'Normal' && !isNormalHR) {
        // Normal prediction nhưng HR bất thường -> Medium risk
        riskLevel = 'Medium';
      } else if (finalPrediction !== 'Normal') {
        // Có bất thường
        if (confidence > 0.8 && !isNormalHR) {
          riskLevel = 'High';
        } else if (confidence > 0.8 && isNormalHR) {
          // Bất thường nhưng HR bình thường -> có thể là false positive
          riskLevel = 'Medium';
        } else if (confidence > 0.6) {
          riskLevel = 'Medium';
        } else {
          riskLevel = 'Low'; // Confidence thấp
        }
      }
      
      
      // Tạo recommendations
      const recommendations = getRecommendations(finalPrediction, confidence, heartRate);
      
      // Tạo result object
      const result: MeasurementResult = {
        classIndex: finalClassIndex,
        heartRate,
        prediction: finalPrediction,
        confidence: Math.min(confidence, 0.99), // Giới hạn confidence tối đa 99% để tránh hiển thị 100%
        riskLevel,
        recommendations,
        timestamp: new Date().toISOString()
      };
      
      setResult(result);
      setStatusMessage('✅ Đã hoàn thành phân tích. Kết quả đã được lưu vào lịch sử.');
      
      // Save measurement ngay lập tức
      try {
        await api.post('/api/measurements', {
          ecgData: data,
          heartRate: result.heartRate,
          prediction: result.prediction,
          confidence: result.confidence,
          symptoms: [],
          notes: ''
        });
        
        // Refresh lịch sử ngay sau khi lưu
        await fetchRecentHistory();
      } catch (saveErr: any) {
        console.error('Error saving measurement:', saveErr);
        setError('Đã phân tích thành công nhưng không thể lưu vào lịch sử: ' + (saveErr.message || 'Lỗi không xác định'));
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
  
  // Prepare chart data - hiển thị nhiều điểm hơn nếu có thể, nhưng tối đa 2000 điểm để đảm bảo hiệu năng
  const maxDisplayPoints = 2000;
  const displayData = processedECGData.length > maxDisplayPoints 
    ? processedECGData.filter((_, i) => i % Math.ceil(processedECGData.length / maxDisplayPoints) === 0)
    : processedECGData;
  
  const chartData = displayData.map((value, index) => ({
    time: (index * (processedECGData.length / displayData.length)) / 360, // Convert to seconds (assuming 360Hz sample rate)
    value: value
  }));

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
                        />
                        <YAxis
                          type="number"
                          scale="linear"
                          label={{ value: 'Điện áp (mV)', angle: -90, position: 'insideLeft' }}
                          domain={['auto', 'auto']}
                          allowDataOverflow={false}
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
              <Card sx={{ border: '2px solid', borderColor: 'primary.main' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom textAlign="center">
                    Kết quả dự đoán
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, mb: 2 }}>
                    <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold' }}>
                      {result.classIndex}
                    </Typography>
                    <Box textAlign="left">
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {getPredictionLabel(result.prediction)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {/* Nhịp tim: {result.heartRate} BPM */}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {/* Độ tin cậy: {(result.confidence * 100).toFixed(1)}% */}
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
                  {/* <Button
                    variant="contained"
                    color="primary"
                    startIcon={<TimerIcon />}
                    onClick={startCountdown}
                    disabled={countdown !== null}
                  >
                    Bắt đầu đếm ngược
                  </Button> */}
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
                              {/* heartRate chip removed per request */}
                              <Chip
                                label={getPredictionLabel(item.prediction)}
                                color={item.prediction === 'Normal' ? 'success' : 'warning'}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={`${(item.confidence * 100).toFixed(1)}%`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={item.riskLevel}
                                color={getRiskLevelColor(item.riskLevel) as any}
                                size="small"
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


import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, onValue, off, Database } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  databaseURL: 'https://heartecg-4e084-default-rtdb.firebaseio.com'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database: Database = getDatabase(app);

// Reference to ECG data
export const ecgRef = ref(database, 'ECG/raw');

/**
 * Lấy tất cả dữ liệu ECG từ Firebase
 * @returns Promise với dữ liệu ECG dạng object { chunk_1: string, chunk_2: string, ... }
 */
export const fetchECGData = async (): Promise<{ [key: string]: string }> => {
  try {
    const snapshot = await get(ecgRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error('Error fetching ECG data:', error);
    throw error;
  }
};

/**
 * Chuyển đổi dữ liệu chunks thành mảng số
 * @param chunks Object chứa các chunks { chunk_1: "1,2,3", chunk_2: "4,5,6", ... }
 * @returns Mảng số đã được sắp xếp theo thứ tự chunk
 */
export const parseECGChunks = (chunks: { [key: string]: string }): number[] => {
  // Sắp xếp chunks theo thứ tự số
  const sortedChunks = Object.keys(chunks)
    .sort((a, b) => {
      const numA = parseInt(a.replace('chunk_', ''));
      const numB = parseInt(b.replace('chunk_', ''));
      return numA - numB;
    });

  // Parse và merge tất cả các chunks thành một mảng
  const ecgData: number[] = [];
  sortedChunks.forEach(key => {
    const chunkData = chunks[key];
    if (typeof chunkData === 'string') {
      const numbers = chunkData.split(',').map(num => {
        const parsed = parseInt(num.trim());
        return isNaN(parsed) ? 0 : parsed;
      });
      ecgData.push(...numbers);
    }
  });

  return ecgData;
};

/**
 * Lắng nghe thay đổi dữ liệu ECG theo thời gian thực
 * @param callback Hàm callback được gọi khi có thay đổi
 * @returns Hàm unsubscribe
 */
export const subscribeECGData = (
  callback: (data: number[]) => void
): (() => void) => {
  let lastProcessedChunkId = -1;

  onValue(ecgRef, (snapshot) => {
    if (snapshot.exists()) {
      const chunks = snapshot.val();
      const sortedChunkIds = Object.keys(chunks)
        .sort((a, b) => {
          const numA = parseInt(a.replace('chunk_', ''));
          const numB = parseInt(b.replace('chunk_', ''));
          return numA - numB;
        });

      // Chỉ xử lý các chunk mới
      const newChunks: { [key: string]: string } = {};
      for (const chunkId of sortedChunkIds) {
        const chunkNum = parseInt(chunkId.replace('chunk_', ''));
        if (chunkNum > lastProcessedChunkId) {
          newChunks[chunkId] = chunks[chunkId];
          lastProcessedChunkId = chunkNum;
        }
      }

      if (Object.keys(newChunks).length > 0) {
        const newData = parseECGChunks(newChunks);
        addNewECGData(newData); // Thêm dữ liệu mới vào mảng
        callback(getStoredECGData()); // Gọi callback với toàn bộ dữ liệu
      }
    }
  }, (error) => {
    console.error('Error listening to ECG data:', error);
  });

  // Return unsubscribe function
  return () => {
    off(ecgRef);
    ecgDataArray = []; // Reset mảng khi ngừng lắng nghe
  };
};

/**
 * Lấy dữ liệu ECG dưới dạng mảng số đã parse
 * @returns Promise với mảng số ECG
 */
export const fetchECGDataAsArray = async (): Promise<number[]> => {
  const chunks = await fetchECGData();
  return parseECGChunks(chunks);
};

// Tạo một mảng để lưu trữ dữ liệu ECG
let ecgDataArray: number[] = [];

// Hàm để thêm dữ liệu mới vào mảng
const addNewECGData = (newData: number[]) => {
  ecgDataArray = [...ecgDataArray, ...newData];
  // Giới hạn số lượng điểm dữ liệu (ví dụ: giữ 10000 điểm gần nhất)
  const MAX_DATA_POINTS = 10000;
  if (ecgDataArray.length > MAX_DATA_POINTS) {
    ecgDataArray = ecgDataArray.slice(-MAX_DATA_POINTS);
  }
};

// Hàm để lấy toàn bộ dữ liệu đã lưu
export const getStoredECGData = (): number[] => {
  return ecgDataArray;
};

/**
 * Xử lý dữ liệu ECG để hiển thị: filter noise và normalize
 * @param rawData Mảng dữ liệu ECG raw
 * @returns Mảng dữ liệu đã được xử lý
 */
export const processECGForDisplay = (rawData: number[]): number[] => {
  if (rawData.length === 0) return [];

  // Filter out saturation values (1024 hoặc gần 1024) - có thể là noise
  const ADC_MAX = 1023;
  const ADC_SATURATION_THRESHOLD = 1020;
  
  // Thay thế các giá trị saturation bằng giá trị trung bình của window xung quanh
  const processed: number[] = [];
  const windowSize = 10; // Window size để tính trung bình khi gặp saturation
  
  for (let i = 0; i < rawData.length; i++) {
    let val = rawData[i];
    
    // Nếu là giá trị saturation, thay bằng trung bình của các giá trị hợp lệ xung quanh
    if (val >= ADC_SATURATION_THRESHOLD) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(rawData.length, i + windowSize + 1);
      const window = rawData.slice(start, end).filter(v => v < ADC_SATURATION_THRESHOLD);
      
      if (window.length > 0) {
        val = window.reduce((a, b) => a + b, 0) / window.length;
      } else {
        // Nếu không có giá trị hợp lệ, dùng giá trị trung bình của toàn bộ dữ liệu
        const allValid = rawData.filter(v => v < ADC_SATURATION_THRESHOLD);
        val = allValid.length > 0 
          ? allValid.reduce((a, b) => a + b, 0) / allValid.length 
          : 512; // Fallback
      }
    }
    
    processed.push(val);
  }

  // Tính trung bình để subtract baseline (loại bỏ DC offset)
  const mean = processed.reduce((a, b) => a + b, 0) / processed.length;
  
  // Subtract mean để center dữ liệu
  const centered = processed.map(val => val - mean);
  
  // Tính độ lệch chuẩn để normalize
  const variance = centered.reduce((sum, val) => sum + val * val, 0) / centered.length;
  const stdDev = Math.sqrt(variance) || 1;
  
  // Normalize về phạm vi hợp lý để hiển thị (scale về ±2mV cho ECG)
  // Scale factor được điều chỉnh để dữ liệu hiển thị rõ ràng
  const SCALE_TO_MV = 2 / (stdDev * 3); // Scale để ±3 sigma = ±2mV
  const normalized = centered.map(val => val * SCALE_TO_MV);

  return normalized;
};

/**
 * Xử lý dữ liệu ECG để gửi đến model AI
 * Model thường cần dữ liệu đã được normalize và clean
 * @param rawData Mảng dữ liệu ECG raw từ Firebase
 * @returns Mảng dữ liệu đã được xử lý sẵn sàng cho model
 */
export const processECGForModel = (rawData: number[]): number[] => {
  if (rawData.length === 0) return [];

  // Filter saturation values tương tự như display
  const ADC_SATURATION_THRESHOLD = 1020;
  const processed: number[] = [];
  const windowSize = 10;
  
  for (let i = 0; i < rawData.length; i++) {
    let val = rawData[i];
    
    if (val >= ADC_SATURATION_THRESHOLD) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(rawData.length, i + windowSize + 1);
      const window = rawData.slice(start, end).filter(v => v < ADC_SATURATION_THRESHOLD);
      
      if (window.length > 0) {
        val = window.reduce((a, b) => a + b, 0) / window.length;
      } else {
        const allValid = rawData.filter(v => v < ADC_SATURATION_THRESHOLD);
        val = allValid.length > 0 
          ? allValid.reduce((a, b) => a + b, 0) / allValid.length 
          : 512;
      }
    }
    
    processed.push(val);
  }

  // Normalize về phạm vi 0-1 hoặc -1 đến 1 (tùy model yêu cầu)
  const min = Math.min(...processed);
  const max = Math.max(...processed);
  const range = max - min || 1;

  // Normalize về -1 đến 1 (chuẩn cho nhiều model ML)
  const normalized = processed.map(val => ((val - min) / range) * 2 - 1);

  return normalized;
};


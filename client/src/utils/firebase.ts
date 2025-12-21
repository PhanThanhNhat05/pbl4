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
export const ecgRef = ref(database, 'ECG/raw211212');

// Tạo ref theo user (đường dẫn đề xuất: ECG/{userId}/raw)
export const getUserECGRef = (userId: string) => ref(database, `ECG/${userId}/raw`);

/**
 * Lấy tất cả dữ liệu ECG từ Firebase
 * @returns Promise với dữ liệu ECG dạng object { chunk_1: string, chunk_2: string, ... }
 */
export const fetchECGData = async (): Promise<{ [key: string]: string }> => {
  try {
    console.log('Fetching from general path: ECG/raw');
    const snapshot = await get(ecgRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('Found data at general path:', Object.keys(data).length, 'chunks');
      console.log('Chunk keys:', Object.keys(data));
      
      // Log một vài chunk để xem cấu trúc
      const sampleKeys = Object.keys(data).slice(0, 3);
      sampleKeys.forEach(key => {
        const value = data[key];
        console.log(`Sample chunk ${key}:`, {
          type: typeof value,
          isString: typeof value === 'string',
          length: typeof value === 'string' ? value.length : 'N/A',
          preview: typeof value === 'string' ? value.substring(0, 50) : value
        });
      });
      
      return data;
    }
    console.log('No data found at general path: ECG/raw');
    return {};
  } catch (error: any) {
    console.error('Error fetching ECG data:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
};

/**
 * Chuyển đổi dữ liệu chunks thành mảng số
 * @param chunks Object chứa các chunks { chunk_1: "1,2,3", chunk_2: "4,5,6", ... }
 * @returns Mảng số đã được sắp xếp theo thứ tự chunk
 */
export const parseECGChunks = (chunks: { [key: string]: any }): number[] => {
  console.log('Parsing chunks, total chunks:', Object.keys(chunks).length);
  
  // Sắp xếp chunks theo thứ tự số
  const sortedChunks = Object.keys(chunks)
    .filter(key => key.startsWith('chunk_'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('chunk_', ''));
      const numB = parseInt(b.replace('chunk_', ''));
      return numA - numB;
    });

  console.log('Sorted chunk keys:', sortedChunks);

  // Parse và merge tất cả các chunks thành một mảng
  const ecgData: number[] = [];
  sortedChunks.forEach(key => {
    const chunkData = chunks[key];
    console.log(`Processing ${key}, type:`, typeof chunkData);
    
    if (typeof chunkData === 'string') {
      // Dữ liệu là string, split bằng comma
      const numbers = chunkData.split(',').map(num => {
        const trimmed = num.trim();
        const parsed = parseFloat(trimmed); // Dùng parseFloat thay vì parseInt để hỗ trợ số thập phân
        return isNaN(parsed) ? 0 : parsed;
      }).filter(num => num !== 0 || num === 0); // Giữ cả số 0
      
      console.log(`  Parsed ${numbers.length} numbers from ${key}`);
      ecgData.push(...numbers);
    } else if (typeof chunkData === 'number') {
      // Dữ liệu là số trực tiếp
      ecgData.push(chunkData);
    } else if (Array.isArray(chunkData)) {
      // Dữ liệu là mảng
      ecgData.push(...chunkData.map(v => typeof v === 'number' ? v : parseFloat(v) || 0));
    } else {
      console.warn(`  Unknown data type for ${key}:`, typeof chunkData, chunkData);
    }
  });

  console.log('Total parsed data points:', ecgData.length);
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
  try {
    const chunks = await fetchECGData();
    if (Object.keys(chunks).length === 0) {
      console.log('No chunks found in general path');
      return [];
    }
    
    console.log('Starting to parse chunks...');
    const parsed = parseECGChunks(chunks);
    console.log('Successfully parsed chunks from general path:', parsed.length, 'points');
    
    if (parsed.length === 0) {
      console.warn('Warning: Parsed data is empty. Check chunk format.');
    }
    
    return parsed;
  } catch (error) {
    console.error('Error in fetchECGDataAsArray:', error);
    throw error;
  }
};

/**
 * Thử lấy dữ liệu từ nhiều path khác nhau (helper để debug)
 */
export const tryFetchECGFromAllPaths = async (userId?: string): Promise<{ path: string; data: number[] }[]> => {
  const results: { path: string; data: number[] }[] = [];
  
  // Thử path chung
  try {
    const generalData = await fetchECGDataAsArray();
    results.push({ path: 'ECG/raw', data: generalData });
  } catch (err) {
    console.error('Error fetching from ECG/raw:', err);
  }
  
  // Thử path theo user nếu có
  if (userId) {
    try {
      const userData = await fetchECGDataAsArrayForUser(userId);
      results.push({ path: `ECG/${userId}/raw`, data: userData });
    } catch (err) {
      console.error(`Error fetching from ECG/${userId}/raw:`, err);
    }
  }
  
  return results;
};

/**
 * Lấy dữ liệu ECG theo user (đã merge thành mảng số)
 */
export const fetchECGDataAsArrayForUser = async (userId: string): Promise<number[]> => {
  try {
    const userRef = getUserECGRef(userId);
    console.log('Fetching from path:', `ECG/${userId}/raw`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      console.log('No data found at path:', `ECG/${userId}/raw`);
      return [];
    }
    
    const data = snapshot.val();
    console.log('Found data at user path:', Object.keys(data).length, 'chunks');
    const parsed = parseECGChunks(data);
    console.log('Parsed data:', parsed.length, 'points');
    return parsed;
  } catch (error) {
    console.error('Error fetching user ECG data:', error);
    return [];
  }
};


// Tạo một mảng để lưu trữ dữ liệu ECG
let ecgDataArray: number[] = [];

// Hàm để thêm dữ liệu mới vào mảng
const addNewECGData = (newData: number[]) => {
  ecgDataArray = [...ecgDataArray, ...newData];
  
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
 * Xử lý dữ liệu ECG để hiển thị đẹp: filter noise, làm mịn baseline nhưng giữ giá trị gần raw
 * @param rawData Mảng dữ liệu ECG raw từ ADC (0-1024)
 * @returns Mảng dữ liệu đã được xử lý, giữ giá trị trong phạm vi ADC để hiển thị đẹp
 */
export const processECGForDisplay = (rawData: number[]): number[] => {
  if (rawData.length === 0) return [];

  // Filter out saturation values (1024 hoặc gần 1024) - có thể là noise
  const ADC_SATURATION_THRESHOLD = 1020;
  
  // Bước 1: Thay thế các giá trị saturation bằng giá trị trung bình của window xung quanh
  const filtered: number[] = [];
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
    
    filtered.push(val);
  }

  // Bước 2: Làm mịn baseline bằng moving average để loại bỏ drift nhưng giữ biến động ECG
  // Sử dụng window lớn để chỉ làm mịn baseline, không làm mất QRS complexes
  const baselineWindowSize = Math.min(500, Math.floor(filtered.length / 20));
  const baseline: number[] = [];
  
  for (let i = 0; i < filtered.length; i++) {
    const start = Math.max(0, i - Math.floor(baselineWindowSize / 2));
    const end = Math.min(filtered.length, i + Math.floor(baselineWindowSize / 2));
    const window = filtered.slice(start, end);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    baseline.push(avg);
  }

  // Bước 3: Subtract baseline để loại bỏ DC offset và drift, nhưng giữ giá trị trong phạm vi hợp lý
  const centered = filtered.map((val, i) => val - baseline[i]);
  
  // Bước 4: Tìm giá trị trung bình của centered data để làm reference
  const centerMean = centered.reduce((a, b) => a + b, 0) / centered.length;
  
  // Bước 5: Scale về phạm vi đẹp để hiển thị (giữ trong phạm vi 0-800 như hình mẫu)
  // Tìm min/max để scale nhưng không normalize quá mức
  const min = Math.min(...centered);
  const max = Math.max(...centered);
  const range = max - min || 1;
  
  // Scale để có phạm vi khoảng 0-800 (như trong hình mẫu)
  // Baseline sẽ ở khoảng 300-400, peaks ở 600-700
  const TARGET_BASELINE = 350;
  const TARGET_RANGE = 400; // Từ baseline ±200
  
  const scaled = centered.map(val => {
    // Normalize về -1 đến 1
    const normalized = (val - min) / range * 2 - 1;
    // Scale về target range và shift lên baseline
    return TARGET_BASELINE + normalized * TARGET_RANGE;
  });

  return scaled;
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


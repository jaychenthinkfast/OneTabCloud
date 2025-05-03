import pako from 'pako';

// 压缩数据，返回压缩后的字符串
export function compressData(data) {
  try {
    // 压缩数据
    const compressed = pako.deflate(JSON.stringify(data));
    return btoa(String.fromCharCode.apply(null, compressed));
  } catch (error) {
    console.error('压缩数据失败:', error);
    throw error;
  }
}

// 解压缩数据，返回原始对象
export function decompressData(compressed) {
  try {
    const binaryString = atob(compressed);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decompressed = pako.inflate(bytes);
    return JSON.parse(new TextDecoder().decode(decompressed));
  } catch (error) {
    console.error('解压缩数据失败:', error);
    throw error;
  }
} 
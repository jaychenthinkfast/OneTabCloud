import CryptoJS from 'crypto-js';
import pako from 'pako';

// 加密数据，返回加密字符串
export function encryptData(data, key) {
  try {
    // 压缩数据
    const compressed = pako.deflate(JSON.stringify(data));
    // 加密
    const wordArray = CryptoJS.lib.WordArray.create(compressed);
    const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
    return encrypted;
  } catch (error) {
    console.error('加密数据失败:', error);
    throw error;
  }
}

// 解密数据，返回原始对象
export function decryptData(encrypted, key) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, key);
    // CryptoJS 解密后为 WordArray，需要转为 Uint8Array
    const words = decrypted.words;
    const sigBytes = decrypted.sigBytes;
    const u8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
      u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    const decompressed = pako.inflate(u8);
    return JSON.parse(new TextDecoder().decode(decompressed));
  } catch (error) {
    console.error('解密数据失败:', error);
    throw error;
  }
} 
import axios from 'axios';
import { encryptData, decryptData } from './crypto.js';

// Gist API 配置
const GIST_API_URL = 'https://api.github.com/gists';

// 获取 GitHub 认证头
function getAuthHeaders() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pat'], (result) => {
      resolve({
        Authorization: `token ${result.pat}`,
        'Content-Type': 'application/json'
      });
    });
  });
}

// 创建新的 Gist
export async function createGist() {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(
      GIST_API_URL,
      {
        description: 'OneTabCloud Sync Data',
        public: false,
        files: {
          'index.json': {
            content: JSON.stringify({
              lastSync: new Date().toISOString(),
              files: []
            })
          }
        }
      },
      { headers }
    );
    
    return response.data.id;
  } catch (error) {
    console.error('创建 Gist 失败:', error);
    throw error;
  }
}

// 保存数据到 Gist
export async function saveToGist(data) {
  try {
    const headers = await getAuthHeaders();
    const gistId = await getGistId();
    
    // 分片处理
    const chunks = [];
    const chunkSize = 900 * 1024; // 900KB
    const jsonStr = JSON.stringify(data);
    
    for (let i = 0; i < jsonStr.length; i += chunkSize) {
      chunks.push(jsonStr.slice(i, i + chunkSize));
    }
    
    // 更新 Gist
    const files = {};
    chunks.forEach((chunk, index) => {
      files[`data-part${index + 1}.json`] = {
        content: chunk
      };
    });
    
    // 更新索引文件
    files['index.json'] = {
      content: JSON.stringify({
        lastSync: new Date().toISOString(),
        files: chunks.map((_, i) => `data-part${i + 1}.json`)
      })
    };
    
    await axios.patch(
      `${GIST_API_URL}/${gistId}`,
      { files },
      { headers }
    );
    
    return true;
  } catch (error) {
    console.error('保存到 Gist 失败:', error);
    throw error;
  }
}

// 从 Gist 加载数据
export async function loadFromGist() {
  try {
    const headers = await getAuthHeaders();
    const gistId = await getGistId();
    
    const response = await axios.get(
      `${GIST_API_URL}/${gistId}`,
      { headers }
    );
    
    const files = response.data.files;
    const index = JSON.parse(files['index.json'].content);
    
    // 合并所有分片
    let data = '';
    for (const filename of index.files) {
      data += files[filename].content;
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error('从 Gist 加载数据失败:', error);
    throw error;
  }
}

// 获取 Gist ID
async function getGistId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['gistId'], async (result) => {
      if (!result.gistId) {
        const gistId = await createGist();
        await chrome.storage.local.set({ gistId });
        resolve(gistId);
      } else {
        resolve(result.gistId);
      }
    });
  });
} 
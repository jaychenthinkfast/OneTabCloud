import axios from 'axios';
import { encryptData, decryptData } from './crypto.js';

// Gist API 配置
const GIST_API_URL = 'https://api.github.com/gists';

// 获取 GitHub 认证头
function getAuthHeaders() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['pat'], (result) => {
      if (!result.pat) {
        // 没有配置 token，返回 null
        resolve(null);
      } else {
        resolve({
          Authorization: `token ${result.pat}`,
          'Content-Type': 'application/json'
        });
      }
    });
  });
}

// 创建新的 Gist
async function createGist() {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      console.warn('未配置 GitHub Token，无法创建 Gist');
      return null;
    }
    const response = await axios.post(
      GIST_API_URL,
      {
        description: 'OneTabCloud Sync Data',
        public: false,
        files: {
          'index.json': {
            content: JSON.stringify({
              version: 1,
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
async function saveToGist(data) {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      console.warn('未配置 GitHub Token，无法保存到 Gist');
      return false;
    }
    const gistId = await getGistId();
    if (!gistId) {
      return false;
    }
    
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
        version: 1,
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
async function loadFromGist() {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      console.warn('未配置 GitHub Token，无法从 Gist 加载数据');
      return { groups: [] };
    }
    const gistId = await getGistId();
    if (!gistId) {
      return { groups: [] };
    }
    
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
        if (!gistId) {
          resolve(null);
          return;
        }
        await chrome.storage.local.set({ gistId });
        resolve(gistId);
      } else {
        resolve(result.gistId);
      }
    });
  });
}

// 同步数据
export async function syncWithGist() {
  try {
    // 检查 token 是否存在
    const pat = await new Promise((resolve) => {
      chrome.storage.local.get(['pat'], (result) => resolve(result.pat));
    });
    if (!pat) {
      console.warn('未配置 GitHub Token，已跳过同步');
      return false;
    }
    // 获取本地数据
    const localData = await new Promise((resolve) => {
      chrome.storage.local.get(['groups', 'lastSync'], resolve);
    });
    // 获取远程数据
    const remoteData = await loadFromGist();
    // 合并数据
    const mergedGroups = mergeGroups(localData.groups, remoteData.groups);
    // 保存合并后的数据
    await chrome.storage.local.set({
      groups: mergedGroups,
      lastSync: new Date().toISOString()
    });
    // 同步到 Gist
    await saveToGist({
      groups: mergedGroups,
      lastSync: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('同步失败:', error);
    return false;
  }
}

// 合并分组
function mergeGroups(localGroups = [], remoteGroups = []) {
  const merged = new Map();
  
  // 添加本地分组
  localGroups.forEach(group => {
    merged.set(group.id, group);
  });
  
  // 合并远程分组
  remoteGroups.forEach(group => {
    const localGroup = merged.get(group.id);
    if (!localGroup || new Date(group.lastModified) > new Date(localGroup.lastModified)) {
      merged.set(group.id, group);
    }
  });
  
  return Array.from(merged.values());
} 
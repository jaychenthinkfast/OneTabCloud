import { syncWithGist } from '../lib/storage.js';

// DOM 元素
const patInput = document.getElementById('patInput');
const savePatBtn = document.getElementById('savePatBtn');
const lastSyncSpan = document.getElementById('lastSync');
const storageUsageSpan = document.getElementById('storageUsage');
const groupCountSpan = document.getElementById('groupCount');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const clearBtn = document.getElementById('clearBtn');

// 加载设置
async function loadSettings() {
  const result = await chrome.storage.local.get(['pat', 'lastSync', 'groups']);
  
  // 显示 PAT
  if (result.pat) {
    patInput.value = result.pat;
  }
  
  // 显示上次同步时间
  if (result.lastSync) {
    lastSyncSpan.textContent = new Date(result.lastSync).toLocaleString();
  }
  
  // 计算存储使用量
  if (result.groups) {
    const size = new Blob([JSON.stringify(result.groups)]).size;
    storageUsageSpan.textContent = `${(size / 1024).toFixed(2)} KB`;
    groupCountSpan.textContent = result.groups.length;
  }
}

// 保存 PAT
async function savePat() {
  const pat = patInput.value.trim();
  if (!pat) {
    alert('请输入 GitHub Personal Access Token');
    return;
  }
  
  try {
    await chrome.storage.local.set({ pat });
    alert('保存成功');
    
    // 验证 PAT 并创建 Gist
    await syncWithGist();
    await loadSettings();
  } catch (error) {
    console.error('保存 PAT 失败:', error);
    alert('保存失败，请检查 PAT 是否正确');
  }
}

// 导出数据
async function exportData() {
  try {
    const result = await chrome.storage.local.get(['groups']);
    const data = JSON.stringify(result.groups, null, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `onetabcloud-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出数据失败:', error);
    alert('导出数据失败，请重试');
  }
}

// 导入数据
async function importData(file) {
  try {
    const text = await file.text();
    const groups = JSON.parse(text);
    
    if (!Array.isArray(groups)) {
      throw new Error('无效的数据格式');
    }
    
    await chrome.storage.local.set({ groups });
    await syncWithGist();
    await loadSettings();
    
    alert('导入成功');
  } catch (error) {
    console.error('导入数据失败:', error);
    alert('导入数据失败，请检查文件格式');
  }
}

// 清除数据
async function clearData() {
  if (!confirm('确定要清除所有数据吗？此操作不可恢复。')) {
    return;
  }
  
  try {
    await chrome.storage.local.clear();
    await loadSettings();
    alert('数据已清除');
  } catch (error) {
    console.error('清除数据失败:', error);
    alert('清除数据失败，请重试');
  }
}

// 事件监听
savePatBtn.addEventListener('click', savePat);
exportBtn.addEventListener('click', exportData);
importInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    importData(file);
    e.target.value = ''; // 重置文件输入
  }
});
clearBtn.addEventListener('click', clearData);

// 初始化
document.addEventListener('DOMContentLoaded', loadSettings); 
// 导入必要的模块
import { syncWithGist } from './lib/storage.js';
import { compressData } from './lib/crypto.js';

// 默认同步配置
const DEFAULT_SYNC_CONFIG = {
  enabled: true,
  interval: 30 // 默认30分钟同步一次
};

// 初始化同步配置
chrome.runtime.onInstalled.addListener(() => {
  // 初始化存储
  chrome.storage.local.get(['groups', 'lastSync', 'syncConfig'], (result) => {
    if (!result.groups) {
      chrome.storage.local.set({ groups: [], lastSync: null });
    }
    if (!result.syncConfig) {
      chrome.storage.local.set({ syncConfig: DEFAULT_SYNC_CONFIG });
    }
  });
});

// 更新同步定时器
function updateSyncAlarm() {
  chrome.storage.local.get(['syncConfig'], (result) => {
    const config = result.syncConfig || DEFAULT_SYNC_CONFIG;
    
    // 清除现有定时器
    chrome.alarms.clear('syncAlarm');
    
    // 如果启用了同步，创建新的定时器
    if (config.enabled) {
      chrome.alarms.create('syncAlarm', {
        periodInMinutes: config.interval
      });
    }
  });
}

// 监听同步定时器
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncAlarm') {
    syncWithGist();
  }
});

// 监听配置变更
chrome.storage.onChanged.addListener((changes) => {
  if (changes.syncConfig) {
    updateSyncAlarm();
  }
});

// 初始化同步定时器
updateSyncAlarm();

// 监听标签保存请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveTabs') {
    saveCurrentTabs(request.groupName).then((gistSync) => {
      sendResponse({ success: true, gistSync });
    }).catch((err) => {
      console.error('保存标签失败:', err);
      sendResponse({ success: false, error: err.message });
    });
    // 必须返回 true 以支持异步
    return true;
  }
});

// 保存当前窗口的标签
async function saveCurrentTabs(groupName) {
  console.log('开始保存标签，分组名：', groupName);
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const tabData = tabs.map(tab => ({
    url: tab.url,
    title: tab.title,
    timestamp: new Date().toISOString()
  }));
  console.log('待保存标签数据：', tabData);

  // 压缩数据
  const compressedData = compressData(tabData);
  console.log('压缩后数据：', compressedData);

  // 获取本地分组
  const result = await chrome.storage.local.get(['groups']);
  const groups = Array.isArray(result.groups) ? result.groups : [];
  groups.push({
    id: Date.now().toString(),
    name: groupName,
    lastModified: new Date().toISOString(),
    tabs: compressedData
  });
  await chrome.storage.local.set({ groups });
  console.log('保存到本地成功，groups 数量：', groups.length);
  // 触发同步，并返回同步结果
  const gistSync = await syncWithGist();
  return gistSync;
} 
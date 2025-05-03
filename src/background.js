// 导入必要的模块
import { syncWithGist } from './lib/storage.js';
import { encryptData } from './lib/crypto.js';
import CryptoJS from 'crypto-js';

// 初始化同步定时器
chrome.alarms.create('syncAlarm', {
  periodInMinutes: 10
});

// 监听同步定时器
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncAlarm') {
    syncWithGist();
  }
});

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

  // 获取或生成全局密钥
  let { cryptoKey } = await chrome.storage.local.get(['cryptoKey']);
  if (!cryptoKey) {
    cryptoKey = CryptoJS.lib.WordArray.random(32).toString();
    await chrome.storage.local.set({ cryptoKey });
    console.log('自动生成全局加密密钥');
  }

  // 加密数据
  const encryptedData = encryptData(tabData, cryptoKey);
  console.log('加密后数据：', encryptedData);

  // 获取本地分组
  const result = await chrome.storage.local.get(['groups']);
  const groups = Array.isArray(result.groups) ? result.groups : [];
  groups.push({
    id: Date.now().toString(),
    name: groupName,
    version: 1,
    lastModified: new Date().toISOString(),
    tabs: encryptedData // 只存加密字符串
  });
  await chrome.storage.local.set({ groups });
  console.log('保存到本地成功，groups 数量：', groups.length);
  // 触发同步，并返回同步结果
  const gistSync = await syncWithGist();
  return gistSync;
}

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  // 初始化存储
  chrome.storage.local.get(['groups', 'lastSync'], (result) => {
    if (!result.groups) {
      chrome.storage.local.set({ groups: [], lastSync: null });
    }
  });
}); 
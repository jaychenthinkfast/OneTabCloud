import { syncWithGist } from '../lib/storage.js';

// DOM 元素
const saveBtn = document.getElementById('saveBtn');
const syncBtn = document.getElementById('syncBtn');
const lastSyncSpan = document.getElementById('lastSync');
const viewAllBtn = document.getElementById('viewAllBtn');
const tipMsg = document.getElementById('tipMsg');

// 加载同步时间
async function loadStatus() {
  const result = await chrome.storage.local.get(['lastSync']);
  if (result.lastSync) {
    lastSyncSpan.textContent = new Date(result.lastSync).toLocaleString();
  }
}

// 自动生成分组名
function getAutoGroupName() {
  const now = new Date();
  return now.toLocaleString('zh-CN', { hour12: false });
}

function showTip(msg, type = 'success') {
  tipMsg.textContent = msg;
  tipMsg.className = `mt-2 text-center text-sm ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
  tipMsg.classList.remove('hidden');
  setTimeout(() => {
    tipMsg.classList.add('hidden');
  }, 1000);
}

// 保存标签
async function saveTabs() {
  const groupName = getAutoGroupName();
  try {
    const resp = await chrome.runtime.sendMessage({
      action: 'saveTabs',
      groupName: groupName
    });
    if (resp && resp.success) {
      showTip('标签保存成功！', 'success');
      await loadStatus();
      setTimeout(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });
      }, 1000);
    } else {
      showTip('保存标签失败：' + (resp && resp.error ? resp.error : '未知错误'), 'error');
    }
  } catch (error) {
    console.error('保存标签失败:', error);
    showTip('保存标签失败，请重试', 'error');
  }
}

// 跳转到查看全部页面
viewAllBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });
});

// 事件监听
saveBtn.addEventListener('click', saveTabs);
syncBtn.addEventListener('click', async () => {
  syncBtn.disabled = true;
  syncBtn.textContent = '同步中...';
  try {
    const { pat } = await chrome.storage.local.get(['pat']);
    if (!pat) {
      showTip('请先配置 GitHub PAT', 'error');
      setTimeout(() => {
        chrome.runtime.openOptionsPage();
      }, 1200);
      return;
    }
    await syncWithGist();
    await loadStatus();
    showTip('同步成功', 'success');
    setTimeout(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });
    }, 1000);
  } catch (error) {
    console.error('同步失败:', error);
    showTip('同步失败，请重试', 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = '立即同步';
  }
});

// 初始化
document.addEventListener('DOMContentLoaded', loadStatus); 
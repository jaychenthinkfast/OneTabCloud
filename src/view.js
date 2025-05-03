import { decryptData } from './lib/crypto.js';

const groupsContainer = document.getElementById('groupsContainer');

// 加载所有分组
async function loadGroups() {
  const result = await chrome.storage.local.get(['groups', 'cryptoKey']);
  let groups = result.groups || [];
  const cryptoKey = result.cryptoKey;
  groupsContainer.innerHTML = '';

  // 按 lastModified 倒序排列
  groups = groups.slice().sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

  if (groups.length === 0) {
    groupsContainer.innerHTML = '<div class="text-center text-gray-400">暂无分组</div>';
    return;
  }

  groups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'bg-white rounded-lg shadow p-4';

    // 分组头部
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    const title = document.createElement('div');
    title.className = 'font-bold text-lg text-gray-800';
    title.textContent = group.name;
    const time = document.createElement('span');
    time.className = 'text-xs text-gray-400 ml-2';
    time.textContent = new Date(group.lastModified).toLocaleString();
    title.appendChild(time);
    header.appendChild(title);

    // 操作按钮
    const btns = document.createElement('div');
    const restoreAllBtn = document.createElement('button');
    restoreAllBtn.className = 'px-2 py-1 bg-green-500 text-white rounded mr-2 hover:bg-green-600';
    restoreAllBtn.textContent = '恢复全部';
    restoreAllBtn.onclick = () => restoreAllTabs(group, cryptoKey);
    const deleteGroupBtn = document.createElement('button');
    deleteGroupBtn.className = 'px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600';
    deleteGroupBtn.textContent = '删除分组';
    deleteGroupBtn.onclick = () => deleteGroup(group.id);
    btns.appendChild(restoreAllBtn);
    btns.appendChild(deleteGroupBtn);
    header.appendChild(btns);
    groupDiv.appendChild(header);

    // 标签列表
    const tabsList = document.createElement('div');
    tabsList.className = 'space-y-1';
    let tabs = [];
    try {
      tabs = decryptData(group.tabs, cryptoKey);
    } catch (e) {
      tabsList.innerHTML = '<div class="text-red-400">标签解密失败</div>';
    }
    tabs.forEach((tab, idx) => {
      const tabDiv = document.createElement('div');
      tabDiv.className = 'flex items-center space-x-2';
      const link = document.createElement('a');
      link.href = tab.url;
      link.target = '_blank';
      link.className = 'text-blue-500 hover:underline truncate flex-1';
      link.textContent = tab.title;
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'text-green-500 hover:text-green-700';
      restoreBtn.textContent = '恢复';
      restoreBtn.onclick = () => restoreTab(tab.url);
      tabDiv.appendChild(link);
      tabDiv.appendChild(restoreBtn);
      tabsList.appendChild(tabDiv);
    });
    groupDiv.appendChild(tabsList);
    groupsContainer.appendChild(groupDiv);
  });
}

// 恢复单个标签
function restoreTab(url) {
  chrome.tabs.create({ url });
}

// 恢复整个分组
function restoreAllTabs(group, cryptoKey) {
  let tabs = [];
  try {
    tabs = decryptData(group.tabs, cryptoKey);
  } catch {}
  tabs.forEach(tab => {
    chrome.tabs.create({ url: tab.url });
  });
}

// 删除分组
async function deleteGroup(groupId) {
  if (!confirm('确定要删除该分组吗？')) return;
  const result = await chrome.storage.local.get(['groups']);
  const groups = (result.groups || []).filter(g => g.id !== groupId);
  await chrome.storage.local.set({ groups });
  loadGroups();
}

// // 删除单个标签（可选功能）
// async function deleteTabFromGroup(groupId, tabIdx) {
//   const result = await chrome.storage.local.get(['groups']);
//   const groups = result.groups || [];
//   const group = groups.find(g => g.id === groupId);
//   if (!group) return;
//   let tabs = decryptData(group.tabs);
//   tabs.splice(tabIdx, 1);
//   group.tabs = encryptData(tabs);
//   await chrome.storage.local.set({ groups });
//   loadGroups();
// }

document.addEventListener('DOMContentLoaded', loadGroups); 
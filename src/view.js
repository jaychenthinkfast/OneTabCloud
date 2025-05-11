import { decompressData, compressData } from './lib/crypto.js';

const groupsContainer = document.getElementById('groupsContainer');

// 加载所有分组
async function loadGroups() {
  const result = await chrome.storage.local.get(['groups']);
  let groups = result.groups || [];
  groupsContainer.innerHTML = '';

  // 过滤掉已删除的分组
  groups = groups.filter(group => !group.deleted);

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
    title.className = 'font-bold text-lg text-gray-800 flex items-center';
    title.textContent = group.name;
    
    // 添加编辑组名称按钮
    const editGroupBtn = document.createElement('button');
    editGroupBtn.className = 'ml-2 text-gray-500 hover:text-gray-700';
    editGroupBtn.innerHTML = '✎';
    editGroupBtn.onclick = () => editGroupName(group);
    title.appendChild(editGroupBtn);
    
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
    restoreAllBtn.onclick = () => restoreAllTabs(group);
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
      tabs = decompressData(group.tabs);
    } catch (e) {
      tabsList.innerHTML = '<div class="text-red-400">标签解压缩失败</div>';
    }
    tabs.forEach((tab, idx) => {
      const tabDiv = document.createElement('div');
      tabDiv.className = 'flex items-center space-x-2';
      
      // 创建链接容器
      const linkContainer = document.createElement('div');
      linkContainer.className = 'flex items-center flex-1';
      
      const link = document.createElement('a');
      link.href = tab.url;
      link.target = '_blank';
      link.className = 'text-blue-500 hover:underline truncate';
      link.textContent = tab.title;
      
      // 添加编辑标签名称按钮（移到链接外部）
      const editTabBtn = document.createElement('button');
      editTabBtn.className = 'ml-2 text-gray-500 hover:text-gray-700';
      editTabBtn.innerHTML = '✎';
      editTabBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        editTabTitle(group, tab, idx);
      };
      
      // 添加移动标签按钮
      const moveTabBtn = document.createElement('button');
      moveTabBtn.className = 'ml-2 text-gray-500 hover:text-gray-700';
      moveTabBtn.innerHTML = '↗';
      moveTabBtn.title = '移动到其他分组';
      moveTabBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        moveTabToGroup(group, tab, idx);
      };
      
      linkContainer.appendChild(link);
      linkContainer.appendChild(editTabBtn);
      linkContainer.appendChild(moveTabBtn);
      
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'text-green-500 hover:text-green-700';
      restoreBtn.textContent = '恢复';
      restoreBtn.onclick = () => restoreTab(tab.url);
      
      tabDiv.appendChild(linkContainer);
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
function restoreAllTabs(group) {
  let tabs = [];
  try {
    tabs = decompressData(group.tabs);
  } catch {}
  tabs.forEach(tab => {
    chrome.tabs.create({ url: tab.url });
  });
}

// 删除分组
async function deleteGroup(groupId) {
  if (!confirm('确定要删除该分组吗？')) return;
  
  const result = await chrome.storage.local.get(['groups']);
  const groups = (result.groups || []).map(g => {
    if (g.id === groupId) {
      return {
        ...g,
        deleted: true,
        tabs: [], // 清空 tabs
        lastModified: new Date().toISOString()
      };
    }
    return g;
  });
  
  await chrome.storage.local.set({ groups });
  loadGroups();
}

// 编辑组名称
async function editGroupName(group) {
  const newName = prompt('请输入新的组名称:', group.name);
  if (!newName || newName === group.name) return;
  
  const result = await chrome.storage.local.get(['groups']);
  const groups = result.groups || [];
  const updatedGroups = groups.map(g => {
    if (g.id === group.id) {
      return {
        ...g,
        name: newName,
        lastModified: new Date().toISOString()
      };
    }
    return g;
  });
  
  await chrome.storage.local.set({ groups: updatedGroups });
  loadGroups();
}

// 编辑标签标题
async function editTabTitle(group, tab, tabIndex) {
  const newTitle = prompt('请输入新的标签标题:', tab.title);
  if (!newTitle || newTitle === tab.title) return;
  
  const result = await chrome.storage.local.get(['groups']);
  const groups = result.groups || [];
  const updatedGroups = groups.map(g => {
    if (g.id === group.id) {
      let tabs = [];
      try {
        tabs = decompressData(g.tabs);
        tabs[tabIndex] = {
          ...tabs[tabIndex],
          title: newTitle
        };
        return {
          ...g,
          tabs: compressData(tabs),
          lastModified: new Date().toISOString()
        };
      } catch (e) {
        console.error('解压缩标签数据失败:', e);
        return g;
      }
    }
    return g;
  });
  
  await chrome.storage.local.set({ groups: updatedGroups });
  loadGroups();
}

// 移动标签到其他分组
async function moveTabToGroup(sourceGroup, tab, tabIndex) {
  // 获取所有分组
  const result = await chrome.storage.local.get(['groups']);
  const groups = result.groups || [];
  
  // 过滤掉源分组和已删除的分组
  const targetGroups = groups.filter(g => g.id !== sourceGroup.id && !g.deleted);
  
  if (targetGroups.length === 0) {
    alert('没有可用的目标分组');
    return;
  }
  
  // 创建选择列表
  const select = document.createElement('select');
  select.className = 'w-full p-2 border rounded';
  targetGroups.forEach(g => {
    const option = document.createElement('option');
    option.value = g.id;
    option.textContent = g.name;
    select.appendChild(option);
  });
  
  // 创建确认对话框
  const dialog = document.createElement('div');
  dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
  dialog.innerHTML = `
    <div class="bg-white p-4 rounded-lg shadow-lg w-96">
      <h3 class="text-lg font-bold mb-4">选择目标分组</h3>
      <div class="mb-4"></div>
      <div class="flex justify-end space-x-2">
        <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" id="cancelMove">取消</button>
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" id="confirmMove">移动</button>
      </div>
    </div>
  `;
  
  // 添加选择列表到对话框
  dialog.querySelector('.mb-4').appendChild(select);
  
  // 显示对话框
  document.body.appendChild(dialog);
  
  // 处理取消按钮
  dialog.querySelector('#cancelMove').onclick = () => {
    document.body.removeChild(dialog);
  };
  
  // 处理确认按钮
  dialog.querySelector('#confirmMove').onclick = async () => {
    const targetGroupId = select.value;
    const targetGroup = targetGroups.find(g => g.id === targetGroupId);
    
    if (!targetGroup) {
      alert('目标分组不存在');
      return;
    }
    
    try {
      // 从源分组移除标签
      const sourceTabs = decompressData(sourceGroup.tabs);
      const [movedTab] = sourceTabs.splice(tabIndex, 1);
      
      // 获取目标分组的标签
      const targetTabs = decompressData(targetGroup.tabs);
      targetTabs.push(movedTab);
      
      // 更新两个分组
      const updatedGroups = groups.map(g => {
        if (g.id === sourceGroup.id) {
          return {
            ...g,
            tabs: compressData(sourceTabs),
            lastModified: new Date().toISOString()
          };
        }
        if (g.id === targetGroupId) {
          return {
            ...g,
            tabs: compressData(targetTabs),
            lastModified: new Date().toISOString()
          };
        }
        return g;
      });
      
      // 保存更新
      await chrome.storage.local.set({ groups: updatedGroups });
      
      // 关闭对话框并刷新显示
      document.body.removeChild(dialog);
      loadGroups();
    } catch (error) {
      console.error('移动标签失败:', error);
      alert('移动标签失败，请重试');
    }
  };
}

document.addEventListener('DOMContentLoaded', loadGroups); 
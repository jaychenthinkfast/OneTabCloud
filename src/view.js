import { decompressData, compressData } from './lib/crypto.js';

const groupsContainer = document.getElementById('groupsContainer');
let allGroupsCache = null;

// 加载所有分组
async function loadGroups(filter = '') {
  const result = await chrome.storage.local.get(['groups']);
  let groups = result.groups || [];
  groupsContainer.innerHTML = '';

  // 过滤掉已删除的分组和解析tabs为空的分组
  groups = groups.filter(group => {
    if (group.deleted) return false;
    
    // 检查tabs是否为空或解析后为空数组
    try {
      if (!group.tabs) return false;
      const tabs = decompressData(group.tabs);
      return Array.isArray(tabs) && tabs.length > 0;
    } catch (e) {
      console.error('解析tabs失败:', e, group);
      return false;
    }
  });

  // 按 lastModified 倒序排列
  groups = groups.slice().sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

  // 缓存所有分组数据，便于搜索时使用
  if (!filter) allGroupsCache = groups;
  if (filter && allGroupsCache) groups = allGroupsCache;

  if (groups.length === 0) {
    groupsContainer.innerHTML = '<div class="text-center text-gray-400">暂无分组</div>';
    return;
  }

  let hasAnyGroup = false;
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
    
    // 添加新增链接按钮
    const addLinkBtn = document.createElement('button');
    addLinkBtn.className = 'ml-2 text-gray-500 hover:text-gray-700';
    addLinkBtn.innerHTML = '+';
    addLinkBtn.title = '添加新链接';
    addLinkBtn.onclick = () => addNewLink(group);
    title.appendChild(addLinkBtn);
    
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
    // 搜索过滤
    let filteredTabs = tabs;
    if (filter) {
      const kw = filter.trim().toLowerCase();
      filteredTabs = tabs.filter(tab =>
        (tab.title && tab.title.toLowerCase().includes(kw)) ||
        (tab.url && tab.url.toLowerCase().includes(kw))
      );
    }
    if (filteredTabs.length === 0) return; // 该分组无匹配标签则不渲染
    hasAnyGroup = true;
    filteredTabs.forEach((tab, idx) => {
      const tabDiv = document.createElement('div');
      tabDiv.className = 'flex justify-between items-center space-x-2 tab-row';
      tabDiv.draggable = true;
      tabDiv.dataset.tabIndex = idx;
      tabDiv.dataset.groupId = group.id;
      
      // 拖拽开始事件
      tabDiv.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          groupId: group.id,
          tabIndex: idx,
          tab: tab
        }));
        tabDiv.classList.add('dragging');
      });
      
      // 拖拽结束事件
      tabDiv.addEventListener('dragend', () => {
        tabDiv.classList.remove('dragging');
        document.querySelectorAll('.group-drop-target').forEach(el => {
          el.classList.remove('drag-over');
        });
      });
      
      // 创建链接容器
      const linkContainer = document.createElement('div');
      linkContainer.className = 'flex items-center flex-1 min-w-0';
      
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
      
      // 按钮组
      const btnGroup = document.createElement('div');
      btnGroup.className = 'flex space-x-2 flex-shrink-0';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'text-red-500 hover:text-red-700 tab-delete-btn';
      deleteBtn.textContent = '删除';
      deleteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteTab(group, tab, idx);
      };

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'text-green-500 hover:text-green-700 tab-restore-btn';
      restoreBtn.textContent = '恢复';
      restoreBtn.onclick = () => restoreTab(tab.url);

      btnGroup.appendChild(deleteBtn);
      btnGroup.appendChild(restoreBtn);

      tabDiv.appendChild(linkContainer);
      tabDiv.appendChild(btnGroup);
      tabsList.appendChild(tabDiv);
    });
    groupDiv.appendChild(tabsList);
    groupsContainer.appendChild(groupDiv);
    
    // 为每个分组添加拖拽目标事件
    groupDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingTab = document.querySelector('.dragging');
      if (draggingTab && draggingTab.dataset.groupId !== group.id) {
        groupDiv.classList.add('group-drop-target', 'drag-over');
      }
    });
    
    groupDiv.addEventListener('dragleave', () => {
      groupDiv.classList.remove('group-drop-target', 'drag-over');
    });
    
    groupDiv.addEventListener('drop', async (e) => {
      e.preventDefault();
      groupDiv.classList.remove('group-drop-target', 'drag-over');
      
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.groupId === group.id) return; // 不能拖到同一个分组
        
        // 从源分组移除标签
        const sourceGroup = groups.find(g => g.id === data.groupId);
        if (!sourceGroup) return;
        
        const sourceTabs = decompressData(sourceGroup.tabs);
        const [movedTab] = sourceTabs.splice(data.tabIndex, 1);
        
        // 获取目标分组的标签
        const targetTabs = decompressData(group.tabs);
        targetTabs.push(movedTab);
        
        // 更新两个分组
        const updatedGroups = groups.map(g => {
          if (g.id === sourceGroup.id) {
            // 如果源分组变为空，标记为删除
            if (sourceTabs.length === 0) {
              return {
                ...g,
                deleted: true,
                tabs: compressData([]),
                lastModified: new Date().toISOString()
              };
            }
            return {
              ...g,
              tabs: compressData(sourceTabs),
              lastModified: new Date().toISOString()
            };
          }
          if (g.id === group.id) {
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
        loadGroups();
      } catch (error) {
        console.error('移动标签失败:', error);
        alert('移动标签失败，请重试');
      }
    });
  });
  if (!hasAnyGroup) {
    groupsContainer.innerHTML = '<div class="text-center text-gray-400">无匹配结果</div>';
  }
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
  const targetGroups = groups.filter(g => {
    if (g.id === sourceGroup.id || g.deleted) return false;
    
    // 过滤掉解析tabs为空的分组
    try {
      const tabs = decompressData(g.tabs);
      return Array.isArray(tabs) && tabs.length > 0;
    } catch (e) {
      return false; // 解析失败的分组也过滤掉
    }
  });
  
  if (targetGroups.length === 0) {
    alert('没有可用的目标分组');
    return;
  }
  
  // 创建选择列表
  const select = document.createElement('select');
  select.className = 'p-2 border rounded max-w-xs flex-1';
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
      <h3 class="text-base font-bold mb-2" style="white-space:nowrap;font-size:14px;">选择目标分组（也可直接拖拽标签到目标分组）</h3>
      <div class="mb-4 flex">
        <!-- select 会被插入到这里 -->
      </div>
      <div class="flex justify-end space-x-2">
        <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" id="cancelMove">取消</button>
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" id="confirmMove">移动</button>
      </div>
    </div>
  `;
  // 设置 select 的 class，限制最大宽度
  select.className = 'p-2 border rounded max-w-xs flex-1';
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
          // 如果源分组变为空，标记为删除
          if (sourceTabs.length === 0) {
            return {
              ...g,
              deleted: true,
              tabs: compressData([]),
              lastModified: new Date().toISOString()
            };
          }
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

// 删除单个标签
async function deleteTab(group, tab, tabIndex) {
  if (!confirm('确定要删除该标签吗？')) return;
  const result = await chrome.storage.local.get(['groups']);
  const groups = result.groups || [];
  const updatedGroups = groups.map(g => {
    if (g.id === group.id) {
      let tabs = [];
      try {
        tabs = decompressData(g.tabs);
        tabs.splice(tabIndex, 1);
        
        // 如果分组变为空，标记为删除
        if (tabs.length === 0) {
          return {
            ...g,
            deleted: true,
            tabs: compressData([]),
            lastModified: new Date().toISOString()
          };
        }
        
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
  loadGroups(document.getElementById('searchInput')?.value || '');
}

// 添加新链接到分组
async function addNewLink(group) {
  // 创建对话框
  const dialog = document.createElement('div');
  dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
  dialog.innerHTML = `
    <div class="bg-white p-4 rounded-lg shadow-lg w-96">
      <h3 class="text-base font-bold mb-2">添加新链接到 "${group.name}" 分组</h3>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">链接标题 (可选)</label>
        <input type="text" id="newLinkTitle" class="w-full p-2 border rounded" placeholder="请输入链接标题，留空则使用链接地址">
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">链接地址</label>
        <input type="url" id="newLinkUrl" class="w-full p-2 border rounded" placeholder="请输入链接地址 (https://...)">
      </div>
      <div class="flex justify-end space-x-2">
        <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" id="cancelAddLink">取消</button>
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" id="confirmAddLink">添加</button>
      </div>
    </div>
  `;
  
  // 显示对话框
  document.body.appendChild(dialog);
  
  // 获取输入框引用
  const titleInput = dialog.querySelector('#newLinkTitle');
  const urlInput = dialog.querySelector('#newLinkUrl');
  
  // 设置URL输入框默认获取焦点
  urlInput.focus();
  
  // 处理取消按钮
  dialog.querySelector('#cancelAddLink').onclick = () => {
    document.body.removeChild(dialog);
  };
  
  // 添加回车键提交功能
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      dialog.querySelector('#confirmAddLink').click();
    }
  });
  
  titleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      urlInput.focus();
    }
  });
  
  // 处理确认按钮
  dialog.querySelector('#confirmAddLink').onclick = async () => {
    const newTitle = titleInput.value.trim();
    let newUrl = urlInput.value.trim();
    
    // 验证URL
    if (!newUrl) {
      alert('请输入链接地址');
      urlInput.focus();
      return;
    }
    
    // 如果URL没有协议前缀，添加https://
    if (!/^https?:\/\//i.test(newUrl)) {
      newUrl = 'https://' + newUrl;
    }
    
    // 如果没有输入标题，使用URL作为标题
    const linkTitle = newTitle || newUrl;
    
    try {
      // 获取分组的标签
      const result = await chrome.storage.local.get(['groups']);
      const groups = result.groups || [];
      const currentGroup = groups.find(g => g.id === group.id);
      
      if (!currentGroup) {
        alert('分组不存在');
        document.body.removeChild(dialog);
        return;
      }
      
      // 解压标签数据
      const tabs = decompressData(currentGroup.tabs);
      
      // 添加新链接
      tabs.push({
        title: linkTitle,
        url: newUrl
      });
      
      // 更新分组
      const updatedGroups = groups.map(g => {
        if (g.id === group.id) {
          return {
            ...g,
            tabs: compressData(tabs),
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
      console.error('添加链接失败:', error);
      alert('添加链接失败，请重试');
    }
  };
}

// 搜索框监听
document.addEventListener('DOMContentLoaded', () => {
  loadGroups();
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      loadGroups(e.target.value);
    });
  }
}); 
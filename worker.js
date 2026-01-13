// 逃离锈钴城 - Cloudflare Worker
// 处理玩家数据存储、排行榜和荣誉榜

// 环境变量绑定
const PLAYERS_KV = PLAYERS; // 玩家数据 KV 命名空间
const RANKINGS_KV = RANKINGS; // 排行榜 KV 命名空间
const HONOR_KV = HONOR; // 荣誉榜 KV 命名空间

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// 游戏配置
const GAME_CONFIG = {
  maxRankings: 100, // 排行榜最大数量
  maxHonor: 50, // 荣誉榜最大数量
  dailyResetTime: '00:00', // 每日重置时间（UTC）
  rankingUpdateInterval: 300 // 排行榜更新间隔（秒）
};

// 辅助函数：生成响应
function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

// 辅助函数：错误响应
function createErrorResponse(message, status = 400) {
  return createResponse({ error: true, message }, status);
}

// 辅助函数：验证请求数据
function validateRequest(request, method = 'GET', requiredFields = []) {
  if (request.method !== method) {
    return { valid: false, error: `Method ${request.method} not allowed` };
  }
  
  return { valid: true };
}

// 获取当前 UTC 时间戳
function getUTCTimestamp() {
  return new Date().toISOString();
}

// 计算玩家总属性
function calculateTotalAttributes(attributes) {
  if (!attributes) return 0;
  return Object.values(attributes).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
}

// 生成玩家唯一 ID
function generatePlayerId(playerCode) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${playerCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${timestamp}_${random}`;
}

// 处理 CORS 预检请求
async function handleOptions(request) {
  return new Response(null, {
    headers: corsHeaders
  });
}

// 保存玩家数据
async function handleSavePlayer(request) {
  try {
    const data = await request.json();
    const { playerId, playerData } = data;
    
    if (!playerId || !playerData) {
      return createErrorResponse('缺少 playerId 或 playerData');
    }
    
    // 更新最后活跃时间
    playerData.lastActive = getUTCTimestamp();
    playerData.updatedAt = getUTCTimestamp();
    
    // 计算总属性
    if (playerData.attributes) {
      playerData.totalAttributes = calculateTotalAttributes(playerData.attributes);
    }
    
    // 保存到 KV
    await PLAYERS_KV.put(playerId, JSON.stringify(playerData));
    
    // 如果是活跃游戏且不是结局状态，更新排行榜
    if (playerData.isGameActive && playerData.buildProgress < 100) {
      await updateRankings(playerId, playerData);
    }
    
    return createResponse({
      success: true,
      message: '玩家数据保存成功',
      playerId,
      timestamp: playerData.updatedAt
    });
    
  } catch (error) {
    console.error('保存玩家数据失败:', error);
    return createErrorResponse('保存失败: ' + error.message, 500);
  }
}

// 加载玩家数据
async function handleLoadPlayer(request) {
  try {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');
    
    if (!playerId) {
      return createErrorResponse('缺少 playerId');
    }
    
    const playerData = await PLAYERS_KV.get(playerId, 'json');
    
    if (!playerData) {
      return createErrorResponse('玩家数据不存在', 404);
    }
    
    return createResponse({
      success: true,
      playerData
    });
    
  } catch (error) {
    console.error('加载玩家数据失败:', error);
    return createErrorResponse('加载失败: ' + error.message, 500);
  }
}

// 更新排行榜
async function updateRankings(playerId, playerData) {
  try {
    const rankingEntry = {
      playerId,
      playerCode: playerData.player?.code || '未知',
      profession: playerData.player?.profession || 'unknown',
      totalAttributes: playerData.totalAttributes || 0,
      buildProgress: playerData.buildProgress || 0,
      gold: playerData.gold || 0,
      currentDay: playerData.currentDay || 1,
      lastActive: playerData.lastActive || getUTCTimestamp()
    };
    
    // 获取当前排行榜
    let rankings = await RANKINGS_KV.get('live_rankings', 'json') || [];
    
    // 查找现有条目或添加新条目
    const existingIndex = rankings.findIndex(item => item.playerId === playerId);
    
    if (existingIndex >= 0) {
      // 更新现有条目
      rankings[existingIndex] = rankingEntry;
    } else {
      // 添加新条目
      rankings.push(rankingEntry);
      
      // 限制排行榜大小
      if (rankings.length > GAME_CONFIG.maxRankings) {
        // 按总属性排序，保留最高的
        rankings.sort((a, b) => b.totalAttributes - a.totalAttributes);
        rankings = rankings.slice(0, GAME_CONFIG.maxRankings);
      }
    }
    
    // 按总属性排序
    rankings.sort((a, b) => b.totalAttributes - a.totalAttributes);
    
    // 保存回 KV
    await RANKINGS_KV.put('live_rankings', JSON.stringify(rankings));
    
    return true;
  } catch (error) {
    console.error('更新排行榜失败:', error);
    return false;
  }
}

// 获取实时排行榜
async function handleGetRankings(request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    
    let rankings = await RANKINGS_KV.get('live_rankings', 'json') || [];
    
    // 过滤掉长时间未活跃的玩家（超过7天）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    rankings = rankings.filter(player => player.lastActive > sevenDaysAgo);
    
    // 重新排序并分页
    rankings.sort((a, b) => b.totalAttributes - a.totalAttributes);
    const paginatedRankings = rankings.slice(offset, offset + limit);
    
    // 添加排名
    const rankingsWithPosition = paginatedRankings.map((player, index) => ({
      ...player,
      position: offset + index + 1
    }));
    
    return createResponse({
      success: true,
      rankings: rankingsWithPosition,
      total: rankings.length,
      offset,
      limit
    });
    
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return createErrorResponse('获取排行榜失败: ' + error.message, 500);
  }
}

// 获取荣誉榜
async function handleGetHonor(request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    
    let honorList = await HONOR_KV.get('honor_list', 'json') || [];
    
    // 按日期排序（最新的在前）
    honorList.sort((a, b) => new Date(b.escapeDate) - new Date(a.escapeDate));
    
    // 分页
    const paginatedHonor = honorList.slice(offset, offset + limit);
    
    return createResponse({
      success: true,
      honorList: paginatedHonor,
      total: honorList.length,
      offset,
      limit
    });
    
  } catch (error) {
    console.error('获取荣誉榜失败:', error);
    return createErrorResponse('获取荣誉榜失败: ' + error.message, 500);
  }
}

// 提交到荣誉榜
async function handleSubmitToHonor(request) {
  try {
    const data = await request.json();
    const { playerId, playerData } = data;
    
    if (!playerId || !playerData) {
      return createErrorResponse('缺少 playerId 或 playerData');
    }
    
    // 验证是否真的成功逃离（建造进度100%）
    if (playerData.buildProgress < 100) {
      return createErrorResponse('建造进度未达到100%，无法进入荣誉榜');
    }
    
    // 创建荣誉记录
    const honorRecord = {
      playerId,
      playerCode: playerData.player?.code || '未知',
      profession: playerData.player?.profession || 'unknown',
      escapeDate: getUTCTimestamp(),
      daysUsed: playerData.currentDay || 30,
      buildProgress: playerData.buildProgress,
      totalAttributes: playerData.totalAttributes || calculateTotalAttributes(playerData.player?.attributes),
      finalGold: playerData.gold || 0,
      attributes: playerData.player?.attributes || {}
    };
    
    // 获取当前荣誉榜
    let honorList = await HONOR_KV.get('honor_list', 'json') || [];
    
    // 检查是否已存在（避免重复提交）
    const exists = honorList.some(record => record.playerId === playerId);
    if (exists) {
      return createErrorResponse('该玩家已存在于荣誉榜中');
    }
    
    // 添加到荣誉榜
    honorList.push(honorRecord);
    
    // 限制荣誉榜大小
    if (honorList.length > GAME_CONFIG.maxHonor) {
      // 保留最新的记录
      honorList.sort((a, b) => new Date(b.escapeDate) - new Date(a.escapeDate));
      honorList = honorList.slice(0, GAME_CONFIG.maxHonor);
    }
    
    // 保存回 KV
    await HONOR_KV.put('honor_list', JSON.stringify(honorList));
    
    // 从实时排行榜中移除（如果存在）
    await removeFromRankings(playerId);
    
    return createResponse({
      success: true,
      message: '成功添加到荣誉榜',
      honorRecord
    });
    
  } catch (error) {
    console.error('提交到荣誉榜失败:', error);
    return createErrorResponse('提交失败: ' + error.message, 500);
  }
}

// 从排行榜中移除玩家
async function removeFromRankings(playerId) {
  try {
    let rankings = await RANKINGS_KV.get('live_rankings', 'json') || [];
    rankings = rankings.filter(player => player.playerId !== playerId);
    await RANKINGS_KV.put('live_rankings', JSON.stringify(rankings));
    return true;
  } catch (error) {
    console.error('从排行榜移除失败:', error);
    return false;
  }
}

// 清理过期数据
async function cleanupExpiredData() {
  try {
    // 清理超过30天未活跃的玩家数据
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // 获取所有玩家键名
    const playerKeys = await PLAYERS_KV.list();
    
    for (const key of playerKeys.keys) {
      const playerData = await PLAYERS_KV.get(key.name, 'json');
      if (playerData && playerData.lastActive && playerData.lastActive < thirtyDaysAgo) {
        // 删除过期玩家数据
        await PLAYERS_KV.delete(key.name);
        
        // 从排行榜中移除
        const playerId = key.name;
        await removeFromRankings(playerId);
      }
    }
    
    console.log('过期数据清理完成');
    return true;
  } catch (error) {
    console.error('清理过期数据失败:', error);
    return false;
  }
}

// 获取游戏统计
async function handleGetStats(request) {
  try {
    // 获取玩家总数
    const playerKeys = await PLAYERS_KV.list();
    const totalPlayers = playerKeys.keys.length;
    
    // 获取活跃玩家数（7天内）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let activePlayers = 0;
    
    for (const key of playerKeys.keys) {
      const playerData = await PLAYERS_KV.get(key.name, 'json');
      if (playerData && playerData.lastActive && playerData.lastActive > sevenDaysAgo) {
        activePlayers++;
      }
    }
    
    // 获取荣誉榜人数
    const honorList = await HONOR_KV.get('honor_list', 'json') || [];
    const honorCount = honorList.length;
    
    // 获取排行榜人数
    const rankings = await RANKINGS_KV.get('live_rankings', 'json') || [];
    const rankingCount = rankings.length;
    
    // 计算平均属性
    let totalAttributesSum = 0;
    let playersWithAttributes = 0;
    
    for (const key of playerKeys.keys) {
      const playerData = await PLAYERS_KV.get(key.name, 'json');
      if (playerData && playerData.totalAttributes) {
        totalAttributesSum += playerData.totalAttributes;
        playersWithAttributes++;
      }
    }
    
    const avgAttributes = playersWithAttributes > 0 
      ? Math.round(totalAttributesSum / playersWithAttributes) 
      : 0;
    
    // 统计职业分布
    const professionStats = {};
    for (const key of playerKeys.keys) {
      const playerData = await PLAYERS_KV.get(key.name, 'json');
      if (playerData && playerData.player && playerData.player.profession) {
        const profession = playerData.player.profession;
        professionStats[profession] = (professionStats[profession] || 0) + 1;
      }
    }
    
    return createResponse({
      success: true,
      stats: {
        totalPlayers,
        activePlayers,
        honorCount,
        rankingCount,
        avgAttributes,
        professionStats,
        lastUpdated: getUTCTimestamp()
      }
    });
    
  } catch (error) {
    console.error('获取游戏统计失败:', error);
    return createErrorResponse('获取统计失败: ' + error.message, 500);
  }
}

// 重置玩家数据（仅用于测试/管理）
async function handleResetPlayer(request) {
  try {
    // 简单的授权检查（在实际应用中应使用更安全的认证）
    const url = new URL(request.url);
    const authToken = url.searchParams.get('auth');
    const adminToken = await HONOR_KV.get('admin_token');
    
    if (!adminToken || authToken !== adminToken) {
      return createErrorResponse('未授权', 401);
    }
    
    const data = await request.json();
    const { playerId } = data;
    
    if (!playerId) {
      return createErrorResponse('缺少 playerId');
    }
    
    // 删除玩家数据
    await PLAYERS_KV.delete(playerId);
    
    // 从排行榜中移除
    await removeFromRankings(playerId);
    
    return createResponse({
      success: true,
      message: `玩家 ${playerId} 数据已重置`
    });
    
  } catch (error) {
    console.error('重置玩家数据失败:', error);
    return createErrorResponse('重置失败: ' + error.message, 500);
  }
}

// 每日任务：清理过期数据，更新排行榜等
async function handleDailyCron() {
  await cleanupExpiredData();
  
  // 更新排行榜排名
  const rankings = await RANKINGS_KV.get('live_rankings', 'json') || [];
  rankings.sort((a, b) => b.totalAttributes - a.totalAttributes);
  await RANKINGS_KV.put('live_rankings', JSON.stringify(rankings));
  
  return createResponse({
    success: true,
    message: '每日任务执行完成',
    tasksCompleted: ['cleanup', 'ranking_update'],
    timestamp: getUTCTimestamp()
  });
}

// 主请求处理
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // CORS 预检请求
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }
  
  // API 路由
  switch (path) {
    case '/api/save':
      return handleSavePlayer(request);
      
    case '/api/load':
      return handleLoadPlayer(request);
      
    case '/api/rankings':
      return handleGetRankings(request);
      
    case '/api/honor':
      return handleGetHonor(request);
      
    case '/api/honor/submit':
      return handleSubmitToHonor(request);
      
    case '/api/stats':
      return handleGetStats(request);
      
    case '/api/admin/reset':
      return handleResetPlayer(request);
      
    case '/api/cron/daily':
      // 通常由 Cloudflare Cron Trigger 调用
      return handleDailyCron();
      
    case '/':
      // 根路径返回 API 信息
      return createResponse({
        name: '逃离锈钴城 API',
        version: '1.0.0',
        endpoints: [
          { path: '/api/save', method: 'POST', description: '保存玩家数据' },
          { path: '/api/load', method: 'GET', description: '加载玩家数据' },
          { path: '/api/rankings', method: 'GET', description: '获取实时排行榜' },
          { path: '/api/honor', method: 'GET', description: '获取荣誉榜' },
          { path: '/api/honor/submit', method: 'POST', description: '提交到荣誉榜' },
          { path: '/api/stats', method: 'GET', description: '获取游戏统计' },
          { path: '/api/admin/reset', method: 'POST', description: '重置玩家数据（需授权）' }
        ],
        documentation: 'https://github.com/your-username/escape-rust-cobalt-city'
      });
      
    default:
      return createErrorResponse('路由未找到', 404);
  }
}

// 事件监听器
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// 监听 Cron Trigger（每日执行）
addEventListener('scheduled', event => {
  event.waitUntil(handleDailyCron());
});
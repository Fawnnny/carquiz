// 荣誉榜API
export async function onRequest(context) {
    const { request, env } = context;
    
    try {
        switch (request.method) {
            case 'GET':
                return handleGet(request, env);
            case 'POST':
                return handlePost(request, env);
            default:
                return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                    status: 405,
                    headers: { 'Content-Type': 'application/json' },
                });
        }
    } catch (error) {
        console.error('Honor API error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// 获取荣誉榜
async function handleGet(request, env) {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    
    // 获取荣誉榜列表
    const honorList = await env.HONOR.get('honor_list');
    if (!honorList) {
        return new Response(JSON.stringify({ 
            honors: [],
            total: 0,
            limit,
            offset
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    const honorIds = JSON.parse(honorList);
    
    // 分页
    const paginatedIds = honorIds.slice(offset, offset + limit);
    const honors = [];
    
    for (const id of paginatedIds) {
        const honorData = await env.HONOR.get(id);
        if (honorData) {
            honors.push(JSON.parse(honorData));
        }
    }
    
    // 按日期排序（最新的在前）
    honors.sort((a, b) => new Date(b.escapedAt) - new Date(a.escapedAt));
    
    // 添加荣誉排名
    const rankedHonors = honors.map((honor, index) => ({
        honorRank: index + 1 + offset,
        ...honor
    }));
    
    return new Response(JSON.stringify({
        honors: rankedHonors,
        total: honorIds.length,
        limit,
        offset
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

// 添加荣誉记录（玩家成功逃离）
async function handlePost(request, env) {
    try {
        const honorData = await request.json();
        
        // 验证必需字段
        if (!honorData.playerId || !honorData.playerName || !honorData.playerCode) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 检查是否已经存在
        const existingHonor = await env.HONOR.get(honorData.playerId);
        if (existingHonor) {
            return new Response(JSON.stringify({ 
                error: 'Player already in honor list',
                honor: JSON.parse(existingHonor)
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 添加时间戳
        const completeHonorData = {
            ...honorData,
            escapedAt: new Date().toISOString(),
            addedAt: new Date().toISOString()
        };
        
        // 保存荣誉记录
        await env.HONOR.put(honorData.playerId, JSON.stringify(completeHonorData));
        
        // 更新荣誉列表
        const honorList = await env.HONOR.get('honor_list');
        let honorIds = honorList ? JSON.parse(honorList) : [];
        
        // 添加到列表开头
        honorIds.unshift(honorData.playerId);
        
        // 限制列表长度（最多保留1000条记录）
        if (honorIds.length > 1000) {
            const oldId = honorIds.pop();
            await env.HONOR.delete(oldId);
        }
        
        await env.HONOR.put('honor_list', JSON.stringify(honorIds));
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Honor record added',
            honor: completeHonorData
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Add honor error:', error);
        return new Response(JSON.stringify({ error: 'Invalid JSON data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

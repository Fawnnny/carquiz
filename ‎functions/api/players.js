// 玩家数据API
export async function onRequest(context) {
    const { request, env } = context;
    
    try {
        // 根据请求方法处理
        switch (request.method) {
            case 'GET':
                return handleGet(request, env);
            case 'POST':
                return handlePost(request, env);
            case 'PUT':
                return handlePut(request, env);
            case 'DELETE':
                return handleDelete(request, env);
            default:
                return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                    status: 405,
                    headers: { 'Content-Type': 'application/json' },
                });
        }
    } catch (error) {
        console.error('Player API error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// 获取玩家数据
async function handleGet(request, env) {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('id');
    const playerCode = url.searchParams.get('code');
    
    if (!playerId && !playerCode) {
        // 获取所有玩家
        const players = [];
        
        // 注意：KV不支持直接获取所有键值对，需要维护一个索引
        const playerList = await env.PLAYERS.get('player_list');
        if (playerList) {
            const playerIds = JSON.parse(playerList);
            for (const id of playerIds) {
                const playerData = await env.PLAYERS.get(id);
                if (playerData) {
                    players.push(JSON.parse(playerData));
                }
            }
        }
        
        return new Response(JSON.stringify({ players }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // 根据ID获取特定玩家
    if (playerId) {
        const playerData = await env.PLAYERS.get(playerId);
        if (!playerData) {
            return new Response(JSON.stringify({ error: 'Player not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(playerData, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // 根据代号搜索玩家（这是一个简化的实现，实际应用中可能需要更好的搜索机制）
    if (playerCode) {
        const playerList = await env.PLAYERS.get('player_list');
        if (!playerList) {
            return new Response(JSON.stringify({ players: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const playerIds = JSON.parse(playerList);
        const matchingPlayers = [];
        
        for (const id of playerIds) {
            const playerData = await env.PLAYERS.get(id);
            if (playerData) {
                const player = JSON.parse(playerData);
                if (player.code.toLowerCase().includes(playerCode.toLowerCase())) {
                    matchingPlayers.push(player);
                }
            }
        }
        
        return new Response(JSON.stringify({ players: matchingPlayers }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
    });
}

// 创建新玩家
async function handlePost(request, env) {
    try {
        const playerData = await request.json();
        
        // 验证必需字段
        if (!playerData.id || !playerData.code || !playerData.profession) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 检查玩家是否已存在
        const existingPlayer = await env.PLAYERS.get(playerData.id);
        if (existingPlayer) {
            return new Response(JSON.stringify({ error: 'Player already exists' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 添加创建时间
        playerData.createdAt = new Date().toISOString();
        playerData.updatedAt = playerData.createdAt;
        playerData.lastActive = playerData.createdAt;
        
        // 保存玩家数据
        await env.PLAYERS.put(playerData.id, JSON.stringify(playerData));
        
        // 更新玩家列表
        const playerList = await env.PLAYERS.get('player_list');
        let playerIds = playerList ? JSON.parse(playerList) : [];
        
        // 避免重复添加
        if (!playerIds.includes(playerData.id)) {
            playerIds.push(playerData.id);
            await env.PLAYERS.put('player_list', JSON.stringify(playerIds));
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Player created',
            player: playerData
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Create player error:', error);
        return new Response(JSON.stringify({ error: 'Invalid JSON data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// 更新玩家数据
async function handlePut(request, env) {
    try {
        const url = new URL(request.url);
        const playerId = url.searchParams.get('id');
        
        if (!playerId) {
            return new Response(JSON.stringify({ error: 'Player ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 检查玩家是否存在
        const existingPlayer = await env.PLAYERS.get(playerId);
        if (!existingPlayer) {
            return new Response(JSON.stringify({ error: 'Player not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const updateData = await request.json();
        const player = JSON.parse(existingPlayer);
        
        // 更新玩家数据
        const updatedPlayer = {
            ...player,
            ...updateData,
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };
        
        // 保存更新
        await env.PLAYERS.put(playerId, JSON.stringify(updatedPlayer));
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Player updated',
            player: updatedPlayer
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Update player error:', error);
        return new Response(JSON.stringify({ error: 'Invalid JSON data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// 删除玩家数据
async function handleDelete(request, env) {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('id');
    
    if (!playerId) {
        return new Response(JSON.stringify({ error: 'Player ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // 检查玩家是否存在
    const existingPlayer = await env.PLAYERS.get(playerId);
    if (!existingPlayer) {
        return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // 删除玩家数据
    await env.PLAYERS.delete(playerId);
    
    // 从玩家列表中移除
    const playerList = await env.PLAYERS.get('player_list');
    if (playerList) {
        let playerIds = JSON.parse(playerList);
        playerIds = playerIds.filter(id => id !== playerId);
        await env.PLAYERS.put('player_list', JSON.stringify(playerIds));
    }
    
    return new Response(JSON.stringify({ 
        success: true, 
        message: 'Player deleted'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
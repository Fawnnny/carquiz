// 排行榜API
export async function onRequest(context) {
    const { request, env } = context;
    
    try {
        // 只允许GET方法
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit')) || 100;
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        
        // 获取所有玩家
        const players = [];
        const playerList = await env.PLAYERS.get('player_list');
        
        if (playerList) {
            const playerIds = JSON.parse(playerList);
            
            // 限制获取数量以提高性能
            const limitedIds = playerIds.slice(offset, offset + Math.min(limit, 100));
            
            for (const id of limitedIds) {
                const playerData = await env.PLAYERS.get(id);
                if (playerData) {
                    const player = JSON.parse(playerData);
                    
                    // 只包含活跃玩家（最近7天活跃）
                    const lastActive = new Date(player.lastActive || player.createdAt);
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    
                    if (lastActive >= sevenDaysAgo) {
                        // 计算总属性值
                        const totalAttributes = (
                            (player.intelligence || 0) +
                            (player.strength || 0) +
                            (player.communication || 0) +
                            (player.charm || 0) +
                            (player.luck || 0)
                        );
                        
                        players.push({
                            id: player.id,
                            code: player.code,
                            profession: player.profession,
                            buildProgress: player.buildProgress || 0,
                            gold: player.gold || 0,
                            totalAttributes,
                            day: player.day || 1,
                            lastActive: player.lastActive || player.createdAt
                        });
                    }
                }
            }
        }
        
        // 按建造进度排序
        players.sort((a, b) => b.buildProgress - a.buildProgress);
        
        // 添加排名
        const rankedPlayers = players.map((player, index) => ({
            rank: index + 1 + offset,
            ...player
        }));
        
        return new Response(JSON.stringify({
            rankings: rankedPlayers,
            total: players.length,
            limit,
            offset
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Rankings API error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
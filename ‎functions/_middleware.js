// 全局中间件 - 处理CORS和错误
export async function onRequest(context) {
    try {
        // 设置CORS头
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        };

        // 处理预检请求
        if (context.request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: corsHeaders,
            });
        }

        // 执行下一个处理器
        const response = await context.next();

        // 添加CORS头到响应
        for (const [key, value] of Object.entries(corsHeaders)) {
            response.headers.set(key, value);
        }

        return response;
    } catch (error) {
        console.error('Middleware error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
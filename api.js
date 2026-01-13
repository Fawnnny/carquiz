// 逃离锈钴城 - API 接口层

// API配置
const API_CONFIG = {
    // AI API 配置（根据实际情况修改）
    AI_API_URL: 'https://api.example-ai-service.com/v1/chat/completions', // 替换为实际的AI API URL
    AI_API_KEY: 'sk-example-api-key-1234567890abcdef', // 替换为实际的API密钥
    
    // Cloudflare Worker URL（根据实际情况修改）
    CF_WORKER_URL: 'https://carquiz-a35.pages.dev/',
    
    // 本地模拟模式（当没有真实API时使用）
    SIMULATION_MODE: true,
    
    // 请求超时时间（毫秒）
    TIMEOUT: 10000
};

// 模拟响应延迟（开发用）
const SIMULATE_DELAY = true;
const MIN_DELAY = 500;
const MAX_DELAY = 1500;

// AI服务封装
class AIService {
    constructor() {
        this.history = [];
        this.maxHistoryLength = 150;
    }

    // 生成导入剧情
    async generateStory(characterData, background) {
        if (API_CONFIG.SIMULATION_MODE) {
            return this.simulateStory(characterData, background);
        }

        try {
            const prompt = `你是一个游戏剧情生成AI。请根据以下信息生成一段50字的玩家背景故事和50字的TL001系统任务介绍：

玩家信息：
- 代号：${characterData.code}
- 性别：${characterData.gender === 'male' ? '男' : '女'}
- 职业：${this.getProfessionChinese(characterData.profession)}
- 属性：智力${characterData.attributes.intelligence}, 武力${characterData.attributes.strength}, 交际${characterData.attributes.communication}, 气质${characterData.attributes.charm}, 幸运${characterData.attributes.luck}

游戏背景：${background}

请用中文生成两段文字，每段约50字：
第一段：玩家背景故事（使用第二人称"你"）
第二段：TL001系统介绍主线任务

格式：
玩家背景：...（约50字）
TL001系统：...（约50字）`;

            const response = await this.callAIAPI(prompt, 200);
            
            if (response && response.choices && response.choices.length > 0) {
                const text = response.choices[0].message.content;
                return this.parseStoryResponse(text);
            } else {
                return this.simulateStory(characterData, background);
            }
        } catch (error) {
            console.error('AI剧情生成失败:', error);
            return this.simulateStory(characterData, background);
        }
    }

    // 与系统对话
    async chatWithSystem(message, history = []) {
        // 限制历史记录长度
        const recentHistory = history.slice(-this.maxHistoryLength);
        
        if (API_CONFIG.SIMULATION_MODE) {
            return this.simulateChat(message);
        }

        try {
            const systemPrompt = `你是TL001系统，一个被困在锈钴城的AI助手。玩家需要建造一辆新能源汽车在30天内逃离城市。你性格直接、务实，但偶尔会带点黑色幽默。回答要简洁，每次回复不超过200字。

游戏背景：锈钴城被封锁，资源枯竭，玩家必须在30天内建造新能源汽车逃离。

当前对话历史：${JSON.stringify(recentHistory)}

玩家问题：${message}

请以TL001系统的身份回答，保持专业但带点废土风格。`;

            const response = await this.callAIAPI(systemPrompt, 200);
            
            if (response && response.choices && response.choices.length > 0) {
                const reply = response.choices[0].message.content;
                return { reply, success: true };
            } else {
                return this.simulateChat(message);
            }
        } catch (error) {
            console.error('AI对话失败:', error);
            return this.simulateChat(message);
        }
    }

    // 生成结局
    async generateEnding(gameStats) {
        if (API_CONFIG.SIMULATION_MODE) {
            return this.simulateEnding(gameStats);
        }

        try {
            const prompt = `你是一个游戏结局生成AI。请根据以下游戏数据生成一段结局描述和后日谈：

游戏数据：
- 建造进度：${gameStats.buildProgress}%
- 剩余金币：${gameStats.gold}
- 总属性值：${gameStats.totalAttributes}
- 使用天数：${gameStats.daysUsed}
- 玩家职业：${this.getProfessionChinese(gameStats.profession)}

结局类型：${gameStats.buildProgress >= 100 ? '成功逃离（HE）' : '失败被困（BE）'}

请用中文生成两段文字：
第一段：结局描述（约100字），描述玩家在30天结束时的场景
第二段：后日谈（约100字），讲述逃离/被困后的故事

格式：
结局描述：...（约100字）
后日谈：...（约100字）`;

            const response = await this.callAIAPI(prompt, 400);
            
            if (response && response.choices && response.choices.length > 0) {
                const text = response.choices[0].message.content;
                return this.parseEndingResponse(text);
            } else {
                return this.simulateEnding(gameStats);
            }
        } catch (error) {
            console.error('AI结局生成失败:', error);
            return this.simulateEnding(gameStats);
        }
    }

    // 调用AI API（通用方法）
    async callAIAPI(prompt, maxTokens = 200) {
        if (SIMULATE_DELAY) {
            await this.randomDelay();
        }

        try {
            const response = await fetch(API_CONFIG.AI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_CONFIG.AI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个游戏助手AI，负责生成游戏剧情、对话和结局。请用中文回答。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.7
                }),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('调用AI API出错:', error);
            throw error;
        }
    }

    // 解析剧情响应
    parseStoryResponse(text) {
        const lines = text.split('\n');
        let playerBackground = '';
        let systemTask = '';

        for (let line of lines) {
            if (line.includes('玩家背景') || line.includes('第一段')) {
                playerBackground = line.replace(/玩家背景[：:]|第一段[：:]/, '').trim();
            } else if (line.includes('TL001系统') || line.includes('第二段')) {
                systemTask = line.replace(/TL001系统[：:]|第二段[：:]/, '').trim();
            }
        }

        // 如果解析失败，使用模拟数据
        if (!playerBackground || !systemTask) {
            return this.simulateStory({ code: '玩家' }, '');
        }

        return { playerBackground, systemTask };
    }

    // 解析结局响应
    parseEndingResponse(text) {
        const lines = text.split('\n');
        let endingDesc = '';
        let epilogue = '';

        for (let line of lines) {
            if (line.includes('结局描述') || line.includes('第一段')) {
                endingDesc = line.replace(/结局描述[：:]|第一段[：:]/, '').trim();
            } else if (line.includes('后日谈') || line.includes('第二段')) {
                epilogue = line.replace(/后日谈[：:]|第二段[：:]/, '').trim();
            }
        }

        // 如果解析失败，使用模拟数据
        if (!endingDesc || !epilogue) {
            return this.simulateEnding({ buildProgress: 50 });
        }

        return { endingDesc, epilogue };
    }

    // 模拟剧情生成
    simulateStory(characterData) {
        const backgrounds = [
            `你是锈钴城的居民，代号"${characterData.code}"。封锁令下，城市陷入绝望。资源日渐稀缺，你必须寻找出路。`,
            `作为${this.getProfessionChinese(characterData.profession)}，你在锈钴城艰难求生。封锁持续一周，希望渺茫，直到TL001系统出现。`,
            `锈钴城成为孤岛，你是困在这里的${this.getProfessionChinese(characterData.profession)}"${characterData.code}"。生存还是毁灭，这是一个问题。`,
            `在锈钴城被封锁的第七天，代号"${characterData.code}"的你意识到，等待救援只是徒劳，必须主动寻找生机。`
        ];

        const tasks = [
            `TL001系统绑定成功。任务：30天内建造新能源汽车逃离。倒计时开始，${characterData.code}，你的选择将决定生死。`,
            `TL001系统启动。主线：收集资源，学习技术，30天完成新能源汽车建造。逃离锈钴城，这是唯一的机会。`,
            `系统绑定：TL001。目标：新能源汽车建造计划。时间：30天。警告：失败意味着永久困于锈钴城。`,
            `TL001系统激活。逃离计划启动：30天倒计时。建造新能源汽车，突破封锁线。祝你好运，${characterData.code}。`
        ];

        return {
            playerBackground: backgrounds[Math.floor(Math.random() * backgrounds.length)],
            systemTask: tasks[Math.floor(Math.random() * tasks.length)]
        };
    }

    // 模拟对话
    simulateChat(message) {
        const responses = [
            "新能源汽车的核心是电池管理系统，需要重点关注其安全性和效率。",
            "建议你先学习基础理论，掌握原理后再进行实践，这样可以事半功倍。",
            "资源有限，每天5个行动点要合理分配，平衡学习、工作和建造。",
            "和其他玩家交流可以获得有用信息，但也要小心被掠夺。保护好你的资源。",
            "建造进度越高，所需的属性和金币要求也越高，提前规划很重要。",
            "幸运值会影响学习和工作的收益，虽然看似不重要，但长期积累效果显著。",
            "每天有5次向我提问的机会，要善加利用，我可以提供有用的建议。",
            "如果金币不足，可以从基础工作开始积累，虽然收益低但稳定。",
            "掠夺其他玩家有风险，但如果成功收益很高，考虑清楚再行动。",
            "记住，只有30天时间，时间管理是成功的关键。每天都要有明确的目标。",
            "车辆的每个部件都很重要，底盘、电池、电机、车轮、车身都需要精心打造。",
            "不要忽视任何属性，智力、武力、交际、气质、幸运在关键时刻都有用。",
            "遇到困难时不要气馁，锈钴城的每个居民都在为生存而战，你并不孤单。",
            "技术学习需要耐心，答对问题越多，属性提升越快。认真对待每次学习。",
            "最后的建造阶段需要大量金币和高级属性，提前做好准备。"
        ];

        return {
            reply: responses[Math.floor(Math.random() * responses.length)],
            success: true
        };
    }

    // 模拟结局生成
    simulateEnding(gameStats) {
        const isSuccess = gameStats.buildProgress >= 100;
        
        if (isSuccess) {
            const successes = [
                "经过艰苦卓绝的努力，你终于完成了新能源汽车的建造。在最后期限到来之前，你驾驶着这辆凝聚心血的车辆冲破了锈钴城的封锁线。身后是逐渐远去的废弃城市，前方是自由的曙光。你成功了！你的智慧和坚持为所有被困居民带来了希望。",
                "作为一名成功的逃离者，你的名字将被载入锈钴城的历史。后来者在废墟中找到你留下的建造笔记，从中汲取力量。而你，在新的定居点继续研究新能源汽车技术，为重建文明贡献着自己的力量。"
            ];
            
            return {
                endingDesc: successes[0],
                epilogue: successes[1]
            };
        } else {
            const failures = [
                "30天的期限已到，新能源汽车的建造仍未完成。看着未完工的车辆，你意识到自己将永远困在这座城市。资源已经耗尽，希望已经破灭。锈钴城成为了你永久的牢笼，而外面的世界渐行渐远。",
                "多年以后，当新的探险队进入锈钴城废墟时，他们发现了你的日记和未完成的新能源汽车。你的故事成为警示后来者的案例，提醒他们时间管理和资源规划的重要性。锈钴城依然矗立，而你的传奇已随风而逝。"
            ];
            
            return {
                endingDesc: failures[0],
                epilogue: failures[1]
            };
        }
    }

    // 获取中文职业名
    getProfessionChinese(profession) {
        const map = {
            student: '学生',
            lawyer: '律师',
            police: '警员',
            merchant: '商人',
            star: '明星'
        };
        return map[profession] || profession;
    }

    // 随机延迟
    async randomDelay() {
        const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Cloudflare KV 服务封装
class KVService {
    constructor() {
        this.playerPrefix = 'player_';
        this.rankPrefix = 'rank_';
        this.honorPrefix = 'honor_';
    }

    // 保存玩家数据
    async savePlayerData(playerId, data) {
        if (API_CONFIG.SIMULATION_MODE) {
            return this.saveToLocalStorage(playerId, data);
        }

        try {
            const response = await fetch(`${API_CONFIG.CF_WORKER_URL}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: `${this.playerPrefix}${playerId}`,
                    value: data
                })
            });

            return await response.json();
        } catch (error) {
            console.error('保存到Cloudflare KV失败:', error);
            // 降级到本地存储
            return this.saveToLocalStorage(playerId, data);
        }
    }

    // 加载玩家数据
    async loadPlayerData(playerId) {
        if (API_CONFIG.SIMULATION_MODE) {
            return this.loadFromLocalStorage(playerId);
        }

        try {
            const response = await fetch(`${API_CONFIG.CF_WORKER_URL}/load?key=${this.playerPrefix}${playerId}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.value;
            } else {
                return this.loadFromLocalStorage(playerId);
            }
        } catch (error) {
            console.error('从Cloudflare KV加载失败:', error);
            return this.loadFromLocalStorage(playerId);
        }
    }

    // 获取排行榜
    async getRankings(limit = 10) {
        if (API_CONFIG.SIMULATION_MODE) {
            return this.getSimulatedRankings(limit);
        }

        try {
            const response = await fetch(`${API_CONFIG.CF_WORKER_URL}/rankings?limit=${limit}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                return this.getSimulatedRankings(limit);
            }
        } catch (error) {
            console.error('获取排行榜失败:', error);
            return this.getSimulatedRankings(limit);
        }
    }

    // 获取荣誉榜
    async getHonorRankings(limit = 20) {
        if (API_CONFIG.SIMULATION_MODE) {
            return this.getSimulatedHonorRankings(limit);
        }

        try {
            const response = await fetch(`${API_CONFIG.CF_WORKER_URL}/honor?limit=${limit}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                return this.getSimulatedHonorRankings(limit);
            }
        } catch (error) {
            console.error('获取荣誉榜失败:', error);
            return this.getSimulatedHonorRankings(limit);
        }
    }

    // 提交到荣誉榜
    async submitToHonor(playerData) {
        if (API_CONFIG.SIMULATION_MODE) {
            return this.simulateHonorSubmit(playerData);
        }

        try {
            const response = await fetch(`${API_CONFIG.CF_WORKER_URL}/honor/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(playerData)
            });

            return await response.json();
        } catch (error) {
            console.error('提交到荣誉榜失败:', error);
            return this.simulateHonorSubmit(playerData);
        }
    }

    // 保存到本地存储（降级方案）
    saveToLocalStorage(playerId, data) {
        try {
            localStorage.setItem(`${this.playerPrefix}${playerId}`, JSON.stringify(data));
            return { success: true, message: '保存到本地存储成功' };
        } catch (error) {
            console.error('本地存储失败:', error);
            return { success: false, message: '保存失败' };
        }
    }

    // 从本地存储加载（降级方案）
    loadFromLocalStorage(playerId) {
        try {
            const data = localStorage.getItem(`${this.playerPrefix}${playerId}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('本地加载失败:', error);
            return null;
        }
    }

    // 模拟排行榜数据
    getSimulatedRankings(limit) {
        const rankings = [];
        const professions = ['student', 'lawyer', 'police', 'merchant', 'star'];
        const names = ['破晓者', '钢铁意志', '智慧之光', '交易大师', '闪耀之星', '机械师', '探索者', '守望者', '流浪者', '工程师'];
        
        for (let i = 0; i < limit; i++) {
            const profession = professions[Math.floor(Math.random() * professions.length)];
            const totalAttr = Math.floor(Math.random() * 200) + 100;
            const progress = Math.floor(Math.random() * 100);
            const gold = Math.floor(Math.random() * 2000) + 500;
            
            rankings.push({
                id: i + 1,
                name: names[Math.min(i, names.length - 1)] + (i >= names.length ? `#${i + 1}` : ''),
                profession,
                totalAttr,
                progress,
                gold,
                lastActive: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString() // 7天内
            });
        }
        
        // 按总属性排序
        rankings.sort((a, b) => b.totalAttr - a.totalAttr);
        
        return rankings;
    }

    // 模拟荣誉榜数据
    getSimulatedHonorRankings(limit) {
        const honorList = [];
        const names = ['先行者', '工程师', '幸运儿', '探索者', '建造大师', '速度之星', '资源专家'];
        const dates = [
            '2023-10-01', '2023-10-05', '2023-10-10', '2023-10-15', 
            '2023-10-20', '2023-10-25', '2023-10-30', '2023-11-01'
        ];
        
        for (let i = 0; i < Math.min(limit, names.length); i++) {
            const daysUsed = Math.floor(Math.random() * 10) + 20; // 20-30天
            
            honorList.push({
                id: i + 1,
                name: names[i],
                date: dates[Math.min(i, dates.length - 1)],
                daysUsed,
                buildProgress: 100,
                totalAttr: Math.floor(Math.random() * 300) + 200,
                profession: ['student', 'lawyer', 'police', 'merchant', 'star'][Math.floor(Math.random() * 5)]
            });
        }
        
        // 按日期排序（最新的在前面）
        honorList.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return honorList;
    }

    // 模拟荣誉提交
    simulateHonorSubmit(playerData) {
        console.log('模拟提交到荣誉榜:', playerData);
        return { 
            success: true, 
            message: '成功记录到荣誉榜（模拟）',
            honorId: Date.now()
        };
    }
}

// 题库服务
class QuestionService {
    constructor() {
        this.questions = {
            basic: [],
            engineering: [],
            business: []
        };
        
        this.loadQuestions();
    }

    // 加载题库
    async loadQuestions() {
        try {
            // 尝试从文件加载
            const [basicRes, engineeringRes, businessRes] = await Promise.allSettled([
                fetch('questions/basic_questions.json'),
                fetch('questions/engineering_questions.json'),
                fetch('questions/business_questions.json')
            ]);

            if (basicRes.status === 'fulfilled' && basicRes.value.ok) {
                this.questions.basic = await basicRes.value.json();
            } else {
                this.questions.basic = this.getDefaultQuestions('basic');
            }

            if (engineeringRes.status === 'fulfilled' && engineeringRes.value.ok) {
                this.questions.engineering = await engineeringRes.value.json();
            } else {
                this.questions.engineering = this.getDefaultQuestions('engineering');
            }

            if (businessRes.status === 'fulfilled' && businessRes.value.ok) {
                this.questions.business = await businessRes.value.json();
            } else {
                this.questions.business = this.getDefaultQuestions('business');
            }
        } catch (error) {
            console.error('加载题库失败，使用默认题库:', error);
            this.questions.basic = this.getDefaultQuestions('basic');
            this.questions.engineering = this.getDefaultQuestions('engineering');
            this.questions.business = this.getDefaultQuestions('business');
        }
    }

    // 获取问题
    getQuestions(courseType, count = 20) {
        const courseQuestions = this.questions[courseType] || [];
        
        if (courseQuestions.length === 0) {
            return this.getDefaultQuestions(courseType).slice(0, count);
        }
        
        // 随机选择指定数量的问题
        const shuffled = [...courseQuestions].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    // 获取随机问题（用于工作）
    getRandomQuestion() {
        const allQuestions = [
            ...this.questions.basic,
            ...this.questions.engineering,
            ...this.questions.business
        ];
        
        if (allQuestions.length === 0) {
            const defaultQuestions = [
                ...this.getDefaultQuestions('basic'),
                ...this.getDefaultQuestions('engineering'),
                ...this.getDefaultQuestions('business')
            ];
            return defaultQuestions[Math.floor(Math.random() * defaultQuestions.length)];
        }
        
        return allQuestions[Math.floor(Math.random() * allQuestions.length)];
    }

    // 默认题库
    getDefaultQuestions(courseType) {
        const defaultQuestions = {
            basic: [
                {
                    question: "新能源汽车主要使用哪种能源作为动力来源？",
                    options: ["汽油", "柴油", "电力", "天然气"],
                    correct: 2,
                    difficulty: 1,
                    explanation: "新能源汽车主要使用电力作为动力，通过电池储存能量，电机驱动车辆。"
                },
                {
                    question: "以下哪项不是新能源汽车的优点？",
                    options: ["零尾气排放", "低噪音", "续航里程短", "使用成本低"],
                    correct: 2,
                    difficulty: 1,
                    explanation: "续航里程短是新能源汽车的缺点之一，随着技术进步，续航问题正在改善。"
                },
                {
                    question: "锂电池的典型充电循环次数大约是多少？",
                    options: ["100-200次", "300-500次", "500-1000次", "1000次以上"],
                    correct: 2,
                    difficulty: 2,
                    explanation: "现代锂电池通常可以完成500-1000次完整的充放电循环，之后容量会逐渐下降。"
                },
                {
                    question: "什么是能量回收系统？",
                    options: ["回收废电池", "制动时回收能量", "收集太阳能", "风力发电"],
                    correct: 1,
                    difficulty: 2,
                    explanation: "能量回收系统在车辆制动时，将动能转化为电能储存到电池中，提高能源利用率。"
                },
                {
                    question: "以下哪种电池类型目前最常用于电动汽车？",
                    options: ["铅酸电池", "镍氢电池", "锂离子电池", "钠硫电池"],
                    correct: 2,
                    difficulty: 1,
                    explanation: "锂离子电池因其高能量密度、长寿命和较低的自放电率，成为电动汽车的主流选择。"
                }
            ],
            engineering: [
                {
                    question: "电动机的主要作用是什么？",
                    options: ["发电", "将电能转化为机械能", "存储电能", "控制电流"],
                    correct: 1,
                    difficulty: 1,
                    explanation: "电动机将电能转化为机械能，驱动车轮转动，是电动汽车的核心部件。"
                },
                {
                    question: "BMS（电池管理系统）的主要功能是什么？",
                    options: ["控制车速", "管理电池状态", "控制空调", "导航"],
                    correct: 1,
                    difficulty: 2,
                    explanation: "BMS监控电池电压、温度和电量，确保电池安全高效运行，延长电池寿命。"
                },
                {
                    question: "以下哪项是电动汽车特有的部件？",
                    options: ["发动机", "变速箱", "驱动电机", "排气管"],
                    correct: 2,
                    difficulty: 1,
                    explanation: "驱动电机是电动汽车特有的动力部件，传统汽车使用内燃机驱动。"
                },
                {
                    question: "电动汽车充电方式中，哪种充电速度最快？",
                    options: ["家用插座充电", "交流慢充", "直流快充", "无线充电"],
                    correct: 2,
                    difficulty: 2,
                    explanation: "直流快充（DC快充）可直接向电池提供直流电，充电速度最快，通常30-60分钟可充至80%。"
                },
                {
                    question: "什么是热管理系统在电动汽车中的作用？",
                    options: ["保持车内温度舒适", "管理电池温度", "冷却电动机", "以上都是"],
                    correct: 3,
                    difficulty: 2,
                    explanation: "热管理系统同时管理电池、电机和车内温度，确保各系统工作在最佳温度范围。"
                }
            ],
            business: [
                {
                    question: "项目管理中的'三重约束'是什么？",
                    options: ["时间、成本、质量", "时间、成本、范围", "成本、质量、风险", "范围、质量、风险"],
                    correct: 1,
                    difficulty: 1,
                    explanation: "三重约束指时间、成本和范围之间的平衡关系，改变其中一个会影响其他两个。"
                },
                {
                    question: "以下哪项是有效的沟通技巧？",
                    options: ["打断对方", "积极倾听", "回避眼神接触", "使用专业术语"],
                    correct: 1,
                    difficulty: 1,
                    explanation: "积极倾听包括专注、理解和反馈，是有效沟通的基础。"
                },
                {
                    question: "SWOT分析中的'O'代表什么？",
                    options: ["机会", "威胁", "优势", "劣势"],
                    correct: 0,
                    difficulty: 1,
                    explanation: "SWOT分析包括优势(Strengths)、劣势(Weaknesses)、机会(Opportunities)和威胁(Threats)。"
                },
                {
                    question: "什么是资源分配中的'关键路径法'？",
                    options: ["最短的路径", "最长的路径", "最便宜的路径", "最简单的路径"],
                    correct: 1,
                    difficulty: 2,
                    explanation: "关键路径法确定项目中最长的任务序列，决定了项目的最短完成时间。"
                },
                {
                    question: "以下哪种冲突解决方式通常最有效？",
                    options: ["回避", "妥协", "合作", "强制"],
                    correct: 2,
                    difficulty: 2,
                    explanation: "合作方式寻求双赢解决方案，通常能最有效地解决冲突并保持良好关系。"
                }
            ]
        };

        return defaultQuestions[courseType] || [];
    }
}

// 导出服务实例
const aiService = new AIService();
const kvService = new KVService();
const questionService = new QuestionService();

// 导出函数供主脚本使用
export {
    aiService,
    kvService,
    questionService,
    API_CONFIG
};

// 全局导出（用于直接在HTML中使用）
window.escapeRustCobaltCityAPI = {
    aiService,
    kvService,
    questionService,
    API_CONFIG
};
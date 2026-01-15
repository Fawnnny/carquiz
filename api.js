// 逃离锈钴城 - API 接口层（Cloudflare Pages版本）

// API 配置
const API_CONFIG = {
    // Cloudflare Pages Functions API URL
    CF_PAGES_API_URL: '/api', // 使用相对路径，会自动指向Pages Functions
    
    // 请求超时时间（毫秒）
    TIMEOUT: 10000
};

// AI服务封装（使用内置生成，不依赖外部API）
class AIService {
    constructor() {
        this.history = [];
        this.maxHistoryLength = 150;
    }

    // 生成导入剧情
    async generateStory(characterData) {
        return this.generateBuiltInStory(characterData);
    }

    // 与系统对话
    async chatWithSystem(message) {
        return this.generateBuiltInChatResponse(message);
    }

    // 生成结局
    async generateEnding(gameStats) {
        return this.generateBuiltInEnding(gameStats);
    }

    // 内置剧情生成
    generateBuiltInStory(characterData) {
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

    // 内置对话回复
    generateBuiltInChatResponse(message) {
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

    // 内置结局生成
    generateBuiltInEnding(gameStats) {
        const isSuccess = gameStats.buildProgress >= 100;
        const playerName = gameStats.playerCode || '玩家';
        
        if (isSuccess) {
            return {
                endingDesc: `经过${gameStats.daysUsed}天的努力，代号"${playerName}"的你终于完成了新能源汽车的建造。在第30天到来之前，你驾驶着这辆凝聚心血的车辆冲破了锈钴城的封锁线。身后是逐渐远去的废弃城市，前方是自由的曙光。你成功了！`,
                epilogue: `你的名字被记录在锈钴城的逃离者名单中，成为后来者的榜样。在新的定居点，你继续研究新能源汽车技术，将锈钴城的求生经验转化为重建文明的力量。`
            };
        } else {
            return {
                endingDesc: `30天的期限已到，代号"${playerName}"的你还未能完成新能源汽车的建造。看着${gameStats.buildProgress}%的完成进度，你意识到自己将永远困在这座城市。资源已经耗尽，希望已经破灭。锈钴城成为了你永久的牢笼。`,
                epilogue: `多年以后，当新的探险队进入锈钴城废墟时，他们发现了你的日记和未完成的新能源汽车。你的故事成为警示后来者的案例，提醒他们时间管理和资源规划的重要性。`
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
}

// Cloudflare KV 服务封装 - 完全使用Pages Functions
class KVService {
    constructor() {
        this.apiUrl = API_CONFIG.CF_PAGES_API_URL;
    }

    // 保存玩家数据
    async savePlayerData(playerId, data) {
        console.log('保存玩家数据到Pages Functions:', playerId);
        
        try {
            const response = await fetch(`${this.apiUrl}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerId: playerId,
                    playerData: data
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`保存失败: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('保存成功:', result);
            return result;
        } catch (error) {
            console.error('保存到Pages Functions失败:', error);
            // 降级到本地存储
            return this.saveToLocalStorage(playerId, data);
        }
    }

    // 加载玩家数据
    async loadPlayerData(playerId) {
        console.log('从Pages Functions加载玩家数据:', playerId);
        
        try {
            const url = `${this.apiUrl}/load?playerId=${encodeURIComponent(playerId)}`;
            console.log('请求URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('加载失败，状态码:', response.status, '错误:', errorText);
                return this.loadFromLocalStorage(playerId);
            }
            
            const data = await response.json();
            console.log('加载成功:', data);
            
            if (data.success && data.playerData) {
                return data.playerData;
            } else {
                return this.loadFromLocalStorage(playerId);
            }
        } catch (error) {
            console.error('从Pages Functions加载失败:', error);
            return this.loadFromLocalStorage(playerId);
        }
    }

    // 获取排行榜
    async getRankings(limit = 10) {
        console.log('获取排行榜，限制:', limit);
        
        try {
            const url = `${this.apiUrl}/rankings?limit=${limit}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.rankings) {
                    return data.rankings;
                }
            }
            console.log('获取排行榜失败，返回空数组');
            return [];
        } catch (error) {
            console.error('获取排行榜失败:', error);
            return [];
        }
    }

    // 获取荣誉榜
    async getHonorRankings(limit = 20) {
        console.log('获取荣誉榜，限制:', limit);
        
        try {
            const url = `${this.apiUrl}/honor?limit=${limit}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.honorList) {
                    return data.honorList;
                }
            }
            console.log('获取荣誉榜失败，返回空数组');
            return [];
        } catch (error) {
            console.error('获取荣誉榜失败:', error);
            return [];
        }
    }

    // 提交到荣誉榜
    async submitToHonor(playerId, playerData) {
        console.log('提交到荣誉榜:', playerId);
        
        try {
            const response = await fetch(`${this.apiUrl}/honor/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerId: playerId,
                    playerData: playerData
                })
            });

            const result = await response.json();
            console.log('荣誉榜提交结果:', result);
            return result;
        } catch (error) {
            console.error('提交到荣誉榜失败:', error);
            return { 
                success: false, 
                message: '提交失败: ' + error.message 
            };
        }
    }

    // 降级方案：本地存储
    saveToLocalStorage(playerId, data) {
        try {
            const key = `player_${playerId}`;
            localStorage.setItem(key, JSON.stringify(data));
            console.log('降级：保存到本地存储，键:', key);
            return { 
                success: true, 
                message: '保存到本地存储成功（降级模式）' 
            };
        } catch (error) {
            console.error('本地存储失败:', error);
            return { 
                success: false, 
                message: '保存失败' 
            };
        }
    }

    // 降级方案：从本地存储加载
    loadFromLocalStorage(playerId) {
        try {
            const key = `player_${playerId}`;
            const data = localStorage.getItem(key);
            console.log('降级：从本地存储加载，键:', key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('本地加载失败:', error);
            return null;
        }
    }
}

// 题库服务 - 使用内置题目
class QuestionService {
    constructor() {
        this.questions = {
            basic: this.getDefaultQuestions('basic'),
            engineering: this.getDefaultQuestions('engineering'),
            business: this.getDefaultQuestions('business')
        };
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

// 创建服务实例
const aiService = new AIService();
const kvService = new KVService();
const questionService = new QuestionService();

// 全局导出（用于直接在HTML中使用）
window.escapeRustCobaltCityAPI = {
    aiService,
    kvService,
    questionService,
    API_CONFIG
};

// 输出加载信息
console.log('逃离锈钴城API已加载（Cloudflare Pages版本）');
console.log('Pages Functions API URL:', API_CONFIG.CF_PAGES_API_URL);
// 逃离锈钴城 - 主游戏逻辑

// 游戏状态对象
const GameState = {
    player: null,
    currentDay: 1,
    maxDays: 30,
    actionPoints: 5,
    gold: 0,
    buildProgress: 0,
    dailyActions: [],
    chatHistory: [],
    chatCount: 0,
    lastRaid: null,
    lastChatReset: null,
    questions: {},
    isGameActive: false,
    playerId: null,
    realPlayers: []
};

// 时间工具函数
const TimeUtils = {
    // 判断两个时间戳是否在同一天（基于UTC，避免时区问题）
    isSameUTCday: (timestamp1, timestamp2) => {
        const date1 = new Date(timestamp1);
        const date2 = new Date(timestamp2);
        return date1.getUTCFullYear() === date2.getUTCFullYear() &&
               date1.getUTCMonth() === date2.getUTCMonth() &&
               date1.getUTCDate() === date2.getUTCDate();
    },

    // 获取今天UTC日期的开始时间戳（午夜00:00）
    getTodayStartUTC: () => {
        const now = new Date();
        return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    },

    // 检查并重置每日状态
    checkAndResetDaily: () => {
        const lastRaidStr = localStorage.getItem('lastRaidTimestamp');
        const lastLoginDateStr = localStorage.getItem('lastLoginDate');
        const todayUTC = TimeUtils.getTodayStartUTC();
        const todayStr = new Date(todayUTC).toUTCString();

        // 如果从未登录过，或者上次登录不是今天，则重置每日状态
        if (!lastLoginDateStr || lastLoginDateStr !== todayStr) {
            localStorage.setItem('lastLoginDate', todayStr);
            // 只有当上次掠夺也不是今天时，才重置掠夺次数
            if (lastRaidStr) {
                const lastRaidDate = new Date(parseInt(lastRaidStr));
                if (!TimeUtils.isSameUTCday(lastRaidDate, new Date(todayUTC))) {
                    localStorage.removeItem('lastRaidTimestamp');
                    console.log('新的一天，掠夺次数已重置！');
                }
            }
        }
    },

    // 检查是否可以掠夺
    canRaidToday: () => {
        const lastRaidStr = localStorage.getItem('lastRaidTimestamp');
        if (!lastRaidStr) return true; // 从未掠夺过，可以掠夺
        
        const lastRaidTime = parseInt(lastRaidStr);
        const now = Date.now();
        return !TimeUtils.isSameUTCday(lastRaidTime, now); // 与现在不是同一天就可以掠夺
    },

    // 记录本次掠夺
    recordRaid: () => {
        localStorage.setItem('lastRaidTimestamp', Date.now().toString());
        GameState.lastRaid = Date.now().toString();
    },

    // 获取距离下次可掠夺的剩余时间（毫秒）
    getNextRaidTimeRemaining: () => {
        const lastRaidStr = localStorage.getItem('lastRaidTimestamp');
        if (!lastRaidStr) return 0;
        
        const lastRaidTime = parseInt(lastRaidStr);
        const lastRaidDate = new Date(lastRaidTime);
        // 计算下一天的UTC开始时间
        const nextDayStart = Date.UTC(
            lastRaidDate.getUTCFullYear(),
            lastRaidDate.getUTCMonth(),
            lastRaidDate.getUTCDate() + 1
        );
        return nextDayStart - Date.now();
    },

    // 格式化的剩余时间显示
    getFormattedTimeRemaining: () => {
        const ms = TimeUtils.getNextRaidTimeRemaining();
        if (ms <= 0) return '现在可以掠夺';
        
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}小时${minutes}分钟后重置`;
    }
};

// 职业加成倍数
const PROFESSION_BONUS = {
    student: { luck: 2 },
    lawyer: { intelligence: 2 },
    police: { strength: 2 },
    merchant: { communication: 2 },
    star: { charm: 2 }
};

// 工作数据
const JOBS = {
    basic: {
        name: "基础劳动",
        description: "在工厂搬运物资",
        minGold: 10,
        maxGold: 20,
        requirements: {},
        questionTypes: ['all']
    },
    technical: {
        name: "技术助手",
        description: "协助工程师维修设备",
        minGold: 20,
        maxGold: 40,
        requirements: { intelligence: 30 },
        questionTypes: ['engineering', 'basic']
    },
    security: {
        name: "安保工作",
        description: "维持区域治安",
        minGold: 25,
        maxGold: 50,
        requirements: { strength: 30 },
        questionTypes: ['engineering', 'basic']
    },
    management: {
        name: "管理工作",
        description: "协调资源分配",
        minGold: 40,
        maxGold: 80,
        requirements: { communication: 40, charm: 30 },
        questionTypes: ['business', 'basic']
    }
};

// 课程数据
const COURSES = {
    basic: {
        name: "基础理论",
        description: "新能源汽车基本原理",
        primary: 'intelligence',
        secondary: 'luck',
        questionFile: 'basic_questions.json'
    },
    engineering: {
        name: "工程技术",
        description: "汽车构造与制造",
        primary: 'strength',
        secondary: 'intelligence',
        questionFile: 'engineering_questions.json'
    },
    business: {
        name: "商务管理",
        description: "资源调配与沟通",
        primary: 'communication',
        secondary: 'charm',
        questionFile: 'business_questions.json'
    }
};

// 建造阶段数据
const BUILD_STAGES = [
    { progress: 0, name: "设计规划", description: "正在规划车辆整体设计", requirements: { intelligence: 10, strength: 10, gold: 50 } },
    { progress: 20, name: "底盘制作", description: "制造车辆底盘框架", requirements: { intelligence: 20, strength: 25, gold: 100 } },
    { progress: 40, name: "动力系统", description: "安装电池和电机", requirements: { intelligence: 35, strength: 30, gold: 200 } },
    { progress: 60, name: "车身制造", description: "制作车辆外壳", requirements: { intelligence: 25, strength: 40, gold: 300 } },
    { progress: 80, name: "系统集成", description: "整合所有部件和测试", requirements: { intelligence: 45, strength: 35, gold: 500 } }
];

// 题库（简化版，实际应从文件加载）
const QUESTIONS = {
    basic: [
        {
            question: "新能源汽车主要使用哪种能源？",
            options: ["汽油", "柴油", "电力", "天然气"],
            correct: 2,
            difficulty: 1
        },
        {
            question: "以下哪项不是新能源汽车的优点？",
            options: ["零排放", "低噪音", "续航短", "使用成本低"],
            correct: 2,
            difficulty: 1
        },
        {
            question: "锂电池的充电循环次数大约是多少？",
            options: ["100-200次", "300-500次", "500-1000次", "1000次以上"],
            correct: 2,
            difficulty: 2
        }
    ],
    engineering: [
        {
            question: "电动机的主要作用是什么？",
            options: ["发电", "将电能转化为机械能", "存储电能", "控制电流"],
            correct: 1,
            difficulty: 1
        },
        {
            question: "BMS系统的主要功能是什么？",
            options: ["控制车速", "管理电池状态", "控制空调", "导航"],
            correct: 1,
            difficulty: 2
        }
    ],
    business: [
        {
            question: "项目管理中的'三重约束'是什么？",
            options: ["时间、成本、质量", "时间、成本、范围", "成本、质量、风险", "范围、质量、风险"],
            correct: 1,
            difficulty: 1
        },
        {
            question: "以下哪项是有效的沟通技巧？",
            options: ["打断对方", "积极倾听", "回避眼神接触", "使用专业术语"],
            correct: 1,
            difficulty: 1
        }
    ]
};

// DOM元素缓存
const DOM = {
    // 界面
    screens: {
        creation: document.getElementById('characterCreation'),
        story: document.getElementById('storyIntro'),
        main: document.getElementById('gameMain'),
        ending: document.getElementById('endingScreen')
    },
    
    // 创建角色
    playerCode: document.getElementById('playerCode'),
    gender: document.getElementById('gender'),
    profession: document.getElementById('profession'),
    remainingPoints: document.getElementById('remainingPoints'),
    startGameBtn: document.getElementById('startGameBtn'),
    
    // 属性输入
    intelligence: document.getElementById('intelligence'),
    strength: document.getElementById('strength'),
    communication: document.getElementById('communication'),
    charm: document.getElementById('charm'),
    luck: document.getElementById('luck'),
    
    // 导入剧情
    storyText: document.getElementById('storyText'),
    continueGameBtn: document.getElementById('continueGameBtn'),
    skipStoryBtn: document.getElementById('skipStoryBtn'),
    loadingStory: document.getElementById('loadingStory'),
    
    // 游戏主界面
    playerNameDisplay: document.getElementById('playerNameDisplay'),
    currentDay: document.getElementById('currentDay'),
    actionPoints: document.getElementById('actionPoints'),
    goldAmount: document.getElementById('goldAmount'),
    buildProgress: document.getElementById('buildProgress'),
    
    // 导航
    navBtns: document.querySelectorAll('.nav-btn'),
    
    // 属性显示
    statIntel: document.getElementById('stat-intel'),
    statIntelValue: document.getElementById('stat-intel-value'),
    statStr: document.getElementById('stat-str'),
    statStrValue: document.getElementById('stat-str-value'),
    statComm: document.getElementById('stat-comm'),
    statCommValue: document.getElementById('stat-comm-value'),
    statCharm: document.getElementById('stat-charm'),
    statCharmValue: document.getElementById('stat-charm-value'),
    statLuck: document.getElementById('stat-luck'),
    statLuckValue: document.getElementById('stat-luck-value'),
    
    // 系统面板
    detailCode: document.getElementById('detail-code'),
    detailProfession: document.getElementById('detail-profession'),
    detailIntel: document.getElementById('detail-intel'),
    detailStr: document.getElementById('detail-str'),
    detailComm: document.getElementById('detail-comm'),
    detailCharm: document.getElementById('detail-charm'),
    detailLuck: document.getElementById('detail-luck'),
    
    // 聊天系统
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    sendChatBtn: document.getElementById('sendChatBtn'),
    chatCount: document.getElementById('chatCount'),
    
    // 工作
    workQuiz: document.getElementById('workQuiz'),
    workQuestion: document.getElementById('workQuestion'),
    submitWorkAnswer: document.getElementById('submitWorkAnswer'),
    
    // 学习
    studyQuiz: document.getElementById('studyQuiz'),
    studyQuestion: document.getElementById('studyQuestion'),
    studyProgress: document.getElementById('studyProgress'),
    submitStudyAnswer: document.getElementById('submitStudyAnswer'),
    
    // 排行榜
    liveRankList: document.getElementById('liveRankList'),
    honorRankList: document.getElementById('honorRankList'),
    refreshRank: document.getElementById('refreshRank'),
    
    // 建造
    buildProgressBar: document.getElementById('buildProgressBar'),
    buildPercent: document.getElementById('buildPercent'),
    buildStage: document.getElementById('buildStage'),
    reqIntel: document.getElementById('req-intel'),
    reqStr: document.getElementById('req-str'),
    reqGold: document.getElementById('req-gold'),
    startBuildBtn: document.getElementById('startBuildBtn'),
    
    // 掠夺
    raidCount: document.getElementById('raidCount'),
    lastRaid: document.getElementById('lastRaid'),
    raidTargets: document.getElementById('raidTargets'),
    raidBattle: document.getElementById('raidBattle'),
    battleResult: document.getElementById('battleResult'),
    confirmBattle: document.getElementById('confirmBattle'),
    
    // 下一天
    currentDayNum: document.getElementById('currentDayNum'),
    nextDayNum: document.getElementById('nextDayNum'),
    dayLog: document.getElementById('dayLog'),
    confirmNextDay: document.getElementById('confirmNextDay'),
    nextDayBtn: document.getElementById('nextDayBtn'),
    daysLeft: document.getElementById('daysLeft'),
    
    // 结局
    endingTitle: document.getElementById('endingTitle'),
    endingSubtitle: document.getElementById('endingSubtitle'),
    endingText: document.getElementById('endingText'),
    endingStats: document.getElementById('endingStats'),
    finalProgress: document.getElementById('finalProgress'),
    finalGold: document.getElementById('finalGold'),
    finalAttributes: document.getElementById('finalAttributes'),
    finalDays: document.getElementById('finalDays'),
    
    // 按钮
    restartGameBtn: document.getElementById('restartGameBtn'),
    restartFromEndingBtn: document.getElementById('restartFromEndingBtn'),
    viewHonorBtn: document.getElementById('viewHonorBtn'),
    saveGameBtn: document.getElementById('saveGameBtn'),
    
    // 其他
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// 当前答题状态
let currentQuiz = {
    type: null, // 'work' 或 'study'
    job: null,
    course: null,
    questions: [],
    currentQuestionIndex: 0,
    correctAnswers: 0,
    selectedOption: null
};

// 当前掠夺状态
let currentRaid = {
    target: null,
    attribute: null
};

// 生成玩家ID
function generatePlayerId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `player_${timestamp}_${random}`;
}

// 获取玩家ID
function getPlayerId() {
    if (GameState.playerId) return GameState.playerId;
    
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
        playerId = generatePlayerId();
        localStorage.setItem('playerId', playerId);
        GameState.playerId = playerId;
    }
    
    return playerId;
}

// 初始化游戏
function initGame() {
    loadGameState();
    setupEventListeners();
    updateAttributeControls();
    checkDailyReset();
    
    // 添加每日状态检查
    TimeUtils.checkAndResetDaily();
    
    // 检查是否有保存的游戏状态
    if (GameState.isGameActive && GameState.player) {
        // 如果有活跃的游戏状态，直接进入主界面
        switchScreen('main');
        updateGameUI();
        updateQuickStats();
        
        // 从KV加载最新数据
        loadFromKV();
    } else {
        // 否则进入创建角色界面
        switchScreen('creation');
    }
    
    // 隐藏加载界面
    setTimeout(() => {
        DOM.loadingOverlay.style.display = 'none';
    }, 500);
}

// 从KV加载游戏数据
async function loadFromKV() {
    if (!window.escapeRustCobaltCityAPI || !window.escapeRustCobaltCityAPI.kvService) {
        console.log('KV服务未初始化');
        return;
    }
    
    try {
        const playerId = getPlayerId();
        const kvData = await window.escapeRustCobaltCityAPI.kvService.loadPlayerData(playerId);
        
        if (kvData) {
            console.log('从KV加载数据成功:', kvData);
            
            // 更新游戏状态
            if (kvData.currentDay) GameState.currentDay = kvData.currentDay;
            if (kvData.gold !== undefined) GameState.gold = kvData.gold;
            if (kvData.buildProgress !== undefined) GameState.buildProgress = kvData.buildProgress;
            if (kvData.actionPoints !== undefined) GameState.actionPoints = kvData.actionPoints;
            if (kvData.chatCount !== undefined) GameState.chatCount = kvData.chatCount;
            if (kvData.chatHistory) GameState.chatHistory = kvData.chatHistory;
            
            // 更新UI
            updateGameUI();
            updateQuickStats();
            
            // 恢复聊天记录
            if (GameState.chatHistory.length > 0) {
                DOM.chatMessages.innerHTML = '';
                GameState.chatHistory.forEach(msg => {
                    addChatMessage(msg.sender, msg.content);
                });
            }
        }
    } catch (error) {
        console.error('从KV加载数据失败:', error);
    }
}

// 切换屏幕
function switchScreen(screenName) {
    // 隐藏所有屏幕
    Object.values(DOM.screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // 显示目标屏幕
    DOM.screens[screenName].classList.add('active');
    
    // 特定屏幕的初始化
    if (screenName === 'main' && GameState.player) {
        updateGameUI();
        updateQuickStats();
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 创建角色相关
    DOM.startGameBtn.addEventListener('click', startGame);
    DOM.playerCode.addEventListener('input', validatePlayerCode);
    
    // 属性控制
    document.querySelectorAll('.attr-btn').forEach(btn => {
        btn.addEventListener('click', handleAttributeButton);
    });
    
    document.querySelectorAll('.attr-input').forEach(input => {
        input.addEventListener('change', handleAttributeInput);
        input.addEventListener('input', handleAttributeInput);
    });
    
    // 剧情相关
    DOM.continueGameBtn.addEventListener('click', () => switchScreen('main'));
    DOM.skipStoryBtn.addEventListener('click', () => switchScreen('main'));
    
    // 导航
    DOM.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            switchSection(section);
        });
    });
    
    // 系统面板标签页
    document.querySelectorAll('.system-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab('systemSection', tab);
        });
    });
    
    // 排行榜标签页
    document.querySelectorAll('.rank-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab('rankSection', tab);
        });
    });
    
    // 聊天系统
    DOM.sendChatBtn.addEventListener('click', sendChatMessage);
    DOM.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // 工作
    document.querySelectorAll('.work-btn').forEach(btn => {
        btn.addEventListener('click', () => startWork(btn.getAttribute('data-job')));
    });
    DOM.submitWorkAnswer.addEventListener('click', submitWorkAnswer);
    
    // 学习
    document.querySelectorAll('.study-btn').forEach(btn => {
        btn.addEventListener('click', () => startStudy(btn.getAttribute('data-course')));
    });
    DOM.submitStudyAnswer.addEventListener('click', submitStudyAnswer);
    
    // 建造
    DOM.startBuildBtn.addEventListener('click', startBuild);
    
    // 排行榜
    DOM.refreshRank.addEventListener('click', updateRankings);
    
    // 掠夺
    DOM.confirmBattle.addEventListener('click', confirmBattleResult);
    
    // 下一天
    DOM.confirmNextDay.addEventListener('change', () => {
        DOM.nextDayBtn.disabled = !DOM.confirmNextDay.checked;
    });
    DOM.nextDayBtn.addEventListener('click', nextDay);
    
    // 游戏控制
    DOM.restartGameBtn.addEventListener('click', confirmRestart);
    DOM.restartFromEndingBtn.addEventListener('click', restartGame);
    DOM.viewHonorBtn.addEventListener('click', () => switchSection('rank'));
    DOM.saveGameBtn.addEventListener('click', saveGame);
    
    // 答题选项（动态生成的事件委托）
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('quiz-option')) {
            selectQuizOption(e.target);
        }
    });
}

// 属性控制
function updateAttributeControls() {
    const inputs = [
        DOM.intelligence,
        DOM.strength, 
        DOM.communication,
        DOM.charm,
        DOM.luck
    ];
    
    let total = 0;
    inputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });
    
    const remaining = 80 - total;
    DOM.remainingPoints.textContent = remaining;
    
    // 更新进度条预览
    inputs.forEach(input => {
        const value = parseInt(input.value) || 0;
        const progressBar = document.getElementById(`stat-${input.id}`);
        if (progressBar) {
            progressBar.style.width = `${(value / 100) * 100}%`;
        }
    });
    
    // 启用/禁用开始游戏按钮
    DOM.startGameBtn.disabled = remaining !== 0 || !DOM.playerCode.value.trim();
}

function handleAttributeButton(e) {
    const btn = e.target;
    const attr = btn.getAttribute('data-attr');
    const input = document.getElementById(attr);
    let value = parseInt(input.value) || 0;
    
    if (btn.classList.contains('plus')) {
        value = Math.min(value + 1, 79);
    } else {
        value = Math.max(value - 1, 1);
    }
    
    input.value = value;
    updateAttributeControls();
}

function handleAttributeInput(e) {
    const input = e.target;
    let value = parseInt(input.value) || 0;
    
    // 确保值在1-79之间
    if (value < 1) value = 1;
    if (value > 79) value = 79;
    
    input.value = value;
    updateAttributeControls();
}

// 验证玩家代号
function validatePlayerCode() {
    const code = DOM.playerCode.value.trim();
    const hint = document.getElementById('codeHint');
    
    if (code.length > 5) {
        DOM.playerCode.value = code.substring(0, 5);
        hint.textContent = "代号不能超过5个字";
        hint.style.color = "var(--danger-color)";
    } else if (code.length === 0) {
        hint.textContent = "";
    } else {
        hint.textContent = `还可以输入${5 - code.length}个字`;
        hint.style.color = "var(--text-muted)";
    }
    
    updateAttributeControls();
}

// 开始游戏
function startGame() {
    const player = {
        code: DOM.playerCode.value.trim(),
        gender: DOM.gender.value,
        profession: DOM.profession.value,
        attributes: {
            intelligence: parseInt(DOM.intelligence.value) || 16,
            strength: parseInt(DOM.strength.value) || 16,
            communication: parseInt(DOM.communication.value) || 16,
            charm: parseInt(DOM.charm.value) || 16,
            luck: parseInt(DOM.luck.value) || 16
        }
    };
    
    // 应用职业加成
    const bonus = PROFESSION_BONUS[player.profession];
    for (const attr in bonus) {
        player.attributes[attr] = Math.floor(player.attributes[attr] * bonus[attr]);
    }
    
    GameState.player = player;
    GameState.isGameActive = true;
    
    // 生成玩家ID
    GameState.playerId = generatePlayerId();
    localStorage.setItem('playerId', GameState.playerId);
    
    // 保存初始状态
    saveGame();
    
    // 切换到导入剧情
    generateStory();
}

// 生成导入剧情
async function generateStory() {
    switchScreen('story');
    DOM.loadingStory.style.display = 'flex';
    DOM.storyText.style.display = 'none';
    DOM.continueGameBtn.style.display = 'none';
    
    // 模拟AI API调用延迟
    setTimeout(() => {
        const player = GameState.player;
        
        // 生成玩家背景故事
        const backgrounds = [
            `你是锈钴城的${player.gender === 'male' ? '一名普通居民' : '一位普通市民'}，代号"${player.code}"。封锁已持续一周，资源日渐稀缺。`,
            `作为锈钴城的${player.profession === 'student' ? '学生' : player.profession === 'lawyer' ? '律师' : player.profession === 'police' ? '警员' : player.profession === 'merchant' ? '商人' : '明星'}，你目睹了城市从繁荣到绝望的转变。`,
            `封锁令下，锈钴城成为孤岛。你，代号"${player.code}"，决定不再坐以待毙，寻找一线生机。`,
            `在锈钴城被封锁的第七天，代号"${player.code}"的你意识到，等待救援只是徒劳，必须主动寻找出路。`
        ];
        
        const tasks = [
            `TL001系统绑定成功。任务：30天内建造新能源汽车逃离。倒计时开始，${player.code}，你的选择将决定生死。`,
            `TL001系统启动。主线：收集资源，学习技术，30天完成新能源汽车建造。逃离锈钴城，这是唯一的机会。`,
            `系统绑定：TL001。目标：新能源汽车建造计划。时间：30天。警告：失败意味着永久困于锈钴城。`,
            `TL001系统激活。逃离计划启动：30天倒计时。建造新能源汽车，突破封锁线。祝你好运，${player.code}。`
        ];
        
        const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        const task = tasks[Math.floor(Math.random() * tasks.length)];
        
        DOM.storyText.innerHTML = `
            <p><strong>${player.code}的故事：</strong></p>
            <p>${background}</p>
            <p><strong>TL001系统指令：</strong></p>
            <p>${task}</p>
        `;
        
        DOM.loadingStory.style.display = 'none';
        DOM.storyText.style.display = 'block';
        DOM.continueGameBtn.style.display = 'block';
        
        // 更新显示
        document.getElementById('storyPlayerInfo').textContent = `玩家：${player.code} | 职业：${getProfessionName(player.profession)}`;
        document.getElementById('storyDayCount').textContent = `第0天`;
        
        // 添加到聊天历史
        addChatMessage('system', `你好${player.code}，我是TL001系统。你是被困在锈钴城的居民，我们还有30天时间建造一辆新能源汽车逃离这里。有什么问题可以问我，但每天我只能回答5次。`);
    }, 1500);
}

// 切换主界面板块
function switchSection(section) {
    // 更新导航按钮
    DOM.navBtns.forEach(btn => {
        if (btn.getAttribute('data-section') === section) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 显示对应的内容区域
    document.querySelectorAll('.content-section').forEach(sectionEl => {
        sectionEl.classList.remove('active');
    });
    
    document.getElementById(`${section}Section`).classList.add('active');
    
    // 特定板块的初始化
    if (section === 'rank') {
        updateRankings();
    } else if (section === 'raid') {
        updateRaidTargets();
        updateRaidUI();
    }
}

// 切换标签页
function switchTab(sectionId, tabId) {
    const section = document.getElementById(sectionId);
    
    // 更新标签按钮
    section.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 显示对应的内容
    section.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `${tabId}Tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// 更新游戏UI
function updateGameUI() {
    if (!GameState.player) return;
    
    const player = GameState.player;
    
    // 头部信息
    DOM.playerNameDisplay.textContent = `代号：${player.code}`;
    DOM.currentDay.textContent = `第${GameState.currentDay}天`;
    DOM.actionPoints.textContent = `${GameState.actionPoints}/5`;
    DOM.goldAmount.textContent = GameState.gold;
    DOM.buildProgress.textContent = `${GameState.buildProgress}%`;
    DOM.buildPercent.textContent = `${GameState.buildProgress}%`;
    
    // 进度条
    DOM.buildProgressBar.style.width = `${GameState.buildProgress}%`;
    
    // 天数显示
    DOM.currentDayNum.textContent = GameState.currentDay;
    DOM.nextDayNum.textContent = GameState.currentDay + 1;
    DOM.daysLeft.textContent = GameState.maxDays - GameState.currentDay + 1;
    
    // 属性详情
    DOM.detailCode.textContent = player.code;
    DOM.detailProfession.textContent = getProfessionName(player.profession);
    
    // 聊天次数
    DOM.chatCount.textContent = 5 - GameState.chatCount;
    
    // 掠夺次数 - 使用新的时间戳系统
    const canRaid = TimeUtils.canRaidToday();
    DOM.raidCount.textContent = canRaid ? 1 : 0;
    
    // 更新掠夺状态显示
    updateRaidUI();
    
    // 更新工作解锁状态
    updateJobUnlocks();
    
    // 更新建造需求
    updateBuildRequirements();
    
    // 更新车辆部件
    updateVehicleParts();
}

// 更新掠夺界面状态
function updateRaidUI() {
    const canRaid = TimeUtils.canRaidToday();
    const raidBtn = document.getElementById('raidActionBtn');
    const raidStatusEl = document.getElementById('raidStatusDisplay');
    
    if (raidBtn) {
        raidBtn.disabled = !canRaid;
        raidBtn.title = canRaid ? '掠夺其他玩家' : TimeUtils.getFormattedTimeRemaining();
    }
    
    if (raidStatusEl) {
        if (canRaid) {
            raidStatusEl.textContent = '今日可掠夺：1次';
            raidStatusEl.style.color = 'var(--success-color)';
        } else {
            raidStatusEl.textContent = `已掠夺，${TimeUtils.getFormattedTimeRemaining()}`;
            raidStatusEl.style.color = 'var(--text-secondary)';
        }
    }
    
    // 更新游戏主界面的资源显示
    if (DOM.raidCount) {
        DOM.raidCount.textContent = canRaid ? '1' : '0';
    }
    
    // 更新最后掠夺时间显示
    if (DOM.lastRaid) {
        const lastRaidStr = localStorage.getItem('lastRaidTimestamp');
        if (lastRaidStr) {
            const lastRaidTime = parseInt(lastRaidStr);
            const date = new Date(lastRaidTime);
            DOM.lastRaid.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } else {
            DOM.lastRaid.textContent = '无';
        }
    }
}

// 更新快速属性显示
function updateQuickStats() {
    if (!GameState.player) return;
    
    const attrs = GameState.player.attributes;
    
    // 数值
    DOM.statIntelValue.textContent = attrs.intelligence;
    DOM.statStrValue.textContent = attrs.strength;
    DOM.statCommValue.textContent = attrs.communication;
    DOM.statCharmValue.textContent = attrs.charm;
    DOM.statLuckValue.textContent = attrs.luck;
    
    // 详情面板
    DOM.detailIntel.textContent = attrs.intelligence;
    DOM.detailStr.textContent = attrs.strength;
    DOM.detailComm.textContent = attrs.communication;
    DOM.detailCharm.textContent = attrs.charm;
    DOM.detailLuck.textContent = attrs.luck;
    
    // 进度条（最大100）
    DOM.statIntel.style.width = `${attrs.intelligence}%`;
    DOM.statStr.style.width = `${attrs.strength}%`;
    DOM.statComm.style.width = `${attrs.communication}%`;
    DOM.statCharm.style.width = `${attrs.charm}%`;
    DOM.statLuck.style.width = `${attrs.luck}%`;
}

// 获取职业名称
function getProfessionName(profession) {
    const names = {
        student: '学生',
        lawyer: '律师', 
        police: '警员',
        merchant: '商人',
        star: '明星'
    };
    return names[profession] || profession;
}

// 发送聊天消息
function sendChatMessage() {
    if (!GameState.player) return;
    
    const message = DOM.chatInput.value.trim();
    if (!message) return;
    
    // 检查聊天次数
    if (GameState.chatCount >= 5) {
        showNotification('今天已经用完5次对话机会，请明天再来');
        return;
    }
    
    // 添加玩家消息
    addChatMessage('player', message);
    GameState.chatCount++;
    
    // 清空输入框
    DOM.chatInput.value = '';
    
    // 模拟AI回复
    setTimeout(() => {
        const responses = [
            "新能源汽车的核心是电池管理系统，需要重点关注。",
            "建议先学习基础理论，再实践工程技术。",
            "资源有限，合理分配行动点至关重要。",
            "别忘了和其他玩家交流，但也要小心掠夺。",
            "建造进度越高，所需资源和属性要求也越高。",
            "幸运值会影响学习和工作的收益，不要忽视。",
            "每天有5次向我提问的机会，要善加利用。",
            "如果金币不足，可以考虑进行基础工作。",
            "掠夺其他玩家有风险，但收益也可能很高。",
            "记住，只有30天时间，时间管理很重要。"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage('system', randomResponse);
        
        // 更新UI
        DOM.chatCount.textContent = 5 - GameState.chatCount;
    }, 500);
    
    // 保存游戏
    saveGame();
}

// 添加聊天消息
function addChatMessage(sender, content) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}`;
    
    const senderName = sender === 'system' ? 'TL001' : GameState.player.code;
    
    messageEl.innerHTML = `
        <div class="message-sender">${senderName}</div>
        <div class="message-content">${content}</div>
    `;
    
    DOM.chatMessages.appendChild(messageEl);
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    
    // 保存到历史（限制150条）
    GameState.chatHistory.push({ sender, content, timestamp: new Date() });
    if (GameState.chatHistory.length > 150) {
        GameState.chatHistory.shift();
    }
}

// 开始工作
function startWork(jobType) {
    if (GameState.actionPoints < 1) {
        showNotification('行动点不足！');
        return;
    }
    
    const job = JOBS[jobType];
    if (!job) return;
    
    // 检查要求
    const playerAttrs = GameState.player.attributes;
    for (const attr in job.requirements) {
        if (playerAttrs[attr] < job.requirements[attr]) {
            showNotification(`不满足要求：${attr}需要${job.requirements[attr]}`);
            return;
        }
    }
    
    // 消耗行动点
    GameState.actionPoints--;
    DOM.actionPoints.textContent = `${GameState.actionPoints}/5`;
    
    // 记录行动
    GameState.dailyActions.push(`进行了${job.name}工作`);
    
    // 选择问题类型
    const questionTypes = job.questionTypes;
    const selectedType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    // 获取问题
    const questions = selectedType === 'all' 
        ? [...QUESTIONS.basic, ...QUESTIONS.engineering, ...QUESTIONS.business]
        : QUESTIONS[selectedType];
    
    if (!questions || questions.length === 0) {
        // 没有问题时直接给与奖励
        completeWork(job, true);
        return;
    }
    
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // 设置答题状态
    currentQuiz.type = 'work';
    currentQuiz.job = job;
    currentQuiz.questions = [randomQuestion];
    currentQuiz.currentQuestionIndex = 0;
    currentQuiz.correctAnswers = 0;
    currentQuiz.selectedOption = null;
    
    // 显示答题界面
    displayQuizQuestion(randomQuestion);
    DOM.workQuiz.style.display = 'flex';
}

// 显示问题
function displayQuizQuestion(question) {
    const container = currentQuiz.type === 'work' ? DOM.workQuiz : DOM.studyQuiz;
    const questionEl = currentQuiz.type === 'work' ? DOM.workQuestion : DOM.studyQuestion;
    const optionsContainer = container.querySelector('.quiz-options');
    
    questionEl.textContent = question.question;
    
    // 清空选项
    optionsContainer.innerHTML = '';
    
    // 添加选项
    question.options.forEach((option, index) => {
        const optionEl = document.createElement('button');
        optionEl.className = 'quiz-option';
        optionEl.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
        optionEl.dataset.index = index;
        optionsContainer.appendChild(optionEl);
    });
    
    // 更新学习进度
    if (currentQuiz.type === 'study') {
        DOM.studyProgress.textContent = currentQuiz.currentQuestionIndex + 1;
    }
}

// 选择答案选项
function selectQuizOption(optionEl) {
    // 清除之前的选择
    const options = optionEl.parentElement.querySelectorAll('.quiz-option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    // 设置当前选择
    optionEl.classList.add('selected');
    currentQuiz.selectedOption = parseInt(optionEl.dataset.index);
}

// 提交工作答案
function submitWorkAnswer() {
    if (currentQuiz.selectedOption === null) {
        showNotification('请选择一个答案！');
        return;
    }
    
    const currentQuestion = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    const isCorrect = currentQuiz.selectedOption === currentQuestion.correct;
    
    // 显示正确答案
    const options = DOM.workQuiz.querySelectorAll('.quiz-option');
    options.forEach((opt, index) => {
        if (index === currentQuestion.correct) {
            opt.classList.add('correct');
        } else if (index === currentQuiz.selectedOption && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });
    
    // 禁用选项
    options.forEach(opt => {
        opt.style.pointerEvents = 'none';
    });
    
    // 更新按钮文本
    DOM.submitWorkAnswer.textContent = '继续';
    DOM.submitWorkAnswer.onclick = completeWorkQuiz;
    
    // 记录结果
    currentQuiz.correctAnswers = isCorrect ? 1 : 0;
}

// 完成工作答题
function completeWorkQuiz() {
    DOM.workQuiz.style.display = 'none';
    
    const job = currentQuiz.job;
    const isCorrect = currentQuiz.correctAnswers > 0;
    
    completeWork(job, isCorrect);
}

// 完成工作
function completeWork(job, isCorrect) {
    // 计算基础金币
    let goldEarned = Math.floor(Math.random() * (job.maxGold - job.minGold + 1)) + job.minGold;
    
    // 答对则翻倍
    if (isCorrect) {
        goldEarned *= 2;
        showNotification(`工作完成！回答正确，获得${goldEarned}金币（翻倍）`);
    } else {
        showNotification(`工作完成！获得${goldEarned}金币`);
    }
    
    // 幸运值影响（简化版）
    const luck = GameState.player.attributes.luck;
    if (luck < 20) {
        goldEarned = Math.floor(goldEarned * 0.5);
    } else if (luck > 80) {
        goldEarned = Math.floor(goldEarned * 2);
    }
    
    // 更新金币
    GameState.gold += goldEarned;
    DOM.goldAmount.textContent = GameState.gold;
    
    // 重置答题状态
    currentQuiz = {
        type: null,
        job: null,
        course: null,
        questions: [],
        currentQuestionIndex: 0,
        correctAnswers: 0,
        selectedOption: null
    };
    
    // 保存游戏
    saveGame();
}

// 开始学习
function startStudy(courseType) {
    if (GameState.actionPoints < 1) {
        showNotification('行动点不足！');
        return;
    }
    
    const course = COURSES[courseType];
    if (!course) return;
    
    // 消耗行动点
    GameState.actionPoints--;
    DOM.actionPoints.textContent = `${GameState.actionPoints}/5`;
    
    // 记录行动
    GameState.dailyActions.push(`学习了${course.name}`);
    
    // 获取问题
    const questions = QUESTIONS[courseType];
    if (!questions || questions.length === 0) {
        // 没有问题时给与基础属性
        completeStudy(course, 0);
        return;
    }
    
    // 随机选择20个问题
    const selectedQuestions = [];
    for (let i = 0; i < Math.min(20, questions.length); i++) {
        selectedQuestions.push(questions[Math.floor(Math.random() * questions.length)]);
    }
    
    // 设置答题状态
    currentQuiz.type = 'study';
    currentQuiz.course = course;
    currentQuiz.questions = selectedQuestions;
    currentQuiz.currentQuestionIndex = 0;
    currentQuiz.correctAnswers = 0;
    currentQuiz.selectedOption = null;
    
    // 显示第一个问题
    displayQuizQuestion(selectedQuestions[0]);
    DOM.studyQuiz.style.display = 'flex';
}

// 提交学习答案
function submitStudyAnswer() {
    if (currentQuiz.selectedOption === null) {
        showNotification('请选择一个答案！');
        return;
    }
    
    const currentQuestion = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    const isCorrect = currentQuiz.selectedOption === currentQuestion.correct;
    
    // 显示正确答案
    const options = DOM.studyQuiz.querySelectorAll('.quiz-option');
    options.forEach((opt, index) => {
        if (index === currentQuestion.correct) {
            opt.classList.add('correct');
        } else if (index === currentQuiz.selectedOption && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });
    
    // 禁用选项
    options.forEach(opt => {
        opt.style.pointerEvents = 'none';
    });
    
    // 更新正确答案计数
    if (isCorrect) {
        currentQuiz.correctAnswers++;
    }
    
    // 更新按钮文本
    DOM.submitStudyAnswer.textContent = '下一题';
    DOM.submitStudyAnswer.onclick = nextStudyQuestion;
}

// 下一学习问题
function nextStudyQuestion() {
    currentQuiz.currentQuestionIndex++;
    
    if (currentQuiz.currentQuestionIndex >= currentQuiz.questions.length) {
        // 学习完成
        DOM.studyQuiz.style.display = 'none';
        completeStudy(currentQuiz.course, currentQuiz.correctAnswers);
    } else {
        // 显示下一题
        const nextQuestion = currentQuiz.questions[currentQuiz.currentQuestionIndex];
        displayQuizQuestion(nextQuestion);
        
        // 重置选项
        const options = DOM.studyQuiz.querySelectorAll('.quiz-option');
        options.forEach(opt => {
            opt.classList.remove('selected', 'correct', 'incorrect');
            opt.style.pointerEvents = 'auto';
        });
        
        // 重置选择
        currentQuiz.selectedOption = null;
        
        // 更新按钮文本
        DOM.submitStudyAnswer.textContent = '提交答案';
        DOM.submitStudyAnswer.onclick = submitStudyAnswer;
    }
}

// 完成学习
function completeStudy(course, correctCount) {
    const totalQuestions = currentQuiz.questions.length;
    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    
    // 计算属性增益
    let primaryGain = Math.floor(accuracy * 5); // 0-5点
    let secondaryGain = Math.floor(accuracy * 2); // 0-2点
    
    // 幸运值影响
    const luck = GameState.player.attributes.luck;
    if (luck < 20) {
        primaryGain = Math.floor(primaryGain * 0.5);
        secondaryGain = Math.floor(secondaryGain * 0.5);
    } else if (luck > 80) {
        primaryGain = Math.floor(primaryGain * 2);
        secondaryGain = Math.floor(secondaryGain * 2);
    }
    
    // 应用增益
    GameState.player.attributes[course.primary] += primaryGain;
    GameState.player.attributes[course.secondary] += secondaryGain;
    
    showNotification(`学习完成！正确率：${Math.round(accuracy * 100)}%，${getAttributeName(course.primary)}+${primaryGain}，${getAttributeName(course.secondary)}+${secondaryGain}`);
    
    // 更新UI
    updateQuickStats();
    
    // 重置答题状态
    currentQuiz = {
        type: null,
        job: null,
        course: null,
        questions: [],
        currentQuestionIndex: 0,
        correctAnswers: 0,
        selectedOption: null
    };
    
    // 保存游戏
    saveGame();
}

// 更新工作解锁状态
function updateJobUnlocks() {
    const playerAttrs = GameState.player.attributes;
    
    document.querySelectorAll('.job-card').forEach(card => {
        const jobType = card.getAttribute('data-job');
        const job = JOBS[jobType];
        const btn = card.querySelector('.work-btn');
        
        // 检查要求
        let unlocked = true;
        for (const attr in job.requirements) {
            if (playerAttrs[attr] < job.requirements[attr]) {
                unlocked = false;
                break;
            }
        }
        
        // 更新UI
        if (unlocked) {
            card.classList.remove('locked');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-hammer"></i> 开始工作';
        } else {
            card.classList.add('locked');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-lock"></i> 未解锁';
        }
    });
}

// 更新建造需求
function updateBuildRequirements() {
    // 找到当前建造阶段
    let currentStage = BUILD_STAGES[0];
    for (let i = BUILD_STAGES.length - 1; i >= 0; i--) {
        if (GameState.buildProgress >= BUILD_STAGES[i].progress) {
            currentStage = BUILD_STAGES[i];
            break;
        }
    }
    
    // 计算下一阶段需求
    const nextProgress = Math.min(GameState.buildProgress + 5, 100);
    let nextStage = BUILD_STAGES.find(stage => stage.progress > GameState.buildProgress);
    if (!nextStage) {
        nextStage = { requirements: { intelligence: 50, strength: 50, gold: 1000 } };
    }
    
    // 更新UI
    DOM.buildStage.textContent = currentStage.name;
    document.querySelector('.stage-desc').textContent = currentStage.description;
    
    DOM.reqIntel.textContent = nextStage.requirements.intelligence;
    DOM.reqStr.textContent = nextStage.requirements.strength;
    DOM.reqGold.textContent = nextStage.requirements.gold;
    
    // 检查是否可以建造
    const playerAttrs = GameState.player.attributes;
    const canBuild = 
        playerAttrs.intelligence >= nextStage.requirements.intelligence &&
        playerAttrs.strength >= nextStage.requirements.strength &&
        GameState.gold >= nextStage.requirements.gold &&
        GameState.actionPoints >= 1;
    
    DOM.startBuildBtn.disabled = !canBuild;
}

// 开始建造
function startBuild() {
    if (GameState.actionPoints < 1) {
        showNotification('行动点不足！');
        return;
    }
    
    // 找到下一阶段需求
    const nextProgress = Math.min(GameState.buildProgress + 5, 100);
    let nextStage = BUILD_STAGES.find(stage => stage.progress > GameState.buildProgress);
    if (!nextStage) {
        nextStage = { requirements: { intelligence: 50, strength: 50, gold: 1000 } };
    }
    
    // 检查需求
    const playerAttrs = GameState.player.attributes;
    if (playerAttrs.intelligence < nextStage.requirements.intelligence) {
        showNotification(`智力不足，需要${nextStage.requirements.intelligence}`);
        return;
    }
    if (playerAttrs.strength < nextStage.requirements.strength) {
        showNotification(`武力不足，需要${nextStage.requirements.strength}`);
        return;
    }
    if (GameState.gold < nextStage.requirements.gold) {
        showNotification(`金币不足，需要${nextStage.requirements.gold}`);
        return;
    }
    
    // 消耗资源
    GameState.actionPoints--;
    GameState.gold -= nextStage.requirements.gold;
    
    // 随机增加5-10%进度
    const progressIncrease = Math.floor(Math.random() * 6) + 5; // 5-10
    GameState.buildProgress = Math.min(GameState.buildProgress + progressIncrease, 100);
    
    // 记录行动
    GameState.dailyActions.push(`进行了建造，进度增加${progressIncrease}%`);
    
    // 更新UI
    DOM.actionPoints.textContent = `${GameState.actionPoints}/5`;
    DOM.goldAmount.textContent = GameState.gold;
    DOM.buildProgress.textContent = `${GameState.buildProgress}%`;
    DOM.buildPercent.textContent = `${GameState.buildProgress}%`;
    DOM.buildProgressBar.style.width = `${GameState.buildProgress}%`;
    
    // 检查是否完成
    if (GameState.buildProgress >= 100) {
        showNotification('新能源汽车建造完成！');
    } else {
        showNotification(`建造成功！进度增加${progressIncrease}%`);
    }
    
    // 更新建造需求和车辆部件
    updateBuildRequirements();
    updateVehicleParts();
    
    // 保存游戏
    saveGame();
}

// 更新车辆部件
function updateVehicleParts() {
    const parts = ['chassis', 'battery', 'motor', 'wheels', 'body'];
    
    parts.forEach(part => {
        const partEl = document.getElementById(`part-${part}`);
        const statusEl = document.querySelector(`.part-item[data-part="${part}"]`);
        
        // 根据进度决定完成状态
        let completed = false;
        if (part === 'chassis' && GameState.buildProgress >= 20) completed = true;
        if (part === 'battery' && GameState.buildProgress >= 40) completed = true;
        if (part === 'motor' && GameState.buildProgress >= 40) completed = true;
        if (part === 'wheels' && GameState.buildProgress >= 60) completed = true;
        if (part === 'body' && GameState.buildProgress >= 80) completed = true;
        
        if (completed) {
            partEl.classList.add('completed');
            statusEl.classList.add('completed');
            statusEl.textContent = `${getPartName(part)}：已完成`;
        } else {
            partEl.classList.remove('completed');
            statusEl.classList.remove('completed');
            statusEl.textContent = `${getPartName(part)}：未完成`;
        }
    });
}

// 获取部件名称
function getPartName(part) {
    const names = {
        chassis: '底盘',
        battery: '电池',
        motor: '电机',
        wheels: '车轮',
        body: '车身'
    };
    return names[part] || part;
}

// 获取属性名称
function getAttributeName(attr) {
    const names = {
        intelligence: '智力',
        strength: '武力',
        communication: '交际',
        charm: '气质',
        luck: '幸运'
    };
    return names[attr] || attr;
}

// 更新排行榜
async function updateRankings() {
    // 清空现有列表
    DOM.liveRankList.innerHTML = '';
    DOM.honorRankList.innerHTML = '';
    
    // 从KV获取实时排行榜
    try {
        if (window.escapeRustCobaltCityAPI && window.escapeRustCobaltCityAPI.kvService) {
            const rankings = await window.escapeRustCobaltCityAPI.kvService.getRankings(10);
            
            if (rankings && rankings.length > 0) {
                // 显示服务器返回的排行榜
                rankings.forEach((player, index) => {
                    const rankItem = document.createElement('div');
                    rankItem.className = 'rank-item';
                    
                    // 检查是否是当前玩家
                    const currentPlayerId = getPlayerId();
                    if (player.playerId === currentPlayerId) {
                        rankItem.classList.add('current-player');
                    }
                    
                    const profName = getProfessionName(player.profession);
                    const avatarText = (player.playerCode || player.name || '玩家').substring(0, 2);
                    
                    rankItem.innerHTML = `
                        <div class="rank-pos">${index + 1}</div>
                        <div class="rank-player">
                            <div class="player-avatar">${avatarText}</div>
                            <div>
                                <div class="player-name">${player.playerCode || player.name}</div>
                                <div class="player-profession">${profName}</div>
                            </div>
                        </div>
                        <div class="rank-attr">${player.totalAttributes || 0}</div>
                        <div class="rank-progress">${player.buildProgress || 0}%</div>
                    `;
                    
                    DOM.liveRankList.appendChild(rankItem);
                });
            } else {
                // 没有数据时显示提示
                showEmptyRankingsMessage();
            }
            
            // 获取荣誉榜
            const honorList = await window.escapeRustCobaltCityAPI.kvService.getHonorRankings(10);
            if (honorList && honorList.length > 0) {
                // 显示荣誉榜
                honorList.forEach((honor, index) => {
                    const honorItem = document.createElement('div');
                    honorItem.className = 'honor-item';
                    
                    const avatarText = (honor.playerCode || honor.name || '英雄').substring(0, 2);
                    const profName = getProfessionName(honor.profession);
                    
                    honorItem.innerHTML = `
                        <div class="player-avatar">${avatarText}</div>
                        <div class="honor-info">
                            <div class="honor-name">${honor.playerCode || honor.name}</div>
                            <div class="honor-details">
                                <span class="profession">${profName}</span>
                                <span class="date">${new Date(honor.escapeDate || honor.date).toLocaleDateString()}</span>
                                <span class="days">用时: ${honor.daysUsed}天</span>
                            </div>
                        </div>
                    `;
                    
                    DOM.honorRankList.appendChild(honorItem);
                });
            } else {
                // 没有荣誉榜数据时显示提示
                showEmptyHonorMessage();
            }
        } else {
            showEmptyRankingsMessage();
        }
    } catch (error) {
        console.error('获取排行榜失败:', error);
        showEmptyRankingsMessage();
    }
}

function showEmptyRankingsMessage() {
    const placeholder = document.createElement('div');
    placeholder.className = 'empty-message';
    placeholder.innerHTML = '排行榜数据加载中...<br><small>（首次加载可能需要一些时间）</small>';
    DOM.liveRankList.appendChild(placeholder);
}

function showEmptyHonorMessage() {
    const placeholder = document.createElement('div');
    placeholder.className = 'empty-message';
    placeholder.innerHTML = '暂无荣誉记录<br><small>（成功逃离的玩家将出现在这里）</small>';
    DOM.honorRankList.appendChild(placeholder);
}

// 更新掠夺目标
function updateRaidTargets() {
    DOM.raidTargets.innerHTML = '';
    
    // 尝试从KV获取其他玩家作为掠夺目标
    showEmptyRaidTargetsMessage();
}

function showEmptyRaidTargetsMessage() {
    const placeholder = document.createElement('div');
    placeholder.className = 'empty-message';
    placeholder.innerHTML = '掠夺目标加载中...<br><small>（目标将从在线玩家中随机选择）</small>';
    DOM.raidTargets.appendChild(placeholder);
}

// 开始掠夺
function startRaid(targetId) {
    // 1. 首先检查今日是否已掠夺
    if (!TimeUtils.canRaidToday()) {
        showNotification(`今天已经掠夺过了！${TimeUtils.getFormattedTimeRemaining()}`);
        return;
    }
    
    // 2. 检查行动点
    if (GameState.actionPoints < 1) {
        showNotification('行动点不足！');
        return;
    }
    
    // 暂时模拟一个掠夺战斗
    showNotification('正在寻找掠夺目标...');
    
    // 消耗行动点
    GameState.actionPoints--;
    DOM.actionPoints.textContent = `${GameState.actionPoints}/5`;
    
    // 记录掠夺
    TimeUtils.recordRaid();
    
    // 模拟战斗结果（50%成功）
    const isSuccess = Math.random() > 0.5;
    
    if (isSuccess) {
        // 成功：获得金币
        const goldStolen = Math.floor(Math.random() * 50) + 20;
        GameState.gold += goldStolen;
        DOM.goldAmount.textContent = GameState.gold;
        showNotification(`掠夺成功！获得${goldStolen}金币`);
        
        // 记录行动
        GameState.dailyActions.push(`掠夺成功，获得${goldStolen}金币`);
    } else {
        // 失败：损失金币
        const goldLost = Math.floor(Math.random() * 30) + 10;
        GameState.gold = Math.max(0, GameState.gold - goldLost);
        DOM.goldAmount.textContent = GameState.gold;
        showNotification(`掠夺失败！损失${goldLost}金币`);
        
        // 记录行动
        GameState.dailyActions.push(`掠夺失败，损失${goldLost}金币`);
    }
    
    // 更新掠夺UI
    updateRaidUI();
    
    // 保存游戏
    saveGame();
}

// 确认战斗结果
function confirmBattleResult() {
    // 这里将从服务器获取真实的战斗结果
    showNotification('掠夺功能需要连接到服务器，暂时模拟战斗结果');
    
    // 记录掠夺
    TimeUtils.recordRaid();
    
    // 关闭战斗界面
    DOM.raidBattle.style.display = 'none';
    
    // 更新掠夺UI
    updateRaidUI();
}

// 进入下一天
function nextDay() {
    if (!DOM.confirmNextDay.checked) {
        showNotification('请确认要进入下一天');
        return;
    }
    
    // 增加天数
    GameState.currentDay++;
    
    // 重置行动点
    GameState.actionPoints = 5;
    
    // 重置每日聊天次数
    GameState.chatCount = 0;
    
    // 清空当日行动记录
    const dayLog = DOM.dayLog;
    dayLog.innerHTML = '';
    
    if (GameState.dailyActions.length > 0) {
        GameState.dailyActions.forEach(action => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.textContent = `• ${action}`;
            dayLog.appendChild(logEntry);
        });
    } else {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = '• 今天没有进行任何行动';
        dayLog.appendChild(logEntry);
    }
    
    // 清空行动记录
    GameState.dailyActions = [];
    
    // 检查是否达到30天
    if (GameState.currentDay > GameState.maxDays) {
        endGame();
        return;
    }
    
    // 更新UI
    updateGameUI();
    updateQuickStats();
    
    // 重置确认复选框
    DOM.confirmNextDay.checked = false;
    DOM.nextDayBtn.disabled = true;
    
    // 显示通知
    showNotification(`第${GameState.currentDay - 1}天结束，进入第${GameState.currentDay}天`);
    
    // 保存游戏
    saveGame();
}

// 结束游戏
function endGame() {
    // 计算总属性
    const totalAttributes = Object.values(GameState.player.attributes).reduce((a, b) => a + b, 0);
    
    // 设置结局数据
    DOM.finalProgress.textContent = `${GameState.buildProgress}%`;
    DOM.finalGold.textContent = GameState.gold;
    DOM.finalAttributes.textContent = totalAttributes;
    DOM.finalDays.textContent = GameState.currentDay - 1;
    
    // 判断结局
    if (GameState.buildProgress >= 100) {
        // 成功结局
        DOM.endingTitle.textContent = '成功逃离！';
        DOM.endingSubtitle.textContent = '恭喜你建造出新能源汽车，成功逃离锈钴城！';
        
        // 提交到荣誉榜
        submitToHonor(totalAttributes);
        
        // 生成成功结局文本
        generateEndingText(true);
        
        showNotification('恭喜！你已成功逃离锈钴城，名字将被记录在荣誉榜上！');
    } else {
        // 失败结局
        DOM.endingTitle.textContent = '逃离失败';
        DOM.endingSubtitle.textContent = '30天已到，新能源汽车未完成，你被困在了锈钴城...';
        
        // 生成失败结局文本
        generateEndingText(false);
        
        showNotification('游戏结束！新能源汽车未完成，你被困在了锈钴城。');
    }
    
    // 显示结局界面
    switchScreen('ending');
    DOM.endingStats.style.display = 'flex';
    
    // 重置游戏状态
    GameState.isGameActive = false;
    
    // 保存游戏状态（记录结局）
    saveGame();
}

// 提交到荣誉榜
async function submitToHonor(totalAttributes) {
    if (!window.escapeRustCobaltCityAPI || !window.escapeRustCobaltCityAPI.kvService) {
        console.log('KV服务未初始化，无法提交到荣誉榜');
        return;
    }
    
    try {
        const playerId = getPlayerId();
        const saveData = {
            player: GameState.player,
            currentDay: GameState.currentDay,
            gold: GameState.gold,
            buildProgress: GameState.buildProgress,
            totalAttributes: totalAttributes,
            isGameActive: false
        };
        
        const result = await window.escapeRustCobaltCityAPI.kvService.submitToHonor(playerId, saveData);
        console.log('荣誉榜提交结果:', result);
    } catch (error) {
        console.error('提交到荣誉榜失败:', error);
    }
}

// 生成结局文本
async function generateEndingText(isSuccess) {
    DOM.endingLoading.style.display = 'flex';
    DOM.endingText.style.display = 'none';
    
    // 使用AI服务生成结局（如果可用）
    if (window.escapeRustCobaltCityAPI && window.escapeRustCobaltCityAPI.aiService) {
        try {
            const gameStats = {
                buildProgress: GameState.buildProgress,
                gold: GameState.gold,
                totalAttributes: Object.values(GameState.player.attributes).reduce((a, b) => a + b, 0),
                daysUsed: GameState.currentDay - 1,
                profession: GameState.player.profession
            };
            
            const ending = await window.escapeRustCobaltCityAPI.aiService.generateEnding(gameStats);
            DOM.endingText.innerHTML = `
                <p><strong>结局描述：</strong></p>
                <p>${ending.endingDesc || ''}</p>
                <p><strong>后日谈：</strong></p>
                <p>${ending.epilogue || ''}</p>
            `;
        } catch (error) {
            console.error('AI生成结局失败，使用模拟结局:', error);
            generateSimulatedEnding(isSuccess);
        }
    } else {
        generateSimulatedEnding(isSuccess);
    }
    
    DOM.endingLoading.style.display = 'none';
    DOM.endingText.style.display = 'block';
}

// 生成模拟结局
function generateSimulatedEnding(isSuccess) {
    const player = GameState.player;
    
    let endingText = '';
    
    if (isSuccess) {
        endingText = `
            <p><strong>结局描述：</strong></p>
            <p>经过${GameState.currentDay - 1}天的努力，代号"${player.code}"的你终于完成了新能源汽车的建造。在最后期限到来之前，你驾驶着自己建造的车辆冲破了锈钴城的封锁线。身后是逐渐远去的废弃城市，前方是自由的曙光。你成功了！</p>
            <p><strong>后日谈：</strong></p>
            <p>你的名字将被记录在锈钴城的逃离者名单中，成为后来者的榜样。在新的定居点，你继续研究新能源汽车技术，为重建文明贡献着自己的力量。</p>
        `;
    } else {
        endingText = `
            <p><strong>结局描述：</strong></p>
            <p>30天的期限已到，代号"${player.code}"的你还未能完成新能源汽车的建造。看着${GameState.buildProgress}%的完成进度，你意识到自己将永远困在这座城市。资源已经耗尽，希望已经破灭。锈钴城成为了你永久的牢笼。</p>
            <p><strong>后日谈：</strong></p>
            <p>多年以后，当新的探险队进入锈钴城废墟时，他们发现了你的日记和未完成的新能源汽车。你的故事成为警示后来者的案例，提醒他们时间管理和资源规划的重要性。</p>
        `;
    }
    
    DOM.endingText.innerHTML = endingText;
}

// 检查每日重置
function checkDailyReset() {
    const today = new Date().toLocaleDateString();
    
    // 检查聊天重置
    if (GameState.lastChatReset !== today) {
        GameState.chatCount = 0;
        GameState.lastChatReset = today;
    }
}

// 显示通知
function showNotification(message, duration = 3000) {
    DOM.notificationText.textContent = message;
    DOM.notification.classList.add('show');
    
    setTimeout(() => {
        DOM.notification.classList.remove('show');
    }, duration);
}

// 保存游戏
async function saveGame() {
    try {
        const saveData = {
            player: GameState.player,
            currentDay: GameState.currentDay,
            gold: GameState.gold,
            buildProgress: GameState.buildProgress,
            actionPoints: GameState.actionPoints,
            chatCount: GameState.chatCount,
            lastChatReset: GameState.lastChatReset,
            lastRaid: GameState.lastRaid,
            chatHistory: GameState.chatHistory.slice(-50),
            isGameActive: GameState.isGameActive
        };
        
        // 1. 保存到本地存储
        localStorage.setItem('escapeRustCobaltCity', JSON.stringify(saveData));
        
        // 2. 保存到Cloudflare KV（如果API可用）
        if (window.escapeRustCobaltCityAPI && window.escapeRustCobaltCityAPI.kvService) {
            const playerId = getPlayerId();
            
            if (playerId) {
                // 异步保存到KV
                const result = await window.escapeRustCobaltCityAPI.kvService.savePlayerData(playerId, saveData);
                console.log('KV保存结果:', result);
            }
        }
        
        console.log('游戏已保存');
    } catch (error) {
        console.error('保存游戏失败:', error);
    }
}

// 加载游戏
function loadGameState() {
    try {
        const savedData = localStorage.getItem('escapeRustCobaltCity');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            // 恢复游戏状态
            GameState.player = data.player;
            GameState.currentDay = data.currentDay || 1;
            GameState.gold = data.gold || 0;
            GameState.buildProgress = data.buildProgress || 0;
            GameState.actionPoints = data.actionPoints || 5;
            GameState.chatCount = data.chatCount || 0;
            GameState.lastChatReset = data.lastChatReset;
            GameState.lastRaid = data.lastRaid;
            GameState.chatHistory = data.chatHistory || [];
            GameState.isGameActive = data.isGameActive || false;
            
            // 获取玩家ID
            GameState.playerId = localStorage.getItem('playerId');
            
            // 恢复聊天记录
            if (GameState.chatHistory.length > 0) {
                DOM.chatMessages.innerHTML = '';
                GameState.chatHistory.forEach(msg => {
                    addChatMessage(msg.sender, msg.content);
                });
            }
        }
    } catch (error) {
        console.error('加载游戏失败:', error);
    }
}

// 确认重新开始
function confirmRestart() {
    if (confirm('确定要重新开始游戏吗？当前进度将丢失！')) {
        restartGame();
    }
}

// 重新开始游戏
function restartGame() {
    // 清除游戏数据
    localStorage.removeItem('escapeRustCobaltCity');
    localStorage.removeItem('lastRaidTimestamp');
    localStorage.removeItem('lastLoginDate');
    
    // 重置游戏状态
    GameState.player = null;
    GameState.currentDay = 1;
    GameState.gold = 0;
    GameState.buildProgress = 0;
    GameState.actionPoints = 5;
    GameState.dailyActions = [];
    GameState.chatHistory = [];
    GameState.chatCount = 0;
    GameState.lastRaid = null;
    GameState.lastChatReset = null;
    GameState.realPlayers = [];
    GameState.isGameActive = false;
    GameState.playerId = null;
    
    // 重置UI
    DOM.playerCode.value = '';
    DOM.intelligence.value = 16;
    DOM.strength.value = 16;
    DOM.communication.value = 16;
    DOM.charm.value = 16;
    DOM.luck.value = 16;
    DOM.chatMessages.innerHTML = '';
    DOM.chatInput.value = '';
    
    // 添加初始系统消息
    addChatMessage('system', '你好，我是TL001系统。你是被困在锈钴城的居民，我们还有30天时间建造一辆新能源汽车逃离这里。有什么问题可以问我，但每天我只能回答5次。');
    
    // 切换到创建角色界面
    switchScreen('creation');
    updateAttributeControls();
    
    showNotification('游戏已重置');
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', initGame);

// 导出给HTML使用的全局函数
window.restartGame = restartGame;
window.saveGame = saveGame;
window.loadGame = loadGameState;
window.startRaid = startRaid;
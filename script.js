// 工具函数对象
const Utils = {
    // 生成唯一ID
    generateId: () => 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    
    // 格式化日期
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // 检查是否是同一天（UTC）
    isSameDay: (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return d1.getUTCFullYear() === d2.getUTCFullYear() &&
               d1.getUTCMonth() === d2.getUTCMonth() &&
               d1.getUTCDate() === d2.getUTCDate();
    },
    
    // 获取今天开始的UTC时间
    getTodayUTC: () => {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    },
    
    // 计算幸运倍率
    getLuckMultiplier: (luck) => {
        if (luck < 20) return 0.5;
        if (luck > 80) return 2.0;
        return 1.0;
    }
};

// 职业加成配置（1.0版本设计）
const PROFESSION_BONUS = {
    student: { luck: 2 },          // 幸运获取倍率2倍
    lawyer: { intelligence: 2 },   // 智力获取倍率2倍
    police: { strength: 2 },       // 武力获取倍率2倍
    merchant: { social: 2 },       // 交际获取倍率2倍
    star: { charm: 2 }             // 气质获取倍率2倍
};

// 工作配置（1.0版本设计，有答题环节）
const JOBS = [
    {
        id: 'scrap_collector',
        name: '废弃金属收集',
        description: '在废墟中寻找可用的金属零件',
        requirements: { strength: 15 },
        baseReward: 50,
        unlockDay: 1
    },
    {
        id: 'component_salvager',
        name: '元件回收员',
        description: '从旧电子设备中回收可用元件',
        requirements: { intelligence: 20 },
        baseReward: 80,
        unlockDay: 3
    },
    {
        id: 'battery_repair',
        name: '电池修复工',
        description: '修复旧电池供城市使用',
        requirements: { intelligence: 30, luck: 20 },
        baseReward: 120,
        unlockDay: 7
    },
    {
        id: 'security_guard',
        name: '物资守卫',
        description: '保护珍贵的建造资源',
        requirements: { strength: 35, social: 20 },
        baseReward: 150,
        unlockDay: 10
    },
    {
        id: 'system_hacker',
        name: '系统破解者',
        description: '破解旧系统获取技术资料',
        requirements: { intelligence: 40, charm: 25 },
        baseReward: 200,
        unlockDay: 15
    }
];

// 课程配置（1.0版本设计，20题测试模式）
const COURSES = [
    {
        id: 'battery_tech',
        name: '电池技术',
        description: '学习锂电池、燃料电池等技术',
        mainAttribute: 'intelligence',  // 主属性
        secondaryAttribute: 'luck',     // 副属性
        baseGain: 3,                    // 基础获得点数
        requirements: { intelligence: 15 }
    },
    {
        id: 'motor_system',
        name: '电机系统',
        description: '永磁同步电机、感应电机原理',
        mainAttribute: 'intelligence',
        secondaryAttribute: 'strength',
        baseGain: 3,
        requirements: { intelligence: 25 }
    },
    {
        id: 'energy_management',
        name: '能源管理',
        description: '电池管理系统优化',
        mainAttribute: 'intelligence',
        secondaryAttribute: 'social',
        baseGain: 4,
        requirements: { intelligence: 30 }
    },
    {
        id: 'material_science',
        name: '材料科学',
        description: '轻量化材料应用',
        mainAttribute: 'intelligence',
        secondaryAttribute: 'charm',
        baseGain: 3,
        requirements: { intelligence: 20, social: 15 }
    },
    {
        id: 'system_integration',
        name: '系统集成',
        description: '整车系统协调优化',
        mainAttribute: 'intelligence',
        secondaryAttribute: 'social',
        baseGain: 5,
        requirements: { intelligence: 35, charm: 20 }
    }
];

// 建造阶段配置（1.0版本设计）
const BUILD_STAGES = [
    { progress: 0, name: '底盘框架', requirements: { intelligence: 20, strength: 20, gold: 100 } },
    { progress: 20, name: '电池系统', requirements: { intelligence: 30, social: 25, gold: 200 } },
    { progress: 40, name: '电机系统', requirements: { intelligence: 40, strength: 30, gold: 300 } },
    { progress: 60, name: '控制系统', requirements: { intelligence: 50, charm: 35, gold: 400 } },
    { progress: 80, name: '车身外壳', requirements: { intelligence: 60, social: 40, gold: 500 } }
];

// 题库（示例题目，实际使用时可以扩展）
const QUESTIONS = {
    work: [
        {
            question: "新能源汽车的电池管理系统主要监控什么？",
            options: ["电压、温度、电流", "车速、里程、转向", "空调、音响、灯光", "轮胎、刹车、悬挂"],
            answer: 0
        },
        {
            question: "以下哪种电池类型在新能源汽车中最常用？",
            options: ["铅酸电池", "镍氢电池", "锂离子电池", "镍镉电池"],
            answer: 2
        },
        {
            question: "永磁同步电机的优点是什么？",
            options: ["成本低", "效率高", "体积大", "维护复杂"],
            answer: 1
        }
    ],
    study: [
        {
            question: "三元锂电池的正极材料通常包含哪些金属元素？",
            options: ["镍、钴、锰", "锂、铁、磷", "钠、钾、镁", "铜、锌、铝"],
            answer: 0
        },
        {
            question: "新能源汽车的能量回收系统主要回收什么能量？",
            options: ["太阳能", "风能", "制动能量", "热能"],
            answer: 2
        },
        {
            question: "以下哪种材料常用于新能源汽车的轻量化？",
            options: ["钢铁", "铝合金", "铅", "铜"],
            answer: 1
        }
    ]
};

// 游戏状态管理类
class GameState {
    constructor() {
        this.player = null;
        this.playerId = null;
        this.day = 1;
        this.maxDays = 30;
        this.actions = 5;
        this.gold = 0;
        this.buildProgress = 0;
        this.chatHistory = [];
        this.chatCount = 0;
        this.lastRaid = null;
        this.currentJob = null;
        this.currentCourse = null;
        this.quizQuestions = [];
        this.currentQuestion = 0;
        this.correctAnswers = 0;
        this.workQuizActive = false;
        this.studyQuizActive = false;
        this.raidTarget = null;
        this.lastSaved = null;
    }

    reset() {
        this.player = null;
        this.playerId = null;
        this.day = 1;
        this.actions = 5;
        this.gold = 0;
        this.buildProgress = 0;
        this.chatHistory = [];
        this.chatCount = 0;
        this.lastRaid = null;
        this.currentJob = null;
        this.currentCourse = null;
        this.quizQuestions = [];
        this.currentQuestion = 0;
        this.correctAnswers = 0;
        this.workQuizActive = false;
        this.studyQuizActive = false;
        this.raidTarget = null;
        this.lastSaved = null;
    }

    // 检查需求是否满足
    checkRequirements(requirements) {
        if (!this.player) return false;
        
        for (const [stat, required] of Object.entries(requirements)) {
            if (this.player.stats[stat] < required) {
                return false;
            }
        }
        return true;
    }

    // 获取当前建造阶段
    getCurrentBuildStage() {
        for (let i = BUILD_STAGES.length - 1; i >= 0; i--) {
            if (this.buildProgress >= BUILD_STAGES[i].progress) {
                return BUILD_STAGES[i];
            }
        }
        return BUILD_STAGES[0];
    }

    // 获取剩余天数
    getDaysLeft() {
        return this.maxDays - this.day + 1; // 修复NaN问题
    }
}

// 玩家类
class Player {
    constructor(realName, codename, gender, profession, stats) {
        this.realName = realName;
        this.codename = codename;
        this.gender = gender;
        this.profession = profession;
        this.stats = stats;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    get totalStats() {
        return Object.values(this.stats).reduce((a, b) => a + b, 0);
    }

    // 应用职业加成到属性获取
    applyProfessionBonus(attribute, baseGain) {
        const bonus = PROFESSION_BONUS[this.profession];
        if (bonus && bonus[attribute]) {
            return baseGain * bonus[attribute];
        }
        return baseGain;
    }
}

// 游戏管理器
class GameManager {
    constructor() {
        this.state = new GameState();
        this.isLoading = false;
        this.gameEventsBound = false;
        
        // API端点配置
        this.API_ENDPOINTS = {
            ai: '/api/ai',
            game: '/api/game',
            leaderboard: '/api/leaderboard'
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromStorage();
        this.checkCurrentScreen();
    }

    // 绑定所有事件
    bindEvents() {
        // 创建角色界面事件
        document.querySelectorAll('.profession-card').forEach(card => {
            card.addEventListener('click', () => this.selectProfession(card));
        });

        // 属性滑块和输入框联动
        ['intelligence', 'strength', 'social', 'charm', 'luck'].forEach(stat => {
            const slider = document.getElementById(`${stat}-slider`);
            const input = document.getElementById(`${stat}-input`);
            
            if (slider && input) {
                slider.addEventListener('input', () => {
                    input.value = slider.value;
                    this.updateStatBar(stat, parseInt(slider.value));
                    this.updateRemainingPoints();
                });
                
                input.addEventListener('input', () => {
                    let value = parseInt(input.value) || 5;
                    if (value < 5) value = 5;
                    if (value > 50) value = 50;
                    input.value = value;
                    slider.value = value;
                    this.updateStatBar(stat, value);
                    this.updateRemainingPoints();
                });
            }
        });

        document.getElementById('start-game-btn').addEventListener('click', () => this.createCharacter());

        // 导入剧情界面
        const beginEscapeBtn = document.getElementById('begin-escape-btn');
        if (beginEscapeBtn) {
            beginEscapeBtn.addEventListener('click', () => this.startGame());
        }

        // 确认对话框
        document.getElementById('confirm-cancel').addEventListener('click', () => this.hideConfirm());
        document.getElementById('confirm-ok').addEventListener('click', () => this.confirmAction());

        // 如果玩家存在，绑定游戏事件
        if (this.state.player) {
            this.bindGameEvents();
        }
    }

    // 绑定游戏事件（只在玩家存在时调用）
    bindGameEvents() {
        if (this.gameEventsBound) return;

        // 导航按钮
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target));
        });

        // 游戏操作按钮
        document.getElementById('next-day-btn').addEventListener('click', () => this.nextDay());
        document.getElementById('restart-btn').addEventListener('click', () => this.confirmRestart());

        // 系统界面
        document.getElementById('send-chat-btn').addEventListener('click', () => this.sendChat());
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChat();
            });
        }

        // 工作界面
        document.getElementById('submit-work-quiz').addEventListener('click', () => this.submitWorkQuiz());

        // 学习界面
        document.getElementById('submit-study-quiz').addEventListener('click', () => this.submitStudyQuiz());
        document.getElementById('close-study-results').addEventListener('click', () => this.closeStudyResults());

        // 建造界面
        document.getElementById('build-btn').addEventListener('click', () => this.buildCar());

        // 掠夺界面
        document.getElementById('confirm-raid').addEventListener('click', () => this.confirmRaidResult());

        // 排行榜标签
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchLeaderboardTab(e.target));
        });

        // 结局界面
        document.getElementById('restart-ending-btn').addEventListener('click', () => this.restartFromEnding());
        document.getElementById('view-honor-btn').addEventListener('click', () => this.viewHonorBoard());

        this.gameEventsBound = true;
    }

    // 更新属性进度条
    updateStatBar(stat, value) {
        const bar = document.getElementById(`${stat}-bar`);
        if (bar) {
            const percentage = (value / 50) * 100;
            bar.style.width = `${percentage}%`;
        }
    }

    // 更新剩余点数
    updateRemainingPoints() {
        const totalPoints = ['intelligence', 'strength', 'social', 'charm', 'luck']
            .reduce((sum, stat) => {
                const input = document.getElementById(`${stat}-input`);
                return sum + (input ? parseInt(input.value) || 5 : 5);
            }, 0);
        
        const remainingPoints = 80 - totalPoints;
        const remainingElement = document.getElementById('remaining-points');
        if (remainingElement) {
            remainingElement.textContent = remainingPoints;
        }

        // 更新开始按钮状态
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.disabled = remainingPoints !== 0;
        }
    }

    // 检查当前应该显示哪个界面
    checkCurrentScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
                loadingScreen.classList.add('hidden');
            }
            
            if (this.state.player) {
                this.showScreen('game-screen');
                this.updateGameUI();
                
                if (!this.gameEventsBound) {
                    this.bindGameEvents();
                }
            } else {
                this.showScreen('create-character-screen');
                this.updateRemainingPoints(); // 初始化剩余点数显示
            }
        }, 300);
    }

    // 屏幕切换
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        const screenElement = document.getElementById(screenId);
        if (screenElement) {
            screenElement.classList.remove('hidden');
        }
        
        // 切换到游戏界面时更新UI
        if (screenId === 'game-screen' && this.state.player) {
            this.updateGameUI();
            this.renderWorkOptions();
            this.renderCourses();
            this.updateBuildInterface();
        }
    }

    // 创建角色
    createCharacter() {
        const realName = document.getElementById('realname').value.trim();
        const codename = document.getElementById('codename').value.trim();
        const gender = document.getElementById('gender').value;
        const profession = document.getElementById('profession').value;

        if (!realName || !codename) {
            this.showMessage('请填写完整信息');
            return;
        }

        if (codename.length > 5) {
            this.showMessage('代号不能超过5个字');
            return;
        }

        const stats = {
            intelligence: parseInt(document.getElementById('intelligence-input').value) || 16,
            strength: parseInt(document.getElementById('strength-input').value) || 16,
            social: parseInt(document.getElementById('social-input').value) || 16,
            charm: parseInt(document.getElementById('charm-input').value) || 16,
            luck: parseInt(document.getElementById('luck-input').value) || 16
        };

        // 检查总点数
        const totalPoints = Object.values(stats).reduce((a, b) => a + b, 0);
        if (totalPoints !== 80) {
            this.showMessage('属性点总和必须为80点');
            return;
        }

        this.state.player = new Player(realName, codename, gender, profession, stats);
        this.state.playerId = Utils.generateId();
        this.saveToStorage();
        
        this.showScreen('intro-screen');
        this.generateIntroStory();
    }

    // 生成导入剧情
    async generateIntroStory() {
        this.showLoading(true, 'AI剧情生成中...');
        
        try {
            // 调用AI API生成剧情
            const response = await fetch(this.API_ENDPOINTS.ai, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'intro',
                    player: this.state.player,
                    background: "锈钴城封锁，资源耗尽，需要建造新能源汽车逃离"
                })
            });
            
            if (!response.ok) throw new Error('AI请求失败');
            
            const data = await response.json();
            const story = data.response || `在锈钴城封锁的第45天，资源耗尽，希望渺茫。作为${this.state.player.codename}，你面临着生存的考验。\n\n就在这时，TL001系统突然激活："检测到生存意志，系统绑定成功。30天后，城外救援队抵达。建造出完美的新能源汽车，这是你逃离的唯一机会。"`;
            
            document.getElementById('intro-text').innerHTML = `<p>${story}</p>`;
            document.getElementById('begin-escape-btn').classList.remove('hidden');
        } catch (error) {
            console.error('AI剧情生成失败:', error);
            const story = `在锈钴城封锁的第45天，资源耗尽，希望渺茫。作为${this.state.player.codename}，你面临着生存的考验。\n\n就在这时，TL001系统突然激活："检测到生存意志，系统绑定成功。30天后，城外救援队抵达。建造出完美的新能源汽车，这是你逃离的唯一机会。"`;
            document.getElementById('intro-text').innerHTML = `<p>${story}</p>`;
            document.getElementById('begin-escape-btn').classList.remove('hidden');
        } finally {
            this.showLoading(false);
        }
    }

    // 开始游戏主界面
    startGame() {
        this.showScreen('game-screen');
        this.updateGameUI();
        
        if (!this.gameEventsBound) {
            this.bindGameEvents();
        }
    }

    // 更新游戏UI
    updateGameUI() {
        if (!this.state.player) return;

        // 更新基本信息
        document.getElementById('player-codename').textContent = this.state.player.codename;
        document.getElementById('current-day').textContent = this.state.day;
        document.getElementById('action-points').textContent = this.state.actions;
        document.getElementById('gold-amount').textContent = this.state.gold;
        document.getElementById('build-progress').textContent = this.state.buildProgress;
        document.getElementById('days-left').textContent = this.state.getDaysLeft(); // 修复NaN问题

        // 更新属性概览
        document.getElementById('stat-intel').textContent = this.state.player.stats.intelligence;
        document.getElementById('stat-str').textContent = this.state.player.stats.strength;
        document.getElementById('stat-soc').textContent = this.state.player.stats.social;
        document.getElementById('stat-cha').textContent = this.state.player.stats.charm;
        document.getElementById('stat-luck').textContent = this.state.player.stats.luck;

        // 详细属性面板
        document.getElementById('detail-intel').textContent = this.state.player.stats.intelligence;
        document.getElementById('detail-str').textContent = this.state.player.stats.strength;
        document.getElementById('detail-soc').textContent = this.state.player.stats.social;
        document.getElementById('detail-cha').textContent = this.state.player.stats.charm;
        document.getElementById('detail-luck').textContent = this.state.player.stats.luck;

        // 聊天次数
        document.getElementById('chat-remaining').textContent = 5 - this.state.chatCount;

        // 建造界面更新
        this.updateBuildInterface();

        // 更新掠夺冷却
        this.updateRaidCooldown();

        // 保存状态
        this.saveToStorage();
    }

    // 职业选择
    selectProfession(card) {
        document.querySelectorAll('.profession-card').forEach(c => {
            c.classList.remove('active');
        });
        card.classList.add('active');
        document.getElementById('profession').value = card.dataset.profession;
    }

    // 渲染工作选项
    renderWorkOptions() {
        const container = document.getElementById('work-options');
        if (!container) return;
        
        container.innerHTML = '';

        if (!this.state.player) {
            container.innerHTML = '<p class="no-data">请先创建角色</p>';
            return;
        }

        const availableJobs = JOBS.filter(job => 
            job.unlockDay <= this.state.day && this.state.checkRequirements(job.requirements)
        );

        if (availableJobs.length === 0) {
            container.innerHTML = '<p class="no-data">暂无可用工作</p>';
            return;
        }

        availableJobs.forEach(job => {
            const reward = this.calculateWorkReward(job.baseReward);
            const jobElement = document.createElement('div');
            jobElement.className = 'work-option';
            jobElement.innerHTML = `
                <h4>${job.name}</h4>
                <div class="work-details">
                    <p>${job.description}</p>
                    <div class="requirements">
                        ${Object.entries(job.requirements).map(([stat, value]) => 
                            `<span class="requirement-tag">${stat}: ${value}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="work-reward">预计收益：${reward}金币</div>
            `;
            jobElement.addEventListener('click', () => this.startWork(job));
            container.appendChild(jobElement);
        });
    }

    // 开始工作
    startWork(job) {
        if (this.state.actions <= 0) {
            this.showMessage('没有行动点了');
            return;
        }

        if (this.state.workQuizActive) {
            this.showMessage('请先完成当前工作测试');
            return;
        }

        this.state.currentJob = job;
        this.state.workQuizActive = true;
        
        // 随机选择一个问题
        const questions = QUESTIONS.work || [];
        if (questions.length > 0) {
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            this.state.quizQuestions = [randomQuestion];
            this.state.currentQuestion = 0;
            this.state.correctAnswers = 0;
            
            this.showWorkQuestion();
        } else {
            // 如果没有题目，直接完成工作
            this.completeWork(true);
        }
    }

    // 显示工作问题
    showWorkQuestion() {
        const quizContainer = document.getElementById('work-quiz');
        const optionsContainer = document.getElementById('work-options');
        
        if (quizContainer && optionsContainer) {
            quizContainer.classList.remove('hidden');
            optionsContainer.classList.add('hidden');
        }

        const question = this.state.quizQuestions[this.state.currentQuestion];
        if (!question) return;

        document.getElementById('quiz-question').textContent = question.question;
        const optionsElement = document.getElementById('quiz-options');
        if (optionsElement) {
            optionsElement.innerHTML = '';
            
            question.options.forEach((option, index) => {
                const optionElement = document.createElement('div');
                optionElement.className = 'quiz-option';
                optionElement.textContent = option;
                optionElement.addEventListener('click', () => {
                    document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
                    optionElement.classList.add('selected');
                    this.selectedAnswer = index;
                });
                optionsElement.appendChild(optionElement);
            });
        }
    }

    // 提交工作测试
    submitWorkQuiz() {
        if (typeof this.selectedAnswer === 'undefined') {
            this.showMessage('请选择一个答案');
            return;
        }

        const question = this.state.quizQuestions[this.state.currentQuestion];
        const isCorrect = this.selectedAnswer === question.answer;
        
        if (isCorrect) {
            this.state.correctAnswers++;
        }

        this.completeWork(isCorrect);
    }

    // 完成工作
    completeWork(isCorrect) {
        const job = this.state.currentJob;
        let reward = this.calculateWorkReward(job.baseReward);
        
        if (isCorrect) {
            reward *= 2; // 答对收益翻倍
            this.showMessage(`工作完成！回答正确，获得${reward}金币`);
        } else {
            this.showMessage(`工作完成！回答错误，获得基础收益${reward}金币`);
        }

        this.state.gold += reward;
        this.state.actions--;
        this.state.workQuizActive = false;
        this.state.currentJob = null;
        this.selectedAnswer = undefined;
        
        // 恢复界面
        const quizContainer = document.getElementById('work-quiz');
        const optionsContainer = document.getElementById('work-options');
        
        if (quizContainer && optionsContainer) {
            quizContainer.classList.add('hidden');
            optionsContainer.classList.remove('hidden');
        }
        
        this.updateGameUI();
        this.renderWorkOptions();
    }

    // 计算工作收益
    calculateWorkReward(baseReward) {
        let reward = baseReward;
        const luckMultiplier = Utils.getLuckMultiplier(this.state.player.stats.luck);
        reward = Math.round(reward * luckMultiplier);
        return reward;
    }

    // 渲染课程
    renderCourses() {
        const container = document.getElementById('course-grid');
        if (!container) return;
        
        container.innerHTML = '';

        if (!this.state.player) {
            container.innerHTML = '<p class="no-data">请先创建角色</p>';
            return;
        }

        const availableCourses = COURSES.filter(course => 
            this.state.checkRequirements(course.requirements)
        );

        if (availableCourses.length === 0) {
            container.innerHTML = '<p class="no-data">暂无可用课程</p>';
            return;
        }

        availableCourses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.className = 'course-card';
            courseElement.innerHTML = `
                <i class="fas fa-book"></i>
                <h4>${course.name}</h4>
                <p>${course.description}</p>
                <div class="course-requirements">
                    需求：${Object.entries(course.requirements).map(([stat, value]) => 
                        `${stat}: ${value}`
                    ).join(', ')}
                </div>
                <div class="course-benefits">
                    主要提升：${course.mainAttribute}，次要提升：${course.secondaryAttribute}
                </div>
            `;
            courseElement.addEventListener('click', () => this.startStudy(course));
            container.appendChild(courseElement);
        });
    }

    // 开始学习
    startStudy(course) {
        if (this.state.actions <= 0) {
            this.showMessage('没有行动点了');
            return;
        }

        if (this.state.studyQuizActive) {
            this.showMessage('请先完成当前课程测试');
            return;
        }

        this.state.currentCourse = course;
        this.state.studyQuizActive = true;
        this.state.quizQuestions = this.generateStudyQuestions(20); // 生成20道题
        this.state.currentQuestion = 0;
        this.state.correctAnswers = 0;
        
        this.showStudyQuestion();
    }

    // 生成学习题目
    generateStudyQuestions(count) {
        const questions = QUESTIONS.study || [];
        const result = [];
        
        for (let i = 0; i < count; i++) {
            if (questions.length > 0) {
                result.push(questions[i % questions.length]);
            } else {
                // 如果题库为空，生成默认题目
                result.push({
                    question: `学习问题 ${i + 1}`,
                    options: ['选项A', '选项B', '选项C', '选项D'],
                    answer: i % 4
                });
            }
        }
        
        return result;
    }

    // 显示学习问题
    showStudyQuestion() {
        const quizContainer = document.getElementById('study-quiz');
        const courseSelection = document.querySelector('.course-selection');
        
        if (quizContainer && courseSelection) {
            quizContainer.classList.remove('hidden');
            courseSelection.classList.add('hidden');
        }

        document.getElementById('quiz-current').textContent = this.state.currentQuestion + 1;
        
        const question = this.state.quizQuestions[this.state.currentQuestion];
        if (!question) return;

        document.getElementById('study-question').textContent = question.question;
        const optionsElement = document.getElementById('study-options');
        if (optionsElement) {
            optionsElement.innerHTML = '';
            
            question.options.forEach((option, index) => {
                const optionElement = document.createElement('div');
                optionElement.className = 'quiz-option';
                optionElement.textContent = option;
                optionElement.addEventListener('click', () => {
                    document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
                    optionElement.classList.add('selected');
                    this.selectedStudyAnswer = index;
                });
                optionsElement.appendChild(optionElement);
            });
        }
    }

    // 提交学习测试
    submitStudyQuiz() {
        if (typeof this.selectedStudyAnswer === 'undefined') {
            this.showMessage('请选择一个答案');
            return;
        }

        const question = this.state.quizQuestions[this.state.currentQuestion];
        const isCorrect = this.selectedStudyAnswer === question.answer;
        
        if (isCorrect) {
            this.state.correctAnswers++;
        }

        this.state.currentQuestion++;
        
        if (this.state.currentQuestion >= this.state.quizQuestions.length) {
            this.completeStudy();
        } else {
            this.selectedStudyAnswer = undefined;
            this.showStudyQuestion();
        }
    }

    // 完成学习
    completeStudy() {
        const course = this.state.currentCourse;
        const totalQuestions = this.state.quizQuestions.length;
        const correctRate = this.state.correctAnswers / totalQuestions;
        
        // 计算属性增长（基于正确率）
        let mainGain = Math.round(course.baseGain * correctRate);
        let secondaryGain = Math.round(course.baseGain * correctRate * 0.5);
        
        // 应用职业加成
        mainGain = this.state.player.applyProfessionBonus(course.mainAttribute, mainGain);
        secondaryGain = this.state.player.applyProfessionBonus(course.secondaryAttribute, secondaryGain);
        
        // 幸运影响
        const luckMultiplier = Utils.getLuckMultiplier(this.state.player.stats.luck);
        mainGain = Math.round(mainGain * luckMultiplier);
        secondaryGain = Math.round(secondaryGain * luckMultiplier);
        
        // 增长属性
        this.state.player.stats[course.mainAttribute] += mainGain;
        this.state.player.stats[course.secondaryAttribute] += secondaryGain;
        
        this.state.actions--;
        this.state.studyQuizActive = false;
        this.state.currentCourse = null;
        this.selectedStudyAnswer = undefined;
        
        // 显示学习结果
        this.showStudyResults(course, mainGain, secondaryGain, correctRate);
    }

    // 显示学习结果
    showStudyResults(course, mainGain, secondaryGain, correctRate) {
        const resultsContainer = document.getElementById('study-results');
        const quizContainer = document.getElementById('study-quiz');
        
        if (resultsContainer && quizContainer) {
            quizContainer.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
        }

        const resultsContent = document.getElementById('results-content');
        if (resultsContent) {
            resultsContent.innerHTML = `
                <p>课程：${course.name}</p>
                <p>正确率：${Math.round(correctRate * 100)}% (${this.state.correctAnswers}/20)</p>
                <p>${course.mainAttribute} +${mainGain}</p>
                <p>${course.secondaryAttribute} +${secondaryGain}</p>
                <p>行动点 -1</p>
            `;
        }
    }

    // 关闭学习结果
    closeStudyResults() {
        const resultsContainer = document.getElementById('study-results');
        const courseSelection = document.querySelector('.course-selection');
        
        if (resultsContainer && courseSelection) {
            resultsContainer.classList.add('hidden');
            courseSelection.classList.remove('hidden');
        }
        
        this.updateGameUI();
        this.renderCourses();
    }

    // 更新建造界面
    updateBuildInterface() {
        if (!this.state.player) return;
        
        const stage = this.state.getCurrentBuildStage();
        
        // 更新需求显示
        document.getElementById('req-intelligence').textContent = stage.requirements.intelligence || 0;
        document.getElementById('req-strength').textContent = stage.requirements.strength || 0;
        document.getElementById('req-social').textContent = stage.requirements.social || 0;
        document.getElementById('req-charm').textContent = stage.requirements.charm || 0;
        document.getElementById('req-gold').textContent = stage.requirements.gold || 0;
        
        // 更新状态
        document.getElementById('intel-status').textContent = 
            this.state.player.stats.intelligence >= (stage.requirements.intelligence || 0) ? '✓ 已满足' : '✗ 不足';
        document.getElementById('str-status').textContent = 
            this.state.player.stats.strength >= (stage.requirements.strength || 0) ? '✓ 已满足' : '✗ 不足';
        document.getElementById('soc-status').textContent = 
            this.state.player.stats.social >= (stage.requirements.social || 0) ? '✓ 已满足' : '✗ 不足';
        document.getElementById('cha-status').textContent = 
            this.state.player.stats.charm >= (stage.requirements.charm || 0) ? '✓ 已满足' : '✗ 不足';
        document.getElementById('gold-status').textContent = 
            this.state.gold >= (stage.requirements.gold || 0) ? '✓ 已满足' : '✗ 不足';
        
        // 更新进度条和部件
        document.getElementById('build-progress-fill').style.width = `${this.state.buildProgress}%`;
        document.getElementById('build-percentage').textContent = this.state.buildProgress;
        
        // 更新车辆部件状态
        BUILD_STAGES.forEach(partStage => {
            const partElement = document.getElementById(`part-${partStage.name.replace('系统', '').replace('框架', '').replace('外壳', '').toLowerCase()}`);
            if (partElement) {
                if (this.state.buildProgress >= partStage.progress) {
                    partElement.classList.add('completed');
                } else {
                    partElement.classList.remove('completed');
                }
            }
        });
        
        // 检查建造按钮
        const canBuild = this.state.checkRequirements(stage.requirements) &&
                        this.state.gold >= (stage.requirements.gold || 0) &&
                        this.state.actions > 0;
        
        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) {
            buildBtn.disabled = !canBuild;
        }
    }

    // 建造汽车
    buildCar() {
        if (this.state.actions <= 0) {
            this.showMessage('没有行动点了');
            return;
        }

        const stage = this.state.getCurrentBuildStage();
        
        if (!this.state.checkRequirements(stage.requirements)) {
            this.showMessage('不满足建造需求');
            return;
        }
        
        if (this.state.gold < stage.requirements.gold) {
            this.showMessage('金币不足');
            return;
        }
        
        // 消耗资源
        this.state.gold -= stage.requirements.gold;
        this.state.actions--;
        
        // 增加进度（5-10%）
        const progressIncrease = 5 + Math.floor(Math.random() * 6);
        this.state.buildProgress = Math.min(100, this.state.buildProgress + progressIncrease);
        
        // 显示结果
        const resultElement = document.getElementById('build-result');
        if (resultElement) {
            resultElement.textContent = `${stage.name}建造完成！进度增加${progressIncrease}%`;
            resultElement.style.color = 'var(--success-color)';
        }
        
        // 检查是否完成
        if (this.state.buildProgress >= 100) {
            setTimeout(() => this.checkEnding(), 1000);
        }
        
        this.updateGameUI();
    }

    // 切换游戏界面
    switchSection(button) {
        const section = button.dataset.section;
        
        if (section === 'next-day') {
            this.nextDay();
            return;
        }
        
        if (section === 'restart') {
            this.confirmRestart();
            return;
        }
        
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // 显示对应内容区域
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        const sectionElement = document.getElementById(`${section}-section`);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
        
        // 特殊处理
        if (section === 'leaderboard') {
            this.updateLeaderboards();
        } else if (section === 'raid') {
            this.updateRaidTargets();
        }
    }

    // 进入下一天
    nextDay() {
        if (this.state.actions > 0) {
            this.showMessage('还有行动点没有使用');
            return;
        }
        
        this.state.day++;
        this.state.actions = 5;
        this.state.chatCount = 0;
        
        if (this.state.day > this.state.maxDays) {
            this.checkEnding();
        } else {
            this.updateGameUI();
            this.showMessage(`第${this.state.day}天开始`);
        }
    }

    // 聊天系统
    async sendChat() {
        const input = document.getElementById('chat-input');
        const message = input ? input.value.trim() : '';
        
        if (!message) {
            this.showMessage('请输入消息');
            return;
        }
        
        if (message.length > 200) {
            this.showMessage('消息不能超过200字');
            return;
        }
        
        if (this.state.chatCount >= 5) {
            this.showMessage('今日对话次数已用完');
            return;
        }
        
        // 添加到聊天历史
        this.addChatMessage('user', message);
        
        // 调用AI API
        this.showLoading(true, '系统思考中...');
        try {
            const response = await fetch(this.API_ENDPOINTS.ai, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'chat',
                    messages: this.state.chatHistory,
                    player: this.state.player,
                    gameState: {
                        day: this.state.day,
                        buildProgress: this.state.buildProgress,
                        gold: this.state.gold
                    }
                })
            });
            
            if (!response.ok) throw new Error('AI请求失败');
            
            const data = await response.json();
            const aiMessage = data.response || '系统暂时无法回应，请稍后再试。';
            this.addChatMessage('system', aiMessage);
            
        } catch (error) {
            console.error('AI对话失败:', error);
            this.addChatMessage('system', '系统连接异常，请重试。');
        } finally {
            this.showLoading(false);
        }
        
        if (input) input.value = '';
        this.state.chatCount++;
        this.updateGameUI();
    }

    addChatMessage(sender, message) {
        const history = document.getElementById('chat-history');
        if (!history) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.innerHTML = `
            <div class="sender">${sender === 'user' ? '你' : 'TL001系统'}</div>
            <div class="content">${message}</div>
        `;
        history.appendChild(messageElement);
        history.scrollTop = history.scrollHeight;
        
        this.state.chatHistory.push({ 
            role: sender === 'user' ? 'user' : 'assistant', 
            content: message 
        });
        
        // 限制历史记录长度
        if (this.state.chatHistory.length > 150) {
            this.state.chatHistory.shift();
        }
    }

    // 更新掠夺冷却
    updateRaidCooldown() {
        const cooldownElement = document.getElementById('raid-cooldown');
        if (!cooldownElement) return;
        
        if (!this.state.lastRaid) {
            cooldownElement.textContent = '今日可以掠夺';
            return;
        }
        
        const lastRaidDate = new Date(this.state.lastRaid);
        const isSameDay = Utils.isSameDay(lastRaidDate, new Date());
        
        if (isSameDay) {
            cooldownElement.textContent = '今日已掠夺过';
        } else {
            cooldownElement.textContent = '今日可以掠夺';
        }
    }

    // 更新掠夺目标
    async updateRaidTargets() {
        const targetsContainer = document.getElementById('raid-targets');
        if (!targetsContainer) return;
        
        // 这里应该从服务器获取在线玩家列表
        // 暂时显示模拟数据
        const mockTargets = [
            { id: 'target1', codename: '工程师', totalStats: 350, gold: 1200 },
            { id: 'target2', codename: '猎人', totalStats: 320, gold: 980 },
            { id: 'target3', codename: '幸存者', totalStats: 310, gold: 850 }
        ];
        
        const noTargetsElement = document.getElementById('no-targets');
        if (mockTargets.length === 0) {
            targetsContainer.innerHTML = '';
            if (noTargetsElement) {
                noTargetsElement.classList.remove('hidden');
            }
            return;
        }
        
        if (noTargetsElement) {
            noTargetsElement.classList.add('hidden');
        }
        
        targetsContainer.innerHTML = '';
        
        mockTargets.forEach(target => {
            const targetElement = document.createElement('div');
            targetElement.className = 'raid-target';
            targetElement.innerHTML = `
                <div class="target-info">
                    <div class="target-name">${target.codename}</div>
                    <div class="target-rank">总属性: ${target.totalStats}</div>
                </div>
                <div class="target-stats">
                    <div class="target-stat">金币: ${target.gold}</div>
                    <div class="target-stat">可掠夺: ${Math.round(target.gold * 0.1)}</div>
                </div>
            `;
            targetElement.addEventListener('click', () => this.startRaid(target));
            targetsContainer.appendChild(targetElement);
        });
    }

    // 开始掠夺
    startRaid(target) {
        // 检查冷却时间
        if (this.state.lastRaid && Utils.isSameDay(new Date(this.state.lastRaid), new Date())) {
            this.showMessage('今日已掠夺过，请明天再来');
            return;
        }
        
        this.state.raidTarget = target;
        
        // 随机选择比拼属性
        const attributes = ['intelligence', 'strength', 'social', 'charm', 'luck'];
        const randomAttribute = attributes[Math.floor(Math.random() * attributes.length)];
        const playerAttribute = this.state.player.stats[randomAttribute];
        const targetAttribute = Math.floor(Math.random() * 50) + 20; // 模拟对手属性
        
        // 显示战斗界面
        const battleContainer = document.getElementById('raid-battle');
        const targetsContainer = document.getElementById('raid-targets');
        
        if (battleContainer && targetsContainer) {
            battleContainer.classList.remove('hidden');
            targetsContainer.classList.add('hidden');
        }
        
        document.getElementById('battle-attribute').textContent = 
            this.getAttributeName(randomAttribute) + '比拼';
        document.getElementById('player1-name').textContent = this.state.player.codename;
        document.getElementById('player1-attr').textContent = playerAttribute;
        document.getElementById('player2-name').textContent = target.codename;
        document.getElementById('player2-attr').textContent = targetAttribute;
        
        // 判断胜负
        this.raidResult = {
            attribute: randomAttribute,
            playerValue: playerAttribute,
            targetValue: targetAttribute,
            playerWins: playerAttribute > targetAttribute,
            goldToSteal: Math.round(target.gold * 0.1)
        };
    }

    // 获取属性中文名称
    getAttributeName(attribute) {
        const names = {
            intelligence: '智力',
            strength: '武力',
            social: '交际',
            charm: '气质',
            luck: '幸运'
        };
        return names[attribute] || attribute;
    }

    // 确认掠夺结果
    confirmRaidResult() {
        const result = this.raidResult;
        const resultElement = document.getElementById('battle-result');
        
        if (!resultElement || !result) return;
        
        if (result.playerWins) {
            this.state.gold += result.goldToSteal;
            resultElement.innerHTML = `
                <p style="color: var(--success-color);">掠夺成功！</p>
                <p>你获得了 ${result.goldToSteal} 金币</p>
            `;
        } else {
            resultElement.innerHTML = `
                <p style="color: var(--danger-color);">掠夺失败！</p>
                <p>对方实力太强，你未能掠夺到金币</p>
            `;
        }
        
        // 更新最后一次掠夺时间
        this.state.lastRaid = new Date().toISOString();
        
        // 恢复界面
        const battleContainer = document.getElementById('raid-battle');
        const targetsContainer = document.getElementById('raid-targets');
        
        if (battleContainer) {
            setTimeout(() => {
                battleContainer.classList.add('hidden');
                if (targetsContainer) {
                    targetsContainer.classList.remove('hidden');
                }
                this.updateGameUI();
                this.updateRaidTargets();
            }, 2000);
        }
    }

    // 更新排行榜
    async updateLeaderboards() {
        try {
            // 获取实时榜
            const realtimeResponse = await fetch(`${this.API_ENDPOINTS.leaderboard}?type=realtime`);
            const realtimeData = await realtimeResponse.json();
            
            // 获取荣誉榜
            const honorResponse = await fetch(`${this.API_ENDPOINTS.leaderboard}?type=honor`);
            const honorData = await honorResponse.json();
            
            this.renderLeaderboard('realtime', realtimeData.leaderboard || []);
            this.renderLeaderboard('honor', honorData.leaderboard || []);
            
        } catch (error) {
            console.error('获取排行榜失败:', error);
            // 显示空排行榜
            this.renderLeaderboard('realtime', []);
            this.renderLeaderboard('honor', []);
        }
    }

    // 渲染排行榜
    renderLeaderboard(type, data) {
        const tbodyId = type === 'realtime' ? 'realtime-leaderboard' : 'honor-leaderboard';
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${type === 'realtime' ? 6 : 5}" style="text-align: center; padding: 20px;">
                        暂无数据
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.map((item, index) => {
            if (type === 'realtime') {
                return `
                    <tr>
                        <td class="rank-${index + 1}">${index + 1}</td>
                        <td>${item.codename}</td>
                        <td>${item.totalStats}</td>
                        <td>${item.buildProgress}%</td>
                        <td>${item.gold}</td>
                        <td>${item.day || 1}</td>
                    </tr>
                `;
            } else {
                return `
                    <tr>
                        <td class="rank-${index + 1}">${index + 1}</td>
                        <td>${item.realName}</td>
                        <td>${item.escapes}</td>
                        <td>${Utils.formatDate(item.firstEscape)}</td>
                        <td>${Utils.formatDate(item.lastEscape)}</td>
                    </tr>
                `;
            }
        }).join('');
    }

    // 切换排行榜标签
    switchLeaderboardTab(button) {
        const tab = button.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        const tabElement = document.getElementById(`${tab}-tab`);
        if (tabElement) {
            tabElement.classList.add('active');
        }
    }

    // 结局判定
    async checkEnding() {
        this.showLoading(true, '生成结局中...');
        
        try {
            const response = await fetch(this.API_ENDPOINTS.ai, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'ending',
                    player: this.state.player,
                    gameState: {
                        day: this.state.day,
                        buildProgress: this.state.buildProgress,
                        gold: this.state.gold,
                        stats: this.state.player.stats
                    }
                })
            });
            
            if (!response.ok) throw new Error('AI请求失败');
            
            const data = await response.json();
            const ending = data.response || '你的故事已经结束，但锈钴城的故事仍在继续...';
            const isSuccess = this.state.buildProgress >= 100;
            
            this.showEnding(
                isSuccess ? '成功逃离' : '未能逃离',
                ending,
                isSuccess
            );
            
            // 如果成功逃离，记录到荣誉榜
            if (isSuccess) {
                await this.recordEscape();
            }
            
        } catch (error) {
            console.error('结局生成失败:', error);
            this.showEnding(
                this.state.buildProgress >= 100 ? '成功逃离' : '未能逃离',
                '你的故事已经结束，但锈钴城的故事仍在继续...',
                this.state.buildProgress >= 100
            );
        } finally {
            this.showLoading(false);
        }
    }

    // 记录成功逃离
    async recordEscape() {
        try {
            await fetch(this.API_ENDPOINTS.leaderboard, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'honor',
                    realName: this.state.player.realName,
                    codename: this.state.player.codename
                })
            });
        } catch (error) {
            console.error('记录逃离失败:', error);
        }
    }

    // 显示结局
    showEnding(title, content, isSuccess) {
        const header = document.getElementById('ending-header');
        const contentElement = document.getElementById('ending-content');
        
        if (header && contentElement) {
            header.innerHTML = `<h2 class="${isSuccess ? 'good-ending' : 'bad-ending'}">${title}</h2>`;
            contentElement.textContent = content;
            this.showScreen('ending-screen');
        }
    }

    // 从结局界面重新开始
    restartFromEnding() {
        this.state.reset();
        this.gameEventsBound = false;
        this.clearStorage();
        this.showScreen('create-character-screen');
    }

    // 查看荣誉榜
    viewHonorBoard() {
        this.showScreen('game-screen');
        this.switchSection(document.querySelector('[data-section="leaderboard"]'));
    }

    // 确认重启
    confirmRestart() {
        this.showConfirm('重新开始游戏', '确定要重新开始吗？所有进度将会丢失。', () => {
            this.state.reset();
            this.gameEventsBound = false;
            this.clearStorage();
            this.showScreen('create-character-screen');
        });
    }

    // 存储管理
    saveToStorage() {
        try {
            localStorage.setItem('escapeRustCobalt', JSON.stringify({
                player: this.state.player,
                playerId: this.state.playerId,
                day: this.state.day,
                actions: this.state.actions,
                gold: this.state.gold,
                buildProgress: this.state.buildProgress,
                chatHistory: this.state.chatHistory,
                chatCount: this.state.chatCount,
                lastRaid: this.state.lastRaid,
                lastSaved: new Date().toISOString()
            }));
        } catch (error) {
            console.error('保存游戏失败:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('escapeRustCobalt'));
            if (saved) {
                if (saved.player) {
                    this.state.player = saved.player;
                    this.state.playerId = saved.playerId;
                    this.state.day = saved.day || 1;
                    this.state.actions = saved.actions || 5;
                    this.state.gold = saved.gold || 0;
                    this.state.buildProgress = saved.buildProgress || 0;
                    this.state.chatHistory = saved.chatHistory || [];
                    this.state.chatCount = saved.chatCount || 0;
                    this.state.lastRaid = saved.lastRaid || null;
                    this.state.lastSaved = saved.lastSaved || null;
                }
            }
        } catch (error) {
            console.error('加载游戏失败:', error);
            this.clearStorage();
        }
    }

    clearStorage() {
        localStorage.removeItem('escapeRustCobalt');
    }

    // 工具方法
    showLoading(show, message = '加载中...') {
        this.isLoading = show;
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            if (show) {
                loadingScreen.classList.remove('hidden');
                const messageElement = loadingScreen.querySelector('p');
                if (messageElement) {
                    messageElement.textContent = message;
                }
            } else {
                loadingScreen.classList.add('hidden');
            }
        }
    }

    showMessage(message) {
        const toast = document.getElementById('message-toast');
        const messageElement = document.getElementById('toast-message');
        
        if (toast && messageElement) {
            messageElement.textContent = message;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }
    }

    showConfirm(title, message, callback) {
        const titleElement = document.getElementById('confirm-title');
        const messageElement = document.getElementById('confirm-message');
        const dialog = document.getElementById('confirm-dialog');
        
        if (titleElement && messageElement && dialog) {
            titleElement.textContent = title;
            messageElement.textContent = message;
            dialog.classList.remove('hidden');
            
            this.confirmCallback = callback;
        }
    }

    hideConfirm() {
        const dialog = document.getElementById('confirm-dialog');
        if (dialog) {
            dialog.classList.add('hidden');
        }
        this.confirmCallback = null;
    }

    confirmAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
        this.hideConfirm();
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.game = new GameManager();
    } catch (error) {
        console.error('游戏初始化失败:', error);
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2>游戏加载失败</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="btn-primary">重新加载</button>
                </div>
            `;
        }
    }
});
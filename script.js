// 逃离锈钴城 - 主游戏逻辑
// 使用IIFE封装，避免全局变量污染
(function() {
    'use strict';

    // API工具函数
    const API = {
        baseUrl: window.location.hostname.includes('localhost') 
            ? 'http://localhost:8787/api' 
            : '/api',
        
        // 通用请求方法
        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            
            try {
                const response = await fetch(url, { ...defaultOptions, ...options });
                
                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`API请求到 ${endpoint} 失败:`, error);
                throw error;
            }
        },
        
        // 玩家API
        players: {
            async create(playerData) {
                return await API.request('/players', {
                    method: 'POST',
                    body: JSON.stringify(playerData)
                });
            },
            
            async update(playerId, updateData) {
                return await API.request(`/players?id=${encodeURIComponent(playerId)}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
            },
            
            async get(playerId) {
                return await API.request(`/players?id=${encodeURIComponent(playerId)}`);
            },
            
            async getAll() {
                return await API.request('/players');
            },
            
            async search(code) {
                return await API.request(`/players?code=${encodeURIComponent(code)}`);
            },
            
            async delete(playerId) {
                return await API.request(`/players?id=${encodeURIComponent(playerId)}`, {
                    method: 'DELETE'
                });
            }
        },
        
        // 排行榜API
        rankings: {
            async get(limit = 100, offset = 0) {
                return await API.request(`/rankings?limit=${limit}&offset=${offset}`);
            }
        },
        
        // 荣誉榜API
        honor: {
            async add(honorData) {
                return await API.request('/honor', {
                    method: 'POST',
                    body: JSON.stringify(honorData)
                });
            },
            
            async getAll(limit = 50, offset = 0) {
                return await API.request(`/honor?limit=${limit}&offset=${offset}`);
            }
        }
    };

    // 游戏状态对象
    const gameState = {
        player: null,
        playerId: null,
        day: 1,
        actionPoints: 5,
        gold: 0,
        buildProgress: 0,
        dailyLog: [],
        chatHistory: [],
        chatLimit: 5,
        raidUsed: false,
        raidTarget: null,
        gameStarted: false,
        actionsToday: 0
    };

    // 职业信息
    const professions = {
        student: { name: '学生', multiplier: { luck: 2 } },
        lawyer: { name: '律师', multiplier: { intelligence: 2 } },
        police: { name: '警员', multiplier: { strength: 2 } },
        merchant: { name: '商人', multiplier: { communication: 2 } },
        star: { name: '明星', multiplier: { charm: 2 } }
    };

    // 建造阶段信息
    const buildStages = [
        { min: 0, max: 20, name: '设计规划', desc: '完成车辆的整体设计方案和图纸', 
          requirements: { intelligence: 15, gold: 100 } },
        { min: 20, max: 40, name: '底盘制作', desc: '制造车辆底盘和框架', 
          requirements: { strength: 20, intelligence: 20, gold: 300 } },
        { min: 40, max: 60, name: '动力系统', desc: '安装电池和电机系统', 
          requirements: { intelligence: 30, communication: 15, gold: 600 } },
        { min: 60, max: 80, name: '车身制造', desc: '制造和安装车身', 
          requirements: { charm: 20, strength: 25, gold: 1000 } },
        { min: 80, max: 100, name: '系统集成', desc: '整合所有系统并进行测试', 
          requirements: { intelligence: 40, communication: 25, gold: 1500 } }
    ];

    // 工作信息
    const jobs = {
        labor: [
            { name: '搬运工', desc: '搬运建筑材料', baseReward: 10, 
              requirements: { strength: 5 }, unlock: true },
            { name: '清洁工', desc: '清理建筑工地', baseReward: 15, 
              requirements: { strength: 8 }, unlock: false },
            { name: '保安', desc: '看守建筑材料', baseReward: 20, 
              requirements: { strength: 12, communication: 5 }, unlock: false },
            { name: '工地助手', desc: '协助技工工作', baseReward: 25, 
              requirements: { strength: 15, intelligence: 5 }, unlock: false }
        ],
        technical: [
            { name: '电工助手', desc: '协助电路安装', baseReward: 30, 
              requirements: { intelligence: 15 }, unlock: false },
            { name: '机械学徒', desc: '学习机械维修', baseReward: 40, 
              requirements: { intelligence: 20, strength: 10 }, unlock: false },
            { name: '电路技术员', desc: '安装电路系统', baseReward: 50, 
              requirements: { intelligence: 25 }, unlock: false },
            { name: '电机技工', desc: '维修和安装电机', baseReward: 60, 
              requirements: { intelligence: 30, strength: 15 }, unlock: false }
        ],
        management: [
            { name: '工地监工', desc: '监督工人工作', baseReward: 70, 
              requirements: { communication: 20, intelligence: 15 }, unlock: false },
            { name: '采购员', desc: '购买建筑材料', baseReward: 80, 
              requirements: { communication: 25, charm: 15 }, unlock: false },
            { name: '项目经理', desc: '管理整个项目', baseReward: 90, 
              requirements: { communication: 30, intelligence: 25 }, unlock: false },
            { name: '团队领导', desc: '领导技术团队', baseReward: 100, 
              requirements: { communication: 35, intelligence: 30 }, unlock: false }
        ],
        expert: [
            { name: '电池专家', desc: '设计电池系统', baseReward: 120, 
              requirements: { intelligence: 40 }, unlock: false },
            { name: '动力工程师', desc: '设计动力系统', baseReward: 140, 
              requirements: { intelligence: 45, strength: 20 }, unlock: false },
            { name: '车身设计师', desc: '设计车辆外观', baseReward: 160, 
              requirements: { charm: 35, intelligence: 30 }, unlock: false },
            { name: '总工程师', desc: '指导整个项目', baseReward: 200, 
              requirements: { intelligence: 50, communication: 40 }, unlock: false }
        ]
    };

    // 学习课程信息
    const courses = {
        basic: [
            { name: '新能源汽车概论', desc: '学习新能源汽车基本概念', 
              mainAttr: 'intelligence', secAttr: 'luck', questions: 20, unlock: true },
            { name: '电池技术基础', desc: '了解电池工作原理', 
              mainAttr: 'intelligence', secAttr: 'strength', questions: 20, unlock: false },
            { name: '电机原理入门', desc: '学习电机工作原理', 
              mainAttr: 'intelligence', secAttr: 'communication', questions: 20, unlock: false }
        ],
        engineering: [
            { name: '电路设计与分析', desc: '学习电路设计原理', 
              mainAttr: 'intelligence', secAttr: 'charm', questions: 20, unlock: false },
            { name: '车身结构设计', desc: '学习车辆结构设计', 
              mainAttr: 'strength', secAttr: 'intelligence', questions: 20, unlock: false },
            { name: '动力系统集成', desc: '学习动力系统整合', 
              mainAttr: 'intelligence', secAttr: 'strength', questions: 20, unlock: false }
        ],
        business: [
            { name: '项目管理', desc: '学习项目管理知识', 
              mainAttr: 'communication', secAttr: 'intelligence', questions: 20, unlock: false },
            { name: '团队协作', desc: '学习团队协作技巧', 
              mainAttr: 'communication', secAttr: 'charm', questions: 20, unlock: false },
            { name: '新能源汽车市场', desc: '了解市场趋势', 
              mainAttr: 'charm', secAttr: 'communication', questions: 20, unlock: false }
        ]
    };

    // 模拟题库（实际游戏中应该从服务器获取）
    const questionBank = {
        basic: [
            { question: "新能源汽车主要使用哪种能源？", options: ["汽油", "柴油", "电能", "核能"], answer: 2 },
            { question: "电池管理系统的主要作用是什么？", options: ["控制车速", "管理电池充放电", "控制空调", "导航"], answer: 1 },
            { question: "以下哪种不是新能源汽车的类型？", options: ["纯电动汽车", "混合动力汽车", "燃料电池汽车", "柴油汽车"], answer: 3 },
            { question: "充电桩的快充和慢充主要区别是什么？", options: ["充电速度", "充电价格", "充电接口", "充电安全"], answer: 0 },
            { question: "电动汽车的'三电系统'不包括以下哪项？", options: ["电池", "电机", "电控", "电灯"], answer: 3 },
            { question: "目前主流的电动汽车电池类型是什么？", options: ["铅酸电池", "镍氢电池", "锂离子电池", "钠硫电池"], answer: 2 },
            { question: "再生制动系统的主要作用是什么？", options: ["提高车速", "回收制动能量", "增加续航", "减少噪音"], answer: 1 },
            { question: "以下哪项不是电动汽车的优点？", options: ["零排放", "低噪音", "加速快", "续航焦虑"], answer: 3 },
            { question: "电池的容量单位通常是什么？", options: ["伏特(V)", "安培(A)", "千瓦时(kWh)", "欧姆(Ω)"], answer: 2 },
            { question: "电动汽车充电时，应该注意什么？", options: ["在雨天充电", "使用专用充电桩", "边充电边使用空调", "充电时间越长越好"], answer: 1 }
        ],
        engineering: [
            { question: "电机的主要作用是什么？", options: ["储存电能", "将电能转化为机械能", "控制车辆", "导航"], answer: 1 },
            { question: "以下哪种材料常用于电池正极？", options: ["锂", "钴酸锂", "铁", "铝"], answer: 1 },
            { question: "BMS是指什么系统？", options: ["刹车系统", "电池管理系统", "车身稳定系统", "导航系统"], answer: 1 },
            { question: "电机的功率单位是什么？", options: ["千瓦(kW)", "伏特(V)", "安时(Ah)", "牛顿米(N·m)"], answer: 0 },
            { question: "以下哪项不是电机的主要类型？", options: ["直流电机", "交流异步电机", "永磁同步电机", "蒸汽电机"], answer: 3 },
            { question: "电池的能量密度是指什么？", options: ["电池重量", "单位体积或重量储存的能量", "电池电压", "电池寿命"], answer: 1 },
            { question: "电控系统的主要功能不包括？", options: ["控制电机转速", "管理电池充电", "控制空调温度", "车辆能量管理"], answer: 2 },
            { question: "热管理系统的主要作用是什么？", options: ["保持电池温度在适宜范围", "提高车速", "减少噪音", "增加续航"], answer: 0 },
            { question: "以下哪项是影响续航里程的主要因素？", options: ["电池容量", "车身颜色", "轮胎品牌", "座椅材质"], answer: 0 },
            { question: "永磁同步电机的优点不包括？", options: ["高效率", "高功率密度", "结构简单", "不需要稀土材料"], answer: 3 }
        ],
        business: [
            { question: "项目管理中的'三重约束'是指什么？", options: ["时间、成本、范围", "时间、质量、风险", "成本、质量、风险", "范围、质量、沟通"], answer: 0 },
            { question: "团队协作中最重要的是什么？", options: ["沟通", "竞争", "个人能力", "设备"], answer: 0 },
            { question: "SWOT分析不包括以下哪项？", options: ["优势", "劣势", "机会", "技术"], answer: 3 },
            { question: "以下哪项不是有效的沟通技巧？", options: ["积极倾听", "清晰表达", "及时反馈", "打断对方"], answer: 3 },
            { question: "冲突解决的第一步应该是什么？", options: ["识别问题", "指责对方", "回避问题", "寻求上级干预"], answer: 0 },
            { question: "时间管理的'四象限法则'是根据什么来划分任务？", options: ["重要性和紧急性", "难易程度", "所需时间", "个人喜好"], answer: 0 },
            { question: "以下哪项不是有效的团队建设活动？", options: ["定期会议", "团队培训", "信任建立", "个人竞赛"], answer: 3 },
            { question: "决策过程中不应该包括？", options: ["收集信息", "分析选项", "立即执行", "评估结果"], answer: 2 },
            { question: "领导力的核心是什么？", options: ["影响他人", "控制他人", "批评他人", "回避责任"], answer: 0 },
            { question: "有效的反馈应该具备什么特点？", options: ["具体、及时、建设性", "模糊、延迟、批评性", "抽象、快速、赞美性", "随意、不定期、负面性"], answer: 0 }
        ]
    };

    // 生成玩家ID
    function generatePlayerId(playerData = null) {
        if (playerData && playerData.name && playerData.code) {
            // 基于玩家信息生成确定性ID
            const str = `${playerData.name}_${playerData.code}_${Date.now()}`;
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 转换为32位整数
            }
            return `player_${Math.abs(hash).toString(16).substring(0, 8)}`;
        }
        // 随机生成ID
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 获取当前建造阶段
    function getCurrentBuildStage() {
        for (let stage of buildStages) {
            if (gameState.buildProgress >= stage.min && gameState.buildProgress < stage.max) {
                return stage;
            }
        }
        return buildStages[buildStages.length - 1];
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationContent = document.getElementById('notificationContent');
        
        notificationContent.textContent = message;
        
        // 设置通知样式
        const borderColors = {
            'info': '#2a9d8f',
            'success': '#2a9d8f',
            'warning': '#e9c46a',
            'error': '#e63946'
        };
        
        notification.style.borderLeftColor = borderColors[type] || borderColors.info;
        
        // 显示通知
        notification.style.display = 'block';
        notification.classList.add('show');
        
        // 3秒后隐藏通知
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 3000);
        
        // 记录到日志
        addToDailyLog(message);
    }

    // 添加到每日日志
    function addToDailyLog(message) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        gameState.dailyLog.push(`[${timestamp}] ${message}`);
        updateDayLog();
    }

    // 更新每日日志显示
    function updateDayLog() {
        const dayLog = document.getElementById('dayLog');
        if (!dayLog) return;
        
        dayLog.innerHTML = '';
        
        if (gameState.dailyLog.length === 0) {
            dayLog.innerHTML = '<div class="log-entry">今天还没有任何行动记录。</div>';
            return;
        }
        
        // 只显示最近的20条日志
        const recentLogs = gameState.dailyLog.slice(-20);
        
        recentLogs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.textContent = log;
            dayLog.appendChild(logEntry);
        });
        
        // 滚动到底部
        dayLog.scrollTop = dayLog.scrollHeight;
    }

    // 更新游戏状态显示
    function updateGameDisplay() {
        if (!gameState.player) return;
        
        // 更新资源显示
        document.getElementById('actionPoints').textContent = gameState.actionPoints;
        document.getElementById('goldCoins').textContent = gameState.gold;
        document.getElementById('buildProgress').textContent = gameState.buildProgress;
        document.getElementById('displayPlayerCode').textContent = gameState.player.code;
        document.getElementById('displayProfession').textContent = professions[gameState.player.profession].name;
        document.getElementById('currentDay').textContent = gameState.day;
        
        // 更新属性显示
        document.getElementById('statIntelligenceValue').textContent = gameState.player.intelligence;
        document.getElementById('statStrengthValue').textContent = gameState.player.strength;
        document.getElementById('statCommunicationValue').textContent = gameState.player.communication;
        document.getElementById('statCharmValue').textContent = gameState.player.charm;
        document.getElementById('statLuckValue').textContent = gameState.player.luck;
        
        // 更新属性进度条
        document.getElementById('statIntelligence').style.width = `${gameState.player.intelligence}%`;
        document.getElementById('statStrength').style.width = `${gameState.player.strength}%`;
        document.getElementById('statCommunication').style.width = `${gameState.player.communication}%`;
        document.getElementById('statCharm').style.width = `${gameState.player.charm}%`;
        document.getElementById('statLuck').style.width = `${gameState.player.luck}%`;
        
        // 更新聊天限制
        document.getElementById('chatLimit').textContent = gameState.chatLimit;
        
        // 更新掠夺状态
        document.getElementById('raidRemaining').textContent = gameState.raidUsed ? 0 : 1;
        
        // 更新建造面板
        updateBuildDisplay();
        
        // 更新下一天面板
        updateNextDayDisplay();
        
        // 更新工作面板
        updateWorkDisplay();
        
        // 更新学习面板
        updateStudyDisplay();
    }

    // 更新建造显示
    function updateBuildDisplay() {
        const stage = getCurrentBuildStage();
        
        document.getElementById('buildPercentage').textContent = gameState.buildProgress;
        document.getElementById('buildStageText').textContent = stage.name;
        document.getElementById('buildStage').textContent = `${stage.name} (${stage.min}-${stage.max}%)`;
        document.getElementById('buildProgressBar').style.width = `${gameState.buildProgress}%`;
        
        // 更新建造需求
        const requirementsDiv = document.getElementById('buildRequirements');
        requirementsDiv.innerHTML = '';
        
        // 添加属性需求
        for (const [attr, value] of Object.entries(stage.requirements)) {
            if (attr === 'gold') continue;
            
            const attrNames = {
                intelligence: '智力',
                strength: '武力',
                communication: '交际',
                charm: '气质'
            };
            
            const reqItem = document.createElement('div');
            reqItem.className = 'req-item';
            
            const hasRequirement = gameState.player[attr] >= value;
            reqItem.innerHTML = `
                <i class="fas fa-${hasRequirement ? 'check' : 'times'}" style="color: ${hasRequirement ? '#2a9d8f' : '#e63946'}"></i>
                <span>${attrNames[attr]} ≥ ${value}</span>
                <span style="margin-left: auto; color: ${hasRequirement ? '#2a9d8f' : '#e63946'}">
                    ${gameState.player[attr]}/${value}
                </span>
            `;
            requirementsDiv.appendChild(reqItem);
        }
        
        // 添加金币需求
        const goldReq = document.createElement('div');
        goldReq.className = 'req-item';
        const hasGold = gameState.gold >= stage.requirements.gold;
        goldReq.innerHTML = `
            <i class="fas fa-coins" style="color: ${hasGold ? '#e9c46a' : '#e63946'}"></i>
            <span>金币 ≥ ${stage.requirements.gold}</span>
            <span style="margin-left: auto; color: ${hasGold ? '#e9c46a' : '#e63946'}">
                ${gameState.gold}/${stage.requirements.gold}
            </span>
        `;
        requirementsDiv.appendChild(goldReq);
        
        // 更新建造按钮状态
        const buildBtn = document.getElementById('buildBtn');
        const buildHint = document.getElementById('buildHint');
        
        let canBuild = gameState.actionPoints > 0;
        let missingRequirements = [];
        
        // 检查所有需求
        for (const [attr, value] of Object.entries(stage.requirements)) {
            if (attr === 'gold') {
                if (gameState.gold < value) {
                    canBuild = false;
                    missingRequirements.push(`金币(${gameState.gold}/${value})`);
                }
            } else {
                if (gameState.player[attr] < value) {
                    canBuild = false;
                    const attrNames = {
                        intelligence: '智力',
                        strength: '武力',
                        communication: '交际',
                        charm: '气质'
                    };
                    missingRequirements.push(`${attrNames[attr]}(${gameState.player[attr]}/${value})`);
                }
            }
        }
        
        if (gameState.buildProgress >= 100) {
            buildBtn.disabled = true;
            buildBtn.innerHTML = '<i class="fas fa-check"></i> 建造已完成';
            buildHint.textContent = '新能源汽车已经建造完成！';
        } else if (canBuild) {
            buildBtn.disabled = false;
            buildHint.textContent = '点击开始建造，每次增加5-10%进度';
        } else {
            buildBtn.disabled = true;
            buildHint.textContent = `无法建造，缺少: ${missingRequirements.join(', ')}`;
        }
        
        // 更新车辆部件状态
        updateVehicleParts();
    }

    // 更新车辆部件状态
    function updateVehicleParts() {
        const parts = ['chassis', 'battery', 'motor', 'wheels', 'body'];
        const partStages = {
            chassis: 1,  // 底盘制作阶段
            battery: 2,  // 动力系统阶段
            motor: 2,    // 动力系统阶段
            wheels: 1,   // 底盘制作阶段
            body: 3      // 车身制造阶段
        };
        
        const currentStageIndex = buildStages.findIndex(stage => 
            gameState.buildProgress >= stage.min && gameState.buildProgress < stage.max
        );
        
        parts.forEach(part => {
            const partElement = document.getElementById(`part${part.charAt(0).toUpperCase() + part.slice(1)}`);
            const statusElement = document.getElementById(`part${part.charAt(0).toUpperCase() + part.slice(1)}Status`);
            
            if (currentStageIndex >= partStages[part]) {
                partElement.classList.add('completed');
                statusElement.textContent = `${part === 'body' ? '车身' : 
                    part === 'chassis' ? '底盘' : 
                    part === 'battery' ? '电池' : 
                    part === 'motor' ? '电机' : '车轮'}: 已完成`;
                statusElement.classList.add('completed');
            } else {
                partElement.classList.remove('completed');
                statusElement.textContent = `${part === 'body' ? '车身' : 
                    part === 'chassis' ? '底盘' : 
                    part === 'battery' ? '电池' : 
                    part === 'motor' ? '电机' : '车轮'}: 未完成`;
                statusElement.classList.remove('completed');
            }
        });
    }

    // 更新下一天显示
    function updateNextDayDisplay() {
        document.getElementById('nextDayNumber').textContent = gameState.day;
        document.getElementById('daysRemaining').textContent = 30 - gameState.day;
        document.getElementById('countdownDays').textContent = 30 - gameState.day;
        document.getElementById('countdownTotal').textContent = 30 - gameState.day;
        document.getElementById('nextDayBtnText').textContent = gameState.day + 1;
        
        // 更新确认按钮
        const confirmCheckbox = document.getElementById('confirmNextDay');
        const nextDayBtn = document.getElementById('nextDayBtn');
        
        if (confirmCheckbox && nextDayBtn) {
            confirmCheckbox.addEventListener('change', function() {
                nextDayBtn.disabled = !this.checked;
            });
            
            nextDayBtn.disabled = !confirmCheckbox.checked;
        }
    }

    // 更新工作显示
    function updateWorkDisplay() {
        const jobList = document.getElementById('jobList');
        if (!jobList) return;
        
        jobList.innerHTML = '';
        
        // 获取当前工作标签
        const activeTab = document.querySelector('#workTabs .tab-btn.active');
        if (!activeTab) return;
        
        const workType = activeTab.dataset.work;
        const jobArray = jobs[workType];
        
        jobArray.forEach((job, index) => {
            // 检查是否解锁
            let unlocked = job.unlock;
            if (!unlocked) {
                // 检查是否满足要求
                let meetsRequirements = true;
                for (const [attr, value] of Object.entries(job.requirements)) {
                    if (gameState.player[attr] < value) {
                        meetsRequirements = false;
                        break;
                    }
                }
                if (meetsRequirements) {
                    job.unlock = true;
                    unlocked = true;
                }
            }
            
            const jobCard = document.createElement('div');
            jobCard.className = `job-card ${unlocked ? '' : 'locked'}`;
            
            // 计算实际奖励（受幸运影响）
            let actualReward = job.baseReward;
            if (gameState.player.luck < 20) {
                actualReward = Math.floor(actualReward * 0.5);
            } else if (gameState.player.luck > 80) {
                actualReward = Math.floor(actualReward * 2);
            }
            
            // 随机波动
            const fluctuation = Math.floor(Math.random() * 11) - 5; // -5 到 +5
            actualReward += fluctuation;
            actualReward = Math.max(5, actualReward); // 最少5金币
            
            jobCard.innerHTML = `
                <h4>${job.name}</h4>
                <p>${job.desc}</p>
                <div class="job-reward">
                    <i class="fas fa-coins"></i>
                    预计收益: ${actualReward} 金币
                </div>
                <div class="job-requirements">
                    ${Object.entries(job.requirements).map(([attr, value]) => {
                        const attrNames = {
                            intelligence: '智力',
                            strength: '武力',
                            communication: '交际',
                            charm: '气质'
                        };
                        const hasRequirement = gameState.player[attr] >= value;
                        return `<span class="req" style="background: ${hasRequirement ? 'rgba(42, 157, 143, 0.2)' : 'rgba(231, 111, 81, 0.2)'}">
                            ${attrNames[attr]}: ${value}
                        </span>`;
                    }).join(' ')}
                </div>
                <button class="btn-action" onclick="window.startWork('${workType}', ${index})" 
                    ${!unlocked || gameState.actionPoints === 0 ? 'disabled' : ''}>
                    <i class="fas fa-hammer"></i> 开始工作
                </button>
            `;
            
            jobList.appendChild(jobCard);
        });
    }

    // 开始工作
    window.startWork = function(workType, jobIndex) {
        if (gameState.actionPoints === 0) {
            showNotification('没有行动点了！', 'warning');
            return;
        }
        
        const job = jobs[workType][jobIndex];
        
        // 消耗行动点
        gameState.actionPoints--;
        gameState.actionsToday++;
        
        // 计算奖励
        let actualReward = job.baseReward;
        if (gameState.player.luck < 20) {
            actualReward = Math.floor(actualReward * 0.5);
        } else if (gameState.player.luck > 80) {
            actualReward = Math.floor(actualReward * 2);
        }
        
        // 随机波动
        const fluctuation = Math.floor(Math.random() * 11) - 5;
        actualReward += fluctuation;
        actualReward = Math.max(5, actualReward);
        
        // 显示答题模态框
        showWorkQuiz(workType, job, actualReward);
    };

    // 显示工作答题
    function showWorkQuiz(workType, job, baseReward) {
        // 从题库中随机选择一道题
        const courseTypes = Object.keys(questionBank);
        const randomCourse = courseTypes[Math.floor(Math.random() * courseTypes.length)];
        const questions = questionBank[randomCourse];
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        
        const modal = document.getElementById('quizModal');
        const quizTitle = document.getElementById('quizTitle');
        const quizQuestion = document.getElementById('quizQuestion');
        const quizOptions = document.getElementById('quizOptions');
        const submitBtn = document.getElementById('submitAnswerBtn');
        
        quizTitle.textContent = `工作挑战 - ${job.name}`;
        quizQuestion.textContent = randomQuestion.question;
        
        // 清空选项
        quizOptions.innerHTML = '';
        
        // 添加选项
        randomQuestion.options.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'quiz-option';
            optionBtn.textContent = option;
            optionBtn.dataset.index = index;
            
            optionBtn.addEventListener('click', function() {
                // 移除之前的选择
                document.querySelectorAll('.quiz-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // 标记当前选择
                this.classList.add('selected');
                submitBtn.disabled = false;
            });
            
            quizOptions.appendChild(optionBtn);
        });
        
        // 设置提交按钮
        submitBtn.onclick = function() {
            const selectedOption = document.querySelector('.quiz-option.selected');
            if (!selectedOption) return;
            
            const selectedIndex = parseInt(selectedOption.dataset.index);
            const isCorrect = selectedIndex === randomQuestion.answer;
            
            // 显示结果
            document.querySelectorAll('.quiz-option').forEach((opt, idx) => {
                opt.classList.remove('selected');
                if (idx === randomQuestion.answer) {
                    opt.classList.add('correct');
                } else if (idx === selectedIndex && !isCorrect) {
                    opt.classList.add('incorrect');
                }
                opt.disabled = true;
            });
            
            submitBtn.disabled = true;
            
            // 计算最终奖励
            let finalReward = isCorrect ? baseReward * 2 : baseReward;
            gameState.gold += finalReward;
            
            // 显示结果并关闭模态框
            setTimeout(() => {
                modal.style.display = 'none';
                updateGameDisplay();
                
                const resultMessage = isCorrect 
                    ? `工作完成！回答正确，获得双倍奖励 ${finalReward} 金币！`
                    : `工作完成！回答错误，获得 ${finalReward} 金币。`;
                
                showNotification(resultMessage, isCorrect ? 'success' : 'info');
                addToDailyLog(`${isCorrect ? '✓' : '✗'} ${job.name}: ${resultMessage}`);
                
                // 保存游戏进度
                saveGame();
            }, 2000);
        };
        
        // 显示模态框
        modal.style.display = 'flex';
        submitBtn.disabled = true;
    };

    // 更新学习显示
    function updateStudyDisplay() {
        const courseList = document.getElementById('courseList');
        if (!courseList) return;
        
        courseList.innerHTML = '';
        
        // 获取当前学习标签
        const activeTab = document.querySelector('#studyTabs .tab-btn.active');
        if (!activeTab) return;
        
        const courseType = activeTab.dataset.course;
        const courseArray = courses[courseType];
        
        courseArray.forEach((course, index) => {
            // 检查是否解锁
            let unlocked = course.unlock;
            if (!unlocked) {
                // 基础课程总是解锁的
                if (courseType === 'basic' && index === 0) {
                    course.unlock = true;
                    unlocked = true;
                }
                // 其他课程根据属性解锁
                else {
                    const attrRequirement = {
                        engineering: { intelligence: 20 },
                        business: { communication: 15 }
                    };
                    
                    if (attrRequirement[courseType]) {
                        const [attr, value] = Object.entries(attrRequirement[courseType])[0];
                        if (gameState.player[attr] >= value) {
                            course.unlock = true;
                            unlocked = true;
                        }
                    }
                }
            }
            
            const courseCard = document.createElement('div');
            courseCard.className = `course-card ${unlocked ? '' : 'locked'}`;
            
            // 计算可能的属性收益（受幸运影响）
            const mainAttrName = {
                intelligence: '智力',
                strength: '武力',
                communication: '交际',
                charm: '气质',
                luck: '幸运'
            };
            
            const secAttrName = mainAttrName[course.secAttr];
            
            courseCard.innerHTML = `
                <h4>${course.name}</h4>
                <p>${course.desc}</p>
                <div class="course-effects">
                    <i class="fas fa-chart-line"></i>
                    主要提升: ${mainAttrName[course.mainAttr]}，次要提升: ${secAttrName}
                </div>
                <button class="btn-action" onclick="window.startStudy('${courseType}', ${index})" 
                    ${!unlocked || gameState.actionPoints === 0 ? 'disabled' : ''}>
                    <i class="fas fa-book-open"></i> 开始学习 (${course.questions}题)
                </button>
            `;
            
            courseList.appendChild(courseCard);
        });
    }

    // 开始学习
    window.startStudy = function(courseType, courseIndex) {
        if (gameState.actionPoints === 0) {
            showNotification('没有行动点了！', 'warning');
            return;
        }
        
        const course = courses[courseType][courseIndex];
        
        // 消耗行动点
        gameState.actionPoints--;
        gameState.actionsToday++;
        
        // 开始学习（显示答题界面）
        startStudyQuiz(courseType, course);
    };

    // 开始学习答题
    function startStudyQuiz(courseType, course) {
        // 获取题目
        const questions = questionBank[courseType] || questionBank.basic;
        
        // 如果题目不足，复制现有题目
        let quizQuestions = [];
        while (quizQuestions.length < course.questions) {
            quizQuestions = quizQuestions.concat(questions);
        }
        quizQuestions = quizQuestions.slice(0, course.questions);
        
        // 打乱题目顺序
        quizQuestions.sort(() => Math.random() - 0.5);
        
        let currentQuestionIndex = 0;
        let correctAnswers = 0;
        
        // 显示第一题
        showNextStudyQuestion();
        
        function showNextStudyQuestion() {
            if (currentQuestionIndex >= quizQuestions.length) {
                // 学习完成
                finishStudy(course, correctAnswers, quizQuestions.length);
                return;
            }
            
            const question = quizQuestions[currentQuestionIndex];
            const modal = document.getElementById('quizModal');
            const quizTitle = document.getElementById('quizTitle');
            const currentQuestionSpan = document.getElementById('currentQuestion');
            const totalQuestionsSpan = document.getElementById('totalQuestions');
            const quizQuestion = document.getElementById('quizQuestion');
            const quizOptions = document.getElementById('quizOptions');
            const submitBtn = document.getElementById('submitAnswerBtn');
            
            quizTitle.textContent = `学习 - ${course.name}`;
            currentQuestionSpan.textContent = currentQuestionIndex + 1;
            totalQuestionsSpan.textContent = quizQuestions.length;
            quizQuestion.textContent = question.question;
            
            // 清空选项
            quizOptions.innerHTML = '';
            
            // 添加选项
            question.options.forEach((option, index) => {
                const optionBtn = document.createElement('button');
                optionBtn.className = 'quiz-option';
                optionBtn.textContent = option;
                optionBtn.dataset.index = index;
                
                optionBtn.addEventListener('click', function() {
                    // 移除之前的选择
                    document.querySelectorAll('.quiz-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    // 标记当前选择
                    this.classList.add('selected');
                    submitBtn.disabled = false;
                });
                
                quizOptions.appendChild(optionBtn);
            });
            
            // 设置提交按钮
            submitBtn.onclick = function() {
                const selectedOption = document.querySelector('.quiz-option.selected');
                if (!selectedOption) return;
                
                const selectedIndex = parseInt(selectedOption.dataset.index);
                const isCorrect = selectedIndex === question.answer;
                
                // 显示结果
                document.querySelectorAll('.quiz-option').forEach((opt, idx) => {
                    opt.classList.remove('selected');
                    if (idx === question.answer) {
                        opt.classList.add('correct');
                    } else if (idx === selectedIndex && !isCorrect) {
                        opt.classList.add('incorrect');
                    }
                    opt.disabled = true;
                });
                
                submitBtn.disabled = true;
                
                // 记录正确答案
                if (isCorrect) {
                    correctAnswers++;
                }
                
                // 显示下一题
                setTimeout(() => {
                    currentQuestionIndex++;
                    showNextStudyQuestion();
                }, 1500);
            };
            
            // 显示模态框
            modal.style.display = 'flex';
            submitBtn.disabled = true;
        }
    }

    // 完成学习
    function finishStudy(course, correctAnswers, totalQuestions) {
        const modal = document.getElementById('quizModal');
        modal.style.display = 'none';
        
        // 计算正确率
        const accuracy = correctAnswers / totalQuestions;
        
        // 计算属性提升（基础提升 + 正确率加成）
        let baseGain = 2;
        let accuracyBonus = Math.floor(accuracy * 5); // 0-5点额外奖励
        
        // 职业加成
        const professionMultiplier = professions[gameState.player.profession].multiplier;
        if (professionMultiplier[course.mainAttr]) {
            baseGain *= professionMultiplier[course.mainAttr];
            accuracyBonus *= professionMultiplier[course.mainAttr];
        }
        
        // 幸运影响
        let luckMultiplier = 1;
        if (gameState.player.luck < 20) {
            luckMultiplier = 0.5;
        } else if (gameState.player.luck > 80) {
            luckMultiplier = 2;
        }
        
        const mainGain = Math.floor((baseGain + accuracyBonus) * luckMultiplier);
        const secGain = Math.floor((baseGain / 2) * luckMultiplier);
        
        // 应用属性提升
        gameState.player[course.mainAttr] += mainGain;
        gameState.player[course.secAttr] += secGain;
        
        // 属性上限
        gameState.player[course.mainAttr] = Math.min(gameState.player[course.mainAttr], 100);
        gameState.player[course.secAttr] = Math.min(gameState.player[course.secAttr], 100);
        
        // 显示结果
        const mainAttrName = {
            intelligence: '智力',
            strength: '武力',
            communication: '交际',
            charm: '气质',
            luck: '幸运'
        };
        
        const resultMessage = `学习完成！正确率: ${Math.floor(accuracy * 100)}%。${mainAttrName[course.mainAttr]} +${mainGain}，${mainAttrName[course.secAttr]} +${secGain}`;
        
        showNotification(resultMessage, 'success');
        addToDailyLog(`📚 ${course.name}: ${resultMessage}`);
        
        // 更新显示
        updateGameDisplay();
        
        // 保存游戏进度
        saveGame();
    }

    // 切换到下一天
    async function nextDay() {
        // 重置行动点
        gameState.actionPoints = 5;
        gameState.day++;
        gameState.actionsToday = 0;
        gameState.raidUsed = false;
        gameState.chatLimit = 5;
        
        // 清空每日日志（保留历史记录）
        gameState.dailyLog = [];
        
        // 检查是否到达30天
        if (gameState.day > 30) {
            endGame();
            return;
        }
        
        // 显示通知
        showNotification(`第 ${gameState.day} 天开始！行动点已重置。`, 'info');
        
        // 更新显示
        updateGameDisplay();
        
        // 保存游戏进度
        await saveGame();
    }

    // 结束游戏
    async function endGame() {
        // 判断结局
        const isSuccess = gameState.buildProgress >= 100;
        
        // 切换到结局界面
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById('screenEnding').classList.add('active');
        
        // 设置结局标题
        const endingTitle = document.getElementById('endingTitle');
        const endingSubtitle = document.getElementById('endingSubtitle');
        const endingText = document.getElementById('endingText');
        const endingStats = document.getElementById('endingStats');
        
        if (isSuccess) {
            endingTitle.textContent = '成功逃离！';
            endingSubtitle.textContent = '第30天，你驾驶着新能源汽车冲出了锈钴城！';
            endingText.innerHTML = `
                <p>经过30天的艰苦努力，你终于完成了新能源汽车的建造。在第30天的黎明，你驾驶着这辆凝聚了所有心血和智慧的车辆，冲破了锈钴城的封锁线。</p>
                <p>外面的世界虽然依然充满未知，但至少你获得了自由。TL001系统在你离开时说道："恭喜你，你证明了人类的坚韧和智慧。记住这段经历，它将成为你未来道路上最宝贵的财富。"</p>
                <p>你的名字将被记录在荣誉榜上，成为锈钴城历史上少数成功逃离的传奇之一。</p>
            `;
        } else {
            endingTitle.textContent = '被困锈钴城';
            endingSubtitle.textContent = '第30天，你的建造计划未能完成...';
            endingText.innerHTML = `
                <p>30天的期限已到，你的新能源汽车建造进度停留在${gameState.buildProgress}%。随着最后期限的到来，锈钴城的资源彻底耗尽。</p>
                <p>TL001系统在你面前逐渐消失："很遗憾，你的逃离计划失败了。但请不要放弃希望，人类的智慧总会找到新的出路..."</p>
                <p>你留在了锈钴城，与其他幸存者一起，继续寻找着逃离这座绝望之城的其他方法。</p>
            `;
        }
        
        // 显示统计数据
        endingStats.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">游戏天数</div>
                <div class="stat-value">${gameState.day - 1}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">建造进度</div>
                <div class="stat-value">${gameState.buildProgress}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">获得金币</div>
                <div class="stat-value">${gameState.gold}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">最终智力</div>
                <div class="stat-value">${gameState.player.intelligence}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">最终武力</div>
                <div class="stat-value">${gameState.player.strength}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">最终交际</div>
                <div class="stat-value">${gameState.player.communication}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">最终气质</div>
                <div class="stat-value">${gameState.player.charm}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">最终幸运</div>
                <div class="stat-value">${gameState.player.luck}</div>
            </div>
        `;
        
        // 如果成功，保存到荣誉榜
        if (isSuccess) {
            await saveToHonor();
        }
        
        // 重置游戏状态
        resetGameState();
    }

    // 保存到荣誉榜
    async function saveToHonor() {
        const honorData = {
            playerId: gameState.playerId,
            playerName: gameState.player.name,
            playerCode: gameState.player.code,
            profession: gameState.player.profession,
            buildProgress: gameState.buildProgress,
            gold: gameState.gold,
            attributes: {
                intelligence: gameState.player.intelligence,
                strength: gameState.player.strength,
                communication: gameState.player.communication,
                charm: gameState.player.charm,
                luck: gameState.player.luck
            },
            day: gameState.day,
            escapedAt: new Date().toISOString()
        };
        
        // 尝试保存到Cloudflare KV
        try {
            await API.honor.add(honorData);
            console.log('成功保存到荣誉榜');
        } catch (error) {
            console.warn('无法保存到云端荣誉榜，使用本地存储:', error);
            // 回退到localStorage
            const honorList = JSON.parse(localStorage.getItem('escapeRustCity_honor') || '[]');
            honorList.push(honorData);
            localStorage.setItem('escapeRustCity_honor', JSON.stringify(honorList));
        }
    }

    // 重置游戏状态
    function resetGameState() {
        gameState.player = null;
        gameState.playerId = null;
        gameState.day = 1;
        gameState.actionPoints = 5;
        gameState.gold = 0;
        gameState.buildProgress = 0;
        gameState.dailyLog = [];
        gameState.chatHistory = [];
        gameState.chatLimit = 5;
        gameState.raidUsed = false;
        gameState.raidTarget = null;
        gameState.gameStarted = false;
        gameState.actionsToday = 0;
    }

    // 保存游戏进度
    async function saveGame() {
        if (!gameState.player || !gameState.playerId) return;
        
        const saveData = {
            id: gameState.playerId,
            name: gameState.player.name,
            code: gameState.player.code,
            gender: gameState.player.gender,
            profession: gameState.player.profession,
            intelligence: gameState.player.intelligence,
            strength: gameState.player.strength,
            communication: gameState.player.communication,
            charm: gameState.player.charm,
            luck: gameState.player.luck,
            day: gameState.day,
            actionPoints: gameState.actionPoints,
            gold: gameState.gold,
            buildProgress: gameState.buildProgress,
            chatHistory: gameState.chatHistory,
            chatLimit: gameState.chatLimit,
            raidUsed: gameState.raidUsed,
            gameStarted: gameState.gameStarted,
            actionsToday: gameState.actionsToday,
            lastActive: new Date().toISOString(),
            saveTime: new Date().toISOString()
        };
        
        // 同时保存到localStorage（离线支持）
        localStorage.setItem('escapeRustCity_save', JSON.stringify(saveData));
        
        // 尝试保存到Cloudflare KV
        try {
            await API.players.update(gameState.playerId, saveData);
            console.log('游戏进度已保存到云端');
        } catch (error) {
            console.warn('无法保存到云端，使用本地存储:', error);
        }
    }

    // 加载游戏进度
    async function loadGame() {
        // 先尝试从localStorage加载
        const localSave = localStorage.getItem('escapeRustCity_save');
        if (!localSave) {
            return false;
        }
        
        const saveData = JSON.parse(localSave);
        
        // 恢复游戏状态
        gameState.player = {
            name: saveData.name,
            code: saveData.code,
            gender: saveData.gender,
            profession: saveData.profession,
            intelligence: saveData.intelligence,
            strength: saveData.strength,
            communication: saveData.communication,
            charm: saveData.charm,
            luck: saveData.luck
        };
        
        gameState.playerId = saveData.id || generatePlayerId(gameState.player);
        gameState.day = saveData.day || 1;
        gameState.actionPoints = saveData.actionPoints || 5;
        gameState.gold = saveData.gold || 0;
        gameState.buildProgress = saveData.buildProgress || 0;
        gameState.chatHistory = saveData.chatHistory || [];
        gameState.chatLimit = saveData.chatLimit || 5;
        gameState.raidUsed = saveData.raidUsed || false;
        gameState.gameStarted = saveData.gameStarted || false;
        gameState.actionsToday = saveData.actionsToday || 0;
        
        // 更新显示
        updateGameDisplay();
        updateChatDisplay();
        
        return true;
    }

    // 更新聊天显示
    function updateChatDisplay() {
        const chatMessages = document.getElementById('chatMessages');
        const chatCount = document.getElementById('chatCount');
        
        if (!chatMessages) return;
        
        // 清空现有消息（除了第一条系统消息）
        while (chatMessages.children.length > 1) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        
        // 添加历史消息
        gameState.chatHistory.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender}`;
            
            const senderDiv = document.createElement('div');
            senderDiv.className = 'message-sender';
            senderDiv.textContent = msg.sender === 'player' ? gameState.player.code : 'TL001系统';
            
            const contentDiv = document.createElement('div');
            contentDiv.textContent = msg.content;
            
            messageDiv.appendChild(senderDiv);
            messageDiv.appendChild(contentDiv);
            
            chatMessages.appendChild(messageDiv);
        });
        
        // 更新消息计数
        chatCount.textContent = gameState.chatHistory.length + 1;
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 发送聊天消息
    async function sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message) {
            showNotification('请输入消息内容！', 'warning');
            return;
        }
        
        if (message.length > 200) {
            showNotification('消息不能超过200字！', 'warning');
            return;
        }
        
        if (gameState.chatLimit <= 0) {
            showNotification('今天的对话次数已用完！', 'warning');
            return;
        }
        
        // 添加玩家消息
        gameState.chatHistory.push({ sender: 'player', content: message });
        gameState.chatLimit--;
        gameState.actionsToday++;
        
        // 清空输入框
        chatInput.value = '';
        
        // 更新显示
        updateGameDisplay();
        updateChatDisplay();
        
        // 显示加载状态
        const chatMessages = document.getElementById('chatMessages');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message system';
        loadingDiv.innerHTML = '<div class="message-sender">TL001系统</div>正在思考...';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // 这里应该调用AI API
            // 由于API密钥需要保密，这里使用模拟响应
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟AI回复
            const aiResponses = [
                "新能源汽车的核心是电池技术，你需要重点关注电池管理系统。",
                "建造进度已经不错，但要记得平衡各个属性的提升。",
                "今天的幸运值可能会影响你的工作收益，可以考虑先进行学习。",
                "别忘了查看排行榜，了解其他玩家的进度。",
                "如果你遇到困难，可以尝试与其他玩家交流（通过掠夺了解他们的实力）。",
                "30天的时间很紧张，合理分配行动点是关键。",
                "你的职业加成在学习相关课程时会非常有用。",
                "建造车辆需要大量金币，记得经常工作赚取资源。",
                "每次建造的进度增加是随机的，保持耐心。",
                "成功逃离需要100%的建造进度，加油！"
            ];
            
            const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
            
            // 移除加载状态
            chatMessages.removeChild(loadingDiv);
            
            // 添加AI回复
            gameState.chatHistory.push({ sender: 'system', content: randomResponse });
            updateChatDisplay();
            
            // 记录到日志
            addToDailyLog(`💬 与TL001系统对话: ${message}`);
            
        } catch (error) {
            console.error('AI聊天错误:', error);
            
            // 移除加载状态
            chatMessages.removeChild(loadingDiv);
            
            // 添加错误回复
            gameState.chatHistory.push({ 
                sender: 'system', 
                content: "抱歉，我现在无法处理你的请求。请检查网络连接或稍后再试。" 
            });
            updateChatDisplay();
        }
        
        // 保存游戏进度
        await saveGame();
    }

    // 生成故事
    async function generateStory() {
        const storyText = document.getElementById('storyText');
        const storyLoading = document.getElementById('storyLoading');
        
        // 显示加载状态
        storyText.style.display = 'none';
        storyLoading.style.display = 'flex';
        
        try {
            // 这里应该调用AI API生成故事
            // 由于API密钥需要保密，这里使用模拟故事
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const professionName = professions[gameState.player.profession].name;
            
            const stories = [
                `你曾是锈钴城的一名${professionName}，过着平凡的生活。直到那天，战争爆发，城市被封锁，资源开始枯竭。你和其他市民被困在这座逐渐死去的城市中，每天都能感受到希望在一分一秒地流逝。`,
                `作为锈钴城的${professionName}，你见证了这座城市从繁荣到衰败。封锁令下达后，你尝试过各种方法逃离，但都失败了。就在你几乎绝望时，一个神秘的TL001系统出现在你的脑海中。`,
                `在锈钴城被封锁的第30天，你几乎放弃了所有希望。作为一名前${professionName}，你目睹了太多人因为绝望而倒下。但今天，一个声音在你的脑海中响起——那是TL001系统，它给你带来了逃离这座城市的唯一希望。`
            ];
            
            const systemMessages = [
                `"你好，${gameState.player.code}。我是TL001系统，检测到你的生存意志足够强烈，已被选为逃离计划执行者。你有30天时间建造一辆新能源汽车，这是逃离锈钴城的唯一方法。我会全程协助你。"`,
                `"${gameState.player.code}，听着，我是TL001系统。这座城市即将彻底崩溃，但我有一个计划。在接下来的30天里，你需要学习新能源汽车技术，收集资源，建造一辆能够冲破封锁的车辆。时间紧迫，开始行动吧。"`,
                `"幸存者${gameState.player.code}，我是TL001系统。锈钴城的资源还能支撑30天，你必须在这段时间内建造一辆新能源汽车逃离。系统将提供必要的技术支持，但主要工作必须由你完成。你的每一个决定都关乎生死。"`
            ];
            
            const randomStory = stories[Math.floor(Math.random() * stories.length)];
            const randomSystem = systemMessages[Math.floor(Math.random() * systemMessages.length)];
            
            storyText.innerHTML = `
                <p>${randomStory}</p>
                <p><strong>TL001系统：</strong> ${randomSystem}</p>
            `;
            
        } catch (error) {
            console.error('生成故事错误:', error);
            storyText.innerHTML = `
                <p>你曾是锈钴城的一名普通市民，过着平凡的生活。直到那天，战争爆发，城市被封锁，资源开始枯竭。你和其他市民被困在这座逐渐死去的城市中，每天都能感受到希望在一分一秒地流逝。</p>
                <p><strong>TL001系统：</strong> "你好，${gameState.player.code}。我是TL001系统，检测到你的生存意志足够强烈，已被选为逃离计划执行者。你有30天时间建造一辆新能源汽车，这是逃离锈钴城的唯一方法。我会全程协助你。"</p>
            `;
        }
        
        // 显示故事
        storyLoading.style.display = 'none';
        storyText.style.display = 'block';
    }

    // 更新排行榜
    async function updateRankings() {
        try {
            // 从API获取实时排行榜
            const result = await API.rankings.get();
            const liveRankItems = document.getElementById('liveRankItems');
            
            if (liveRankItems && result.rankings) {
                liveRankItems.innerHTML = '';
                
                // 添加当前玩家到排行榜数据中（如果不在API返回中）
                let allPlayers = result.rankings;
                
                if (gameState.player && gameState.gameStarted) {
                    const currentPlayerInList = allPlayers.find(p => p.id === gameState.playerId);
                    
                    if (!currentPlayerInList) {
                        const totalAttr = gameState.player.intelligence + gameState.player.strength + 
                                         gameState.player.communication + gameState.player.charm + 
                                         gameState.player.luck;
                        
                        allPlayers.push({
                            id: gameState.playerId,
                            code: gameState.player.code,
                            profession: professions[gameState.player.profession].name,
                            buildProgress: gameState.buildProgress,
                            totalAttributes: totalAttr,
                            day: gameState.day,
                            isCurrent: true
                        });
                    }
                }
                
                // 按进度排序
                allPlayers.sort((a, b) => b.buildProgress - a.buildProgress);
                
                // 生成排行榜项
                allPlayers.forEach((player, index) => {
                    const rankItem = document.createElement('div');
                    rankItem.className = `rank-item ${player.isCurrent ? 'current-player' : ''}`;
                    
                    rankItem.innerHTML = `
                        <div class="rank-pos ${index < 3 ? 'top-3' : ''}">#${index + 1}</div>
                        <div class="rank-player">
                            <div class="player-avatar">${player.code.charAt(0)}</div>
                            <div>
                                <div>${player.code}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted)">${player.profession}</div>
                            </div>
                        </div>
                        <div class="rank-progress">${player.buildProgress}%</div>
                        <div class="rank-total">${player.totalAttributes}</div>
                    `;
                    
                    liveRankItems.appendChild(rankItem);
                });
            }
            
            // 从API获取荣誉榜
            try {
                const honorResult = await API.honor.getAll();
                const honorItems = document.getElementById('honorItems');
                
                if (honorItems) {
                    if (!honorResult.honors || honorResult.honors.length === 0) {
                        // 如果没有云端数据，回退到localStorage
                        const localHonor = JSON.parse(localStorage.getItem('escapeRustCity_honor') || '[]');
                        
                        if (localHonor.length === 0) {
                            honorItems.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">暂无荣誉记录</div>';
                            return;
                        }
                        
                        // 显示本地荣誉记录
                        localHonor.sort((a, b) => new Date(b.escapedAt) - new Date(a.escapedAt));
                        const topHonor = localHonor.slice(0, 10);
                        
                        honorItems.innerHTML = '';
                        topHonor.forEach((honor, index) => {
                            const honorItem = document.createElement('div');
                            honorItem.className = 'honor-item';
                            
                            const date = new Date(honor.escapedAt);
                            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                            
                            honorItem.innerHTML = `
                                <div class="player-avatar">${honor.playerCode.charAt(0)}</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500; color: var(--text-primary)">${honor.playerCode} (${honor.playerName})</div>
                                    <div style="font-size: 0.9rem; color: var(--text-secondary)">${professions[honor.profession]?.name || honor.profession} · ${formattedDate}</div>
                                    <div style="font-size: 0.9rem; margin-top: 0.3rem;">
                                        <span style="color: var(--light-color)">进度: ${honor.buildProgress}%</span>
                                        <span style="margin-left: 1rem; color: var(--accent-color)">金币: ${honor.gold}</span>
                                    </div>
                                </div>
                            `;
                            
                            honorItems.appendChild(honorItem);
                        });
                    } else {
                        // 显示云端荣誉记录
                        honorItems.innerHTML = '';
                        honorResult.honors.forEach((honor, index) => {
                            const honorItem = document.createElement('div');
                            honorItem.className = 'honor-item';
                            
                            const date = new Date(honor.escapedAt);
                            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                            
                            honorItem.innerHTML = `
                                <div class="player-avatar">${honor.playerCode.charAt(0)}</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500; color: var(--text-primary)">${honor.playerCode} (${honor.playerName})</div>
                                    <div style="font-size: 0.9rem; color: var(--text-secondary)">${professions[honor.profession]?.name || honor.profession} · ${formattedDate}</div>
                                    <div style="font-size: 0.9rem; margin-top: 0.3rem;">
                                        <span style="color: var(--light-color)">进度: ${honor.buildProgress}%</span>
                                        <span style="margin-left: 1rem; color: var(--accent-color)">金币: ${honor.gold}</span>
                                    </div>
                                </div>
                            `;
                            
                            honorItems.appendChild(honorItem);
                        });
                    }
                }
            } catch (honorError) {
                console.warn('无法获取荣誉榜:', honorError);
                // 显示错误信息
                const honorItems = document.getElementById('honorItems');
                if (honorItems) {
                    honorItems.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">无法加载荣誉榜</div>';
                }
            }
            
            showNotification('排行榜已刷新', 'info');
        } catch (error) {
            console.error('更新排行榜失败:', error);
            showNotification('无法加载排行榜数据', 'error');
            
            // 回退到本地模拟数据
            const liveRankItems = document.getElementById('liveRankItems');
            if (liveRankItems) {
                liveRankItems.innerHTML = '';
                
                // 模拟其他玩家
                const mockPlayers = [
                    { code: '疾风', profession: '学生', progress: 65, totalAttr: 320, isCurrent: false },
                    { code: '铁锤', profession: '警员', progress: 58, totalAttr: 310, isCurrent: false },
                    { code: '智星', profession: '律师', progress: 72, totalAttr: 350, isCurrent: false },
                    { code: '银狐', profession: '商人', progress: 80, totalAttr: 380, isCurrent: false },
                    { code: '流星', profession: '明星', progress: 45, totalAttr: 290, isCurrent: false }
                ];
                
                // 添加当前玩家
                if (gameState.player && gameState.gameStarted) {
                    const totalAttr = gameState.player.intelligence + gameState.player.strength + 
                                     gameState.player.communication + gameState.player.charm + 
                                     gameState.player.luck;
                    
                    mockPlayers.push({
                        code: gameState.player.code,
                        profession: professions[gameState.player.profession].name,
                        progress: gameState.buildProgress,
                        totalAttr: totalAttr,
                        isCurrent: true
                    });
                }
                
                // 按进度排序
                mockPlayers.sort((a, b) => b.progress - a.progress);
                
                // 生成排行榜项
                mockPlayers.forEach((player, index) => {
                    const rankItem = document.createElement('div');
                    rankItem.className = `rank-item ${player.isCurrent ? 'current-player' : ''}`;
                    
                    rankItem.innerHTML = `
                        <div class="rank-pos ${index < 3 ? 'top-3' : ''}">#${index + 1}</div>
                        <div class="rank-player">
                            <div class="player-avatar">${player.code.charAt(0)}</div>
                            <div>
                                <div>${player.code}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted)">${player.profession}</div>
                            </div>
                        </div>
                        <div class="rank-progress">${player.progress}%</div>
                        <div class="rank-total">${player.totalAttr}</div>
                    `;
                    
                    liveRankItems.appendChild(rankItem);
                });
            }
            
            // 回退到本地荣誉榜
            const honorItems = document.getElementById('honorItems');
            if (honorItems) {
                const localHonor = JSON.parse(localStorage.getItem('escapeRustCity_honor') || '[]');
                
                if (localHonor.length === 0) {
                    honorItems.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">暂无荣誉记录</div>';
                    return;
                }
                
                localHonor.sort((a, b) => new Date(b.escapedAt) - new Date(a.escapedAt));
                const topHonor = localHonor.slice(0, 10);
                
                honorItems.innerHTML = '';
                topHonor.forEach((honor, index) => {
                    const honorItem = document.createElement('div');
                    honorItem.className = 'honor-item';
                    
                    const date = new Date(honor.escapedAt);
                    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                    
                    honorItem.innerHTML = `
                        <div class="player-avatar">${honor.playerCode.charAt(0)}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: var(--text-primary)">${honor.playerCode} (${honor.playerName})</div>
                            <div style="font-size: 0.9rem; color: var(--text-secondary)">${professions[honor.profession]?.name || honor.profession} · ${formattedDate}</div>
                            <div style="font-size: 0.9rem; margin-top: 0.3rem;">
                                <span style="color: var(--light-color)">进度: ${honor.buildProgress}%</span>
                                <span style="margin-left: 1rem; color: var(--accent-color)">金币: ${honor.gold}</span>
                            </div>
                        </div>
                    `;
                    
                    honorItems.appendChild(honorItem);
                });
            }
        }
    }

    // 初始化事件监听器
    function initEventListeners() {
        // 创建角色表单提交
        const creationForm = document.getElementById('creationForm');
        if (creationForm) {
            creationForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // 获取表单数据
                const playerName = document.getElementById('playerName').value.trim();
                const playerCode = document.getElementById('playerCode').value.trim();
                const playerGender = document.getElementById('playerGender').value;
                const playerProfession = document.getElementById('playerProfession').value;
                
                // 验证
                if (!playerName || !playerCode || !playerGender || !playerProfession) {
                    showNotification('请填写所有字段！', 'error');
                    return;
                }
                
                if (playerCode.length > 5) {
                    showNotification('游戏代号不能超过5个字！', 'error');
                    return;
                }
                
                // 获取属性值
                const intelligence = parseInt(document.getElementById('intelligence').value);
                const strength = parseInt(document.getElementById('strength').value);
                const communication = parseInt(document.getElementById('communication').value);
                const charm = parseInt(document.getElementById('charm').value);
                const luck = parseInt(document.getElementById('luck').value);
                
                // 检查属性点总和
                const totalPoints = intelligence + strength + communication + charm + luck;
                if (totalPoints !== 80) {
                    showNotification(`属性点总和必须为80，当前为${totalPoints}`, 'error');
                    return;
                }
                
                // 创建玩家对象
                const playerId = generatePlayerId({ name: playerName, code: playerCode });
                
                gameState.player = {
                    name: playerName,
                    code: playerCode,
                    gender: playerGender,
                    profession: playerProfession,
                    intelligence: intelligence,
                    strength: strength,
                    communication: communication,
                    charm: charm,
                    luck: luck
                };
                
                gameState.playerId = playerId;
                
                // 尝试保存到Cloudflare KV
                try {
                    await API.players.create({
                        id: playerId,
                        ...gameState.player,
                        createdAt: new Date().toISOString(),
                        lastActive: new Date().toISOString()
                    });
                } catch (error) {
                    console.warn('无法保存玩家到云端，使用本地存储:', error);
                }
                
                // 切换到故事导入界面
                document.getElementById('screenCreation').classList.remove('active');
                document.getElementById('screenStory').classList.add('active');
                
                // 显示玩家代号
                document.getElementById('storyPlayerCode').textContent = playerCode;
                
                // 生成故事
                generateStory();
            });
        }
        
        // 属性点分配按钮
        document.querySelectorAll('.attr-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const attr = this.dataset.attr;
                const action = this.dataset.action;
                const input = document.getElementById(attr);
                let value = parseInt(input.value);
                const remainingPoints = parseInt(document.getElementById('remainingPoints').textContent);
                
                if (action === 'increase') {
                    if (value >= 80) {
                        showNotification('单个属性不能超过80点！', 'warning');
                        return;
                    }
                    if (remainingPoints <= 0) {
                        showNotification('没有剩余属性点了！', 'warning');
                        return;
                    }
                    value++;
                    document.getElementById('remainingPoints').textContent = remainingPoints - 1;
                } else {
                    if (value <= 1) {
                        showNotification('单个属性不能少于1点！', 'warning');
                        return;
                    }
                    value--;
                    document.getElementById('remainingPoints').textContent = remainingPoints + 1;
                }
                
                input.value = value;
            });
        });
        
        // 重新生成故事按钮
        const regenerateStoryBtn = document.getElementById('regenerateStoryBtn');
        if (regenerateStoryBtn) {
            regenerateStoryBtn.addEventListener('click', generateStory);
        }
        
        // 开始计划按钮
        const startPlanBtn = document.getElementById('startPlanBtn');
        if (startPlanBtn) {
            startPlanBtn.addEventListener('click', function() {
                // 切换到游戏主界面
                document.getElementById('screenStory').classList.remove('active');
                document.getElementById('screenMain').classList.add('active');
                
                // 更新显示
                updateGameDisplay();
                
                // 标记游戏开始
                gameState.gameStarted = true;
                
                // 保存游戏进度
                saveGame();
                
                // 显示欢迎通知
                showNotification(`欢迎来到锈钴城，${gameState.player.code}！你有30天时间逃离这里。`, 'info');
                
                // 更新排行榜
                updateRankings();
            });
        }
        
        // 导航按钮
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // 移除所有active类
                document.querySelectorAll('.nav-btn').forEach(b => {
                    b.classList.remove('active');
                });
                
                // 添加active类到当前按钮
                this.classList.add('active');
                
                // 获取要显示的部分
                const sectionId = this.dataset.section;
                
                // 隐藏所有内容部分
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                // 显示对应的内容部分
                const sectionElement = document.getElementById(`section${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`);
                if (sectionElement) {
                    sectionElement.classList.add('active');
                }
                
                // 如果是排行榜，刷新数据
                if (sectionId === 'rankings') {
                    updateRankings();
                }
            });
        });
        
        // 标签页按钮
        document.querySelectorAll('.tab-buttons, .system-tabs, .rank-tabs').forEach(container => {
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('tab-btn')) {
                    // 移除所有active类
                    container.querySelectorAll('.tab-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // 添加active类到当前按钮
                    e.target.classList.add('active');
                    
                    // 处理不同的标签页
                    if (container.id === 'workTabs') {
                        updateWorkDisplay();
                    } else if (container.id === 'studyTabs') {
                        updateStudyDisplay();
                    } else if (container.classList.contains('rank-tabs')) {
                        // 切换排行榜标签
                        const tabId = e.target.dataset.rank;
                        document.querySelectorAll('.tab-content').forEach(content => {
                            content.classList.remove('active');
                        });
                        const contentElement = document.getElementById(`rank${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
                        if (contentElement) {
                            contentElement.classList.add('active');
                            if (tabId === 'honor') {
                                // 刷新荣誉榜
                                updateRankings();
                            }
                        }
                    }
                }
            });
        });
        
        // 发送聊天按钮
        const sendChatBtn = document.getElementById('sendChatBtn');
        if (sendChatBtn) {
            sendChatBtn.addEventListener('click', sendChatMessage);
        }
        
        // 聊天输入框回车发送
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                }
            });
        }
        
        // 清空聊天按钮
        const clearChatBtn = document.getElementById('clearChatBtn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', function() {
                gameState.chatHistory = [];
                updateChatDisplay();
                showNotification('聊天记录已清空', 'info');
            });
        }
        
        // 建造按钮
        const buildBtn = document.getElementById('buildBtn');
        if (buildBtn) {
            buildBtn.addEventListener('click', async function() {
                if (gameState.actionPoints === 0) {
                    showNotification('没有行动点了！', 'warning');
                    return;
                }
                
                const stage = getCurrentBuildStage();
                
                // 检查是否满足所有需求
                for (const [attr, value] of Object.entries(stage.requirements)) {
                    if (attr === 'gold') {
                        if (gameState.gold < value) {
                            showNotification(`金币不足！需要${value}，当前${gameState.gold}`, 'error');
                            return;
                        }
                    } else {
                        if (gameState.player[attr] < value) {
                            const attrNames = {
                                intelligence: '智力',
                                strength: '武力',
                                communication: '交际',
                                charm: '气质'
                            };
                            showNotification(`${attrNames[attr]}不足！需要${value}，当前${gameState.player[attr]}`, 'error');
                            return;
                        }
                    }
                }
                
                // 消耗资源
                gameState.actionPoints--;
                gameState.gold -= stage.requirements.gold;
                gameState.actionsToday++;
                
                // 增加建造进度（随机5-10%）
                const progressIncrease = 5 + Math.floor(Math.random() * 6);
                gameState.buildProgress = Math.min(gameState.buildProgress + progressIncrease, 100);
                
                // 显示通知
                showNotification(`建造完成！进度增加${progressIncrease}%，当前进度${gameState.buildProgress}%`, 'success');
                addToDailyLog(`🔨 建造车辆: 进度增加${progressIncrease}%，当前${gameState.buildProgress}%`);
                
                // 更新显示
                updateGameDisplay();
                
                // 保存游戏进度
                await saveGame();
                
                // 检查是否完成建造
                if (gameState.buildProgress >= 100) {
                    setTimeout(() => {
                        showNotification('恭喜！新能源汽车建造完成！', 'success');
                    }, 500);
                }
            });
        }
        
        // 下一天按钮
        const nextDayBtn = document.getElementById('nextDayBtn');
        if (nextDayBtn) {
            nextDayBtn.addEventListener('click', nextDay);
        }
        
        // 重开游戏按钮
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', function() {
                if (confirm('确定要重开游戏吗？当前进度将丢失！')) {
                    // 清除本地存储
                    localStorage.removeItem('escapeRustCity_save');
                    
                    // 尝试从云端删除玩家数据
                    if (gameState.playerId) {
                        API.players.delete(gameState.playerId).catch(console.error);
                    }
                    
                    // 重置游戏状态
                    resetGameState();
                    
                    // 切换到创建角色界面
                    document.querySelectorAll('.screen').forEach(screen => {
                        screen.classList.remove('active');
                    });
                    document.getElementById('screenCreation').classList.add('active');
                    
                    // 重置创建表单
                    document.getElementById('creationForm').reset();
                    document.getElementById('remainingPoints').textContent = '80';
                    ['intelligence', 'strength', 'communication', 'charm', 'luck'].forEach(attr => {
                        document.getElementById(attr).value = '10';
                    });
                    
                    showNotification('游戏已重置', 'info');
                }
            });
        }
        
        // 从结局界面重新开始
        const restartFromEndingBtn = document.getElementById('restartFromEndingBtn');
        if (restartFromEndingBtn) {
            restartFromEndingBtn.addEventListener('click', function() {
                // 切换到创建角色界面
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                document.getElementById('screenCreation').classList.add('active');
                
                // 重置创建表单
                document.getElementById('creationForm').reset();
                document.getElementById('remainingPoints').textContent = '80';
                ['intelligence', 'strength', 'communication', 'charm', 'luck'].forEach(attr => {
                    document.getElementById(attr).value = '10';
                });
            });
        }
        
        // 查看荣誉榜按钮
        const viewHonorBtn = document.getElementById('viewHonorBtn');
        if (viewHonorBtn) {
            viewHonorBtn.addEventListener('click', function() {
                // 切换到主界面并打开排行榜
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                document.getElementById('screenMain').classList.add('active');
                
                // 激活排行榜标签
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                const rankingsBtn = document.querySelector('.nav-btn[data-section="rankings"]');
                if (rankingsBtn) {
                    rankingsBtn.classList.add('active');
                }
                
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById('sectionRankings').classList.add('active');
                
                // 切换到荣誉榜
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                const honorTabBtn = document.querySelector('.rank-tabs .tab-btn[data-rank="honor"]');
                if (honorTabBtn) {
                    honorTabBtn.classList.add('active');
                }
                
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById('rankHonor').classList.add('active');
                
                // 刷新荣誉榜
                updateRankings();
            });
        }
        
        // 刷新排行榜按钮
        const refreshRankBtn = document.getElementById('refreshRankBtn');
        if (refreshRankBtn) {
            refreshRankBtn.addEventListener('click', updateRankings);
        }
        
        // 音效开关按钮
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', function() {
                const icon = this.querySelector('i');
                if (icon.classList.contains('fa-volume-up')) {
                    icon.classList.remove('fa-volume-up');
                    icon.classList.add('fa-volume-mute');
                    showNotification('音效已关闭', 'info');
                } else {
                    icon.classList.remove('fa-volume-mute');
                    icon.classList.add('fa-volume-up');
                    showNotification('音效已开启', 'info');
                }
            });
        }
        
        // 关闭加载界面
        window.addEventListener('load', function() {
            setTimeout(async () => {
                document.getElementById('loadingOverlay').style.display = 'none';
                
                // 尝试加载游戏进度
                if (await loadGame()) {
                    // 如果有保存的游戏，直接进入主界面
                    document.getElementById('screenCreation').classList.remove('active');
                    document.getElementById('screenMain').classList.add('active');
                    updateGameDisplay();
                    showNotification('游戏进度已加载', 'info');
                    
                    // 更新排行榜
                    updateRankings();
                }
            }, 1500);
        });
    }

    // 初始化游戏
    function initGame() {
        initEventListeners();
        console.log('逃离锈钴城游戏已初始化');
    }

    // 启动游戏
    document.addEventListener('DOMContentLoaded', initGame);
})();
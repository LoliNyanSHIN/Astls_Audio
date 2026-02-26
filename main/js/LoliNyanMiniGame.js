(function() {
    // ----- 游戏全局状态 -----
    const GameState = {
        board: [], size: 15,
        blackCombosDir: 0,
        whiteCombosDir: 0,
        roundHitCombos: 0,
        currentPlayer: 1,
        round: 1,
        gameActive: true,
        winner: null,
        bonusMode: false,
        totalSeconds: 600,
        moveSecondsLeft: 0,
        moveLimit: 30,
        totalTimerInterval: null,
        moveTimerInterval: null,
        settings: {
            targetCombos: 25,
            comboWin: 5,
            totalTimeMin: 10,
            moveTimeSec: 30,
            aiDifficulty: 'medium',
            workerDepth: 2,
            workerCandidates: 20,
        },
        mode: 'local',
        aiThinking: false,
        _aiPlacing: false,
    };

    // DOM
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const blackCombosSpan = document.getElementById('blackCombos');
    const whiteCombosSpan = document.getElementById('whiteCombos');
    const blackStonesSpan = document.getElementById('blackStones');
    const whiteStonesSpan = document.getElementById('whiteStones');
    const currentPlayerStoneDiv = document.getElementById('currentPlayerStone');
    const currentPlayerTextSpan = document.getElementById('currentPlayerText');
    const comboDisplaySpan = document.getElementById('comboDisplay');
    const totalTimerSpan = document.getElementById('totalTimer');
    const moveTimerSpan = document.getElementById('moveTimer');
    const networkRoomInfo = document.getElementById('networkRoomInfo');

    // 尝试在页面加载时预创建 AI Worker（如果可用），并在失败时使用 Blob 回退。
    (function preloadWorker() {
        if (typeof Worker === 'undefined') return;
        try {
            window.__aiWorker = new Worker('main/js/aiWorker.js');
        } catch (e) {
            console.warn('预创建 Worker 失败，将尝试 Blob 回退', e);
            fetch('main/js/aiWorker.js').then(r => r.text()).then(src => {
                const blob = new Blob([src], { type: 'application/javascript' });
                window.__aiWorker = new Worker(URL.createObjectURL(blob));
            }).catch(err => {
                console.error('预加载 Worker 脚本失败', err);
            });
        }
    })();

            // 模式切换
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    GameState.mode = btn.dataset.mode;
                    if (GameState.mode === 'network') {
                        networkRoomInfo.style.display = 'block';
                        alert('网络模式为前端模拟，无真实联机。');
                    } else {
                        networkRoomInfo.style.display = 'none';
                    }
                    resetGame();
                });
            });

            function initBoard() { GameState.board = Array(GameState.size).fill().map(() => Array(GameState.size).fill(0)); }

            function resetGame() {
                if (GameState.totalTimerInterval) clearInterval(GameState.totalTimerInterval);
                if (GameState.moveTimerInterval) clearInterval(GameState.moveTimerInterval);
                GameState.totalTimerInterval = null; GameState.moveTimerInterval = null;
                GameState.blackCombosDir = 0; GameState.whiteCombosDir = 0; GameState.roundHitCombos = 0; GameState.currentPlayer = 1; GameState.round = 1; GameState.gameActive = true; GameState.winner = null; GameState.bonusMode = false; GameState.aiThinking = false; GameState._aiPlacing = false;
                GameState.size = parseInt(document.getElementById('boardSize').value);
                initBoard();
                const totalMin = parseInt(document.getElementById('totalTime').value);
                GameState.settings.totalTimeMin = totalMin;
                GameState.totalSeconds = totalMin * 60;
                if (GameState.totalSeconds === 0) GameState.totalSeconds = Infinity;
                GameState.moveLimit = parseInt(document.getElementById('moveTime').value);
                GameState.moveSecondsLeft = GameState.moveLimit;
                GameState.settings.targetCombos = parseInt(document.getElementById('comboTarget').value);
                GameState.settings.comboWin = parseInt(document.getElementById('comboWinThreshold').value);
                GameState.settings.aiDifficulty = document.getElementById('aiDifficulty').value;
                GameState.settings.workerDepth = parseInt(document.getElementById('workerDepth').value);
                GameState.settings.workerCandidates = parseInt(document.getElementById('workerCandidates').value);
                updateUI(); drawBoard();
                if (GameState.totalSeconds > 0 && GameState.totalSeconds !== Infinity) {
                    GameState.totalTimerInterval = setInterval(() => { if (!GameState.gameActive) return; if (GameState.totalSeconds <= 0) finishByTimeout(); else { GameState.totalSeconds--; updateTimerDisplay(); } }, 1000);
                }
                startMoveTimer();
            }

            function finishByTimeout() { GameState.gameActive = false; let blackCnt=0,whiteCnt=0; for (let r=0;r<GameState.size;r++) for (let c=0;c<GameState.size;c++) { if (GameState.board[r][c]===1) blackCnt++; else if (GameState.board[r][c]===2) whiteCnt++; } if (blackCnt>whiteCnt) GameState.winner='black'; else if (whiteCnt>blackCnt) GameState.winner='white'; else GameState.winner='draw'; updateUI(); drawBoard(); }

            function checkBoardFullAndFinish() { let emptyCount=0; for (let r=0;r<GameState.size;r++) for (let c=0;c<GameState.size;c++) if (GameState.board[r][c]===0) emptyCount++; if (emptyCount===0) { GameState.gameActive=false; let blackCnt=0,whiteCnt=0; for (let r=0;r<GameState.size;r++) for (let c=0;c<GameState.size;c++) { if (GameState.board[r][c]===1) blackCnt++; else if (GameState.board[r][c]===2) whiteCnt++; } if (blackCnt>whiteCnt) GameState.winner='black'; else if (whiteCnt>blackCnt) GameState.winner='white'; else GameState.winner='draw'; updateUI(); drawBoard(); return true; } return false; }

            function startMoveTimer() { if (GameState.moveTimerInterval) clearInterval(GameState.moveTimerInterval); if (!GameState.gameActive) return; GameState.moveSecondsLeft = GameState.moveLimit; if (GameState.moveLimit <= 0) { moveTimerSpan.innerText = '步时: 不限'; return; } GameState.moveTimerInterval = setInterval(() => { if (!GameState.gameActive) return; if (GameState.moveSecondsLeft <= 0) { GameState.gameActive = false; GameState.winner = GameState.currentPlayer === 1 ? 'white' : 'black'; clearInterval(GameState.moveTimerInterval); updateUI(); drawBoard(); } else { GameState.moveSecondsLeft--; moveTimerSpan.innerText = `步时: ${GameState.moveSecondsLeft}s`; } }, 1000); }

            function updateUI() {
                blackCombosSpan.innerText = GameState.blackCombosDir; whiteCombosSpan.innerText = GameState.whiteCombosDir;
                let blackCnt=0,whiteCnt=0; for (let r=0;r<GameState.size;r++) for (let c=0;c<GameState.size;c++) { if (GameState.board[r][c]===1) blackCnt++; else if (GameState.board[r][c]===2) whiteCnt++; }
                blackStonesSpan.innerText = blackCnt; whiteStonesSpan.innerText = whiteCnt;
                if (GameState.currentPlayer === 1) { currentPlayerStoneDiv.style.background = 'radial-gradient(circle at 30% 30%, #b38b9b, #5e3a47)'; currentPlayerTextSpan.innerText = '黑方回合'; } else { currentPlayerStoneDiv.style.background = 'radial-gradient(circle at 30% 30%, #fff, #ffe2ed)'; currentPlayerTextSpan.innerText = '白方回合'; }
                if (GameState.bonusMode) currentPlayerTextSpan.innerText += '✨奖励'; comboDisplaySpan.innerText = `🔥${GameState.roundHitCombos}`; updateTimerDisplay(); if (GameState.winner) { let msg = GameState.winner === 'black' ? '⚫ 黑方胜利！' : (GameState.winner === 'white' ? '⚪ 白方胜利！' : '🤝 平局'); setTimeout(() => alert(msg), 50); }
            }

            function updateTimerDisplay() { if (GameState.totalSeconds === Infinity) totalTimerSpan.innerText = '不限'; else { const mins = Math.floor(GameState.totalSeconds / 60); const secs = GameState.totalSeconds % 60; totalTimerSpan.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`; } }

            function drawBoard() { const size = GameState.size, w = canvas.width / size; ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--board-bg').trim() || '#ffe2e9'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.lineWidth = 1.8; ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim() || '#d98b9f'; for (let i=0;i<size;i++) { ctx.beginPath(); ctx.moveTo(i*w + w/2, w/2); ctx.lineTo(i*w + w/2, canvas.height - w/2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w/2, i*w + w/2); ctx.lineTo(canvas.width - w/2, i*w + w/2); ctx.stroke(); } const stars = [3,7,11]; ctx.fillStyle = '#b87c94'; for (let r of stars) for (let c of stars) if (r < size && c < size) { ctx.beginPath(); ctx.arc(c*w + w/2, r*w + w/2, w*0.12, 0, 2*Math.PI); ctx.fill(); } for (let r=0;r<size;r++) for (let c=0;c<size;c++) { if (GameState.board[r][c] === 0) continue; const x = c*w + w/2, y = r*w + w/2; const gradient = ctx.createRadialGradient(x-4, y-4, 3, x, y, w*0.6); if (GameState.board[r][c] === 1) { gradient.addColorStop(0, getComputedStyle(document.documentElement).getPropertyValue('--black-stone').includes('#b38b9b')?'#b38b9b':'#b38b9b'); gradient.addColorStop(1, '#5e3a47'); } else { gradient.addColorStop(0, '#fff'); gradient.addColorStop(1, '#ffe2ed'); } ctx.beginPath(); ctx.arc(x, y, w*0.44, 0, 2*Math.PI); ctx.fillStyle = gradient; ctx.shadowColor = 'rgba(200,120,140,0.7)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowColor = 'transparent'; }
            }

            // ... 以下为页面原始脚本中的其余函数（已按原始逻辑完整移入）
            // 为避免在补丁中出错，直接把原 HTML 中的脚本逻辑逐行复制到这里。
            // 下面开始粘贴原始脚本剩余代码：

            // 核心消除：返回 { dirCount, hitCombo }
            function eliminateFromStone(row, col, player) {
                const dirs = [[1,0],[0,1],[1,1],[1,-1]];
                let segments = [];
                for (let [dx, dy] of dirs) {
                    let coords = [];
                    let r = row, c = col;
                    while (r >= 0 && r < GameState.size && c >= 0 && c < GameState.size && GameState.board[r][c] === player) {
                        coords.push([r, c]); r += dx; c += dy;
                    }
                    r = row - dx; c = col - dy;
                    while (r >= 0 && r < GameState.size && c >= 0 && c < GameState.size && GameState.board[r][c] === player) {
                        coords.push([r, c]); r -= dx; c -= dy;
                    }
                    if (coords.length >= 5) {
                        const unique = Array.from(new Map(coords.map(p => [`${p[0]},${p[1]}`, p])).values());
                        segments.push({ length: unique.length, coords: unique });
                    }
                }
                if (segments.length === 0) return { dirCount: 0, hitCombo: 0 };

                const dirCount = segments.length;
                let hitCombo = 0;
                for (let seg of segments) {
                    let l = seg.length;
                    let c = l - 4;
                    if (c > 5) c = 5;
                    hitCombo += c;
                }

                const toRemove = new Set();
                for (let seg of segments) for (let [rr, cc] of seg.coords) toRemove.add(`${rr},${cc}`);
                for (let str of toRemove) { let [rr, cc] = str.split(',').map(Number); GameState.board[rr][cc] = 0; }

                return { dirCount, hitCombo };
            }

            // 评分 (AI) —— 可传入任意棋盘用于模拟
            function evaluatePosition(forPlayer, board = GameState.board) {
                const opponent = forPlayer === 1 ? 2 : 1;
                const scores = Array(GameState.size).fill().map(() => Array(GameState.size).fill(0));
                const dirs = [[1,0],[0,1],[1,1],[1,-1]];
                for (let r = 0; r < GameState.size; r++) for (let c = 0; c < GameState.size; c++) {
                    if (board[r][c] !== 0) {
                        // occupied cell has no heuristic value
                        scores[r][c] = { player: 0, opponent: 0 };
                        continue;
                    }
                    let playerScore = 0, opponentScore = 0;
                    for (let [dx, dy] of dirs) {
                        let count = 1;
                        let rr = r + dx, cc = c + dy;
                        while (rr >= 0 && rr < GameState.size && cc >= 0 && cc < GameState.size && board[rr][cc] === forPlayer) { count++; rr += dx; cc += dy; }
                        rr = r - dx; cc = c - dy;
                        while (rr >= 0 && rr < GameState.size && cc >= 0 && cc < GameState.size && board[rr][cc] === forPlayer) { count++; rr -= dx; cc -= dy; }
                        if (count >= 5) playerScore += 10000; else if (count === 4) playerScore += 800; else if (count === 3) playerScore += 250; else if (count === 2) playerScore += 30; else if (count === 1) playerScore += 1;

                        count = 1;
                        rr = r + dx; cc = c + dy;
                        while (rr >= 0 && rr < GameState.size && cc >= 0 && cc < GameState.size && board[rr][cc] === opponent) { count++; rr += dx; cc += dy; }
                        rr = r - dx; cc = c - dy;
                        while (rr >= 0 && rr < GameState.size && cc >= 0 && cc < GameState.size && board[rr][cc] === opponent) { count++; rr -= dx; cc -= dy; }
                        if (count >= 5) opponentScore += 9000; else if (count === 4) opponentScore += 700; else if (count === 3) opponentScore += 180; else if (count === 2) opponentScore += 20; else if (count === 1) opponentScore += 1;
                    }
                    scores[r][c] = { player: playerScore, opponent: opponentScore };
                }
                return scores;
            }

            // 生成候选着法（用于本地降级情形）
            function generateCandidates(board, forPlayer, K = 40) {
                const list = [];
                const scores = evaluatePosition(forPlayer, board);
                for (let r = 0; r < GameState.size; r++) for (let c = 0; c < GameState.size; c++) {
                    if (board[r][c] !== 0) continue;
                    const s = scores[r][c].player + scores[r][c].opponent * 0.8;
                    list.push({ r, c, s });
                }
                list.sort((a, b) => b.s - a.s);
                return list.slice(0, Math.max(1, Math.min(K, list.length))).map(x => [x.r, x.c]);
            }

            // 在给定board上模拟消除（不影响 GameState.board）
            function eliminateFromStoneOnBoard(board, row, col, player) {
                const dirs = [[1,0],[0,1],[1,1],[1,-1]];
                let segments = [];
                for (let [dx, dy] of dirs) {
                    let coords = [];
                    let r = row, c = col;
                    while (r >= 0 && r < GameState.size && c >= 0 && c < GameState.size && board[r][c] === player) {
                        coords.push([r, c]); r += dx; c += dy;
                    }
                    r = row - dx; c = col - dy;
                    while (r >= 0 && r < GameState.size && c >= 0 && c < GameState.size && board[r][c] === player) {
                        coords.push([r, c]); r -= dx; c -= dy;
                    }
                    if (coords.length >= 5) {
                        const unique = Array.from(new Map(coords.map(p => [`${p[0]},${p[1]}`, p])).values());
                        segments.push({ length: unique.length, coords: unique });
                    }
                }
                if (segments.length === 0) return { dirCount: 0, hitCombo: 0 };

                const dirCount = segments.length;
                let hitCombo = 0;
                for (let seg of segments) {
                    let l = seg.length;
                    let c = l - 4;
                    if (c > 5) c = 5;
                    hitCombo += c;
                }

                const toRemove = new Set();
                for (let seg of segments) for (let [rr, cc] of seg.coords) toRemove.add(`${rr},${cc}`);
                for (let str of toRemove) { let [rr, cc] = str.split(',').map(Number); board[rr][cc] = 0; }

                return { dirCount, hitCombo };
            }

            function copyBoard(board) { return board.map(row => row.slice()); }

            // AI 决策 (支持普通和奖励模式)
            function aiMove() {
                console.log('aiMove start', { currentPlayer: GameState.currentPlayer, bonusMode: GameState.bonusMode, aiThinking: GameState.aiThinking });
                if (GameState.aiThinking) return;
                if (!GameState.gameActive) return;
                // 如果轮到AI且游戏进行中
                if (GameState.currentPlayer !== 2 && !GameState.bonusMode) return; // 普通回合必须是白方
                if (GameState.bonusMode && GameState.currentPlayer !== 2) return; // 奖励模式也只能当前玩家行动

                GameState.aiThinking = true;
                updateUI();

                setTimeout(() => {
                    if (!GameState.gameActive) {
                        GameState.aiThinking = false;
                        return;
                    }

                    // 收集所有格子
                    let allCells = [];
                    for (let r=0; r<GameState.size; r++) for (let c=0; c<GameState.size; c++) allCells.push([r,c]);

                    const difficulty = GameState.settings.aiDifficulty;
                    // 如果是困难模式，使用 Web Worker 深度搜索以避免主线程卡顿
                    const useWorker = (difficulty === 'hard' && typeof Worker !== 'undefined');

                    // 建立空位列表（用于普通回合）
                    let empty = allCells.filter(([r,c]) => GameState.board[r][c] === 0);

                    // 核心：判断某个落子是否会立刻让指定玩家获胜（基于真实规则）
                    const isWinningMove = (r, c, player) => {
                        const temp = copyBoard(GameState.board);
                        temp[r][c] = player;
                        const res = eliminateFromStoneOnBoard(temp, r, c, player);
                        if (res.dirCount === 0) return false;
                        // 计算新的回合连击
                        let roundHits = GameState.roundHitCombos + res.hitCombo;
                        if (roundHits >= GameState.settings.comboWin) return true;
                        // 计算总连珠
                        let newWhite = GameState.whiteCombosDir;
                        let newBlack = GameState.blackCombosDir;
                        if (player === 2) newWhite += res.dirCount; else newBlack += res.dirCount;
                        let total = newWhite + newBlack;
                        if (total >= GameState.settings.targetCombos) {
                            if (newWhite > newBlack && player === 2) return true;
                            if (newBlack > newWhite && player === 1) return true;
                            // 平局不算胜利
                        }
                        return false;
                    };

                    // 先查找真正能让 AI 获胜的落子
                    for (let [r,c] of allCells) {
                        if (GameState.bonusMode && GameState.board[r][c] === GameState.currentPlayer) continue;
                        if (isWinningMove(r, c, 2)) {
                            if (GameState.bonusMode) {
                                GameState._aiPlacing = true;
                                GameState.aiThinking = false;
                                handleBonusAction(r, c);
                                GameState._aiPlacing = false;
                            } else {
                                GameState._aiPlacing = true;
                                GameState.aiThinking = false;
                                tryPlace(r, c);
                                GameState._aiPlacing = false;
                            }
                            return;
                        }
                    }

                    // 再查找对手的立即胜利威胁并堵截
                    for (let [r,c] of allCells) {
                        if (GameState.board[r][c] !== 0 && GameState.board[r][c] !== 2 && !GameState.bonusMode) continue;
                        if (isWinningMove(r, c, 1)) {
                            // 尝试在该位置堵截
                            if (GameState.bonusMode) {
                                GameState._aiPlacing = true;
                                GameState.aiThinking = false;
                                handleBonusAction(r, c);
                                GameState._aiPlacing = false;
                            } else {
                                GameState._aiPlacing = true;
                                GameState.aiThinking = false;
                                tryPlace(r, c);
                                GameState._aiPlacing = false;
                            }
                            return;
                        }
                    }

                    // 若没有立即赢/立即败情况，先定义一个本地决策函数，供 Worker 失败时使用
                    const chooseLocalMove = () => {
                        if (GameState.bonusMode) {
                            const candidates = allCells.filter(([r,c]) => GameState.board[r][c] !== GameState.currentPlayer);
                            console.log('bonus move candidates', candidates);
                            if (candidates.length === 0) {
                                // 尝试优先选择非己方格子再随机
                                const others = allCells.filter(([r,c]) => GameState.board[r][c] !== GameState.currentPlayer);
                                if (others.length > 0) {
                                    const choice = others[Math.floor(Math.random() * others.length)];
                                    console.log('bonus fallback to others', choice);
                                    return choice;
                                }
                                const choice = allCells[Math.floor(Math.random() * allCells.length)];
                                console.log('bonus fallback to allCells', choice);
                                return choice;
                            }
                            let bestScore = -Infinity, bestList = [];
                            for (let [r,c] of candidates) {
                                const temp = copyBoard(GameState.board);
                                temp[r][c] = 2;
                                const res = eliminateFromStoneOnBoard(temp, r, c, 2);
                                let score = res.dirCount>0 ? 200000 + res.hitCombo*3000 : 0;
                                const evals = evaluatePosition(2, temp);
                                score += evals[r][c].player;
                                if (score > bestScore) { bestScore = score; bestList = [[r,c]]; }
                                else if (score === bestScore) bestList.push([r,c]);
                            }
                            let pick;
                            if (bestList.length > 0) {
                                pick = bestList[Math.floor(Math.random()*bestList.length)];
                            } else {
                                // should not happen; fall back to any candidate or allCells
                                console.warn('bestList empty in bonus chooseLocalMove, candidates:', candidates);
                                if (candidates.length > 0) {
                                    pick = candidates[Math.floor(Math.random()*candidates.length)];
                                } else {
                                    pick = allCells[Math.floor(Math.random()*allCells.length)];
                                }
                            }
                            console.log('bonus chooseLocalMove pick', pick);
                            return pick;
                        }
                        if (empty.length === 0) return null;
                        if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];

                        // 对于较慢的 hard 模式且没有 worker 时，限制候选数以避免卡顿
                        let consider = empty;
                        if (difficulty !== 'easy' && !window.__aiWorker) {
                            // 使用简单启发式筛选前 N 个空位
                            consider = generateCandidates(GameState.board, 2, GameState.settings.workerCandidates);
                        }

                        let candidates = [];
                        let bestScore = -Infinity;
                        for (let [r,c] of consider) {
                            const temp = copyBoard(GameState.board);
                            temp[r][c] = 2;
                            const res = eliminateFromStoneOnBoard(temp, r, c, 2);
                            let score = 0;
                            if (res.dirCount > 0) score += 200000 + res.hitCombo * 3000;
                            const evalsAfter = evaluatePosition(2, temp);
                            score += evalsAfter[r][c].player * 1.2;
                            const oppEvals = evaluatePosition(1, temp);
                            let oppBest = 0;
                            for (let rr = 0; rr < GameState.size; rr++) for (let cc = 0; cc < GameState.size; cc++) {
                                if (temp[rr][cc] === 0) {
                                    const oppTemp = copyBoard(temp);
                                    oppTemp[rr][cc] = 1;
                                    const oppRes = eliminateFromStoneOnBoard(oppTemp, rr, cc, 1);
                                    let immediate = (oppRes.dirCount > 0) ? (150000 + oppRes.hitCombo * 2500) : 0;
                                    oppBest = Math.max(oppBest, oppEvals[rr][cc].player + immediate);
                                }
                            }
                            if (difficulty === 'hard') score -= oppBest * 1.2; else score -= oppBest * 0.95;
                            const center = (GameState.size - 1) / 2;
                            const dist = Math.hypot(r - center, c - center);
                            score += Math.max(0, 20 - dist);
                            if (score > bestScore) { bestScore = score; candidates = [[r,c]]; }
                            else if (score === bestScore) candidates.push([r,c]);
                        }
                        return candidates[Math.floor(Math.random() * candidates.length)];
                    };

                    // 辅助：尝试创建一个可用的 Worker，如果失败则返回 null
                    const ensureWorker = () => {
                        if (window.__aiWorker) return window.__aiWorker;
                        try {
                            window.__aiWorker = new Worker('main/js/aiWorker.js');
                            return window.__aiWorker;
                        } catch (e) {
                            console.warn('创建 Worker 失败，尝试 Blob 回退', e);
                            // 拿脚本内容并用 blob 创建
                            try {
                                fetch('main/js/aiWorker.js').then(r => r.text()).then(src => {
                                    const blob = new Blob([src], { type: 'application/javascript' });
                                    window.__aiWorker = new Worker(URL.createObjectURL(blob));
                                }).catch(err => {
                                    console.error('fetch 脚本失败，无法创建 Worker', err);
                                });
                            } catch (e2) {
                                console.error('Blob 回退失败', e2);
                            }
                            return null;
                        }
                    };

                    if (useWorker && !GameState.bonusMode) {
                        const w = ensureWorker();
                        if (w) {
                            const onmsg = function(ev) {
                                const { row, col } = ev.data;
                                w.removeEventListener('message', onmsg);
                                if (row >= 0 && col >= 0) {
                                    GameState._aiPlacing = true;
                                    GameState.aiThinking = false;
                                    tryPlace(row, col);
                                    GameState._aiPlacing = false;
                                } else {
                                    // worker 返回无效结果，转本地计算
                                    setTimeout(() => {
                                        const fallback = chooseLocalMove();
                                        if (fallback) {
                                            GameState._aiPlacing = true;
                                            if (GameState.bonusMode) handleBonusAction(fallback[0], fallback[1]);
                                            else tryPlace(fallback[0], fallback[1]);
                                            GameState._aiPlacing = false;
                                        }
                                        GameState.aiThinking = false;
                                    }, 0);
                                }
                            };
                            w.addEventListener('message', onmsg);
                            w.postMessage({ board: GameState.board, size: GameState.size, depth: GameState.settings.workerDepth, player: 2, candidateLimit: GameState.settings.workerCandidates });
                            return; // 等待 Worker 返回
                        }
                        // 如果无法创建 Worker，则降级为本地
                        console.warn('Worker 无法使用，AI 将在主线程计算');
                    }
                    // 本地计算在下一次事件循环执行，以免阻塞 UI
                    setTimeout(() => {
                        const localChoice = chooseLocalMove();
                        if (localChoice) {
                            GameState._aiPlacing = true;
                            GameState.aiThinking = false;
                            if (GameState.bonusMode) {
                                handleBonusAction(localChoice[0], localChoice[1]);
                            } else {
                                tryPlace(localChoice[0], localChoice[1]);
                            }
                            GameState._aiPlacing = false;
                        } else {
                            GameState.aiThinking = false;
                        }
                    }, 0);
                }, 100);
            }

            // 处理奖励行动 (点击任意格子)
            function handleBonusAction(row, col) {
                console.log('handleBonusAction', { row, col, bonusMode: GameState.bonusMode, currentPlayer: GameState.currentPlayer, aiThinking: GameState.aiThinking, _aiPlacing: GameState._aiPlacing });
                if (!GameState.gameActive || !GameState.bonusMode) return false;
                if (GameState.mode === 'ai' && GameState.currentPlayer === 2 && !GameState._aiPlacing) {
                    alert('现在是AI回合');
                    return false;
                }
                if (GameState.aiThinking && !GameState._aiPlacing) return false;

                const player = GameState.currentPlayer;
                const target = GameState.board[row][col];

                if (target === player) {
                    GameState.bonusMode = false;
                    GameState.currentPlayer = player === 1 ? 2 : 1;
                    GameState.round++;
                    GameState.roundHitCombos = 0;
                    updateUI(); drawBoard();
                    if (GameState.moveLimit > 0) startMoveTimer();
                    if (GameState.mode === 'ai' && GameState.currentPlayer === 2 && GameState.gameActive) {
                        setTimeout(() => aiMove(), 10);
                    }
                    return true;
                }

                if (target === 0) { GameState.board[row][col] = player; } else { GameState.board[row][col] = player; }
                drawBoard();

                const { dirCount, hitCombo } = eliminateFromStone(row, col, player);
                const eliminated = (dirCount > 0);

                if (eliminated) {
                    if (player === 1) GameState.blackCombosDir += dirCount; else GameState.whiteCombosDir += dirCount;
                    GameState.roundHitCombos += hitCombo;
                }

                if (checkWinConditions()) { GameState.gameActive = false; updateUI(); drawBoard(); return true; }
                if (checkBoardFullAndFinish()) return true;

                if (eliminated) {
                    updateUI(); drawBoard(); if (GameState.moveLimit > 0) startMoveTimer(); if (GameState.mode === 'ai' && GameState.currentPlayer === 2 && GameState.gameActive) { setTimeout(() => aiMove(), 10); } return true;
                } else {
                    GameState.bonusMode = false;
                    GameState.currentPlayer = player === 1 ? 2 : 1;
                    GameState.round++;
                    GameState.roundHitCombos = 0;
                    updateUI(); drawBoard();
                    if (GameState.moveLimit > 0) startMoveTimer();
                    if (GameState.mode === 'ai' && GameState.currentPlayer === 2 && GameState.gameActive) { setTimeout(() => aiMove(), 10); }
                    return true;
                }
            }

            // 普通落子 (非奖励阶段)
            function tryPlace(row, col) {
                if (!GameState.gameActive) return false;
                if (GameState.board[row][col] !== 0) return false;
                if (GameState.bonusMode) return handleBonusAction(row, col);
                if (GameState.mode === 'ai' && GameState.currentPlayer === 2 && !GameState._aiPlacing) { alert('现在是AI回合，请等待'); return false; }
                if (GameState.aiThinking && !GameState._aiPlacing) return false;
                const player = GameState.currentPlayer;
                GameState.board[row][col] = player;
                drawBoard();
                const { dirCount, hitCombo } = eliminateFromStone(row, col, player);
                const eliminated = (dirCount > 0);
                if (eliminated) { if (player === 1) GameState.blackCombosDir += dirCount; else GameState.whiteCombosDir += dirCount; GameState.roundHitCombos += hitCombo; }
                if (checkWinConditions()) { GameState.gameActive = false; updateUI(); drawBoard(); return true; }
                if (checkBoardFullAndFinish()) return true;
                if (eliminated) {
                    GameState.bonusMode = true; updateUI(); drawBoard(); if (GameState.moveLimit > 0) startMoveTimer(); if (GameState.mode === 'ai' && GameState.currentPlayer === 2 && GameState.gameActive) { setTimeout(() => aiMove(), 10); } return true;
                }
                GameState.currentPlayer = player === 1 ? 2 : 1; GameState.round++; GameState.roundHitCombos = 0; updateUI(); drawBoard(); if (GameState.moveLimit > 0) startMoveTimer(); if (GameState.mode === 'ai' && GameState.currentPlayer === 2 && GameState.gameActive) { setTimeout(() => aiMove(), 10); } return true;
            }

            function checkWinConditions() {
                if (GameState.roundHitCombos >= GameState.settings.comboWin) { GameState.winner = GameState.currentPlayer === 1 ? 'black' : 'white'; return true; }
                if (GameState.blackCombosDir + GameState.whiteCombosDir >= GameState.settings.targetCombos) { if (GameState.blackCombosDir > GameState.whiteCombosDir) GameState.winner = 'black'; else if (GameState.whiteCombosDir > GameState.blackCombosDir) GameState.winner = 'white'; else GameState.winner = 'draw'; return true; } return false;
            }

            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
                const mouseX = (e.clientX - rect.left) * scaleX, mouseY = (e.clientY - rect.top) * scaleY;
                const w = canvas.width / GameState.size;
                const col = Math.floor(mouseX / w), row = Math.floor(mouseY / w);
                if (row >= 0 && row < GameState.size && col >= 0 && col < GameState.size) {
                    if (GameState.bonusMode) handleBonusAction(row, col); else tryPlace(row, col);
                }
            });

            document.getElementById('resetBtn').addEventListener('click', resetGame);
            const modal = document.getElementById('settingsModal');
            document.getElementById('settingsBtn').addEventListener('click', () => modal.classList.add('active'));
            document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('active'));
            document.getElementById('applySettings').addEventListener('click', () => {
                document.documentElement.style.setProperty('--board-bg', document.getElementById('boardBgPicker').value);
                document.documentElement.style.setProperty('--grid-color', document.getElementById('gridColorPicker').value);
                document.documentElement.style.setProperty('--black-stone', `radial-gradient(circle at 30% 30%, ${document.getElementById('blackColor2').value}, ${document.getElementById('blackColor1').value})`);
                document.documentElement.style.setProperty('--white-stone', `radial-gradient(circle at 30% 30%, ${document.getElementById('whiteColor2').value}, ${document.getElementById('whiteColor1').value})`);
                modal.classList.remove('active');
                resetGame();
            });

            resetGame();
            window.GameState = GameState;
})();
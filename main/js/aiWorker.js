// 简易 AI Worker：支持深度限制的剪枝式两/三步搜索，按启发式限制分支
self.onmessage = function(e) {
    const { board, size, depth, player, candidateLimit } = e.data;
    const opponent = player === 1 ? 2 : 1;

    function copyBoard(b) { return b.map(r => r.slice()); }

    // Zobrist hash table for quick board hashing
    const zobrist = (function() {
        const table = [];
        for (let r = 0; r < size; r++) {
            table[r] = [];
            for (let c = 0; c < size; c++) {
                table[r][c] = [rand32(), rand32(), rand32()];
            }
        }
        return table;
        function rand32() { return Math.floor(Math.random() * 0x100000000); }
    })();

    function hashBoard(b) {
        let h = 0;
        for (let r=0; r<size; r++) for (let c=0; c<size; c++) {
            const v = b[r][c];
            if (v) h ^= zobrist[r][c][v-1];
        }
        return h;
    }

    const transposition = new Map();

    function eliminateFromStoneOnBoard(board, row, col, p) {
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        let segments = [];
        for (let [dx, dy] of dirs) {
            let coords = [];
            let r = row, c = col;
            while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === p) { coords.push([r,c]); r += dx; c += dy; }
            r = row - dx; c = col - dy;
            while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === p) { coords.push([r,c]); r -= dx; c -= dy; }
            if (coords.length >= 5) {
                const unique = Array.from(new Map(coords.map(q => [`${q[0]},${q[1]}`, q])).values());
                segments.push({ length: unique.length, coords: unique });
            }
        }
        if (segments.length === 0) return { dirCount: 0, hitCombo: 0 };
        let dirCount = segments.length, hitCombo = 0;
        for (let seg of segments) { let l = seg.length; let c = l - 4; if (c > 5) c = 5; hitCombo += c; }
        const toRemove = new Set();
        for (let seg of segments) for (let [rr,cc] of seg.coords) toRemove.add(`${rr},${cc}`);
        for (let s of toRemove) { let [rr,cc] = s.split(',').map(Number); board[rr][cc] = 0; }
        return { dirCount, hitCombo };
    }

    function evaluatePosition(forPlayer, board) {
        const opp = forPlayer === 1 ? 2 : 1;
        const scores = [];
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        for (let r=0; r<size; r++) { scores[r] = []; for (let c=0; c<size; c++) {
            if (board[r][c] !== 0) { scores[r][c] = { player:0, opponent:0 }; continue; }
            let playerScore = 0, opponentScore = 0;
            for (let [dx,dy] of dirs) {
                let count = 1, rr = r+dx, cc = c+dy;
                while (rr>=0 && rr<size && cc>=0 && cc<size && board[rr][cc]===forPlayer) { count++; rr+=dx; cc+=dy; }
                rr = r-dx; cc = c-dy;
                while (rr>=0 && rr<size && cc>=0 && cc<size && board[rr][cc]===forPlayer) { count++; rr-=dx; cc-=dy; }
                // pattern weighting: open three/other patterns
                if (count>=5) playerScore += 10000;
                else if (count===4) playerScore += 1200; // prefer four
                else if (count===3) playerScore += 300;
                else if (count===2) playerScore += 50;
                else if (count===1) playerScore += 5;

                count = 1; rr = r+dx; cc = c+dy;
                while (rr>=0 && rr<size && cc>=0 && cc<size && board[rr][cc]===opp) { count++; rr+=dx; cc+=dy; }
                rr = r-dx; cc = c-dy;
                while (rr>=0 && rr<size && cc>=0 && cc<size && board[rr][cc]===opp) { count++; rr-=dx; cc-=dy; }
                if (count>=5) opponentScore += 9000;
                else if (count===4) opponentScore += 1000;
                else if (count===3) opponentScore += 250;
                else if (count===2) opponentScore += 40;
                else if (count===1) opponentScore += 5;
            }
            scores[r][c] = { player: playerScore, opponent: opponentScore };
        }}
        return scores;
    }

    function generateCandidates(board, forPlayer, K=40) {
        const scores = evaluatePosition(forPlayer, board);
        const list = [];
        const center = (size - 1) / 2;
        for (let r=0;r<size;r++) for (let c=0;c<size;c++) if (board[r][c]===0) {
            let s = scores[r][c].player + scores[r][c].opponent*0.8;
            // 添加靠近中心的加权
            const dist = Math.hypot(r-center, c-center);
            s += (20 - dist);
            list.push({ r, c, s });
        }
        list.sort((a,b)=>b.s-a.s);
        return list.slice(0, Math.max(1, Math.min(K, list.length))).map(x=>[x.r,x.c]);
    }

    // alpha-beta search with transposition table
    function search(board, turnPlayer, depth, alpha=-Infinity, beta=Infinity) {
        const hkey = hashBoard(board) ^ depth;
        if (transposition.has(hkey)) {
            const entry = transposition.get(hkey);
            if (entry.depth >= depth) return { score: entry.score, move: entry.move };
        }
        const emptyMoves = [];
        for (let r=0;r<size;r++) for (let c=0;c<size;c++) if (board[r][c]===0) emptyMoves.push([r,c]);
        if (emptyMoves.length===0 || depth===0) return { score: 0 };
        const candidates = generateCandidates(board, turnPlayer, (typeof candidateLimit==='number'&&candidateLimit>0)?candidateLimit:(depth>=2?30:20));
        let best = { score: -Infinity, move: null };
        for (let [r,c] of candidates) {
            const tmp = copyBoard(board);
            tmp[r][c] = turnPlayer;
            const res = eliminateFromStoneOnBoard(tmp, r, c, turnPlayer);
            let gain = res.dirCount>0 ? (10000 + res.hitCombo*1000) : 0;
            let score;
            if (depth>1) {
                const opp = turnPlayer===1?2:1;
                const reply = search(tmp, opp, depth-1, -beta, -alpha);
                score = gain - (reply.score || 0);
            } else {
                const evals = evaluatePosition(turnPlayer, tmp);
                score = gain + evals[r][c].player - evals[r][c].opponent*0.5;
            }
            if (score > best.score) { best.score = score; best.move = [r,c]; }
            alpha = Math.max(alpha, score);
            if (alpha >= beta) break; // prune
        }
        transposition.set(hkey, { score: best.score, move: best.move, depth });
        return best;
    }

    const result = search(board, player, depth);
    if (result.move) postMessage({ row: result.move[0], col: result.move[1] });
    else postMessage({ row: -1, col: -1 });
};

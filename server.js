const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const GRID_SIZE = 200; 
const board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('#ffffff'));

// --- Кулдаун 0.3 секунды (300 мс) ---
const COOLDOWN_MS = 300; 
const lastDrawTimes = new Map();
let onlineCount = 0;

io.on('connection', (socket) => {
    onlineCount++;
    io.emit('online_count', onlineCount);
    socket.emit('init', board);

    socket.on('draw', (data) => {
        const now = Date.now();
        const lastDraw = lastDrawTimes.get(socket.id) || 0;

        if (now - lastDraw >= COOLDOWN_MS) {
            const { x, y, color } = data;
            if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                board[y][x] = color;
                lastDrawTimes.set(socket.id, now);
                io.emit('update', { x, y, color });
                socket.emit('cooldown_start', COOLDOWN_MS);
            }
        }
    });

    socket.on('disconnect', () => {
        onlineCount--;
        io.emit('online_count', onlineCount);
        lastDrawTimes.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=== Пиксель батл Фурманов запущен на порту ${PORT} ===`);
});

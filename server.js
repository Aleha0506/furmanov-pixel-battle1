const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const GRID_SIZE = 200; 
const SAVE_PATH = './board.json';

let board;
if (fs.existsSync(SAVE_PATH)) {
    board = JSON.parse(fs.readFileSync(SAVE_PATH));
} else {
    board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('#ffffff'));
}

const COOLDOWN_MS = 300; 
let onlineCount = 0;

io.on('connection', (socket) => {
    onlineCount++;
    io.emit('online_count', onlineCount);
    socket.emit('init', board);

    socket.on('draw', (data) => {
        const { x, y, color } = data;
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            board[y][x] = color;
            io.emit('update', { x, y, color });
            socket.emit('cooldown_start', COOLDOWN_MS);
            
            // Сохранение (шанс 10%, чтобы не грузить диск)
            if (Math.random() > 0.9) fs.writeFileSync(SAVE_PATH, JSON.stringify(board));
        }
    });

    socket.on('disconnect', () => {
        onlineCount--;
        io.emit('online_count', onlineCount);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Сервер на порту ${PORT}`));

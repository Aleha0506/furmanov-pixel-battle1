const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статические файлы из папки public
app.use(express.static('public'));

const GRID_SIZE = 200; 
// Инициализация пустого белого поля
const board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('#ffffff'));
const COOLDOWN_MS = 3000; 
const lastDrawTimes = new Map();

let onlineCount = 0;

io.on('connection', (socket) => {
    onlineCount++;
    // Отправляем всем обновленный счетчик онлайна
    io.emit('online_count', onlineCount);
    
    // Отправляем текущее состояние доски новому игроку
    socket.emit('init', board);

    socket.on('draw', (data) => {
        const now = Date.now();
        const lastDraw = lastDrawTimes.get(socket.id) || 0;

        // Проверка кулдауна на сервере (защита от читов)
        if (now - lastDraw >= COOLDOWN_MS) {
            const { x, y, color } = data;
            
            if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                board[y][x] = color;
                lastDrawTimes.set(socket.id, now);
                
                // Рассылаем обновление всем игрокам
                io.emit('update', { x, y, color });
                // Подтверждаем начало кулдауна для отправителя
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

// Универсальный порт для хостинга
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=== Пиксель батл Фурманов запущен ===`);
    console.log(`Порт: ${PORT}`);
});

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 10000;

app.use(express.static('public'));

let clients = {}; // { socket.id: { name, messages: [ {from, text} ] } }

io.on('connection', (socket) => {
    // Khách đăng ký tên
    socket.on('register', (name) => {
        clients[socket.id] = { name, messages: [] };
        io.to('admin').emit('clients', getClientsList());
    });

    // Admin join phòng admin
    socket.on('admin', () => {
        socket.join('admin');
        socket.emit('clients', getClientsList());
    });

    // Khách gửi tin nhắn cho admin
    socket.on('chat message', (msg) => {
        // msg = {from, text}
        if (clients[socket.id]) {
            clients[socket.id].messages.push({ from: msg.from, text: msg.text });
            io.to('admin').emit('private message', {
                from: msg.from,
                text: msg.text,
                id: socket.id
            });
        }
    });

    // Admin gửi tin nhắn cho khách
    socket.on('admin message', ({ id, text }) => {
        if (clients[id]) {
            clients[id].messages.push({ from: 'Admin', text });
            io.to(id).emit('private message', { from: 'Admin', text });
        }
    });

    // Admin chọn khách để xem lịch sử (trong session, không lưu DB)
    socket.on('get history', (id) => {
        if (clients[id]) {
            socket.emit('history', { id, name: clients[id].name, messages: clients[id].messages });
        }
    });

    socket.on('disconnect', () => {
        delete clients[socket.id];
        io.to('admin').emit('clients', getClientsList());
    });
});

function getClientsList() {
    // Trả về mảng [ [socketId, name] ]
    return Object.entries(clients).map(([id, v]) => [id, v.name]);
}

http.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});

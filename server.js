const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 10000;

app.use(express.static('public'));

let clients = {}; // Lưu tên khách và socket.id

io.on('connection', (socket) => {
    // Khách đăng ký tên
    socket.on('register', (name) => {
        clients[socket.id] = name;
        // Gửi danh sách khách cho admin
        io.to('admin').emit('clients', Object.entries(clients));
    });

    // Admin tham gia phòng admin
    socket.on('admin', () => {
        socket.join('admin');
        socket.emit('clients', Object.entries(clients));
    });

    // Khách gửi tin nhắn cho admin
    socket.on('chat message', (msg) => {
        // msg = {from: tên khách, text: nội dung}
        io.to('admin').emit('private message', {from: msg.from, text: msg.text, id: socket.id});
    });

    // Admin gửi tin nhắn cho khách
    socket.on('admin message', ({id, text}) => {
        io.to(id).emit('private message', {from: 'Admin', text});
    });

    // Admin chọn khách để join phòng chat riêng
    socket.on('join client', (id) => {
        socket.join(id);
    });

    socket.on('disconnect', () => {
        delete clients[socket.id];
        io.to('admin').emit('clients', Object.entries(clients));
    });
});

http.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});

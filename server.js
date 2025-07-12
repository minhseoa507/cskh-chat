const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
const MSG_FILE = path.join(__dirname, 'data', 'messages.json');

app.use(express.static('public'));
app.use(express.json());

if (!fs.existsSync('data')) fs.mkdirSync('data');
if (!fs.existsSync(MSG_FILE)) fs.writeFileSync(MSG_FILE, '{}');

function loadMessages() {
    return JSON.parse(fs.readFileSync(MSG_FILE));
}
function saveMessages(messages) {
    fs.writeFileSync(MSG_FILE, JSON.stringify(messages));
}

io.on('connection', (socket) => {
    let userId = null;

    socket.on('register', (info) => {
        userId = info.id;
        socket.join(userId);
        socket.emit('history', loadMessages()[userId] || []);
    });

    socket.on('chat message', (msg) => {
        if (!userId) return;
        const messages = loadMessages();
        if (!messages[userId]) messages[userId] = [];
        messages[userId].push({ from: msg.from, text: msg.text, time: Date.now() });
        saveMessages(messages);

        // Gửi tin nhắn cho đúng phòng khách và admin
        io.to(userId).emit('chat message', { from: msg.from, text: msg.text });
        io.to('admin').emit('notify', { userId, last: msg.text });
    });

    socket.on('admin join', () => {
        socket.join('admin');
        socket.emit('clients', Object.keys(loadMessages()));
    });

    socket.on('admin select', (id) => {
        socket.join(id);
        socket.emit('history', loadMessages()[id] || []);
    });

    socket.on('admin message', ({ id, text }) => {
        const messages = loadMessages();
        if (!messages[id]) messages[id] = [];
        messages[id].push({ from: 'Admin', text, time: Date.now() });
        saveMessages(messages);
        io.to(id).emit('chat message', { from: 'Admin', text });
    });
});

app.get('/admin/clients', (req, res) => {
    res.json(Object.keys(loadMessages()));
});

app.get('/admin/messages/:id', (req, res) => {
    const messages = loadMessages();
    res.json(messages[req.params.id] || []);
});

http.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});

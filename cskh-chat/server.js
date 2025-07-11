const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');

const PORT = process.env.PORT || 10000;
const MSG_FILE = 'messages.json';

app.use(express.static('public'));

if (!fs.existsSync(MSG_FILE)) fs.writeFileSync(MSG_FILE, '[]');

function saveMessage(msg) {
    const messages = JSON.parse(fs.readFileSync(MSG_FILE));
    messages.push(msg);
    fs.writeFileSync(MSG_FILE, JSON.stringify(messages));
}

io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
        saveMessage(msg);
        io.emit('chat message', msg);
    });
});

app.get('/admin/messages', (req, res) => {
    const messages = JSON.parse(fs.readFileSync(MSG_FILE));
    res.json(messages);
});

http.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});

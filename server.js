import express from 'express';
import basicAuth from 'express-basic-auth';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

app.use(express.static('public'));
app.use(express.json({limit: '2mb'}));
app.use(express.urlencoded({extended: true}));

// Tạo thư mục data và uploads nếu chưa có
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync('./data/uploads')) fs.mkdirSync('./data/uploads');

// Multer để upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './data/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).substr(2,6) + ext);
  }
});
const upload = multer({ storage });

// Đọc/lưu lịch sử chat
const CHAT_FILE = './data/chats.json';
function readChats() {
  if (!fs.existsSync(CHAT_FILE)) return [];
  return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8') || '[]');
}
function writeChats(chats) {
  fs.writeFileSync(CHAT_FILE, JSON.stringify(chats, null, 2));
}

// API gửi/nhận tin nhắn
app.post('/api/send', (req, res) => {
  const {name, msg, role, clientId, typing} = req.body;
  let chats = readChats();
  let chat = chats.find(c => c.clientId === clientId);
  if (!chat) {
    chat = {clientId, name, messages: [], unread: true, online: true, typing: false};
    chats.push(chat);
  }
  if (msg) {
    chat.messages.push({role, msg, time: Date.now()});
    chat.unread = (role === 'user');
    chat.typing = false;
  }
  if (typeof typing === 'boolean') chat.typing = typing;
  chat.online = true;
  writeChats(chats);
  res.json({success: true});
});

// API lấy lịch sử chat cho client
app.get('/api/history', (req, res) => {
  const {clientId} = req.query;
  let chats = readChats();
  let chat = chats.find(c => c.clientId === clientId);
  res.json(chat ? chat.messages : []);
});

// API lấy danh sách chat cho admin
app.get('/api/allchats', basicAuth({users: { 'admin': 'adminpass' }, challenge: true}), (req, res) => {
  let chats = readChats();
  res.json(chats.map(c => ({
    clientId: c.clientId,
    name: c.name,
    unread: c.unread,
    online: c.online,
    typing: c.typing,
    lastMsg: c.messages.length ? c.messages[c.messages.length-1] : null
  })));
});

// API lấy chi tiết chat cho admin
app.get('/api/chat', basicAuth({users: { 'admin': 'adminpass' }, challenge: true}), (req, res) => {
  const {clientId} = req.query;
  let chats = readChats();
  let chat = chats.find(c => c.clientId === clientId);
  res.json(chat ? chat.messages : []);
});

// API admin gửi tin nhắn
app.post('/api/adminsend', basicAuth({users: { 'admin': 'adminpass' }, challenge: true}), (req, res) => {
  const {clientId, msg} = req.body;
  let chats = readChats();
  let chat = chats.find(c => c.clientId === clientId);
  if (chat) {
    chat.messages.push({role: 'admin', msg, time: Date.now()});
    chat.unread = false;
    chat.typing = false;
    writeChats(chats);
    res.json({success: true});
  } else {
    res.json({success: false});
  }
});

// API admin gửi trạng thái đang nhập
app.post('/api/admintyping', basicAuth({users: { 'admin': 'adminpass' }, challenge: true}), (req, res) => {
  const {clientId, typing} = req.body;
  let chats = readChats();
  let chat = chats.find(c => c.clientId === clientId);
  if (chat) {
    chat.typing = typing;
    writeChats(chats);
    res.json({success: true});
  } else {
    res.json({success: false});
  }
});

// API upload ảnh
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({error: 'No file'});
  res.json({url: '/uploads/' + req.file.filename});
});
app.use('/uploads', express.static('./data/uploads'));

app.listen(PORT, () => console.log('CSKH server running at http://localhost:' + PORT));

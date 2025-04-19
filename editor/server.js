import express from 'express';
import path from 'path';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 设置静态文件目录
app.use(express.static(path.join(__dirname)));

// 设置 MIME 类型
app.use((req, res, next) => {
    if (req.path.endsWith('.ts')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});

// 设置路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'editor.html'));
});

// 启动服务器
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
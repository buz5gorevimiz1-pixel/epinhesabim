const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\Zımbacı\\Desktop\\epinhesabim3-project\\frodent';

const server = http.createServer((req, res) => {
    let filePath = path.join(dir, req.url === '/' ? 'bakiye-ekle.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    }[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(8080, () => {
    console.log('Server running at http://localhost:8080/');
});

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// 新增：引入 db.js 並確認資料庫開啟
const db = require('./db');

// 測試資料庫連線
db.serialize(() => {
    db.get('SELECT 1', (err) => {
        if (err) {
            console.error('資料庫連線測試失敗:', err.message, err.stack);
            process.exit(1);
        } else {
            console.log('資料庫連線測試成功');
        }
    });
});

const cors = require('cors');
// 啟用 CORS，允許特定來源
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8080'], // 根據前端實際 URL 調整
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// /api/gold/price 路由：查詢 gold_price 所有資料
app.get('/api/gold/price', (req, res) => {
    db.all('SELECT * FROM gold_price ORDER BY year DESC', (err, rows) => {
        if (err) {
            console.error('查詢 gold_price 失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        console.log('查詢 gold_price 成功，返回資料筆數:', rows.length);
        res.json(rows);
    });
});

// /api/gold?year= 路由：查詢指定 year 的 gold_price 資料
app.get('/api/gold', (req, res) => {
    const year = parseInt(req.query.year, 10);
    if (isNaN(year)) {
        return res.status(400).json({ error: '請提供正確的 year 參數' });
    }
    db.get('SELECT * FROM gold_price WHERE year = ?', [year], (err, row) => {
        if (err) {
            console.error('查詢 gold_price 失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(row);
    });
});

// POST /api/gold 路由：查詢指定 year 的 gold_price 資料
app.post('/api/gold', (req, res) => {
    const year = parseInt(req.body.year, 10);
    if (isNaN(year)) {
        return res.status(400).json({ error: '請提供正確的 year 參數' });
    }
    db.get('SELECT * FROM gold_price WHERE year = ?', [year], (err, row) => {
        if (err) {
            console.error('查詢 gold_price 失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(row);
    });
});

// /api/insert/gold 路由：新增一筆 gold_price 資料
app.get('/api/insert/gold', (req, res) => {
    const { year, average_price, highest_price, lowest_price, annual_range } = req.query;
    if (!year || !average_price || !highest_price || !lowest_price || !annual_range) {
        return res.status(400).json({ error: '請提供 year, average_price, highest_price, lowest_price, annual_range 參數' });
    }
    const sql = `INSERT INTO gold_price (year, average_price, highest_price, lowest_price, annual_range) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [year, average_price, highest_price, lowest_price, annual_range], function(err) {
        if (err) {
            console.error('新增資料失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫新增失敗', details: err.message });
        }
        console.log('新增資料成功，ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// POST /api/insert/gold 路由：新增一筆 gold_price 資料，回傳文字訊息
app.post('/api/insert/gold', (req, res) => {
    const { year, average_price, highest_price, lowest_price, annual_range } = req.body;
    if (!year || !average_price || !highest_price || !lowest_price || !annual_range) {
        return res.status(400).send('請提供 year, average_price, highest_price, lowest_price, annual_range 參數');
    }
    const sql = `INSERT INTO gold_price (year, average_price, highest_price, lowest_price, annual_range) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [year, average_price, highest_price, lowest_price, annual_range], function(err) {
        if (err) {
            console.error('新增資料失敗:', err.message, err.stack);
            return res.status(500).send('資料庫新增失敗');
        }
        console.log('新增資料成功');
        res.send('資料新增成功');
    });
});

// /api/gold/range 路由：查詢指定年份範圍的 gold_price 資料
app.get('/api/gold/range', (req, res) => {
    const startYear = parseInt(req.query.startYear, 10);
    const endYear = parseInt(req.query.endYear, 10);
    if (isNaN(startYear) || isNaN(endYear)) {
        return res.status(400).json({ error: '請提供正確的 startYear 和 endYear 參數' });
    }
    if (startYear > endYear) {
        return res.status(400).json({ error: 'startYear 必須小於或等於 endYear' });
    }
    db.all('SELECT * FROM gold_price WHERE year >= ? AND year <= ? ORDER BY year DESC', [startYear, endYear], (err, rows) => {
        if (err) {
            console.error('查詢 gold_price 範圍失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        console.log('查詢範圍成功，返回資料筆數:', rows.length);
        if (rows.length === 0) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(rows);
    });
});

// /api/silver/price 路由：查詢 silver_price 所有資料
app.get('/api/silver/price', (req, res) => {
    db.all('SELECT * FROM silver_price ORDER BY year DESC', (err, rows) => {
        if (err) {
            console.error('查詢 silver_price 失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        console.log('查詢 silver_price 成功，返回資料筆數:', rows.length);
        res.json(rows);
    });
});

// GET /api/silver?year= 路由：查詢 silver_price 某 year 的資料
app.get('/api/silver', (req, res) => {
    const year = parseInt(req.query.year, 10);
    if (isNaN(year)) {
        return res.status(400).json({ error: '請提供正確的 year 參數' });
    }
    db.get('SELECT * FROM silver_price WHERE year = ?', [year], (err, row) => {
        if (err) {
            return res.status(500).json({ error: '資料庫查詢失敗', detail: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(row);
    });
});

// /api/insert/silver 路由：新增一筆 silver_price 資料
app.get('/api/insert/silver', (req, res) => {
    const { year, average_price, highest_price, lowest_price, annual_range } = req.query;
    if (!year || !average_price || !highest_price || !lowest_price || !annual_range) {
        return res.status(400).json({ error: '請提供 year, average_price, highest_price, lowest_price, annual_range 參數' });
    }
    const sql = `INSERT INTO silver_price (year, average_price, highest_price, lowest_price, annual_range) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [year, average_price, highest_price, lowest_price, annual_range], function(err) {
        if (err) {
            console.error('新增 silver_price 資料失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫新增失敗', details: err.message });
        }
        console.log('新增 silver_price 資料成功，ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// /api/silver/range 路由：查詢指定年份範圍的 silver_price 資料
app.get('/api/silver/range', (req, res) => {
    const startYear = parseInt(req.query.startYear, 10);
    const endYear = parseInt(req.query.endYear, 10);
    if (isNaN(startYear) || isNaN(endYear)) {
        return res.status(400).json({ error: '請提供正確的 startYear 和 endYear 參數' });
    }
    if (startYear > endYear) {
        return res.status(400).json({ error: 'startYear 必須小於或等於 endYear' });
    }
    db.all('SELECT * FROM silver_price WHERE year >= ? AND year <= ? ORDER BY year DESC', [startYear, endYear], (err, rows) => {
        if (err) {
            console.error('查詢 silver_price 範圍失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        console.log('查詢 silver_price 範圍成功，返回資料筆數:', rows.length);
        if (rows.length === 0) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(rows);
    });
});

// /api/platinum/price 路由：查詢 platinum_price 所有資料
app.get('/api/platinum/price', (req, res) => {
    db.all('SELECT * FROM platinum_price ORDER BY year DESC', (err, rows) => {
        if (err) {
            console.error('查詢 platinum_price 失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        console.log('查詢 platinum_price 成功，返回資料筆數:', rows.length);
        res.json(rows);
    });
});

// /api/platinum?year= 路由：查詢 platinum_price 某 year 的資料
app.get('/api/platinum', (req, res) => {
    const year = parseInt(req.query.year, 10);
    if (isNaN(year)) {
        return res.status(400).json({ error: '請提供正確的 year 參數' });
    }
    db.get('SELECT * FROM platinum_price WHERE year = ?', [year], (err, row) => {
        if (err) {
            return res.status(500).json({ error: '資料庫查詢失敗', detail: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(row);
    });
});

// /api/platinum/range 路由：查詢指定年份範圍的 platinum_price 資料
app.get('/api/platinum/range', (req, res) => {
    const startYear = parseInt(req.query.startYear, 10);
    const endYear = parseInt(req.query.endYear, 10);
    if (isNaN(startYear) || isNaN(endYear)) {
        return res.status(400).json({ error: '請提供正確的 startYear 和 endYear 參數' });
    }
    if (startYear > endYear) {
        return res.status(400).json({ error: 'startYear 必須小於或等於 endYear' });
    }
    db.all('SELECT * FROM platinum_price WHERE year >= ? AND year <= ? ORDER BY year DESC', [startYear, endYear], (err, rows) => {
        if (err) {
            console.error('查詢 platinum_price 範圍失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫查詢失敗', details: err.message });
        }
        console.log('查詢 platinum_price 範圍成功，返回資料筆數:', rows.length);
        if (rows.length === 0) {
            return res.status(404).json({ error: '查無資料' });
        }
        res.json(rows);
    });
});

// /api/insert/platinum 路由：新增一筆 platinum_price 資料
app.get('/api/insert/platinum', (req, res) => {
    const { year, average_price, highest_price, lowest_price, annual_range } = req.query;
    if (!year || !average_price || !highest_price || !lowest_price || !annual_range) {
        return res.status(400).json({ error: '請提供 year, average_price, highest_price, lowest_price, annual_range 參數' });
    }
    const sql = `INSERT INTO platinum_price (year, average_price, highest_price, lowest_price, annual_range) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [year, average_price, highest_price, lowest_price, annual_range], function(err) {
        if (err) {
            console.error('新增 platinum_price 資料失敗:', err.message, err.stack);
            return res.status(500).json({ error: '資料庫新增失敗', details: err.message });
        }
        console.log('新增 platinum_price 資料成功，ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

module.exports = app;

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.json());
const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : '';

app.use(cors({
    origin: [process.env.FRONTEND_URL, frontendUrl, 'http://localhost:5173'].filter(Boolean),
    credentials: true,
}));

const authRouter = require('./routes/auth.routes');
const interviewRouter = require('./routes/interview.route');

app.use('/api/auth', authRouter);
app.use('/api/interview', interviewRouter);


module.exports = app;
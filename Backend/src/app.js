const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: true,
    credentials: true,
}));

const authRouter = require('./routes/auth.routes');
const interviewRouter = require('./routes/interview.route');

app.use('/api/auth', authRouter);
app.use('/api/interview', interviewRouter);


module.exports = app;
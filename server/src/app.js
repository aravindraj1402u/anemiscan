// ---------------------------------------------------------------------
// src/app.js
// Builds and configures the Express application. Kept separate from
// server.js so tests can import the app without opening a port.
// ---------------------------------------------------------------------
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind a proxy (nginx, Render, etc.) trust its X-Forwarded-* headers.
app.set('trust proxy', 1);

// --- Security headers -------------------------------------------------
app.use(helmet());

// --- CORS: only the web panels we list may call this API --------------
app.use(
  cors({
    origin(origin, cb) {
      // Allow tools like curl/Postman (no origin) and the allow-list.
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// --- Body parsing (JSON only; photos go up as multipart in Stage 2) ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// --- Request logging (skip in tests) ----------------------------------
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// --- Liveness / health check ------------------------------------------
app.get('/health', (_req, res) =>
  res.json({ success: true, service: 'anemiscan-api', env: env.nodeEnv, time: new Date().toISOString() })
);

// --- API ---------------------------------------------------------------
app.use('/api', routes);

// --- 404 + central error handler (must be last) -----------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;

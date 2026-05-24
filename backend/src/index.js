const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

// Health check — GitHub Actions and ECS both ping this
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (we'll add these next)
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/barbers',      require('./routes/barbers'));
app.use('/api/appointments', require('./routes/appointments'));
//app.use('/api/services',     require('./routes/services'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`DrippyCutz API running on port ${PORT}`);
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/measurements', require('./routes/measurements'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/ml', require('./routes/ml'));
app.use('/api/history', require('./routes/history'));
app.use('/api/admin', require('./routes/admin'));

// Serve static files from React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}


mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heart-rate-monitor', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📊 Database:', mongoose.connection.db.databaseName);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('💡 Đang sử dụng database tạm thời...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



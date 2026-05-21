const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const path    = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set. Copy nile-backend/.env.example to nile-backend/.env and fill it in.');
  process.exit(1);
}

const authRoutes         = require('./routes/auth');
const postRoutes         = require('./routes/post');
const userRoutes         = require('./routes/user');
const bookmarkRoutes     = require('./routes/bookmark');
const notificationRoutes = require('./routes/notification');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',          authRoutes);
app.use('/api/posts',         postRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/bookmarks',     bookmarkRoutes);
app.use('/api/notifications', notificationRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Nile backend running on port ${PORT}`));
}

module.exports = app;

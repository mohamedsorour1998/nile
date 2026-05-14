const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/post');
const userRoutes = require('./routes/user');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',  authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Nile backend running on port ${PORT}`));
}

module.exports = app;

import app from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Civic AI backend listening on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});

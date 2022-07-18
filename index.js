/* eslint-disable no-console */
const express = require('express');
const path = require('path');

const app = express();

const port = process.env.PORT || 4242;
const log = console.info;

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./src/index.html'));
});

app.use(express.static('src'));

app.listen(port, () => {
  log(`🚀 Server launched on ${port} 🚀`);
});

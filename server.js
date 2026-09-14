const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const submissionsFile = path.join(__dirname, 'messages.json');

app.use(express.json({ limit: '250kb' }));
app.use(express.urlencoded({ extended: true, limit: '250kb' }));
app.use(express.static(__dirname));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/contact', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 120);
  const email = String(req.body.email || '').trim().slice(0, 180);
  const service = String(req.body.service || '').trim().slice(0, 120);
  const message = String(req.body.message || '').trim().slice(0, 5000);

  if (!name || !email || !service || !message) {
    return res.status(400).json({ message: 'Please complete all fields.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const submission = {
    name,
    email,
    service,
    message,
    submittedAt: new Date().toISOString()
  };

  let savedMessages = [];
  if (fs.existsSync(submissionsFile)) {
    try {
      savedMessages = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
      if (!Array.isArray(savedMessages)) savedMessages = [];
    } catch {
      savedMessages = [];
    }
  }

  savedMessages.push(submission);
  fs.writeFileSync(submissionsFile, JSON.stringify(savedMessages, null, 2));

  return res.status(200).json({ message: 'Inquiry received successfully.' });
});

app.get('/health', (_req, res) => res.status(200).send('ok'));

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
});

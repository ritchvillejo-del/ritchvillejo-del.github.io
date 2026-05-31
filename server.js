const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const submissionsFile = path.join(__dirname, 'messages.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/contact', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const message = String(req.body.message || '').trim();

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Please complete all fields.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const submission = {
    name,
    email,
    message,
    submittedAt: new Date().toISOString()
  };

  let savedMessages = [];

  if (fs.existsSync(submissionsFile)) {
    try {
      savedMessages = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
    } catch (error) {
      savedMessages = [];
    }
  }

  savedMessages.push(submission);
  fs.writeFileSync(submissionsFile, JSON.stringify(savedMessages, null, 2));

  return res.status(200).json({ message: 'Message received successfully.' });
});

app.listen(PORT, () => {
  console.log(`Portfolio backend running at http://localhost:${PORT}`);
});

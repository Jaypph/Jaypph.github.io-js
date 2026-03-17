const express = require('express');
const path = require('path');
const app = express();

// Porten skal dynamisk læses fra Render (process.env.PORT)
const PORT = process.env.PORT || 10000;

// Gør det muligt for din frontend at tale med backenden (CORS)
const cors = require('cors');
app.use(cors());

// Simpel API-rute
app.get('/api/data', (req, res) => {
    res.json({ message: "Hej fra Node.js på Render!" });
});

// Start serveren
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server kører på port ${PORT}`);
});
// Tilføj denne rute øverst sammen med dine andre app.get()
app.get('/', (req, res) => {
    res.send('Backend kører korrekt på Render!');
});

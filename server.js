const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Produkter (Din priskontrol)
const produkter = [
    { id: 1, navn: "iPhone 12/13/14 Cover – Sort", pris: 20 },
    { id: 2, navn: "VikLin.fun iPhone 11 Pro/XS/X Cover", pris: 20 },
    { id: 3, navn: "VikLin.fun iPhone 7/8/SE Cover", pris: 20 }
];

let ordrer = [];

// Ruter
app.get('/', (req, res) => {
    res.send('Backend kører korrekt på Render!');
});

app.get('/api/products', (req, res) => {
    res.json(produkter);
});

app.post('/api/checkout', (req, res) => {
    const nyOrdre = {
        id: Date.now(),
        varer: req.body.cart,
        total: req.body.total,
        tidspunkt: new Date()
    };
    ordrer.push(nyOrdre);
    console.log("Ny ordre modtaget:", nyOrdre);
    res.json({ message: "Tak for din bestilling! Ordre ID: " + nyOrdre.id });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server kører på port ${PORT}`);
});

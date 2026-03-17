const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Her styrer du priserne ét centralt sted
const produkter = [
    { id: 1, navn: "iPhone 12/13/14 Cover – Sort", pris: 20 },
    { id: 2, navn: "VikLin.fun iPhone 11 Pro/XS/X Cover", pris: 20 },
    { id: 3, navn: "VikLin.fun iPhone 7/8/SE Cover", pris: 25 } // Pris opdateret her
];

app.get('/api/products', (req, res) => {
    res.json(produkter);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server kører på port ${PORT}`));

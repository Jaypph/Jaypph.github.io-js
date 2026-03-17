const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(cors());
app.use(express.json());

// Forbind til Supabase (Hent dine keys under Settings > API i Supabase)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Produkter
const produkter = [
    { id: 1, navn: "iPhone 12/13/14 Cover – Sort", pris: 20 },
    { id: 2, navn: "VikLin.fun iPhone 11 Pro/XS/X Cover", pris: 20 },
    { id: 3, navn: "VikLin.fun iPhone 7/8/SE Cover", pris: 20 }
];

app.get('/api/products', (req, res) => res.json(produkter));

app.post('/api/checkout', async (req, res) => {
    const { cart, total } = req.body;

    // Gem ordren i Supabase databasen
    const { data, error } = await supabase
        .from('ordrer')
        .insert([{ varer: cart, total: total }]);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Ordre gemt i Supabase!", status: "Success" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server kører på port ${PORT}`));

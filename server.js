// Tilføj dette øverst for at serveren kan læse JSON-data
app.use(express.json());

// Her gemmer vi ordrerne midlertidigt (forsvinder ved genstart på gratis-versionen)
let ordrer = [];

app.post('/api/checkout', (req, res) => {
    const nyOrdre = {
        id: Date.now(),
        varer: req.body.cart,
        total: req.body.total,
        tidspunkt: new Date()
    };
    
    ordrer.push(nyOrdre);
    console.log("Ny ordre:", nyOrdre);
    
    res.json({ message: "Tak for din bestilling! Ordre ID: " + nyOrdre.id });
});

// Valgfrit: Se alle ordrer (kun til test)
app.get('/api/admin/orders', (req, res) => {
    res.json(ordrer);
});

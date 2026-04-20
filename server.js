const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// ======================
// 🔌 SUPABASE
// ======================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ======================
// 🧠 TOKENIZER
// ======================
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\wæøå\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);
}

// ======================
// 🚫 FILTER
// ======================
const bannedWords = [
    "sex","porno","nøgen","drugs","våben",
    "hacke","stjæle","ulovlig"
];

function isBlocked(text) {
    const lower = text.toLowerCase();
    return bannedWords.some(word => lower.includes(word));
}

// ======================
// 📚 BASIS VIDEN
// ======================
const baseKnowledge = [
    { input: "hej", response: "Hej! Hvordan kan jeg hjælpe dig?" },
    { input: "hvad koster jeres produkter", response: "Alle produkter koster 20 kr." },
    { input: "levering", response: "Levering tager typisk 1-3 hverdage." },
    { input: "iphone", response: "Vi har covers til flere iPhone modeller." },
    { input: "tak", response: "Selv tak!" }
];

// ======================
// 🧠 MATCH ENGINE
// ======================
function scoreMatch(inputTokens, entryTokens) {
    let score = 0;

    for (let token of inputTokens) {
        if (entryTokens.includes(token)) score += 2;

        for (let word of entryTokens) {
            if (word.startsWith(token) || token.startsWith(word)) {
                score += 1;
            }
        }
    }

    return score;
}

// ======================
// 📥 HENT VIDEN FRA DB
// ======================
async function loadKnowledgeFromDB() {
    const { data, error } = await supabase
        .from('ai_learning')
        .select('*')
        .eq('approved', true);

    if (error) {
        console.error(error);
        return [];
    }

    return data.map(row => ({
        input: row.input,
        response: row.response
    }));
}

// ======================
// 🧠 AI LOGIK
// ======================
async function findBestAnswer(input) {
    const inputTokens = tokenize(input);

    const dbKnowledge = await loadKnowledgeFromDB();
    const allKnowledge = [...baseKnowledge, ...dbKnowledge];

    let bestScore = 0;
    let bestAnswer = null;

    for (let entry of allKnowledge) {
        const entryTokens = tokenize(entry.input);
        const score = scoreMatch(inputTokens, entryTokens);

        if (score > bestScore) {
            bestScore = score;
            bestAnswer = entry.response;
        }
    }

    if (bestScore < 2) return null;

    return bestAnswer;
}

// ======================
// 🤖 AI ENDPOINT
// ======================
app.post('/api/ai', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Ingen besked sendt" });
    }

    // 🚫 Filter
    if (isBlocked(message)) {
        return res.json({
            response: "Det kan jeg ikke hjælpe med."
        });
    }

    let response = await findBestAnswer(message);

    // ❗ Hvis AI ikke kender svaret
    if (!response) {
        response = "Det ved jeg ikke endnu – men jeg lærer det gerne!";

        await supabase.from('ai_learning').insert([
            {
                input: message,
                response: "MANGLER SVAR",
                approved: false
            }
        ]);
    }

    // 💾 Log chat
    await supabase.from('chat_logs').insert([
        { input: message, output: response }
    ]);

    res.json({ response });
});

// ======================
// 🧑‍💼 ADMIN: GODKEND SVAR
// ======================
app.post('/api/ai/approve', async (req, res) => {
    const { id, response } = req.body;

    const { error } = await supabase
        .from('ai_learning')
        .update({
            response: response,
            approved: true
        })
        .eq('id', id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Svar godkendt!" });
});

// ======================
// 📋 ADMIN: SE UGODKENDTE
// ======================
app.get('/api/ai/pending', async (req, res) => {
    const { data, error } = await supabase
        .from('ai_learning')
        .select('*')
        .eq('approved', false);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// ======================
// 🛒 PRODUKTER
// ======================
const produkter = [
    { id: 1, navn: "iPhone 12/13/14 Cover – Sort", pris: 20 },
    { id: 2, navn: "VikLin.fun iPhone 11 Pro/XS/X Cover", pris: 20 },
    { id: 3, navn: "VikLin.fun iPhone 7/8/SE Cover", pris: 20 }
];

app.get('/api/products', (req, res) => res.json(produkter));

// ======================
// 💳 CHECKOUT
// ======================
app.post('/api/checkout', async (req, res) => {
    const { cart, total } = req.body;

    const { error } = await supabase
        .from('ordrer')
        .insert([{ varer: cart, total: total }]);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Ordre gemt!", status: "Success" });
});

// ======================
// 🚀 SERVER
// ======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server kører på port ${PORT}`);
});

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
// ⚡ CACHE (hurtigere AI)
// ======================
const cache = new Map();

function getCache(key) {
    return cache.get(key);
}

function setCache(key, value) {
    cache.set(key, value);
    setTimeout(() => cache.delete(key), 1000 * 60 * 10); // 10 min
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
    return bannedWords.some(w => lower.includes(w));
}

// ======================
// 🧠 SYNONYMER (dansk forståelse)
// ======================
const synonyms = {
    hej: ["hej", "hallo", "goddag", "yo"],
    pris: ["pris", "koster", "betaling", "værdi"],
    levering: ["levering", "fragt", "sendes", "transport"],
    iphone: ["iphone", "apple telefon", "ios mobil"],
    tak: ["tak", "mange tak", "thx"]
};

function normalizeWithSynonyms(tokens) {
    let result = [];

    for (let t of tokens) {
        let mapped = false;

        for (let key in synonyms) {
            if (synonyms[key].includes(t)) {
                result.push(key);
                mapped = true;
                break;
            }
        }

        if (!mapped) result.push(t);
    }

    return result;
}

// ======================
// 🧠 TOKENIZER
// ======================
function tokenize(text) {
    const tokens = text
        .toLowerCase()
        .replace(/[^\wæøå\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

    return normalizeWithSynonyms(tokens);
}

// ======================
// 📚 BASE VIDEN
// ======================
const baseKnowledge = [
    { input: "hej", response: "Hej! Hvordan kan jeg hjælpe dig?" },
    { input: "pris", response: "Alle produkter koster 20 kr." },
    { input: "levering", response: "Levering tager 1-3 hverdage." },
    { input: "iphone", response: "Vi har covers til flere iPhone modeller." },
    { input: "tak", response: "Selv tak!" }
];

// ======================
// 📥 DB VIDEN (selvlærende)
// ======================
async function loadKnowledgeFromDB() {
    const { data } = await supabase
        .from('ai_learning')
        .select('*')
        .eq('approved', true);

    return data || [];
}

// ======================
// 🧠 SCORING ENGINE
// ======================
function scoreMatch(inputTokens, entryTokens) {
    let score = 0;

    for (let t of inputTokens) {
        if (entryTokens.includes(t)) score += 2;

        for (let w of entryTokens) {
            if (w.startsWith(t) || t.startsWith(w)) {
                score += 1;
            }
        }
    }

    return score;
}

// ======================
// 🧠 AI ENGINE
// ======================
async function findBestAnswer(input) {

    // ⚡ CACHE FIRST
    const cached = getCache(input);
    if (cached) return cached;

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

    setCache(input, bestAnswer);

    return bestAnswer;
}

// ======================
// 🤖 AI ENDPOINT
// ======================
app.post('/api/ai', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Ingen besked" });
    }

    // 🚫 filter
    if (isBlocked(message)) {
        return res.json({ response: "Det kan jeg ikke hjælpe med." });
    }

    let response = await findBestAnswer(message);

    // 🧠 læring hvis ukendt
    if (!response) {
        response = "Jeg ved det ikke endnu – men jeg lærer det gerne!";

        await supabase.from('ai_learning').insert([
            {
                input: message,
                response: "MANGLER SVAR",
                approved: false
            }
        ]);
    }

    await supabase.from('chat_logs').insert([
        { input: message, output: response }
    ]);

    res.json({ response });
});

// ======================
// 🧑‍💼 ADMIN: GODKEND
// ======================
app.post('/api/ai/approve', async (req, res) => {
    const { id, response } = req.body;

    const { error } = await supabase
        .from('ai_learning')
        .update({ response, approved: true })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Godkendt" });
});

// ======================
// 📋 ADMIN: PENDING
// ======================
app.get('/api/ai/pending', async (req, res) => {
    const { data, error } = await supabase
        .from('ai_learning')
        .select('*')
        .eq('approved', false);

    if (error) return res.status(500).json({ error });

    res.json(data);
});

// ======================
// 🛒 PRODUKTER
// ======================
const produkter = [
    { id: 1, navn: "iPhone 12/13/14 Cover – Sort", pris: 20 },
    { id: 2, navn: "VikLin.fun iPhone Cover", pris: 20 },
    { id: 3, navn: "iPhone SE Cover", pris: 20 }
];

app.get('/api/products', (req, res) => {
    res.json(produkter);
});

// ======================
// 💳 CHECKOUT
// ======================
app.post('/api/checkout', async (req, res) => {
    const { cart, total } = req.body;

    const { error } = await supabase
        .from('ordrer')
        .insert([{ varer: cart, total }]);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Ordre gemt!", status: "Success" });
});

// ======================
// 🚀 SERVER
// ======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server kører på port ${PORT}`);
});

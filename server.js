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
// ⚡ CACHE SYSTEM
// ======================
const cache = new Map();

function setCache(key, value) {
    cache.set(key, {
        value,
        time: Date.now(),
        hits: 0
    });
}

function getCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;

    entry.hits++;
    return entry.value;
}

// cleanup
setInterval(() => {
    const now = Date.now();
    for (let [k, v] of cache.entries()) {
        if (now - v.time > 1000 * 60 * 10) {
            cache.delete(k);
        }
    }
}, 60000);

// ======================
// 🚫 SAFETY FILTER
// ======================
const bannedWords = [
    "sex","porno","nøgen","drugs","våben",
    "hacke","stjæle","ulovlig"
];

function isBlocked(text) {
    return bannedWords.some(w => text.toLowerCase().includes(w));
}

// ======================
// 🧠 SYNONYMER (DANSK)
// ======================
const synonyms = {
    hej: ["hej", "hallo", "goddag", "yo"],
    pris: ["pris", "koster", "betaling"],
    levering: ["levering", "fragt", "sendetid"],
    iphone: ["iphone", "apple", "ios"],
    tak: ["tak", "mange tak", "thx"]
};

function normalize(text) {
    let words = text.toLowerCase().split(" ");
    let result = [];

    for (let w of words) {
        let mapped = false;

        for (let key in synonyms) {
            if (synonyms[key].includes(w)) {
                result.push(key);
                mapped = true;
                break;
            }
        }

        if (!mapped) result.push(w);
    }

    return result.join(" ");
}

// ======================
// 📚 KNOWLEDGE BASE
// ======================
const baseKnowledge = [
    { text: "hej hvordan kan jeg hjælpe dig", answer: "Hej! Velkommen til VikLin AI 👋" },
    { text: "pris koster produkter", answer: "Alle produkter koster 20 kr." },
    { text: "levering fragt tid", answer: "Levering tager 1-3 hverdage." },
    { text: "iphone apple cover", answer: "Vi har covers til flere iPhone modeller." },
    { text: "tak mange tak", answer: "Selv tak!" }
];

// ======================
// 🔎 SEARCH ENGINE (Google-style)
// ======================
function search(query, knowledge) {
    const words = query.split(" ");
    const scores = new Map();

    for (let item of knowledge) {
        let score = 0;

        for (let w of words) {
            if (item.text.includes(w)) score++;
        }

        if (score > 0) {
            scores.set(item, score);
        }
    }

    return [...scores.entries()]
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

// ======================
// 📥 LOAD DB KNOWLEDGE
// ======================
async function loadDB() {
    const { data } = await supabase
        .from('ai_learning')
        .select('*')
        .eq('approved', true);

    return data || [];
}

// ======================
// 🧠 VIKLIN AI ENGINE
// ======================
async function viklinAI(message) {

    // ⚡ CACHE FIRST
    const cached = getCache(message);
    if (cached) return cached.value;

    const clean = normalize(message);

    const db = await loadDB();
    const all = [...baseKnowledge, ...db.map(x => ({
        text: x.input,
        answer: x.response
    }))];

    const result = search(clean, all);

    const response = result
        ? result.answer
        : "Jeg er stadig ved at lære – VikLin AI udvikler sig hele tiden 🤖";

    setCache(message, { answer: response });

    return { answer: response };
}

// ======================
// 🤖 AI ENDPOINT
// ======================
app.post('/api/ai', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Ingen besked" });
    }

    if (isBlocked(message)) {
        return res.json({
            response: "Det kan jeg ikke hjælpe med."
        });
    }

    const result = await viklinAI(message);

    // 💾 læring (ukendt spørgsmål)
    if (result.answer.includes("lære")) {
        await supabase.from('ai_learning').insert([
            {
                input: message,
                response: "MANGLER SVAR",
                approved: false
            }
        ]);
    }

    await supabase.from('chat_logs').insert([
        { input: message, output: result.answer }
    ]);

    res.json({
        ai: "VikLin AI",
        response: result.answer
    });
});

// ======================
// 🧑‍💼 ADMIN
// ======================
app.get('/api/ai/pending', async (req, res) => {
    const { data } = await supabase
        .from('ai_learning')
        .select('*')
        .eq('approved', false);

    res.json(data);
});

app.post('/api/ai/approve', async (req, res) => {
    const { id, response } = req.body;

    await supabase
        .from('ai_learning')
        .update({ response, approved: true })
        .eq('id', id);

    res.json({ ok: true });
});

// ======================
// 🛒 PRODUKTER
// ======================
const produkter = [
    { id: 1, navn: "iPhone Cover Sort", pris: 20 },
    { id: 2, navn: "VikLin Premium Cover", pris: 20 },
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

    await supabase.from('ordrer').insert([
        { varer: cart, total }
    ]);

    res.json({
        status: "success",
        message: "Ordre gemt i VikLin systemet"
    });
});

// ======================
// 🚀 START SERVER
// ======================
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log("🚀 VikLin AI kører på port " + PORT);
});

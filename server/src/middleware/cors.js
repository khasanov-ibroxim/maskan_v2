// middleware/cors.js
function corsMiddleware(req, res, next) {
    // Ruxsat berilgan originlar
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:3000'
    ];

    const origin = req.headers.origin;

    // Origin tekshirish
    if (!origin || allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin || "*");
    } else {
        // Development uchun barchasiga ruxsat
        res.header("Access-Control-Allow-Origin", origin);
    }

    // CORS headers
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-session-id, X-Requested-With, Accept");
    res.header("Access-Control-Expose-Headers", "x-session-id");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "86400"); // 24 soat

    // Preflight request
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
}

module.exports = corsMiddleware;
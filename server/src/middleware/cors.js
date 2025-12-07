// middleware/cors.js
function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    const isDev = process.env.NODE_ENV !== 'production';
    const host = req.headers.host;

    console.log('🔍 CORS Request:');
    console.log('   Method:', req.method);
    console.log('   Path:', req.path);
    console.log('   Origin:', origin || 'none');
    console.log('   Host:', host);

    // Ngrok tekshiruvi
    const isNgrok = host && host.includes('ngrok');

    // CORS Headers
    let allowedOrigin = '*';

    if (origin) {
        // Development yoki Ngrok - barcha originlarga ruxsat
        if (isDev || isNgrok) {
            allowedOrigin = origin;
            console.log('   ✅ Dev/Ngrok mode - origin allowed:', origin);
        } else {
            // Production - faqat ma'lum originlar
            const allowedOrigins = [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:3000',
                'https://maskan-v2.vercel.app',
                'https://maskanrielter.vercel.app',
                'http://192.168.1.6:5173',
                'http://194.163.140.30:5000',
                'https://maskanlux.uz'
            ];

            if (allowedOrigins.includes(origin)) {
                allowedOrigin = origin;
                console.log('   ✅ Production - origin allowed:', origin);
            } else {
                console.log('   ⚠️ Production - origin NOT in whitelist:', origin);
                allowedOrigin = allowedOrigins[0];
            }
        }
    } else {
        // Origin yo'q - wildcard
        console.log('   ℹ️ No origin header, using wildcard');
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id, X-Requested-With, Accept, ngrok-skip-browser-warning');
    res.setHeader('Access-Control-Expose-Headers', 'x-session-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Ngrok-specific headers
    if (isNgrok) {
        res.setHeader('ngrok-skip-browser-warning', 'true');
        console.log('   🔧 Ngrok headers set');
    }

    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
        console.log('   ✅ OPTIONS preflight - sending 204');
        return res.status(204).end();
    }

    next();
}

module.exports = corsMiddleware;
const { app } = require("@azure/functions");
const axios = require("axios");

// Environment vars from local.settings.json or Azure App Config
const EMAILJS_SERVICE_ID = (process.env.EMAILJS_SERVICE_ID || "").trim();
const EMAILJS_TEMPLATE_ID = (process.env.EMAILJS_TEMPLATE_ID || "").trim();
const EMAILJS_USER_ID     = (process.env.EMAILJS_USER_ID || "").trim();       // public key
const EMAILJS_PRIVATE_KEY = (process.env.EMAILJS_PRIVATE_KEY || "").trim();    // private key
const EMAILJS_ENDPOINT    = (process.env.EMAILJS_ENDPOINT || "https://api.emailjs.com/api/v1.0/email/send").trim();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// CORS helper
function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || "*");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // allow the headers we actually use
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-EmailJS-Access-Token, x-functions-key",
    Vary: "Origin",
  };
}

// Minimal env sanity check (fail fast on cold start if misconfigured)
function assertEnv() {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_USER_ID) {
    throw new Error("Missing one or more EmailJS IDs (service/template/user). Check configuration.");
  }
  // Private key is optional if strict mode is OFF in EmailJS, but required if ON
}

app.http("mailer", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    const origin = request.headers.get("origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders(origin) };
    }

    try {
      assertEnv();

      // Parse body safely
      const body = await request.json().catch(() => ({}));
      const templateParams = body?.template_params && typeof body.template_params === "object"
        ? body.template_params
        : {};

      // Build payload (strict mode compatible)
      const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_USER_ID,                 // public key always required in body
        accessToken: EMAILJS_PRIVATE_KEY || undefined, // helps strict mode on some accounts
        template_params: templateParams,
      };

      // Build headers (strict mode auth)
      const headersObj = {
        "Content-Type": "application/json",
        ...(EMAILJS_PRIVATE_KEY ? { Authorization: `Bearer ${EMAILJS_PRIVATE_KEY}` } : {}),
        ...(EMAILJS_PRIVATE_KEY ? { "X-EmailJS-Access-Token": EMAILJS_PRIVATE_KEY } : {}),
      };

      // Make request
      const { data, status } = await axios.post(EMAILJS_ENDPOINT, payload, { headers: headersObj });

      // Minimal success log (no secrets)
      context.log(`EmailJS send OK (status ${status})`);

      return {
        status,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, data }),
      };
    } catch (err) {
      const status = err?.response?.status || 400;
      const info = err?.response?.data || err.message || "Unknown error";
      context.error?.(info) || console.error(info);

      return {
        status,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: info }),
      };
    }
  },
});

// mailer.js
// New-model Azure Functions (v4) – discovered via app.http(..), no function.json required
const { app } = require("@azure/functions");
const axios = require("axios");

// ---- Env / config -----------------------------------------------------------
const EMAILJS_SERVICE_ID = (process.env.EMAILJS_SERVICE_ID || "").trim();
const EMAILJS_TEMPLATE_ID = (process.env.EMAILJS_TEMPLATE_ID || "").trim();
const EMAILJS_USER_ID     = (process.env.EMAILJS_USER_ID || "").trim();        // public key
const EMAILJS_PRIVATE_KEY = (process.env.EMAILJS_PRIVATE_KEY || "").trim();    // private key (for strict mode)
const EMAILJS_ENDPOINT    = (process.env.EMAILJS_ENDPOINT || "https://api.emailjs.com/api/v1.0/email/send").trim();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// CHANGE: allow commas/spaces or * for “any”, and normalize origin compare
const allowAnyOrigin = ALLOWED_ORIGINS.includes("*");

// ---- Helpers ----------------------------------------------------------------
function corsHeaders(origin) {
  // CHANGE: echo specific origin if allowed (or first configured) – else block
  const allowOrigin =
    allowAnyOrigin ? "*" :
    ALLOWED_ORIGINS.includes(origin) ? origin :
    (ALLOWED_ORIGINS[0] || ""); // empty string -> no CORS header

  const base = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-EmailJS-Access-Token, x-functions-key",
    Vary: "Origin",
  };

  // Only set Allow-Origin if we have a match (or *).
  return allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin, ...base } : base;
}

function assertEnv() {
  const missing = [];
  if (!EMAILJS_SERVICE_ID)  missing.push("EMAILJS_SERVICE_ID");
  if (!EMAILJS_TEMPLATE_ID) missing.push("EMAILJS_TEMPLATE_ID");
  if (!EMAILJS_USER_ID)     missing.push("EMAILJS_PUBLIC_KEY");
  if (missing.length) {
    const err = new Error(`Missing required env var(s): ${missing.join(", ")}`);
    err.status = 500;
    throw err;
  }
}

// CHANGE: small body parser with content-type guard + size cap (basic DoS safety)
async function readJsonBody(req, maxBytes = 256 * 1024) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    throw Object.assign(new Error("Content-Type must be application/json"), { status: 415 });
  }
  
  const text = await req.text();
  if (text.length > maxBytes) {
    throw Object.assign(new Error("Payload too large"), { status: 413 });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

console.log("templateParams received:", templateParams);

// CHANGE: tiny validator for required fields
function validateTemplateParams(params) {
  const { from_name, reply_to, alias, message } = params || {};

  if (!from_name || !reply_to || !alias || !message) {
    const err = new Error("from_name, reply_to, alias, and message are required");
    err.status = 400;
    throw err;
  }
}

// ---- Function (HTTP trigger) ------------------------------------------------
// Function name is "mailer" (visible in portal/CLI). Route defaults to /api/mailer.
// If you prefer /api/contact, add `route: "contact"` in options below.
app.http("mailer", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  // route: "contact", // optional
  handler: async (request, context) => {
    const origin = request.headers.get("origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders(origin) };
    }

    try {
      assertEnv();

      // Parse/validate body
      const body = await readJsonBody(request);
      const templateParams =
        body && typeof body.template_params === "object" ? body.template_params : body || {};

      // Optional normalization (kept minimal): trim outer whitespace
      if (templateParams && typeof templateParams === "object") {
        ["from_name", "reply_to", "alias", "message"].forEach((k) => {
          if (k in templateParams) templateParams[k] = String(templateParams[k] ?? "").trim();
        });
      } // ← MISSING BRACE WAS HERE

      validateTemplateParams(templateParams);

      // Build EmailJS payload (strict-mode compatible)
      const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_USER_ID,                      // public key in body is required
        accessToken: EMAILJS_PRIVATE_KEY || undefined, // helps strict mode for some accounts
        template_params: templateParams,
      };

      // Request headers
      const headersObj = {
        "Content-Type": "application/json",
        // send both headers only if we actually have the private key
        ...(EMAILJS_PRIVATE_KEY ? { Authorization: `Bearer ${EMAILJS_PRIVATE_KEY}` } : {}),
        ...(EMAILJS_PRIVATE_KEY ? { "X-EmailJS-Access-Token": EMAILJS_PRIVATE_KEY } : {}),
      };

      // timeout + explicit error messages from axios
      const { data, status } = await axios.post(EMAILJS_ENDPOINT, payload, {
        headers: headersObj,
        timeout: 15000, // 15s
        validateStatus: () => true, // pass through EmailJS status; we handle below
      });

      if (status >= 200 && status < 300) {
        context.log(`EmailJS send OK (status ${status})`);
        return {
          status,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          body: JSON.stringify({ ok: true, data }),
        };
      } else {
        // Non-2xx from EmailJS
        const errBody = typeof data === "string" ? { message: data } : data;
        throw Object.assign(new Error("EmailJS error"), {
          status: status || 502,
          info: errBody,
        });
      }
    } catch (err) {
      const status = err?.status || err?.response?.status || 400;
      const info = err?.info || err?.response?.data || err?.message || "Unknown error";

      // Use context.log.error directly (no optional chaining call)
      try {
        context.log.error(`mailer error: ${typeof info === "string" ? info : JSON.stringify(info)}`);
      } catch { /* ignore logging failures */ }

      return {
        status,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: info }),
      };
    }
  },
});

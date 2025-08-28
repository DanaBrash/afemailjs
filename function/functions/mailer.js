// function/functions/mailer.js
const { app } = require("@azure/functions");

// ---- Config / env reads (safe at top-level; won't throw) ----
const EMAILJS_ENDPOINT     = process.env.EMAILJS_ENDPOINT || "https://api.emailjs.com/api/v1.0/email/send";
const EMAILJS_SERVICE_ID   = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID  = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_USER_ID      = process.env.EMAILJS_PUBLIC_KEY;   // EmailJS "public key"
const EMAILJS_PRIVATE_KEY  = process.env.EMAILJS_PRIVATE_KEY;  // optional

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

// ---- Helpers ----
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-functions-key, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

async function readJsonBody(request) {
  const ct = request.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("application/json")) return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
}


function validateTemplateParams(params) {
  const { from_name, reply_to, alias, message } = params || {};

  if (!from_name || !reply_to || !alias || !message) {
    const err = new Error("from_name, reply_to, alias, and message are required");
    err.status = 400;
    throw err;
  }
}

// TOP-LEVEL breadcrumb: file loaded
console.log("[mailer] module load start");

app.http("mailer", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    // HANDLER breadcrumb
    console.log("[mailer] handler start");

    // Lazy-require so startup can’t fail if deps were missing in a previous build
    const axios = require("axios");

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

      // Optional normalization (trim whitespace)
      if (templateParams && typeof templateParams === "object") {
        ["from_name", "reply_to", "alias", "message"].forEach((k) => {
          if (k in templateParams) templateParams[k] = String(templateParams[k] ?? "").trim();
        });
      }

      validateTemplateParams(templateParams);

      // Build EmailJS payload (strict-mode compatible)
      const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_USER_ID,                      // public key
        accessToken: EMAILJS_PRIVATE_KEY || undefined, // optional
        template_params: templateParams,
      };

      // Request headers
      const headersObj = {
        "Content-Type": "application/json",
        ...(EMAILJS_PRIVATE_KEY ? { Authorization: `Bearer ${EMAILJS_PRIVATE_KEY}` } : {}),
        ...(EMAILJS_PRIVATE_KEY ? { "X-EmailJS-Access-Token": EMAILJS_PRIVATE_KEY } : {}),
      };

      // Call EmailJS
      const { data, status } = await axios.post(EMAILJS_ENDPOINT, payload, {
        headers: headersObj,
        timeout: 15000,
        validateStatus: () => true, // pass through EmailJS status
      });

      if (status >= 200 && status < 300) {
        context.log(`[mailer] send OK (status ${status})`);
        return {
          status,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          body: JSON.stringify({ ok: true, data }),
        };
      } else {
        const errBody = typeof data === "string" ? { message: data } : data;
        throw Object.assign(new Error("EmailJS error"), {
          status: status || 502,
          info: errBody,
        });
      }
    } catch (err) {
      const status = err?.status || err?.response?.status || 400;
      const info = err?.info || err?.response?.data || err?.message || "Unknown error";
      try {
        context.log.error(`[mailer] error: ${typeof info === "string" ? info : JSON.stringify(info)}`);
      } catch {}
      return {
        status,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: info }),
      };
    }
  },
});

// POST-REGISTRATION breadcrumb
console.log("[mailer] registered");

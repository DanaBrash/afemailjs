// function/functions/mailer.js
const { app } = require("@azure/functions");

// ---------- Config (safe to read at top level) ----------
const EMAILJS_ENDPOINT =
  process.env.EMAILJS_ENDPOINT || "https://api.emailjs.com/api/v1.0/email/send";

// Accept either PUBLIC_KEY or legacy USER_ID for compatibility
const ENV = {
  SERVICE_ID:   process.env.EMAILJS_SERVICE_ID,
  TEMPLATE_ID:  process.env.EMAILJS_TEMPLATE_ID,
  USER_OR_PUB:  process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID,
  PRIVATE_KEY:  process.env.EMAILJS_PRIVATE_KEY || undefined,
};

// ---------- Helpers ----------
function requireEmailJsOrThrow() {
  const missing = [];
  if (!ENV.SERVICE_ID)  missing.push("EMAILJS_SERVICE_ID");
  if (!ENV.TEMPLATE_ID) missing.push("EMAILJS_TEMPLATE_ID");
  if (!ENV.USER_OR_PUB) missing.push("EMAILJS_PUBLIC_KEY or EMAILJS_USER_ID");
  if (missing.length) {
    const e = new Error(`Missing required env var(s): ${missing.join(", ")}`);
    e.status = 500;
    throw e;
  }
  return {
    serviceId: ENV.SERVICE_ID,
    templateId: ENV.TEMPLATE_ID,
    userId:     ENV.USER_OR_PUB,
    privateKey: ENV.PRIVATE_KEY,
  };
}

async function readJsonBody(request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) return {};
  try { return await request.json(); } catch { return {}; }
}

function validateTemplateParams(params) {
  const { from_name, reply_to, alias, message } = params || {};

  if (!from_name || !reply_to || !alias || !message) {
    const err = new Error("from_name, reply_to, alias, and message are required");
    err.status = 400;
    throw err;
  }
}

// ---------- CORS (tight; Postman/curl allowed) ----------
const PROD_ORIGIN_RE = /^https:\/\/(www\.)?tyranny\.sucks$/i;
const DEV_ORIGIN_RE  = /^http:\/\/localhost:(5173|3000|7071)$/;
const isProdEnv = () => !!process.env.WEBSITE_INSTANCE_ID;

function isAllowedOrigin(origin) {
  if (!origin) return false; // browsers should always send Origin; Postman/curl handled separately
  if (PROD_ORIGIN_RE.test(origin)) return true; // Azure: only your prod domain(s)
  if (!isProdEnv() && DEV_ORIGIN_RE.test(origin)) return true; // local dev only
  return false;
}

function corsHeaders(origin, allowed) {
  if (!origin) return {}; // Postman/curl => no CORS headers
  if (allowed) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-functions-key, Authorization",
      "Access-Control-Max-Age": "86400",
    };
  }
  return { "Access-Control-Allow-Origin": "null", "Vary": "Origin" };
}

// ---------- Breadcrumb ----------
console.log("[mailer] module load start");

// ---------- Function registration ----------
app.http("mailer", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    console.log("[mailer] handler start");

    // Detect browser vs Postman/curl
    const origin    = request.headers.get("origin") || "";
    const isBrowser = !!origin;
    const allowed   = isAllowedOrigin(origin);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return isBrowser
        ? (allowed
            ? { status: 204, headers: corsHeaders(origin, true) }
            : { status: 403, headers: corsHeaders(origin, false), body: "CORS: origin not allowed" })
        : { status: 204 }; // non-browser OPTIONS
    }

    // Block disallowed browser requests (Postman/curl allowed)
    if (isBrowser && !allowed) {
      return {
        status: 403,
        headers: corsHeaders(origin, false),
        body: JSON.stringify({ ok: false, error: "CORS: origin not allowed" }),
      };
    }

    // Lazy-require so startup can't fail if deps were missing in some deploy
    const axios = require("axios");

    try {
      // Env sanity
      const { serviceId, templateId, userId, privateKey } = requireEmailJsOrThrow();

      // Body parse / normalize / validate
      const body = await readJsonBody(request);
      const templateParams =
        body && typeof body.template_params === "object" ? body.template_params : body || {};
      if (templateParams && typeof templateParams === "object") {
        ["from_name", "reply_to", "alias", "message"].forEach((k) => {
          if (k in templateParams) templateParams[k] = String(templateParams[k] ?? "").trim();
        });
      }
      validateTemplateParams(templateParams);

      // EmailJS request
      const payload = {
        service_id: serviceId,
        template_id: templateId,
        user_id:    userId,       // public key / user id
        accessToken: privateKey,  // optional
        template_params: templateParams,
      };
      const headersObj = {
        "Content-Type": "application/json",
        ...(privateKey ? { Authorization: `Bearer ${privateKey}` } : {}),
        ...(privateKey ? { "X-EmailJS-Access-Token": privateKey } : {}),
      };

      // Call EmailJS
      const { data, status: httpStatus } = await axios.post(EMAILJS_ENDPOINT, payload, {
        headers: headersObj,
        timeout: 15000,
        validateStatus: () => true, // pass through EmailJS status
      });

      if (httpStatus >= 200 && httpStatus < 300) {
        context.log(`[mailer] send OK (status ${httpStatus})`);
        return {
          status: httpStatus,
          headers: isBrowser
            ? { ...corsHeaders(origin, true), "Content-Type": "application/json" }
            : { "Content-Type": "application/json" },
          body: JSON.stringify({ ok: true, data }),
        };
      }

      // Non-2xx from EmailJS
      const errBody = typeof data === "string" ? { message: data } : data;
      throw Object.assign(new Error("EmailJS error"), {
        status: httpStatus || 502,
        info: errBody,
      });
    } catch (err) {
      const httpStatus = err?.status || err?.response?.status || 400;
      const info = err?.info || err?.response?.data || err?.message || "Unknown error";
      try {
        context.log.error(`[mailer] error: ${typeof info === "string" ? info : JSON.stringify(info)}`);
      } catch {}
      return {
        status: httpStatus,
        headers: isBrowser
          ? { ...corsHeaders(origin, allowed), "Content-Type": "application/json" }
          : { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: info }),
      };
    }
  },
});

console.log("[mailer] registered");

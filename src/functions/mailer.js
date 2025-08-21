const { app } = require("@azure/functions");
const axios = require("axios");

// Environment vars from local.settings.json or Azure App Config
const EMAILJS_SERVICE_ID = (process.env.EMAILJS_SERVICE_ID || "").trim();
const EMAILJS_TEMPLATE_ID = (process.env.EMAILJS_TEMPLATE_ID || "").trim();
const EMAILJS_USER_ID = (process.env.EMAILJS_USER_ID || "").trim();
const EMAILJS_PRIVATE_KEY = (process.env.EMAILJS_PRIVATE_KEY || "").trim();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim());
const EMAILJS_ENDPOINT =
  process.env.EMAILJS_ENDPOINT || "https://api.emailjs.com/api/v1.0/email/send";

// Build headers dynamically
function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (EMAILJS_PRIVATE_KEY.length > 0) {
    // IMPORTANT: exact casing "Authorization"
    headers.Authorization = `Bearer ${EMAILJS_PRIVATE_KEY}`;
  }
  return headers;
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-functions-key",
    Vary: "Origin",
  };
}

app.http("mailer", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function", // requires function key
  handler: async (request, context) => {
    const origin = request.headers.get("origin") || "";

    // Handle preflight
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders(origin) };
    }

    try {
      const body = await request.json();

      const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_USER_ID, // keep this even with private key
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: body.template_params || {},
      };

      context.log("Payload to EmailJS:", JSON.stringify(payload, null, 2));
      context.log(
        "ENV flags — service?",
        !!EMAILJS_SERVICE_ID,
        "template?",
        !!EMAILJS_TEMPLATE_ID,
        "public?",
        !!EMAILJS_USER_ID,
        "private?",
        !!EMAILJS_PRIVATE_KEY
      );

      // build payload above ...

      // 🔹 Inline header construction
      const authHeader = EMAILJS_PRIVATE_KEY
        ? `Bearer ${EMAILJS_PRIVATE_KEY}`
        : "";

      context.log("Auth header will be sent: BOOL", !!authHeader);
      context.log("Auth header will be sent: LENGTH", authHeader.length > 0);
      context.log("Auth header will be sent: VALUE", authHeader);

      if (authHeader) {
        const masked = authHeader.slice(0, 14) + "..." + authHeader.slice(-4);
        context.log("Auth header (masked):", masked);
      }

      const headersObj = {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        "X-EmailJS-Access-Token": EMAILJS_PRIVATE_KEY,
      };

      context.log(
        "Outgoing headers (masked):",
        JSON.stringify({
          "Content-Type": headersObj["Content-Type"],
          Authorization: headersObj.Authorization
            ? headersObj.Authorization.slice(0, 14) +
              "..." +
              headersObj.Authorization.slice(-4)
            : null,
        })
      );

      if (!headersObj.Authorization) {
        return {
          status: 500,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
          body: {
            ok: false,
            error:
              "No Authorization header built — check EMAILJS_PRIVATE_KEY and restart func host.",
          },
        };
      }

      const { data, status } = await axios.post(EMAILJS_ENDPOINT, payload, {
        headers: headersObj,
      });

      context.log("POSTing to:", EMAILJS_ENDPOINT);
      context.log(
        "Headers about to send (masked):",
        JSON.stringify({
          "Content-Type": headersObj["Content-Type"],
          Authorization: headersObj.Authorization
            ? headersObj.Authorization.slice(0, 14) +
              "..." +
              headersObj.Authorization.slice(-4)
            : null,
        })
      );

      context.log("EmailJS response status:", status);
      context.log("EmailJS response data:", data);

      return {
        status,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, data }),
      };
    } catch (err) {
      console.error(
        "EmailJS error:",
        err.response?.status,
        err.response?.data || err.message
      );

      return {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: err.message }),
      };
    }
  },
});

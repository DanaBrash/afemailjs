// function/index.js
console.log("[bootstrap] loading functions/mailer.js");
try {
  require("./functions/mailer.js"); // NOTE: path is case-sensitive on Linux
  console.log("[bootstrap] loaded functions/mailer.js");
} catch (err) {
  console.error("[bootstrap] FAILED to load functions/mailer.js:", err?.stack || err);
}

const { app } = require("@azure/functions");
app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, body: "ok" }),
});

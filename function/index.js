// function/index.js
try {
  require("./functions/mailer.js");
  console.log("[bootstrap] mailer.js loaded");
} catch (err) {
  console.error("[bootstrap] FAILED to load functions/mailer.js:", err);
}

const { app } = require("@azure/functions");
app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, body: "ok" }),
});

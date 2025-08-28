// function/index.js
try {
  console.log("[bootstrap] loading functions/mailer.js");
  require("./functions/mailer.js");
  console.log("[bootstrap] loaded functions/mailer.js");
} catch (err) {
  console.error("[bootstrap] FAILED to load functions/mailer.js:", err);
}

const { app } = require("@azure/functions");
app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, body: "ok" }),
});

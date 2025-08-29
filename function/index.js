const { app } = require("@azure/functions");

// health at /health
app.http("health", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, body: "ok" }),
});


  console.log("[bootstrap] loading functions/mailer.js");
  require("./functions/mailer.js");   // this executes mailer.js and registers "mailer"
  console.log("[bootstrap] loaded functions/mailer.js");

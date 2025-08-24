// Root entrypoint for the Functions host.
// Require any files that register handlers via app.http(...).
require("./functions/mailer.js");

// Optional: a tiny health function to prove discovery works.
// If this registers but mailer doesn't, the error is inside mailer.js.
const { app } = require("@azure/functions");
app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, body: "ok" }),
});

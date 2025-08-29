const { app } = require("@azure/functions");

// health at /health
app.http("health", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, body: "ok" }),
});

// mailer stays at /api/mailer (even with empty routePrefix)
app.http("mailer", {
  route: "api/mailer",
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  handler: async (request, context) => {
    // ...your existing code...
  },
});
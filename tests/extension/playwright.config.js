// Pruebas de la extensión: npm run test:extension
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: __dirname,
  timeout: 120000,
  workers: 1,
  reporter: [["list"]],
});

import { defineConfig, devices } from "@playwright/test";

const nextStartCommand = `"${process.execPath}" ./node_modules/next/dist/bin/next start --port 3107 --hostname 127.0.0.1`;

export default defineConfig({
  testDir: "./tests/e2e",
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3107",
    trace: "retain-on-failure"
  },
  webServer: {
    command: nextStartCommand,
    url: "http://127.0.0.1:3107",
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] }
    }
  ]
});

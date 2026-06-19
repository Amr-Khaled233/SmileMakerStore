// pm2 process definition — run with: pm2 start ecosystem.config.cjs
// Keeps the API server alive, restarts on crash, and starts on server boot
// (after `pm2 save` + `pm2 startup`). Environment comes from the .env file,
// which the server loads via "dotenv/config".
module.exports = {
  apps: [
    {
      name: "smilemaker",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: "400M",
    },
  ],
};

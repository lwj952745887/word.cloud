// ═══════════════════════════════════════════════════════════════
// Word Cloud - PM2 Ecosystem Configuration
// ═══════════════════════════════════════════════════════════════
// PM2 manages the Node.js backend process with auto-restart.
// Usage: pm2 start ecosystem.config.js
// ═══════════════════════════════════════════════════════════════

module.exports = {
  apps: [{
    name: 'word-cloud-server',
    script: 'server/index.js',
    cwd: '/opt/word-cloud',

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },

    // Process management
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',

    // Auto-restart on crash
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,

    // Logging
    error_file: '/var/log/word-cloud/error.log',
    out_file: '/var/log/word-cloud/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true
  }]
};

const path = require('node:path')

const deployPath = process.env.DEPLOY_PATH || '/var/www/info_platform'
const appPort = process.env.APP_PORT || '3000'

module.exports = {
  apps: [
    {
      name: 'info-platform',
      cwd: path.join(deployPath, 'current'),
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env_file: path.join(deployPath, '.env'),
      env: {
        NODE_ENV: 'production',
        PORT: appPort,
        HOST: '127.0.0.1',
      },
      max_memory_restart: '512M',
      autorestart: true,
    },
  ],
}

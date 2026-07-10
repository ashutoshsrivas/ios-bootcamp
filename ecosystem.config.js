// PM2 process definitions. Run from the repo root:  pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'bootcamp-api',
      cwd: './backend',
      script: 'src/server.js',
      env: { NODE_ENV: 'production' },
      max_restarts: 10,
    },
    {
      name: 'bootcamp-web',
      cwd: './frontend',
      // Port 3100 (3000 is used by the existing iosform app). Serves under basePath /bootcamp.
      script: './node_modules/.bin/next',
      args: 'start -p 3100',
      env: { NODE_ENV: 'production' },
      max_restarts: 10,
    },
  ],
};

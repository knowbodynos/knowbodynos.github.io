module.exports = {
  apps: [
    {
      name: "homepage",
      cwd: "/var/www/homepage",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
      },
      env_file: "/var/www/homepage/.env.production",
      time: true,
    },
  ],
};
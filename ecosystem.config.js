module.exports = {
  apps: [
    {
      name: 'kose',
      script: 'app.js',
      cwd: __dirname,
      watch: ['app.js', 'config', 'middleware', 'models', 'routes', 'utils', 'views'],
      watch_options: {
        followSymlinks: false,
        usePolling: false,
      },
      ignore_watch: [
        'node_modules',
        'public',
        '.git',
        'kose-mcp',
        '*.log',
      ],
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}

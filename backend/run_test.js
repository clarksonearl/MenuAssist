const { spawn } = require('child_process');

const testProcess = spawn('node', ['tightnessCheck.test.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

testProcess.on('close', (code) => {
  process.exit(code);
});


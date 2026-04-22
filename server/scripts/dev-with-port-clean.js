import { execSync, spawn } from 'node:child_process';
import process from 'node:process';

const PORT = Number(process.env.PORT || 4000);

function killPortWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } catch {
        // Ignore if process exits between discovery and kill.
      }
    }
  } catch {
    // No listener on the port, which is fine.
  }
}

function killPortUnix(port) {
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: 'ignore' });
  } catch {
    // No listener on the port, which is fine.
  }
}

if (process.platform === 'win32') {
  killPortWindows(PORT);
} else {
  killPortUnix(PORT);
}

const child = spawn(process.execPath, ['--watch', 'src/index.js'], {
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Function to wait for the port file and read it
async function waitForPortFile(timeout = 10000) {
  const portFile = path.join(process.cwd(), '.logui-port');
  const startTime = Date.now();
  
  console.log('[DEV] Waiting for server to start and write port file...');
  
  while (Date.now() - startTime < timeout) {
    try {
      if (fs.existsSync(portFile)) {
        const port = fs.readFileSync(portFile, 'utf8').trim();
        console.log('[DEV] Found server port:', port);
        return port;
      }
    } catch (error) {
      // File might be being written, continue waiting
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('Timeout waiting for server port file');
}

// Function to start the dev servers
function startDevServers() {
  console.log('[DEV] Starting development servers...');
  
  const devProcess = spawn('npm', ['run', 'dev:concurrent'], {
    stdio: 'inherit',
    shell: true
  });
  
  return devProcess;
}

// Function to open browser with correct port
async function openBrowserWithPort() {
  try {
    // Wait for the server port
    const serverPort = await waitForPortFile();
    
    // Try common Vite ports (5173, 5174, 5175, etc.)
    const vitePort = process.env.VITE_PORT || '5173';
    
    // Open browser with server_port query parameter
    const url = `http://localhost:${vitePort}?server_port=${serverPort}`;
    console.log('[DEV] Opening browser:', url);
    console.log('[DEV] If this fails, the Vite server might be on a different port. Check the Vite output above.');
    
    // Use dynamic import for ES module
    const { default: open } = await import('open');
    await open(url);
    console.log('[DEV] Browser opened successfully!');
    
  } catch (error) {
    console.error('[DEV] Failed to open browser:', error.message);
    console.log('[DEV] You can manually open the URL shown in Vite output with ?server_port=<server_port> added');
  }
}

// Main function
async function main() {
  // Start the dev servers
  const devProcess = startDevServers();
  
  // Wait a bit for servers to initialize, then open browser
  setTimeout(() => {
    openBrowserWithPort();
  }, 2000);
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('[DEV] Shutting down...');
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
}

main().catch(error => {
  console.error('[DEV] Error:', error);
  process.exit(1);
});
#!/usr/bin/env node

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🧪 Testing LogUI package installation...\n')

// Step 1: Build the package
console.log('📦 Building package...')
const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' })

buildProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed')
    process.exit(1)
  }
  
  // Step 2: Create npm pack
  console.log('\n📦 Creating package tarball...')
  const packProcess = spawn('npm', ['pack'], { stdio: 'pipe' })
  
  let packOutput = ''
  packProcess.stdout.on('data', (data) => {
    packOutput += data.toString()
  })
  
  packProcess.on('exit', (packCode) => {
    if (packCode !== 0) {
      console.error('❌ Packing failed')
      process.exit(1)
    }
    
    const tarballName = packOutput.trim()
    console.log(`✅ Package created: ${tarballName}`)
    
    // Step 3: Test installation locally
    console.log('\n🔄 Testing local installation...')
    console.log('Note: This will install the package globally for testing')
    console.log('You may need to run `npm uninstall -g logui` afterwards\n')
    
    const installProcess = spawn('npm', ['install', '-g', tarballName], { 
      stdio: 'inherit'
    })
    
    installProcess.on('exit', (installCode) => {
      if (installCode === 0) {
        console.log('\n✅ Installation successful!')
        console.log('🎯 Try running: logui --help')
        console.log('🎬 Or try the demo: logui --demo')
        console.log('\n🧹 Cleanup: run `npm uninstall -g log-ui` to remove the test install')
      } else {
        console.error('\n❌ Installation failed')
        process.exit(1)
      }
      
      // Cleanup tarball
      try {
        fs.unlinkSync(tarballName)
        console.log(`🗑️  Removed ${tarballName}`)
      } catch (error) {
        // Ignore cleanup errors
      }
    })
  })
})
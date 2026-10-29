import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execPromise = promisify(exec)

// Check if we're running in a Docker container
const isDocker = async () => {
  try {
    await fs.access('/.dockerenv')
    return true
  } catch {
    try {
      const cgroup = await fs.readFile('/proc/self/cgroup', 'utf8')
      return cgroup.includes('docker')
    } catch {
      return false
    }
  }
}

export async function GET() {
  try {
    // Get the project root directory
    const rootDir = process.cwd()
    
    // Path to the debug script
    const scriptPath = path.join(rootDir, 'debug_crawl4ai.sh')
    
    console.log(`Executing debug script: ${scriptPath}`)
    
    // Check if the script exists
    try {
      await fs.access(scriptPath)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `Debug script not found at ${scriptPath}`,
        output: null
      }, { status: 404 })
    }
    
    // Check if we're in Docker
    const dockerEnvironment = await isDocker()
    
    // Choose the appropriate command based on environment
    let command = `bash ${scriptPath}`
    if (dockerEnvironment) {
      // In Docker, use sh instead of bash if available
      command = `sh ${scriptPath}`
    }
    
    console.log(`Using command: ${command} in environment: ${dockerEnvironment ? 'Docker' : 'Host'}`)
    
    // Execute the debug script
    const { stdout, stderr } = await execPromise(command, {
      cwd: rootDir,
      timeout: 30000, // 30 seconds timeout
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
      shell: dockerEnvironment ? '/bin/sh' : '/bin/bash'
    })
    
    // If there's an error in stderr, include it in the response
    if (stderr) {
      console.warn('Debug script stderr:', stderr)
    }
    
    return NextResponse.json({
      success: true,
      output: stdout,
      error: stderr || null
    })
  } catch (error) {
    console.error('Error executing debug script:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to execute debug script',
        output: null
      },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const scriptName = searchParams.get('name')
    
    if (!scriptName) {
      return NextResponse.json(
        { success: false, error: 'Script name is required' },
        { status: 400 }
      )
    }
    
    // Validate script name to prevent directory traversal
    if (scriptName.includes('/') || scriptName.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Invalid script name' },
        { status: 400 }
      )
    }
    
    // Get the project root directory
    const rootDir = process.cwd()
    
    // Path to the script
    const scriptPath = path.join(rootDir, scriptName)
    
    console.log(`Fetching script content: ${scriptPath}`)
    
    // Check if the script exists
    try {
      await fs.access(scriptPath)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: `Script not found: ${scriptName}` },
        { status: 404 }
      )
    }
    
    // Read the script content
    const content = await fs.readFile(scriptPath, 'utf-8')
    
    return NextResponse.json({
      success: true,
      content
    })
  } catch (error) {
    console.error('Error fetching script content:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch script content'
      },
      { status: 500 }
    )
  }
}
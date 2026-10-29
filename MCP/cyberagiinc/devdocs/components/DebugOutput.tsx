'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui"
import RefreshIcon from '@mui/icons-material/Refresh'
import BugReportIcon from '@mui/icons-material/BugReport'
import CodeIcon from '@mui/icons-material/Code'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

export default function DebugOutput() {
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [scriptContent, setScriptContent] = useState<string | null>(null)
  const [showScript, setShowScript] = useState(false)

  // Function to fetch the script content
  const fetchScriptContent = async () => {
    try {
      const response = await fetch('/api/script-content?name=debug_crawl4ai.sh')
      
      if (!response.ok) {
        console.error('Failed to fetch script content:', response.statusText)
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.content) {
        setScriptContent(data.content)
      } else {
        console.error('Invalid script content response:', data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error fetching script content:', error)
    }
  }

  const fetchDebugOutput = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/debug')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch debug output')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to execute debug script')
      }
      
      setOutput(data.output || 'No output returned')
      if (data.error) {
        setError(data.error)
      }
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching debug output:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch debug output')
      setOutput('')
      
      // If we failed to execute the script, try to fetch the script content
      if (!scriptContent) {
        fetchScriptContent()
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle between script view and output view
  const toggleScriptView = () => {
    setShowScript(!showScript)
  }

  // Fetch debug output on initial load
  useEffect(() => {
    fetchDebugOutput()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BugReportIcon className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-medium text-amber-400">Debug Output</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          
          {scriptContent && (
            <Button
              onClick={toggleScriptView}
              variant="outline"
              size="sm"
              className="h-8 bg-gray-800/50 hover:bg-gray-700/50 border-gray-700"
            >
              {showScript ? (
                <>
                  <PlayArrowIcon className="w-4 h-4 mr-1" />
                  Show Output
                </>
              ) : (
                <>
                  <CodeIcon className="w-4 h-4 mr-1" />
                  View Script
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={fetchDebugOutput}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="h-8 bg-gray-800/50 hover:bg-gray-700/50 border-gray-700"
          >
            <RefreshIcon className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 h-96 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full"></div>
            <span className="text-gray-400">Executing debug script...</span>
          </div>
        </div>
      ) : showScript && scriptContent ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 h-96 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="text-green-400 font-semibold">Script Content: debug_crawl4ai.sh</div>
            <div className="text-xs text-gray-400">This is the script that would be executed</div>
          </div>
          <pre className="text-green-300 text-sm whitespace-pre-wrap font-mono">{scriptContent}</pre>
        </div>
      ) : error ? (
        <div className="bg-gray-900/50 border border-red-900/50 rounded-lg p-4 h-96 overflow-auto">
          <div className="text-red-400 mb-2 font-semibold">Error:</div>
          <pre className="text-red-300 text-sm whitespace-pre-wrap font-mono">{error}</pre>
          {output && (
            <>
              <div className="text-amber-400 mt-4 mb-2 font-semibold">Output:</div>
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">{output}</pre>
            </>
          )}
          {scriptContent && !showScript && (
            <div className="mt-4 mb-2">
              <Button
                onClick={toggleScriptView}
                variant="outline"
                size="sm"
                className="bg-gray-800/50 hover:bg-gray-700/50 border-gray-700"
              >
                <CodeIcon className="w-4 h-4 mr-1" />
                View Script Content
              </Button>
              <span className="text-gray-400 text-xs ml-2">
                The script couldn't be executed, but you can view its content
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 h-96 overflow-auto">
          <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">{output}</pre>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui"
import MCPServerStatus from '@/components/MCPServerStatus'
import DebugOutput from '@/components/DebugOutput'
import SettingsIcon from '@mui/icons-material/Settings'

export default function ConfigSettings() {
  const [isOpen, setIsOpen] = useState(false)

  const togglePopup = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <Button
        onClick={togglePopup}
        variant="outline"
        className="fixed bottom-4 right-4 h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700 border-gray-700 shadow-lg z-50"
        title="Config and Settings"
      >
        <SettingsIcon className="w-5 h-5 text-gray-300" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={togglePopup}
          />
          
          {/* Popup */}
          <div className="fixed inset-10 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl z-50 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-white">Config and Settings</h2>
                <Button
                  onClick={togglePopup}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 rounded-full bg-gray-800 hover:bg-gray-700 border-gray-700"
                >
                  ✕
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 shadow-lg">
                  <h3 className="text-xl font-semibold mb-4 text-white">MCP Server</h3>
                  <MCPServerStatus />
                </div>
                
                <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 shadow-lg">
                  <DebugOutput />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
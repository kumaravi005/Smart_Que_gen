import React from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'

export const NetworkIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isOnline } = useNetworkStatus()

  if (compact) {
    return (
      <span
        title={isOnline ? 'Online (Connected)' : 'Offline Mode (IndexedDB Active)'}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </span>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        isOnline
          ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200'
          : 'bg-amber-50/90 text-amber-900 border-amber-300 shadow-sm'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
          <span className="font-semibold">Offline Mode (IndexedDB Active)</span>
        </>
      )}
    </div>
  )
}

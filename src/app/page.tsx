'use client'

import dynamic from 'next/dynamic'

const App = dynamic(() => import('./App'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-white text-xl">Chargement...</div>
    </div>
  )
})

export default function Page() {
  return <App />
}
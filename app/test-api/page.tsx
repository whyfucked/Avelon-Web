"use client"

import { useState } from "react"

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testRegister = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test${Date.now()}@example.com`,
          password: 'Test1234',
          name: 'Test User',
        }),
      })
      const data = await res.json()
      setResult({ status: res.status, data })
    } catch (error: any) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  const testPromo = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/promo/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'TEST',
          type: 'discount',
          amount: 100,
        }),
      })
      const data = await res.json()
      setResult({ status: res.status, data })
    } catch (error: any) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  const testHeaders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/debug/headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      })
      const data = await res.json()
      setResult({ status: res.status, data })
    } catch (error: any) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Test Page</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={testHeaders}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Headers
          </button>
          
          <button
            onClick={testRegister}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-4"
          >
            Test Register
          </button>
          
          <button
            onClick={testPromo}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 ml-4"
          >
            Test Promo
          </button>
        </div>

        {loading && <p className="text-muted-foreground">Loading...</p>}

        {result && (
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Result:</h2>
            <pre className="bg-muted p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

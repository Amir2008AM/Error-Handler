'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import TestPanel from '@/app/internal/dev-test/panel'

/**
 * Developer Dashboard — Full operational UI for:
 * - Auto-discovered tools list
 * - Real tool enable/disable controls
 * - File testing with pipeline visualization
 * - Verify Fix system (auto-stored failure state comparison)
 * - Diagnostics inspection
 * - Real-time status
 */

interface Tool {
  id: string
  name: string
  slug: string
  description: string
  category: string
  icon: string
  enabled: boolean
  isDisabled: boolean
}

interface DashboardState {
  tools: Tool[]
  selectedTool: Tool | null
  loading: boolean
  error: string | null
  togglingTool: string | null
  testInProgress: boolean
  lastFailure: Record<string, any>
}

const C = {
  bg: '#0d0f14',
  sidebar: '#0f1118',
  card: '#141720',
  border: '#1e2235',
  text: '#e2e8f0',
  muted: '#6b7280',
  accent: '#6366f1',
  ok: '#22c55e',
  fail: '#ef4444',
  warn: '#f59e0b',
}

export default function DeveloperDashboard() {
  const [state, setState] = useState<DashboardState>({
    tools: [],
    selectedTool: null,
    loading: true,
    error: null,
    togglingTool: null,
    testInProgress: false,
    lastFailure: {},
  })

  // Fetch tools on mount
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch('/api/internal/dashboard', {
          method: 'GET',
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to fetch tools')
        const data = await res.json()
        setState((prev) => ({
          ...prev,
          tools: data.tools || [],
          selectedTool: data.tools?.[0] || null,
          loading: false,
        }))
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: String(err),
          loading: false,
        }))
      }
    }
    fetchTools()
  }, [])

  const handleToggleTool = useCallback(async (tool: Tool) => {
    setState((prev) => ({ ...prev, togglingTool: tool.slug }))
    try {
      const res = await fetch('/api/internal/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          toolSlug: tool.slug,
          enabled: !tool.enabled,
        }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Toggle failed')
      setState((prev) => ({
        ...prev,
        tools: prev.tools.map((t) =>
          t.slug === tool.slug ? { ...t, enabled: !t.enabled } : t
        ),
        togglingTool: null,
      }))
    } catch (err) {
      setState((prev) => ({ ...prev, error: String(err), togglingTool: null }))
    }
  }, [])

  const handleSelectTool = useCallback((tool: Tool) => {
    setState((prev) => ({ ...prev, selectedTool: tool }))
  }, [])

  if (state.loading) {
    return (
      <div style={{ background: C.bg, color: C.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Loading Dashboard...</div>
          <div style={{ fontSize: 12, color: C.muted }}>Discovering tools and loading configuration</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 280, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Developer Dashboard</div>
          <div style={{ fontSize: 11, color: C.muted }}>Tool Management</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: '8px' }}>
            {state.tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleSelectTool(tool)}
                style={{
                  padding: '10px 12px',
                  margin: '4px 0',
                  cursor: 'pointer',
                  borderRadius: 8,
                  background: state.selectedTool?.id === tool.id ? `${C.accent}20` : 'transparent',
                  border: state.selectedTool?.id === tool.id ? `1px solid ${C.accent}` : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: tool.enabled ? C.ok : C.fail, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tool.name}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>{tool.category}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
          {state.tools.filter((t) => t.enabled).length} / {state.tools.length} enabled
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {state.selectedTool?.name || 'Select a Tool'}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {state.selectedTool?.description || 'Choose a tool from the sidebar'}
              </div>
            </div>
            {state.selectedTool && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 6,
                    background: state.selectedTool.enabled ? `${C.ok}20` : `${C.fail}20`,
                    color: state.selectedTool.enabled ? C.ok : C.fail,
                  }}
                >
                  {state.selectedTool.enabled ? '✓ ENABLED' : '✗ DISABLED'}
                </span>
                <button
                  onClick={() => handleToggleTool(state.selectedTool!)}
                  disabled={state.togglingTool === state.selectedTool.slug}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: state.selectedTool.enabled ? C.fail : C.ok,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: state.togglingTool === state.selectedTool.slug ? 'not-allowed' : 'pointer',
                    opacity: state.togglingTool === state.selectedTool.slug ? 0.6 : 1,
                  }}
                >
                  {state.togglingTool === state.selectedTool.slug
                    ? 'Updating...'
                    : state.selectedTool.enabled
                      ? 'Disable Tool'
                      : 'Enable Tool'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content area with test panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {state.selectedTool ? (
            <TestPanel selectedToolId={state.selectedTool.slug} />
          ) : (
            <div style={{ textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No tool selected</div>
              <div>Select a tool from the sidebar to begin testing</div>
            </div>
          )}
        </div>
      </div>

      {/* Error notification */}
      {state.error && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            background: C.fail,
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 12,
            maxWidth: 300,
          }}
        >
          {state.error}
        </div>
      )}
    </div>
  )
}

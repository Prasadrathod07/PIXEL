'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'pixel-accent-color'

const COLORS = [
  { id: 'blue',   label: 'Blue',   value: 'hsl(217 91% 60%)', fg: 'hsl(222 47% 6%)' },
  { id: 'purple', label: 'Purple', value: 'hsl(262 83% 65%)', fg: 'hsl(0 0% 100%)' },
  { id: 'green',  label: 'Green',  value: 'hsl(142 71% 48%)', fg: 'hsl(0 0% 100%)' },
  { id: 'orange', label: 'Orange', value: 'hsl(25 95% 58%)',  fg: 'hsl(0 0% 100%)' },
  { id: 'rose',   label: 'Rose',   value: 'hsl(347 77% 60%)', fg: 'hsl(0 0% 100%)' },
  { id: 'cyan',   label: 'Cyan',   value: 'hsl(189 94% 45%)', fg: 'hsl(222 47% 6%)' },
]

function applyColor(value: string, fg: string) {
  document.documentElement.style.setProperty('--primary', value)
  document.documentElement.style.setProperty('--ring', value)
  document.documentElement.style.setProperty('--primary-foreground', fg)
}

export function ThemeColorPicker() {
  const [active, setActive] = useState('blue')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? 'blue'
    const color = COLORS.find(c => c.id === saved) ?? COLORS[0]
    setActive(color.id)
    applyColor(color.value, color.fg)
  }, [])

  const select = (color: typeof COLORS[0]) => {
    setActive(color.id)
    setOpen(false)
    localStorage.setItem(STORAGE_KEY, color.id)
    applyColor(color.value, color.fg)
  }

  const current = COLORS.find(c => c.id === active) ?? COLORS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Change accent color"
        className="w-7 h-7 rounded-full border-2 border-border hover:border-primary/50 transition-all duration-150 shrink-0"
        style={{ backgroundColor: current.value }}
      />
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Popover */}
          <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl p-3 shadow-xl flex flex-col gap-2 w-40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Accent Color
            </p>
            <div className="grid grid-cols-3 gap-2">
              {COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => select(color)}
                  title={color.label}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all duration-150 mx-auto',
                    active === color.id
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105 hover:border-border'
                  )}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

"use client"

import * as React from "react"
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface AsyncSearchOption {
  id: string | number
  label: string
}

interface AsyncSearchSelectProps<T extends AsyncSearchOption> {
  value?: string
  onValueChange: (value: string | undefined) => void
  /** Fires against the backend once the query reaches `minChars`. */
  getOptions: (search: string) => Promise<T[]>
  /** Static display label when a value is set without live options (edit mode). */
  selectedLabel?: string
  /**
   * When provided, options are shown immediately on open without requiring a
   * typed search; typing filters the preloaded list client-side instead of
   * hitting the server.
   */
  preloadedOptions?: T[]
  placeholder?: string
  searchPlaceholder?: string
  minChars?: number
  debounceMs?: number
  disabled?: boolean
  emptyMessage?: string
  notFoundMessage?: string
  className?: string
}

/**
 * Reusable server-side search select (shadcn-styled, radix Popover based).
 * Typing `minChars`+ characters debounces a fetch via `getOptions` and renders
 * the results below the search input. Designed for large option sets (e.g.
 * picking a Head of Department from thousands of staff) where loading every
 * option up-front is not an option.
 */
export function AsyncSearchSelect<T extends AsyncSearchOption>({
  value,
  onValueChange,
  getOptions,
  selectedLabel,
  preloadedOptions,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  minChars = 2,
  debounceMs = 300,
  disabled = false,
  emptyMessage,
  notFoundMessage = "No results found.",
  className,
}: AsyncSearchSelectProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<AsyncSearchOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [pickedLabel, setPickedLabel] = React.useState<string | undefined>(
    undefined
  )
  const inputRef = React.useRef<HTMLInputElement>(null)

  const term = search.trim()
  const hasPreloaded = preloadedOptions !== undefined
  const visibleOptions = hasPreloaded
    ? term
      ? preloadedOptions.filter((option) =>
          option.label.toLowerCase().includes(term.toLowerCase())
        )
      : preloadedOptions
    : options
  const display = pickedLabel ?? selectedLabel

  React.useEffect(() => {
    if (!open || hasPreloaded || term.length < minChars) {
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      setHasError(false)
      getOptions(term)
        .then((next) => {
          if (cancelled) return
          setOptions(next)
          setHighlightedIndex(next.length > 0 ? 0 : -1)
        })
        .catch(() => {
          if (!cancelled) setHasError(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, term, minChars, debounceMs, getOptions, hasPreloaded])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setSearch("")
      setOptions([])
      setLoading(false)
      setHasError(false)
      setHighlightedIndex(visibleOptions.length > 0 ? 0 : -1)
    } else {
      setHighlightedIndex(-1)
    }
  }

  function selectOption(option: AsyncSearchOption) {
    setPickedLabel(option.label)
    setOpen(false)
    onValueChange(String(option.id))
    inputRef.current?.blur()
  }

  function clearValue() {
    setPickedLabel(undefined)
    onValueChange(undefined)
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlightedIndex((index) =>
        visibleOptions.length === 0 ? -1 : (index + 1) % visibleOptions.length
      )
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlightedIndex((index) =>
        visibleOptions.length === 0
          ? -1
          : (index - 1 + visibleOptions.length) % visibleOptions.length
      )
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (visibleOptions[highlightedIndex]) {
        selectOption(visibleOptions[highlightedIndex])
      }
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={false}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between gap-2 px-3 font-normal",
            !display && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{display ?? placeholder}</span>
          {value ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                clearValue()
              }}
              className="grid shrink-0 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </span>
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        align="start"
        sideOffset={6}
        className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={searchPlaceholder}
            className="h-8 border-transparent px-0 focus-visible:border-transparent focus-visible:ring-0"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-72">
          {loading && !hasPreloaded ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : hasError ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              {emptyMessage ?? "Something went wrong. Please try again."}
            </div>
          ) : visibleOptions.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              {hasPreloaded
                ? (emptyMessage ?? "No options available.")
                : notFoundMessage}
            </div>
          ) : (
            <div role="listbox" className="p-1">
              {visibleOptions.map((option, index) => {
                const selected = option.id === value
                const highlighted = index === highlightedIndex
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none select-none",
                      highlighted && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {selected && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}

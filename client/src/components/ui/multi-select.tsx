"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"

export interface MultiSelectProps {
  value?: string[]
  onValueChange?: (value: string[]) => void
  options: {
    label: string
    value: string
    disabled?: boolean
  }[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  value = [],
  onValueChange,
  options,
  placeholder = "Select options...",
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedItems = options.filter((option) => value.includes(option.value))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onValueChange?.(value.filter((v) => v !== item.value))
                  }}
                >
                  {item.label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No option found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  onValueChange?.(
                    value.includes(option.value)
                      ? value.filter((v) => v !== option.value)
                      : [...value, option.value]
                  )
                }}
                disabled={option.disabled}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// For backwards compatibility
export const MultiSelectTrigger = PopoverTrigger
export const MultiSelectContent = PopoverContent
export const MultiSelectItem = CommandItem
export const MultiSelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>((props, ref) => (
  <span {...props} ref={ref} className={cn("text-sm", props.className)} />
))
MultiSelectValue.displayName = "MultiSelectValue"
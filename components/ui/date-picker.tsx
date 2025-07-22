"use client"

import * as React from "react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  className,
  placeholder = "בחר תאריך",
  disabled = false,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal rtl:text-right rtl:justify-end",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
          {date ? (
            format(date, "dd/MM/yyyy")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={disabled}
          captionLayout="dropdown"
          initialFocus
          formatters={{
            formatCaption: (date) => format(date, 'MMMM yyyy', { locale: he }),
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

interface MonthYearPickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  className?: string
  disabled?: boolean
}

export function MonthYearPicker({
  date,
  onDateChange,
  className,
  disabled = false,
}: MonthYearPickerProps) {
  const displayText = date ? format(date, 'MMMM yyyy', { locale: he }) : 'בחר חודש ושנה'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[200px] justify-start text-left font-normal rtl:text-right rtl:justify-end",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
          <span>{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={disabled}
          captionLayout="dropdown"
          initialFocus
          formatters={{
            formatCaption: (date) => format(date, 'MMMM yyyy', { locale: he }),
          }}
        />
      </PopoverContent>
    </Popover>
  )
} 
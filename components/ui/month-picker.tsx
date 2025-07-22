"use client"

import * as React from "react"
import { format, startOfMonth, isBefore, isSameMonth, addMonths, subMonths } from "date-fns"
import { he } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface MonthPickerProps {
  selectedMonth?: Date
  onMonthChange?: (date: Date) => void
  className?: string
  disabled?: boolean
}

export function MonthPicker({
  selectedMonth = new Date(),
  onMonthChange,
  className,
  disabled = false,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState(selectedMonth)
  
  const currentMonth = startOfMonth(new Date())
  const selectedMonthStart = startOfMonth(selectedMonth)
  const displayText = format(selectedMonthStart, 'MMMM yyyy', { locale: he })

  // Generate months for the picker (last 24 months + current)
  const months = React.useMemo(() => {
    const monthsArray = []
    const startDate = startOfMonth(subMonths(currentMonth, 23)) // 2 years back
    
    for (let i = 0; i <= 23; i++) {
      const month = addMonths(startDate, i)
      if (!isBefore(currentMonth, month)) { // Don't show future months
        monthsArray.push(month)
      }
    }
    
    return monthsArray.reverse() // Most recent first
  }, [currentMonth])

  const handleMonthSelect = (month: Date) => {
    onMonthChange?.(month)
    setIsOpen(false)
  }

  const goToPreviousYear = () => {
    setViewDate(prev => subMonths(prev, 12))
  }

  const goToNextYear = () => {
    const nextYear = addMonths(viewDate, 12)
    if (!isBefore(currentMonth, nextYear)) {
      setViewDate(nextYear)
    }
  }

  // Get months for current view year
  const viewYear = viewDate.getFullYear()
  const monthsInViewYear = months.filter(month => month.getFullYear() === viewYear)
  
  const canGoNextYear = viewYear < currentMonth.getFullYear()
  const canGoPrevYear = months.some(month => month.getFullYear() < viewYear)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal rtl:text-right rtl:justify-end min-w-[200px]",
            !selectedMonth && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
          <span>{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 rtl" align="start">
        <div className="space-y-4">
          {/* Year Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousYear}
              disabled={!canGoPrevYear}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <div className="font-semibold text-center">
              {viewYear}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextYear}
              disabled={!canGoNextYear}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Months Grid */}
          <div className="grid grid-cols-3 gap-2">
            {monthsInViewYear.map((month) => {
              const isSelected = isSameMonth(month, selectedMonthStart)
              const isCurrent = isSameMonth(month, currentMonth)
              
              return (
                <Button
                  key={month.toISOString()}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-9 text-sm font-normal",
                    isCurrent && !isSelected && "bg-accent text-accent-foreground",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleMonthSelect(month)}
                >
                  {format(month, 'MMM', { locale: he })}
                </Button>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex justify-center pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMonthSelect(currentMonth)}
              className="text-xs"
            >
              חודש נוכחי
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 
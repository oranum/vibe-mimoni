'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { suggestFieldMappings, normalizeCSVData, CSVParseResult } from '@/utils/importUtils'

interface FieldMapping {
  sourceField: string
  targetField: string
  isRequired: boolean
  isValid: boolean
  validationMessage?: string
}

interface DataMappingTableProps {
  parseResult: CSVParseResult
  onMappingChange: (mappings: Record<string, string>) => void
  onValidationChange: (isValid: boolean, errors: string[]) => void
  initialMappings?: Record<string, string>
}

// Transaction schema fields
const TRANSACTION_FIELDS = [
  { key: 'description', label: 'Description', required: true, type: 'text' },
  { key: 'amount', label: 'Amount', required: true, type: 'number' },
  { key: 'date', label: 'Date', required: true, type: 'date' },
  { key: 'currency', label: 'Currency', required: false, type: 'currency' },
  { key: 'identifier', label: 'Identifier', required: false, type: 'text' },
  { key: 'source', label: 'Source', required: false, type: 'text' },
  { key: 'notes', label: 'Notes', required: false, type: 'text' }
]

const FIELD_COLORS = {
  description: 'bg-blue-100 text-blue-800',
  amount: 'bg-green-100 text-green-800',
  date: 'bg-purple-100 text-purple-800',
  currency: 'bg-indigo-100 text-indigo-800',
  identifier: 'bg-orange-100 text-orange-800',
  source: 'bg-yellow-100 text-yellow-800',
  notes: 'bg-gray-100 text-gray-800'
}

export default function DataMappingTable({
  parseResult,
  onMappingChange,
  onValidationChange,
  initialMappings
}: DataMappingTableProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([])

  // Initialize mappings with suggestions
  useEffect(() => {
    const suggested = initialMappings || suggestFieldMappings(parseResult.headers)
    setMappings(suggested)
  }, [parseResult.headers, initialMappings])

  // Generate field mappings with validation
  const fieldMappings = useMemo((): FieldMapping[] => {
    return parseResult.headers.map(header => {
      const targetField = mappings[header] || ''
      const fieldConfig = targetField && targetField !== "none" ? TRANSACTION_FIELDS.find(f => f.key === targetField) : undefined
      
      let isValid = true
      let validationMessage = ''
      
      if (fieldConfig?.required && (!targetField || targetField === "none")) {
        isValid = false
        validationMessage = 'Required field must be mapped'
      } else if (targetField && targetField !== "none" && parseResult.data.length > 0) {
        // Validate sample data
        const sampleValue = parseResult.data[0][header]
        if (sampleValue) {
          if (fieldConfig?.type === 'number') {
            const num = parseFloat(sampleValue.replace(/[^0-9.-]/g, ''))
            if (isNaN(num)) {
              isValid = false
              validationMessage = 'Sample value is not numeric'
            }
          } else if (fieldConfig?.type === 'date') {
            const date = new Date(sampleValue)
            if (isNaN(date.getTime())) {
              isValid = false
              validationMessage = 'Sample value is not a valid date'
            }
          }
        }
      }
      
      return {
        sourceField: header,
        targetField,
        isRequired: fieldConfig?.required || false,
        isValid,
        validationMessage
      }
    })
  }, [mappings, parseResult.headers, parseResult.data])

  // Update parent components when mappings change
  useEffect(() => {
    const validMappings = fieldMappings
      .filter(fm => fm.targetField && fm.targetField !== "none" && fm.isValid)
      .reduce((acc, fm) => {
        acc[fm.sourceField] = fm.targetField
        return acc
      }, {} as Record<string, string>)
    
    onMappingChange(validMappings)
    
    // Check if all required fields are mapped
    const requiredFields = TRANSACTION_FIELDS.filter(f => f.required)
    const mappedTargetFields = Object.values(validMappings)
    const missingRequired = requiredFields.filter(f => !mappedTargetFields.includes(f.key))
    const validationErrors = fieldMappings.filter(fm => !fm.isValid).map(fm => fm.validationMessage || '')
    
    const allErrors = [
      ...missingRequired.map(f => `Required field '${f.label}' is not mapped`),
      ...validationErrors
    ]
    
    onValidationChange(allErrors.length === 0, allErrors)
    
    // Generate preview data
    if (Object.keys(validMappings).length > 0) {
      const normalized = normalizeCSVData(parseResult.data.slice(0, 5), validMappings)
      setPreviewData(normalized)
    }
  }, [fieldMappings, onMappingChange, onValidationChange, parseResult.data])

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setMappings(prev => ({
      ...prev,
      [sourceField]: targetField
    }))
  }

  const resetMappings = () => {
    const suggested = suggestFieldMappings(parseResult.headers)
    setMappings(suggested)
  }

  const getAvailableTargetFields = (currentSourceField: string) => {
    const usedTargetFields = Object.entries(mappings)
      .filter(([sourceField]) => sourceField !== currentSourceField)
      .map(([, targetField]) => targetField)
      .filter(field => field !== "none") // Don't consider "none" as used
    
    return TRANSACTION_FIELDS.filter(field => !usedTargetFields.includes(field.key))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Field Mapping</h3>
          <p className="text-sm text-gray-600">
            Map your data fields to transaction fields
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetMappings}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Field Mapping</CardTitle>
          <CardDescription>
            Select which transaction field each data field should map to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fieldMappings.map((mapping, index) => (
              <div key={mapping.sourceField} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">{mapping.sourceField}</div>
                  <div className="text-xs text-gray-500">
                    Sample: {parseResult.data[0]?.[mapping.sourceField] || 'N/A'}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={mapping.targetField}
                    onValueChange={(value) => handleMappingChange(mapping.sourceField, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-gray-500">Don't map</span>
                      </SelectItem>
                      {getAvailableTargetFields(mapping.sourceField).map(field => (
                        <SelectItem key={field.key} value={field.key}>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${FIELD_COLORS[field.key as keyof typeof FIELD_COLORS]}`}
                            >
                              {field.label}
                            </Badge>
                            {field.required && <span className="text-red-500 text-xs">*</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {mapping.isRequired && !mapping.targetField && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                  
                  {!mapping.isValid && (
                    <div className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">{mapping.validationMessage}</span>
                    </div>
                  )}
                  
                  {mapping.isValid && mapping.targetField && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {showPreview && previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              Preview of how your data will appear after mapping and normalization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {TRANSACTION_FIELDS.map(field => (
                      <th key={field.key} className="text-left p-2 font-medium">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${FIELD_COLORS[field.key as keyof typeof FIELD_COLORS]}`}
                        >
                          {field.label}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b">
                      {TRANSACTION_FIELDS.map(field => (
                        <td key={field.key} className="p-2">
                          {row[field.key] !== null && row[field.key] !== undefined ? (
                            <span className={field.key === 'amount' ? 'font-mono' : ''}>
                              {field.key === 'amount' && typeof row[field.key] === 'number' 
                                ? row[field.key].toFixed(2)
                                : String(row[field.key])}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
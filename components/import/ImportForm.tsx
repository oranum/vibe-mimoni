'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  FileText, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  X,
  ArrowRight,
  ArrowLeft,
  Download
} from 'lucide-react'
import { parseCSV, parseJSON, validateCSVStructure, analyzeCurrencyFromCSV, CSVParseResult } from '@/utils/importUtils'
import { CurrencySelector } from '@/components/ui/CurrencySelector'
import { CurrencyCode } from '@/types/database'
import DataMappingTable from './DataMappingTable'

type ImportStep = 'upload' | 'mapping' | 'validation' | 'confirmation'

interface ImportFormProps {
  onImport: (data: any[], mappings: Record<string, string>, defaultCurrency: CurrencyCode) => Promise<void>
  onCancel: () => void
}

interface ImportState {
  step: ImportStep
  file: File | null
  parseResult: CSVParseResult | null
  fieldMappings: Record<string, string>
  validationErrors: string[]
  isValid: boolean
  isImporting: boolean
  importProgress: number
  detectedCurrency: CurrencyCode | null
  defaultCurrency: CurrencyCode
  currencyConfidence: number
}

export default function ImportForm({ onImport, onCancel }: ImportFormProps) {
  const [state, setState] = useState<ImportState>({
    step: 'upload',
    file: null,
    parseResult: null,
    fieldMappings: {},
    validationErrors: [],
    isValid: false,
    isImporting: false,
    importProgress: 0,
    detectedCurrency: null,
    defaultCurrency: 'ILS',
    currencyConfidence: 0
  })

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        let parseResult: CSVParseResult;
        
        // Detect file type and use appropriate parser
        if (file.name.toLowerCase().endsWith('.json')) {
          parseResult = parseJSON(content)
        } else {
          parseResult = parseCSV(content)
        }
        
        const structureValidation = validateCSVStructure(parseResult)
        
        setState(prev => ({
          ...prev,
          file,
          parseResult,
          step: 'mapping',
          validationErrors: structureValidation.errors,
          isValid: structureValidation.isValid
        }))
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const dataFile = files.find(file => 
      file.name.toLowerCase().endsWith('.csv') || 
      file.name.toLowerCase().endsWith('.json')
    )
    if (dataFile) {
      handleFileUpload(dataFile)
    }
  }, [handleFileUpload])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.json'))) {
      handleFileUpload(file)
    }
  }

  const handleMappingChange = useCallback((mappings: Record<string, string>) => {
    setState(prev => ({
      ...prev,
      fieldMappings: mappings
    }))
  }, [])

  const handleValidationChange = useCallback((isValid: boolean, errors: string[]) => {
    setState(prev => ({
      ...prev,
      isValid,
      validationErrors: errors
    }))
  }, [])

  const handleNextStep = () => {
    if (state.step === 'mapping') {
      setState(prev => ({ ...prev, step: 'validation' }))
    } else if (state.step === 'validation') {
      setState(prev => ({ ...prev, step: 'confirmation' }))
    }
  }

  const handlePrevStep = () => {
    if (state.step === 'validation') {
      setState(prev => ({ ...prev, step: 'mapping' }))
    } else if (state.step === 'confirmation') {
      setState(prev => ({ ...prev, step: 'validation' }))
    }
  }

  const handleImport = async () => {
    if (!state.parseResult || !state.isValid) return

    setState(prev => ({ ...prev, isImporting: true, importProgress: 0 }))

    try {
      // Simulate progress for UI feedback
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          importProgress: Math.min(prev.importProgress + 10, 90)
        }))
      }, 200)

      await onImport(state.parseResult.data, state.fieldMappings, state.defaultCurrency)

      clearInterval(progressInterval)
      setState(prev => ({ ...prev, importProgress: 100 }))
      
      // Close after brief delay
      setTimeout(() => {
        onCancel()
      }, 1000)
    } catch (error) {
      console.error('Import failed:', error)
      setState(prev => ({ ...prev, isImporting: false, importProgress: 0 }))
    }
  }

  const getStepIcon = (step: ImportStep) => {
    switch (step) {
      case 'upload': return <Upload className="h-4 w-4" />
      case 'mapping': return <Settings className="h-4 w-4" />
      case 'validation': return <CheckCircle className="h-4 w-4" />
      case 'confirmation': return <FileText className="h-4 w-4" />
    }
  }

  const getStepTitle = (step: ImportStep) => {
    switch (step) {
      case 'upload': return 'Upload File'
      case 'mapping': return 'Map Fields'
      case 'validation': return 'Validate Data'
      case 'confirmation': return 'Confirm Import'
    }
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Upload Data File</h3>
        <p className="text-gray-600">
          Choose a CSV or JSON file containing your transaction data
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">Drag and drop your CSV or JSON file here</p>
        <p className="text-gray-600 mb-4">or</p>
        <input
          type="file"
          accept=".csv,.json"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose File
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">CSV Requirements:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• First row must contain column headers</li>
            <li>• Required columns: Description, Amount, Date</li>
            <li>• Optional columns: Identifier, Source, Notes</li>
            <li>• Amounts can include currency symbols</li>
            <li>• Dates can be in various formats (MM/DD/YYYY, DD/MM/YYYY, etc.)</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">JSON Requirements:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Array of objects: <code>[{`{"description": "...", "amount": "..."}`}]</code></li>
            <li>• Or object with array: <code>{`{"transactions": [...]}`}</code></li>
            <li>• Required fields: description, amount, date</li>
            <li>• Optional fields: identifier, source, notes</li>
            <li>• Supports nested objects (will be stringified)</li>
          </ul>
        </div>
      </div>
    </div>
  )

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Map Data Fields</h3>
          <p className="text-gray-600">
            Map your data fields to transaction fields
          </p>
        </div>
        <Badge variant="outline">
          {state.parseResult?.rowCount || 0} rows
        </Badge>
      </div>

      {state.parseResult && (
        <DataMappingTable
          parseResult={state.parseResult}
          onMappingChange={handleMappingChange}
          onValidationChange={handleValidationChange}
        />
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={!state.isValid}
        >
          Next: Validate Data
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Validation Results</h3>
        <p className="text-gray-600">
          Review any issues with your data before importing
        </p>
      </div>

      <div className="space-y-4">
        {state.validationErrors.length === 0 ? (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Data validation passed</p>
              <p className="text-sm text-green-700">
                Your data is ready to import with no issues detected
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Validation issues found</p>
                <p className="text-sm text-red-700">
                  Please fix these issues before importing
                </p>
              </div>
            </div>
            {state.validationErrors.map((error, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-red-50 border-l-4 border-red-400">
                <X className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevStep}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mapping
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={!state.isValid}
        >
          Next: Confirm Import
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Confirm Import</h3>
        <p className="text-gray-600">
          Review the import details and confirm to proceed
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">File Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Filename:</span>
              <span className="text-sm font-medium">{state.file?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Size:</span>
              <span className="text-sm font-medium">
                {state.file ? (state.file.size / 1024).toFixed(1) : 0} KB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Rows:</span>
              <span className="text-sm font-medium">{state.parseResult?.rowCount || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Field Mappings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(state.fieldMappings).map(([source, target]) => (
              <div key={source} className="flex justify-between">
                <span className="text-sm text-gray-600">{source}:</span>
                <Badge variant="secondary" className="text-xs">
                  {target}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {state.isImporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Importing...</span>
            <span className="text-sm text-gray-600">{state.importProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.importProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevStep}
          disabled={state.isImporting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Validation
        </Button>
        <Button
          onClick={handleImport}
          disabled={!state.isValid || state.isImporting}
        >
          {state.isImporting ? 'Importing...' : 'Import Transactions'}
          <Download className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Transactions
          </CardTitle>
          <CardDescription>
            Import transactions from a CSV file with automatic field mapping
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {(['upload', 'mapping', 'validation', 'confirmation'] as ImportStep[]).map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    state.step === step 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : index < (['upload', 'mapping', 'validation', 'confirmation'] as ImportStep[]).indexOf(state.step)
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}>
                    {getStepIcon(step)}
                  </div>
                  {index < 3 && (
                    <div className={`w-16 h-0.5 ${
                      index < (['upload', 'mapping', 'validation', 'confirmation'] as ImportStep[]).indexOf(state.step)
                        ? 'bg-green-600' 
                        : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              {(['upload', 'mapping', 'validation', 'confirmation'] as ImportStep[]).map((step) => (
                <div key={step} className="text-xs text-gray-600">
                  {getStepTitle(step)}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {state.step === 'upload' && renderUploadStep()}
          {state.step === 'mapping' && renderMappingStep()}
          {state.step === 'validation' && renderValidationStep()}
          {state.step === 'confirmation' && renderConfirmationStep()}
        </CardContent>
      </Card>
    </div>
  )
} 
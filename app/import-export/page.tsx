'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  Download, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  X,
  Info,
  ArrowLeft,
  Database,
  Settings
} from 'lucide-react'
import { ImportForm } from '@/components/transactions'
import { CurrencyCode } from '@/types/database'
import { useAuthenticatedMutation } from '@/hooks/useAuthenticatedMutation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImportService, ImportProgress, ImportResult } from '@/services/importService'
import { useAuth } from '@/context/auth'

interface ImportHistory {
  id: string
  filename: string
  rowCount: number
  timestamp: Date
  status: 'success' | 'failed' | 'in-progress'
  errorMessage?: string
  result?: ImportResult
}

export default function ImportExportPage() {
  const [showImportForm, setShowImportForm] = useState(false)
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [currentImportProgress, setCurrentImportProgress] = useState<ImportProgress | null>(null)
  
  const { user } = useAuth()
  const router = useRouter()

  // Load import history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('import-history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setImportHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })))
      } catch (error) {
        console.error('Failed to parse import history:', error)
      }
    }
  }, [])

  // Save import history to localStorage
  const saveImportHistory = (history: ImportHistory[]) => {
    localStorage.setItem('import-history', JSON.stringify(history))
    setImportHistory(history)
  }

  const handleImport = async (data: any[], mappings: Record<string, string>, defaultCurrency: CurrencyCode = 'ILS') => {
    if (!user) {
      console.error('User not authenticated')
      return
    }

    const importId = `import-${Date.now()}`
    
    // Add to history as in-progress
    const newEntry: ImportHistory = {
      id: importId,
      filename: 'import.csv', // This would come from the form
      rowCount: data.length,
      timestamp: new Date(),
      status: 'in-progress'
    }
    
    const updatedHistory = [newEntry, ...importHistory]
    saveImportHistory(updatedHistory)

    try {
      const importService = new ImportService()
      
      const result = await importService.importTransactionsInBatches(
        data,
        mappings,
        defaultCurrency,
        user.id,
        {
          batchSize: 50,
          duplicateStrategy: 'skip',
          duplicateThreshold: 0.8,
          onProgress: (progress) => {
            setCurrentImportProgress(progress)
          }
        }
      )

      // Update history with results
      const finalHistory = updatedHistory.map(item => 
        item.id === importId 
          ? { 
              ...item, 
              status: result.success ? 'success' as const : 'failed' as const,
              errorMessage: result.success ? undefined : ImportService.handleImportErrors(result.errors).summary,
              result
            }
          : item
      )
      saveImportHistory(finalHistory)
      
      // Clear progress indicator
      setCurrentImportProgress(null)

      // Show results and redirect if successful
      if (result.success) {
        console.log(`Import completed successfully: ${result.imported} imported, ${result.skipped} skipped`)
        setTimeout(() => {
          router.push('/inbox')
        }, 2000)
      } else {
        const errorInfo = ImportService.handleImportErrors(result.errors)
        console.error('Import failed:', errorInfo)
      }

    } catch (error) {
      console.error('Import failed:', error)
      
      // Update history as failed
      const failedHistory = updatedHistory.map(item => 
        item.id === importId 
          ? { 
              ...item, 
              status: 'failed' as const,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          : item
      )
      saveImportHistory(failedHistory)
      setCurrentImportProgress(null)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // This would integrate with the export functionality
      // For now, just simulate
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real implementation, this would:
      // 1. Fetch transactions with filters
      // 2. Format as CSV or JSON
      // 3. Trigger download
      
      console.log('Export completed')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (showImportForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setShowImportForm(false)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import/Export
            </Button>
          </div>
          
          <ImportForm
            onImport={handleImport}
            onCancel={() => setShowImportForm(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import & Export</h1>
              <p className="text-gray-600">
                Import transactions from CSV files or export your data
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Data
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Import Actions */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Import Transactions
                    </CardTitle>
                    <CardDescription>
                      Import your transaction history from CSV files
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium">CSV Import</h3>
                          <p className="text-sm text-gray-600">
                            Upload a CSV file with your transaction data
                          </p>
                        </div>
                        <Button 
                          onClick={() => setShowImportForm(true)}
                          disabled={currentImportProgress !== null}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {currentImportProgress ? 'Importing...' : 'Start Import'}
                        </Button>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900">Supported Format</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              CSV files with columns for Description, Amount, Date, and optionally 
                              Identifier, Source, and Notes. The system will automatically detect 
                              and suggest field mappings.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Import History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Import History
                    </CardTitle>
                    <CardDescription>
                      Track your recent imports and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {importHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No imports yet</p>
                        <p className="text-sm text-gray-500">
                          Your import history will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {importHistory.slice(0, 5).map((item) => (
                          <div key={item.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {getStatusIcon(item.status)}
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.filename}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.timestamp.toLocaleDateString()} at {item.timestamp.toLocaleTimeString()}
                                  </p>
                                  
                                  {/* Show import results if successful */}
                                  {item.result && item.status === 'success' && (
                                    <div className="text-sm text-green-600 mt-1 flex items-center gap-2">
                                      <span>✅ {item.result.imported} imported</span>
                                      {item.result.skipped > 0 && (
                                        <span>• {item.result.skipped} skipped</span>
                                      )}
                                      {item.result.duplicates.length > 0 && (
                                        <span>• {item.result.duplicates.length} duplicates detected</span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Show error message */}
                                  {item.errorMessage && (
                                    <p className="text-sm text-red-600 mt-1">{item.errorMessage}</p>
                                  )}
                                  
                                  {/* Show detailed errors if available */}
                                  {item.result && !item.result.success && item.result.errors.length > 0 && (
                                    <details className="mt-2 text-sm text-red-600">
                                      <summary className="cursor-pointer hover:text-red-800 text-xs">
                                        View {item.result.errors.length} error(s)
                                      </summary>
                                      <div className="mt-1 pl-2 border-l-2 border-red-200 max-h-32 overflow-y-auto">
                                        {ImportService.handleImportErrors(item.result.errors).details.slice(0, 5).map((detail, i) => (
                                          <div key={i} className="text-xs py-0.5">{detail}</div>
                                        ))}
                                        {item.result.errors.length > 5 && (
                                          <div className="text-xs text-red-500">... and {item.result.errors.length - 5} more</div>
                                        )}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  {item.rowCount} rows
                                </span>
                                <Badge variant="secondary" className={`text-xs ${getStatusColor(item.status)}`}>
                                  {item.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Import Documentation */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Guide</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-sm">Prepare CSV File</p>
                          <p className="text-xs text-gray-600">
                            Export from your bank or create a CSV with transaction data
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-sm">Upload & Map</p>
                          <p className="text-xs text-gray-600">
                            Upload your file and map columns to transaction fields
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-sm">Review & Import</p>
                          <p className="text-xs text-gray-600">
                            Review the data and confirm to import transactions
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">CSV Format Example</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                      <div className="mb-2 text-gray-600">CSV Headers:</div>
                      <div>Date,Description,Amount,Account</div>
                      <div className="mt-2 text-gray-600">Sample Row:</div>
                      <div>2024-01-15,Coffee Shop,-4.50,Checking</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Transactions
                </CardTitle>
                <CardDescription>
                  Export your transaction data in various formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Export Format</label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="csv"
                            name="format"
                            value="csv"
                            checked={exportFormat === 'csv'}
                            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                            className="w-4 h-4"
                          />
                          <label htmlFor="csv" className="text-sm">CSV (Comma-separated values)</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="json"
                            name="format"
                            value="json"
                            checked={exportFormat === 'json'}
                            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                            className="w-4 h-4"
                          />
                          <label htmlFor="json" className="text-sm">JSON (JavaScript Object Notation)</label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Data Range</label>
                      <p className="text-sm text-gray-600">
                        All transactions will be exported
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900">Coming Soon</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Export functionality is currently in development. 
                          You'll be able to export your transaction data with 
                          custom filters and date ranges.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="flex-1"
                    >
                      {isExporting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export {exportFormat.toUpperCase()}
                        </>
                      )}
                                            </Button>
                      </div>
                    </div>

                    {/* Import Progress Display */}
                    {currentImportProgress && (
                      <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-blue-900">Import Progress</h4>
                          <span className="text-sm text-blue-700">
                            {Math.round(currentImportProgress.percentage)}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${currentImportProgress.percentage}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-blue-700">
                          <span>{currentImportProgress.message}</span>
                          {currentImportProgress.totalBatches > 0 && (
                            <span>
                              Batch {currentImportProgress.currentBatch} of {currentImportProgress.totalBatches}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-blue-600 mt-1">
                          {currentImportProgress.processed} / {currentImportProgress.total} records processed
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FilterBuilder, { Filter } from '@/components/transactions/FilterBuilder'
import { FilterChips } from '@/components/transactions/FilterChips'
import { TransactionList } from '@/components/transactions/TransactionList'
import { applyAdvancedFilterToQuery, testFilter } from '@/lib/advanced-filter-query'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/auth'
import { Transaction, TransactionWithLabels } from '@/types/database'
import { 
  Search, 
  Filter as FilterIcon, 
  Save, 
  History, 
  Star, 
  Play, 
  Loader2, 
  AlertCircle 
} from 'lucide-react'
import { toast } from 'sonner'

interface SavedAdvancedFilter {
  id: string
  name: string
  filter: Filter
  createdAt: Date
  lastUsed?: Date
}

export default function SearchPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<Filter>({
    conditions: [],
    conjunction: 'AND'
  })
  const [searchResults, setSearchResults] = useState<TransactionWithLabels[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [savedFilters, setSavedFilters] = useState<SavedAdvancedFilter[]>([])
  const [activeTab, setActiveTab] = useState('simple')
  const [testResults, setTestResults] = useState<{
    matches: boolean
    results?: any[]
    error?: string
  } | null>(null)
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadSavedFilters()
    loadLabels()
  }, [])

  const loadLabels = async () => {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('id, name, color')
        .order('name')

      if (error) throw error
      setLabels(data || [])
    } catch (error) {
      console.error('Error loading labels:', error)
    }
  }

  // Helper function to transform raw transaction data to TransactionWithLabels
  const transformTransactionData = (rawData: any[]): TransactionWithLabels[] => {
    return rawData.map(transaction => ({
      ...transaction,
      labels: transaction.transaction_labels?.map((tl: any) => tl.labels).filter(Boolean) || []
    }))
  }

  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem('vibe-mimoni-advanced-filters')
      if (saved) {
        const parsed = JSON.parse(saved).map((filter: any) => ({
          ...filter,
          createdAt: new Date(filter.createdAt),
          lastUsed: filter.lastUsed ? new Date(filter.lastUsed) : undefined,
        }))
        setSavedFilters(parsed)
      }
    } catch (error) {
      console.error('Error loading saved filters:', error)
    }
  }

  const saveSavedFilters = (filters: SavedAdvancedFilter[]) => {
    try {
      localStorage.setItem('vibe-mimoni-advanced-filters', JSON.stringify(filters))
      setSavedFilters(filters)
    } catch (error) {
      console.error('Error saving filters:', error)
    }
  }

  const handleSimpleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_labels (
            label_id,
            labels (
              id,
              name,
              color
            )
          )
        `)
        .ilike('description', `%${searchQuery}%`)
        .order('date', { ascending: false })
        .limit(50)

      if (error) throw error
      setSearchResults(transformTransactionData(data || []))
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAdvancedSearch = async (filter: Filter) => {
    if (!filter.conditions || filter.conditions.length === 0) return

    setIsSearching(true)
    try {
      const query = applyAdvancedFilterToQuery(supabase, filter)
      const { data, error } = await query
        .order('date', { ascending: false })
        .limit(50)

      if (error) throw error
      setSearchResults(transformTransactionData(data || []))
    } catch (error) {
      console.error('Advanced search error:', error)
      toast.error('Advanced search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSaveFilter = (filter: Filter) => {
    if (!filter.name) return

    const newFilter: SavedAdvancedFilter = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: filter.name,
      filter,
      createdAt: new Date(),
    }

    const updated = [newFilter, ...savedFilters].slice(0, 20) // Keep max 20 filters
    saveSavedFilters(updated)
    toast.success(`Filter "${filter.name}" saved successfully`)
  }

  const handleLoadFilter = (savedFilter: SavedAdvancedFilter) => {
    setCurrentFilter(savedFilter.filter)
    setActiveTab('advanced')
    
    // Update last used
    const updated = savedFilters.map(f => 
      f.id === savedFilter.id 
        ? { ...f, lastUsed: new Date() }
        : f
    )
    saveSavedFilters(updated)
  }

  const handleDeleteFilter = (filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId)
    saveSavedFilters(updated)
    toast.success('Filter deleted')
  }

  const handleTestFilter = async (filter: Filter) => {
    try {
      const result = await testFilter(supabase, filter)
      setTestResults(result)
      
      if (result.error) {
        toast.error(`Test failed: ${result.error}`)
      } else {
        toast.success(`Test completed: ${result.matches ? 'Found matches' : 'No matches'}`)
      }
    } catch (error) {
      console.error('Test error:', error)
      toast.error('Test failed')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSimpleSearch()
    }
  }

  const handleRemoveCondition = (conditionId: string) => {
    setCurrentFilter(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }))
  }

  const handleClearAllConditions = () => {
    setCurrentFilter(prev => ({
      ...prev,
      conditions: []
    }))
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Advanced Search</h1>
        <p className="text-gray-600">
          Search and filter your transactions with powerful queries and saved filters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search size={20} />
                Search Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="simple">Simple Search</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced Filter</TabsTrigger>
                </TabsList>
                
                <TabsContent value="simple" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search transaction descriptions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSimpleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                      >
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={16} />}
                        Search
                      </Button>
                    </div>
                    
                    {searchQuery && (
                      <div className="text-sm text-gray-600">
                        Searching for: "<strong>{searchQuery}</strong>"
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="mt-4">
                  <FilterBuilder
                    initialFilter={currentFilter}
                    onFilterChange={setCurrentFilter}
                    onSave={handleSaveFilter}
                    onTest={handleTestFilter}
                  />
                  
                  {testResults && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Test Results</h4>
                      {testResults.error ? (
                        <div className="text-red-600 flex items-center gap-2">
                          <AlertCircle size={16} />
                          {testResults.error}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={testResults.matches ? "default" : "secondary"}>
                              {testResults.matches ? 'Matches Found' : 'No Matches'}
                            </Badge>
                            {testResults.results && (
                              <span className="text-sm text-gray-600">
                                {testResults.results.length} results
                              </span>
                            )}
                          </div>
                          {testResults.results && testResults.results.length > 0 && (
                            <div className="text-sm text-gray-600">
                              Sample results: {testResults.results.slice(0, 3).map(r => r.description).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-end">
                    <Button 
                      onClick={() => handleAdvancedSearch(currentFilter)}
                      disabled={isSearching || !currentFilter.conditions.length}
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={16} />}
                      Apply Filter
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Saved Filters Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star size={20} />
                Saved Filters
              </CardTitle>
              <CardDescription>
                Quick access to your saved search filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedFilters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FilterIcon size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No saved filters yet</p>
                  <p className="text-sm">Create an advanced filter and save it for quick access</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedFilters.map(filter => (
                    <div
                      key={filter.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{filter.name}</h4>
                        <button
                          onClick={() => handleDeleteFilter(filter.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {filter.filter.conditions.map((condition, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {condition.field} {condition.operator}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {filter.lastUsed ? `Used ${filter.lastUsed.toLocaleDateString()}` : 'Never used'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadFilter(filter)}
                        >
                          Load
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active Filter Chips */}
      {currentFilter.conditions.length > 0 && (
        <div className="mt-6">
          <FilterChips
            filter={currentFilter}
            onRemoveCondition={handleRemoveCondition}
            onClearAll={handleClearAllConditions}
            labels={labels}
          />
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>
                Search Results ({searchResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionList transactions={searchResults} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Results Message */}
      {isSearching === false && searchResults.length === 0 && (searchQuery || currentFilter.conditions.length > 0) && (
        <div className="mt-8 text-center py-12 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No transactions found</p>
          <p>Try adjusting your search terms or filters</p>
        </div>
      )}
    </div>
  )
} 
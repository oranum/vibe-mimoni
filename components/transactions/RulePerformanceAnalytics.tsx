'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RulePerformanceService } from '@/lib/rule-performance-service'
import { RulePerformanceStats, RulePerformanceWithRule, RuleExecutionLog } from '@/types/database'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  Target, 
  Clock, 
  BarChart3, 
  Zap, 
  AlertTriangle,
  Trophy,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface RulePerformanceAnalyticsProps {
  className?: string
}

export default function RulePerformanceAnalytics({ className }: RulePerformanceAnalyticsProps) {
  const [stats, setStats] = useState<RulePerformanceStats | null>(null)
  const [allPerformance, setAllPerformance] = useState<RulePerformanceWithRule[]>([])
  const [todayPerformance, setTodayPerformance] = useState<RulePerformanceWithRule[]>([])
  const [underperforming, setUnderperforming] = useState<RulePerformanceWithRule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadPerformanceData()
  }, [])

  const loadPerformanceData = async () => {
    setLoading(true)
    try {
      const [statsData, allData, todayData, underData] = await Promise.all([
        RulePerformanceService.getPerformanceStats(),
        RulePerformanceService.getAllRulePerformance(),
        RulePerformanceService.getTodayPerformance(),
        RulePerformanceService.getUnderperformingRules()
      ])

      setStats(statsData)
      setAllPerformance(allData)
      setTodayPerformance(todayData)
      setUnderperforming(underData)
    } catch (error) {
      console.error('Error loading performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getMatchRateColor = (matchRate: number) => {
    if (matchRate >= 0.5) return 'text-green-600'
    if (matchRate >= 0.2) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getMatchRateBadge = (matchRate: number) => {
    if (matchRate >= 0.5) return 'default'
    if (matchRate >= 0.2) return 'secondary'
    return 'destructive'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    )
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
          <p className="text-gray-600">
            Performance analytics will appear here once rules start executing
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Rule Performance</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          <Button variant="outline" onClick={loadPerformanceData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalExecutions}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.executionsToday} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMatches}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.matchesToday} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Match Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getMatchRateColor(stats.averageMatchRate)}`}>
                  {(stats.averageMatchRate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all rules
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labels Applied</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLabelsApplied}</div>
                <p className="text-xs text-muted-foreground">
                  Automatic categorization
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Rules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stats.mostActiveRule && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Most Active Rule
                  </CardTitle>
                  <CardDescription>
                    Rule with the highest number of executions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium">{stats.mostActiveRule.rule.name}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{stats.mostActiveRule.total_executions} executions</span>
                      <span>{stats.mostActiveRule.total_matches} matches</span>
                      <Badge variant={getMatchRateBadge(stats.mostActiveRule.match_rate)}>
                        {(stats.mostActiveRule.match_rate * 100).toFixed(1)}% match rate
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {stats.mostEffectiveRule && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Most Effective Rule
                  </CardTitle>
                  <CardDescription>
                    Rule with the highest match rate (min 5 executions)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium">{stats.mostEffectiveRule.rule.name}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{stats.mostEffectiveRule.total_executions} executions</span>
                      <span>{stats.mostEffectiveRule.total_matches} matches</span>
                      <Badge variant={getMatchRateBadge(stats.mostEffectiveRule.match_rate)}>
                        {(stats.mostEffectiveRule.match_rate * 100).toFixed(1)}% match rate
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {allPerformance.length === 0 ? (
            <Card className="p-6">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No rule performance data available</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {allPerformance.map((performance) => (
                <Card key={performance.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{performance.rule.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <span>Last executed: {performance.last_execution_at?.toLocaleDateString() || 'Never'}</span>
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={performance.rule.is_active ? "default" : "secondary"}
                      >
                        {performance.rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-600">Executions</div>
                        <div className="text-lg font-bold">{performance.total_executions}</div>
                        <div className="text-xs text-gray-500">
                          {performance.executions_today} today
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Matches</div>
                        <div className="text-lg font-bold">{performance.total_matches}</div>
                        <div className="text-xs text-gray-500">
                          {performance.matches_today} today
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Match Rate</div>
                        <div className={`text-lg font-bold ${getMatchRateColor(performance.match_rate)}`}>
                          {(performance.match_rate * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Labels Applied</div>
                        <div className="text-lg font-bold">{performance.total_labels_applied}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {stats.recentActivity.length === 0 ? (
            <Card className="p-6">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No recent activity</p>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Rule Executions</CardTitle>
                <CardDescription>
                  Latest {stats.recentActivity.length} rule executions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${activity.matched ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div>
                          <div className="font-medium">Rule execution</div>
                          <div className="text-sm text-gray-600">
                            {activity.matched ? 'Matched' : 'No match'} • {activity.execution_time_ms.toFixed(1)}ms
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{activity.executed_at.toLocaleTimeString()}</div>
                        <div className="text-xs text-gray-500">{activity.executed_at.toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Performance
                </CardTitle>
                <CardDescription>
                  Rules that executed today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayPerformance.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No rules executed today</p>
                ) : (
                  <div className="space-y-3">
                    {todayPerformance.slice(0, 5).map((performance) => (
                      <div key={performance.id} className="flex justify-between items-center">
                        <div className="font-medium">{performance.rule.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {performance.executions_today} executions
                          </span>
                          <Badge variant={getMatchRateBadge(performance.match_rate)}>
                            {performance.matches_today} matches
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Underperforming Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Underperforming Rules
                </CardTitle>
                <CardDescription>
                  Rules with low match rates (min 10 executions)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {underperforming.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No underperforming rules detected</p>
                ) : (
                  <div className="space-y-3">
                    {underperforming.slice(0, 5).map((performance) => (
                      <div key={performance.id} className="flex justify-between items-center">
                        <div className="font-medium">{performance.rule.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {performance.total_executions} executions
                          </span>
                          <Badge variant="destructive">
                            {(performance.match_rate * 100).toFixed(1)}% match rate
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
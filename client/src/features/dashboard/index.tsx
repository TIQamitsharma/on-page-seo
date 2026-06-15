import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity, CircleCheck as CheckCircle2, Clock, ExternalLink, Globe, Loader as Loader2, Plus, Search, TrendingUp, Circle as XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { auditApi, settingsApi } from '@/lib/api'
import type { Audit } from '@/types/seo'

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  }
  return map[status] || map.pending
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className='h-4 w-4 text-green-500' />
  if (status === 'failed') return <XCircle className='h-4 w-4 text-red-500' />
  if (status === 'processing') return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
  return <Clock className='h-4 w-4 text-yellow-500' />
}

export function Dashboard() {
  const { data: audits, isLoading } = useQuery({
    queryKey: ['audits'],
    queryFn: auditApi.getAll,
    refetchInterval: 10000,
  })

  const { data: status } = useQuery({
    queryKey: ['settings', 'status'],
    queryFn: settingsApi.getStatus,
  })

  const total = audits?.length ?? 0
  const completed = audits?.filter((a) => a.status === 'completed').length ?? 0
  const processing = audits?.filter((a) => a.status === 'processing').length ?? 0
  const failed = audits?.filter((a) => a.status === 'failed').length ?? 0
  const totalPages = audits?.reduce((sum, a) => sum + (a.completed_pages ?? 0), 0) ?? 0

  const recent = audits?.slice(0, 6) ?? []

  return (
    <>
      <Header fixed>
        <div className='flex w-full items-center justify-between'>
          <h1 className='text-lg font-semibold'>Dashboard</h1>
          <Button asChild size='sm'>
            <Link to='/'>
              <Plus className='mr-2 h-4 w-4' />
              New Audit
            </Link>
          </Button>
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Setup alert if APIs not configured */}
          {status && !status.all_configured && (
            <Card className='border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'>
              <CardContent className='flex items-center justify-between pt-4'>
                <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                  Configure your API keys to start running SEO audits.
                </p>
                <Button variant='outline' size='sm' asChild>
                  <Link to='/settings/api-keys'>Configure APIs</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Total Audits</CardTitle>
                <Search className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{isLoading ? '—' : total}</div>
                <p className='text-xs text-muted-foreground'>All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Completed</CardTitle>
                <CheckCircle2 className='h-4 w-4 text-green-500' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-green-600'>{isLoading ? '—' : completed}</div>
                <p className='text-xs text-muted-foreground'>
                  {total > 0 ? `${Math.round((completed / total) * 100)}% success rate` : 'No audits yet'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Pages Analyzed</CardTitle>
                <Globe className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{isLoading ? '—' : totalPages.toLocaleString()}</div>
                <p className='text-xs text-muted-foreground'>Across all audits</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Active / Failed</CardTitle>
                <Activity className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  <span className='text-blue-500'>{isLoading ? '—' : processing}</span>
                  <span className='mx-1 text-muted-foreground'>/</span>
                  <span className='text-red-500'>{isLoading ? '—' : failed}</span>
                </div>
                <p className='text-xs text-muted-foreground'>Running / Failed</p>
              </CardContent>
            </Card>
          </div>

          {/* API Status */}
          {status && (
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Integration Status</CardTitle>
                <CardDescription>Your configured API connections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                  {[
                    { label: 'Firecrawl', ok: status.firecrawl_configured, desc: 'Page discovery' },
                    { label: 'DataForSEO', ok: status.dataforseo_configured, desc: 'SEO analysis' },
                    { label: 'OpenRouter AI', ok: status.openrouter_configured, desc: 'AI recommendations' },
                    { label: 'Claude AI', ok: status.claude_configured, desc: 'AI recommendations' },
                  ].map(({ label, ok, desc }) => (
                    <div key={label} className='flex items-center gap-3 rounded-lg border p-3'>
                      {ok ? (
                        <CheckCircle2 className='h-5 w-5 shrink-0 text-green-500' />
                      ) : (
                        <XCircle className='h-5 w-5 shrink-0 text-muted-foreground' />
                      )}
                      <div>
                        <p className='text-sm font-medium'>{label}</p>
                        <p className='text-xs text-muted-foreground'>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Audits */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle className='text-base'>Recent Audits</CardTitle>
                <CardDescription>Your most recent SEO audit results</CardDescription>
              </div>
              <Button variant='outline' size='sm' asChild>
                <Link to='/audits'>
                  <TrendingUp className='mr-2 h-4 w-4' />
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='flex justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                </div>
              ) : recent.length === 0 ? (
                <div className='py-8 text-center'>
                  <Globe className='mx-auto mb-3 h-10 w-10 text-muted-foreground' />
                  <p className='text-sm text-muted-foreground'>No audits yet. Start your first SEO audit!</p>
                  <Button className='mt-4' asChild>
                    <Link to='/'>
                      <Plus className='mr-2 h-4 w-4' />
                      Start Audit
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className='divide-y'>
                  {recent.map((audit: Audit) => (
                    <div key={audit.id} className='flex items-center gap-3 py-3'>
                      <StatusIcon status={audit.status} />
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <p className='truncate text-sm font-medium'>{audit.url}</p>
                          <a
                            href={audit.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='shrink-0 text-muted-foreground hover:text-foreground'
                          >
                            <ExternalLink className='h-3 w-3' />
                          </a>
                        </div>
                        <p className='text-xs text-muted-foreground'>
                          {audit.completed_pages}/{audit.total_pages || '?'} pages &middot;{' '}
                          {new Date(audit.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Badge className={statusBadgeClass(audit.status)}>{audit.status}</Badge>
                        {audit.status === 'completed' && (
                          <Button variant='ghost' size='sm' asChild className='h-7 px-2'>
                            <Link to='/audits/$auditId' params={{ auditId: audit.id }}>
                              View
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}

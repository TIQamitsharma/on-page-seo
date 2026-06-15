import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, CircleCheck as CheckCircle2, Circle as XCircle, Loader as Loader2, Zap, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { settingsApi } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

const apiKeysSchema = z.object({
  firecrawl_api_key: z.string().optional(),
  dataforseo_username: z.string().optional(),
  dataforseo_password: z.string().optional(),
  claude_api_key: z.string().optional(),
  openrouter_api_key: z.string().optional(),
})

type ApiKeysFormValues = z.infer<typeof apiKeysSchema>

function StatusBadge({ configured, label }: { configured: boolean; label: string }) {
  return (
    <div className='flex items-center gap-3 rounded-lg border p-4'>
      {configured ? (
        <CheckCircle2 className='h-5 w-5 shrink-0 text-green-500' />
      ) : (
        <XCircle className='h-5 w-5 shrink-0 text-red-500' />
      )}
      <div>
        <p className='font-medium'>{label}</p>
        <p className='text-sm text-muted-foreground'>{configured ? 'Configured' : 'Not configured'}</p>
      </div>
    </div>
  )
}

export function ApiKeysForm() {
  const queryClient = useQueryClient()
  const [show, setShow] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => setShow((prev) => ({ ...prev, [key]: !prev[key] }))

  const [testingFirecrawl, setTestingFirecrawl] = useState(false)
  const [testingDataForSeo, setTestingDataForSeo] = useState(false)

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['settings', 'status'],
    queryFn: () => settingsApi.getStatus(),
  })

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll(),
  })

  const form = useForm<ApiKeysFormValues>({
    resolver: zodResolver(apiKeysSchema),
    defaultValues: {
      firecrawl_api_key: '',
      dataforseo_username: '',
      dataforseo_password: '',
      claude_api_key: '',
      openrouter_api_key: '',
    },
  })

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast.success('API settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      form.reset()
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'))
    },
  })

  function onSubmit(data: ApiKeysFormValues) {
    const updates: Partial<ApiKeysFormValues> = {}
    if (data.firecrawl_api_key) updates.firecrawl_api_key = data.firecrawl_api_key
    if (data.dataforseo_username) updates.dataforseo_username = data.dataforseo_username
    if (data.dataforseo_password) updates.dataforseo_password = data.dataforseo_password
    if (data.claude_api_key) updates.claude_api_key = data.claude_api_key
    if (data.openrouter_api_key) updates.openrouter_api_key = data.openrouter_api_key

    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save')
      return
    }
    updateMutation.mutate(updates)
  }

  async function testFirecrawl() {
    setTestingFirecrawl(true)
    try {
      const result = await settingsApi.testFirecrawl()
      if (result.success) toast.success(result.message || 'Firecrawl connected!')
      else toast.error(result.error || 'Firecrawl test failed')
    } catch (error) {
      toast.error('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setTestingFirecrawl(false)
    }
  }

  async function testDataForSeo() {
    setTestingDataForSeo(true)
    try {
      const result = await settingsApi.testDataForSeo()
      if (result.success) toast.success(result.message || 'DataForSEO connected!')
      else toast.error(result.error || 'DataForSEO test failed')
    } catch (error) {
      toast.error('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setTestingDataForSeo(false)
    }
  }

  const isLoading = statusLoading || settingsLoading

  function PasswordField({ name, placeholder, label, description }: { name: keyof ApiKeysFormValues; placeholder: string; label: string; description: string }) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className='relative'>
                <Input
                  type={show[name] ? 'text' : 'password'}
                  placeholder={placeholder}
                  {...field}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                  onClick={() => toggle(name)}
                >
                  {show[name] ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </Button>
              </div>
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <div className='space-y-6'>
      {/* Status Overview */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {isLoading ? (
          <div className='col-span-4 flex justify-center p-4'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <>
            <StatusBadge configured={!!status?.firecrawl_configured} label='Firecrawl API' />
            <StatusBadge configured={!!status?.dataforseo_configured} label='DataForSEO API' />
            <StatusBadge configured={!!status?.claude_configured} label='Claude AI' />
            <StatusBadge configured={!!status?.openrouter_configured} label='OpenRouter AI' />
          </>
        )}
      </div>

      {!status?.all_configured && !isLoading && (
        <Alert>
          <AlertDescription>
            Firecrawl and DataForSEO are required to run audits. Add Claude or OpenRouter to enable AI recommendations.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-10'>
          {/* Firecrawl */}
          <div className='space-y-4'>
            <div>
              <h3 className='text-lg font-medium'>Firecrawl API</h3>
              <p className='text-sm text-muted-foreground'>
                Used for discovering pages on a website.{' '}
                <a href='https://firecrawl.dev' target='_blank' rel='noopener noreferrer' className='text-primary underline'>
                  firecrawl.dev
                </a>
              </p>
            </div>
            <FormField
              control={form.control}
              name='firecrawl_api_key'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <div className='flex gap-2'>
                      <div className='relative flex-1'>
                        <Input
                          type={show.firecrawl_api_key ? 'text' : 'password'}
                          placeholder={settings?.firecrawl_api_key || 'fc-xxxxxxxxxxxxxxxx'}
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                          onClick={() => toggle('firecrawl_api_key')}
                        >
                          {show.firecrawl_api_key ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                        </Button>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={testFirecrawl}
                        disabled={testingFirecrawl || !status?.firecrawl_configured}
                      >
                        {testingFirecrawl ? <Loader2 className='h-4 w-4 animate-spin' /> : <><Zap className='mr-1 h-4 w-4' />Test</>}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {settings?.firecrawl_api_key_configured === 'true' ? 'A key is saved. Enter a new one to replace it.' : 'Enter your Firecrawl API key.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* DataForSEO */}
          <div className='space-y-4'>
            <div>
              <h3 className='text-lg font-medium'>DataForSEO API</h3>
              <p className='text-sm text-muted-foreground'>
                Used for on-page SEO analysis (74+ metrics).{' '}
                <a href='https://dataforseo.com' target='_blank' rel='noopener noreferrer' className='text-primary underline'>
                  dataforseo.com
                </a>
              </p>
            </div>
            <FormField
              control={form.control}
              name='dataforseo_username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username / Email</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder={settings?.dataforseo_username || 'your-email@example.com'}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {settings?.dataforseo_username_configured === 'true' ? 'A username is saved. Enter a new one to replace it.' : 'Your DataForSEO account email.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='dataforseo_password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Password</FormLabel>
                  <FormControl>
                    <div className='flex gap-2'>
                      <div className='relative flex-1'>
                        <Input
                          type={show.dataforseo_password ? 'text' : 'password'}
                          placeholder={settings?.dataforseo_password || 'Your API password'}
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                          onClick={() => toggle('dataforseo_password')}
                        >
                          {show.dataforseo_password ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                        </Button>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={testDataForSeo}
                        disabled={testingDataForSeo || !status?.dataforseo_configured}
                      >
                        {testingDataForSeo ? <Loader2 className='h-4 w-4 animate-spin' /> : <><Zap className='mr-1 h-4 w-4' />Test</>}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {settings?.dataforseo_password_configured === 'true' ? 'A password is saved. Enter a new one to replace it.' : 'Your DataForSEO API password.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* AI Keys */}
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Bot className='h-5 w-5 text-primary' />
              <div>
                <h3 className='text-lg font-medium'>AI Recommendations</h3>
                <p className='text-sm text-muted-foreground'>Configure one AI provider to enable AI-powered SEO recommendations. OpenRouter is preferred (cheaper, multi-model).</p>
              </div>
            </div>

            <div className='grid gap-6 sm:grid-cols-2'>
              {/* OpenRouter */}
              <div className='space-y-3 rounded-lg border p-4'>
                <div>
                  <p className='font-medium'>OpenRouter (Recommended)</p>
                  <p className='text-xs text-muted-foreground'>
                    Access 100+ AI models.{' '}
                    <a href='https://openrouter.ai' target='_blank' rel='noopener noreferrer' className='text-primary underline'>
                      openrouter.ai
                    </a>
                  </p>
                </div>
                <PasswordField
                  name='openrouter_api_key'
                  placeholder={settings?.openrouter_api_key || 'sk-or-xxxxxxxxxxxxxxxx'}
                  label='API Key'
                  description={settings?.openrouter_api_key_configured === 'true' ? 'Key saved. Enter new to replace.' : 'Enter your OpenRouter API key.'}
                />
              </div>

              {/* Claude */}
              <div className='space-y-3 rounded-lg border p-4'>
                <div>
                  <p className='font-medium'>Anthropic Claude</p>
                  <p className='text-xs text-muted-foreground'>
                    Direct Claude access.{' '}
                    <a href='https://console.anthropic.com' target='_blank' rel='noopener noreferrer' className='text-primary underline'>
                      console.anthropic.com
                    </a>
                  </p>
                </div>
                <PasswordField
                  name='claude_api_key'
                  placeholder={settings?.claude_api_key || 'sk-ant-xxxxxxxxxxxxxxxx'}
                  label='API Key'
                  description={settings?.claude_api_key_configured === 'true' ? 'Key saved. Enter new to replace.' : 'Enter your Anthropic API key.'}
                />
              </div>
            </div>
          </div>

          <Button type='submit' disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save API Keys
          </Button>
        </form>
      </Form>
    </div>
  )
}

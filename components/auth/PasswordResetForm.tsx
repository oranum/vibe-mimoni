'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/context/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const passwordResetSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type PasswordResetFormData = z.infer<typeof passwordResetSchema>

interface PasswordResetFormProps {
  onSuccess?: () => void
  onBackToLogin?: () => void
}

export default function PasswordResetForm({ onSuccess, onBackToLogin }: PasswordResetFormProps) {
  const { resetPassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const form = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: ''
    }
  })

  const onSubmit = async (data: PasswordResetFormData) => {
    setLoading(true)
    setMessage(null)

    const { error } = await resetPassword(data.email)

    if (error) {
      setMessage({ type: 'error', text: error })
    } else {
      setMessage({ 
        type: 'success', 
        text: 'Check your email for a password reset link!' 
      })
      form.reset()
      onSuccess?.()
    }
    
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter your email"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {message && (
              <div className={`p-3 rounded-md text-sm ${
                message.type === 'error' 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message.text}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </Button>

            {onBackToLogin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 
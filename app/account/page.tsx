import { createClient } from '@/utils/supabase/server'
import { LoginForm } from '@/components/LoginForm'
import { AccountDashboard } from '@/components/AccountDashboard'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return <AccountDashboard />
  }

  return <LoginForm />
}

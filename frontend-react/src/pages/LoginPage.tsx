import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

export function LoginPage() {
  const [login, setLogin] = useState('manager')
  const [password, setPassword] = useState('manager123')
  const [error, setError] = useState('')
  const { login: doLogin, loading } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!login.trim() || !password.trim()) { setError('Введите логин и пароль'); return }
    try {
      await doLogin(login, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Вход в систему</CardTitle>
          <CardDescription>B2B платформа управления заказами</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Field label="Логин">
              <Input value={login} onChange={e => setLogin(e.target.value)} placeholder="manager" autoFocus />
            </Field>
            <Field label="Пароль">
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground space-y-0.5">
              <p>Менеджер: <code className="font-mono">manager / manager123</code></p>
              <p>Администратор: <code className="font-mono">admin / admin123</code></p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Входим...' : 'Войти'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

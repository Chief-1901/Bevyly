'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Squares2X2Icon } from '@heroicons/react/24/outline';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    // Basic validation
    const newErrors: FormErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({
          general: data.error?.message || 'Invalid email or password',
        });
        setIsLoading(false);
        return;
      }

      // Redirect to briefing on success
      router.push('/briefing');
      router.refresh();
    } catch {
      setErrors({ general: 'An unexpected error occurred' });
      setIsLoading(false);
    }
  };

  return (
    <Card padding="lg" className="shadow-floating">
      <CardContent>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-md bg-secondary-500 flex items-center justify-center">
              <Squares2X2Icon className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-text-primary">Bevyly</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
          Welcome back
        </h1>
        <p className="text-text-muted text-center mb-8">
          Sign in to your account to continue
        </p>

        {errors.general && (
          <div className="mb-6 p-3 bg-danger/10 border border-danger/20 rounded-md text-sm text-danger">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1.5">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary-700 hover:text-primary-900 font-medium">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}


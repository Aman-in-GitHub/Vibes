import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { toast } from 'sonner';
import useAuth from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Loading from '@/components/Loading';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

const SignInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type SignInFormData = z.infer<typeof SignInSchema>;

function SignIn() {
  const [error, setError] = useState<string>('');
  const { isAuthenticated, isLoading } = useAuth();
  const { register, handleSubmit, formState, reset } = useForm<SignInFormData>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    toast.warning('You’re already logged in. Redirecting your feed');
    return <Navigate to="/" replace={true} />;
  }

  async function onSignIn(data: SignInFormData) {
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (error) {
        throw error;
      }

      reset();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
    }
  }

  if (error) {
    toast.error(error);
  }

  return (
    <main className="motion-blur-in motion-opacity-in motion-duration-1000 mx-auto flex min-h-screen max-w-[90%] flex-col justify-center py-8">
      <h1 className="mb-4 text-7xl font-bold">Log in to your account</h1>

      <form onSubmit={handleSubmit(onSignIn)} className="space-y-2">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            {...register('email')}
            type="email"
            className={
              formState.errors.email
                ? 'ring ring-red-500 focus-visible:ring-red-500'
                : ''
            }
          />
          {formState.errors.email && (
            <p className="mt-1 text-xs font-semibold text-red-500">
              {formState.errors.email.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            {...register('password')}
            className={
              formState.errors.password
                ? 'ring ring-red-500 focus-visible:ring-red-500'
                : ''
            }
          />
          {formState.errors.password && (
            <p className="mt-1 text-xs font-semibold text-red-500">
              {formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full rounded-xs bg-green-600 py-3 text-lg disabled:cursor-not-allowed disabled:opacity-50"
            disabled={formState.isSubmitting}
          >
            Sign in
          </button>
        </div>

        <div className="pt-2">
          <p className="text-sm">
            Don't have an account?{' '}
            <Link
              to="/auth/create-account"
              className="whitespace-nowrap underline underline-offset-2"
            >
              Create a new account
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}

export default SignIn;

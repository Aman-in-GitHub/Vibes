import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import useAuth from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import Loading from '@/components/Loading';

const SignUpSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[\W_]/, 'Password must contain at least one special character'),
    confirmPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[\W_]/, 'Password must contain at least one special character')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword']
  });

type SignUpFormData = z.infer<typeof SignUpSchema>;

function SignUp() {
  const [error, setError] = useState('');
  const { isAuthenticated, isLoading } = useAuth();
  const { register, handleSubmit, formState, reset } = useForm<SignUpFormData>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace={true} />;
  }

  async function onSignUp(data: SignUpFormData) {
    setError('');

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password
      });

      if (authError) {
        throw authError;
      }

      reset();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
    }
  }

  if (error) {
    return (
      <div>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <main className="motion-blur-in motion-opacity-in motion-duration-1000 mx-auto flex min-h-screen max-w-[90%] flex-col justify-center py-8">
      <h1 className="mb-4 text-8xl font-bold">Create a new account</h1>

      <form onSubmit={handleSubmit(onSignUp)} className="space-y-2">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            {...register('email')}
            type="email"
            className={formState.errors.email ? 'border-red-600' : ''}
          />
          {formState.errors.email && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              {formState.errors.email.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            {...register('password')}
            className={formState.errors.password ? 'border-red-600' : ''}
          />
          {formState.errors.password && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              {formState.errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            {...register('confirmPassword')}
            className={formState.errors.confirmPassword ? 'border-red-600' : ''}
          />
          {formState.errors.confirmPassword && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              {formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full"
            disabled={formState.isSubmitting}
          >
            Sign up
          </button>
        </div>

        <div className="pt-2">
          <p className="text-sm">
            Already have an account?{' '}
            <Link
              to="/auth/sign-in"
              className="whitespace-nowrap underline underline-offset-2"
            >
              Sign in to your account
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}

export default SignUp;

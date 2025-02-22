import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { toast } from 'sonner';
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
    toast.warning('You’re already logged in. Redirecting your feed');
    return <Navigate to="/" replace={true} />;
  }

  async function onSignUp(data: SignUpFormData) {
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password
      });

      console.log(authData);

      if (authError) {
        throw authError;
      }

      toast.info('Check your email for a verification link');

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
      <h1 className="mb-4 text-7xl font-bold">Create a new account</h1>

      <form onSubmit={handleSubmit(onSignUp)} className="space-y-2">
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
            <p className="mt-1 text-xs font-semibold text-red-600">
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
            <p className="mt-1 text-xs font-semibold text-red-600">
              {formState.errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            {...register('confirmPassword')}
            className={
              formState.errors.confirmPassword
                ? 'ring ring-red-500 focus-visible:ring-red-500'
                : ''
            }
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
            className="w-full rounded-xs bg-blue-600 py-3 text-lg"
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
              Log in to your account
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}

export default SignUp;

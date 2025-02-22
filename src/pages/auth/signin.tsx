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
import { PiSpinner as Spinner } from 'react-icons/pi';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot
} from '@/components/ui/input-otp';

const SignInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email')
});

type SignInFormData = z.infer<typeof SignInSchema>;

function SignIn() {
  const [otp, setOtp] = useState('');
  const [screen, setScreen] = useState<'otp' | 'signin'>('signin');
  const { isAuthenticated, isLoading } = useAuth();
  const { register, handleSubmit, getValues, formState, reset } =
    useForm<SignInFormData>({
      resolver: zodResolver(SignInSchema),
      defaultValues: {
        email: ''
      }
    });

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    if (screen !== 'otp') {
      toast.warning('You’re already logged in. Redirecting to your feed');
    }
    return <Navigate to="/" replace={true} />;
  }

  async function onSignIn(data: SignInFormData) {
    try {
      const { data: emailExists, error } = await supabase.rpc(
        'does_email_exist',
        { email: data.email }
      );

      if (!emailExists) {
        toast.error('User with this email does not exist');
        return;
      }

      if (error) {
        throw error;
      }
      const { error: OtpError } = await supabase.auth.signInWithOtp({
        email: data.email
      });

      if (OtpError) {
        throw OtpError;
      }

      setScreen('otp');
    } catch (error) {
      console.error('Signin Error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong'
      );
    }
  }

  async function verifyOTP(OTP: string) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: getValues('email'),
        token: OTP,
        type: 'magiclink'
      });

      if (error) {
        throw error;
      }

      toast.success('OTP verified successfully');

      reset();
      setOtp('');

      return <Navigate to="/" replace={true} />;
    } catch (error) {
      console.error(
        'OTP Verification Error:',
        error instanceof Error ? error.message : 'Something went wrong'
      );
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong'
      );
      setScreen('signin');
      setOtp('');
      return;
    }
  }

  return (
    <main className="motion-blur-in motion-opacity-in motion-duration-1000 mx-auto flex min-h-screen max-w-[90%] flex-col justify-center py-8">
      {screen === 'signin' ? (
        <>
          <h1 className="mb-4 text-7xl font-bold">Log in to your account</h1>

          <form onSubmit={handleSubmit(onSignIn)} className="space-y-4">
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
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xs bg-rose-600 py-3 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                disabled={formState.isSubmitting}
              >
                {formState.isSubmitting && <Spinner className="animate-spin" />}

                {formState.isSubmitting ? 'Sending you an OTP' : 'Continue'}
              </button>
            </div>

            <div>
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
        </>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <h1 className="mb-12 text-7xl font-bold">Verify your OTP</h1>

          <InputOTP
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={otp}
            onChange={(value) => setOtp(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <button
            type="submit"
            onClick={() => verifyOTP(otp)}
            className="mt-12 flex w-full items-center justify-center gap-2 rounded-xs bg-blue-600 py-3 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create your account
          </button>
        </div>
      )}
    </main>
  );
}

export default SignIn;

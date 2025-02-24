import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { toast } from 'sonner';
import useAuth from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PiSpinner as Spinner } from 'react-icons/pi';
import { Checkbox } from '@/components/ui/checkbox';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot
} from '@/components/ui/input-otp';
import { db } from '@/lib/dexie';

const SignUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Your email is required')
    .email('Enter a valid email'),
  name: z.string().min(1, 'Your name is required'),
  age: z.number().min(12, 'Your must be 12 years or older'),
  sex: z.enum(['Male', 'Female']),
  isNsfw: z.boolean().optional(),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms to continue'
  })
});

type SignUpFormData = z.infer<typeof SignUpSchema>;

function SignUp() {
  const [otp, setOtp] = useState('');
  const [screen, setScreen] = useState<'signup' | 'otp'>('signup');
  const { isAuthenticated, isLoading } = useAuth();
  const {
    control,
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    reset
  } = useForm<SignUpFormData>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: '',
      name: '',
      age: 10,
      sex: 'Male',
      isNsfw: false,
      terms: false
    }
  });

  if (isLoading) {
    return null;
  }

  useEffect(() => {
    document.title = 'Signup - Vibes';
  }, []);

  if (isAuthenticated) {
    if (!isSubmitSuccessful) {
      toast.warning('You’re already logged in. Redirecting to your feed');
    }
    return <Navigate to="/" replace={true} />;
  }

  async function onSignUp(data: SignUpFormData) {
    try {
      const { data: emailExists, error } = await supabase.rpc(
        'does_email_exist',
        { email: data.email }
      );

      if (emailExists) {
        toast.error('User with this email already exists');
        return;
      }

      if (error) {
        throw error;
      }

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: data.email
      });

      if (authError) throw authError;

      toast.info('Check your email for an OTP');
      setScreen('otp');
    } catch (error) {
      console.error('Signup Error:', error);
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
        type: 'signup'
      });

      if (error) throw error;

      const { data, error: seedError } = await supabase
        .from('profiles')
        .insert({
          email: getValues('email'),
          name: getValues('name'),
          age: getValues('age'),
          sex: getValues('sex').toLowerCase(),
          isNsfw: getValues('isNsfw')
        })
        .select('auth_id');

      if (seedError) {
        throw seedError;
      }

      toast.success('Welcome to Vibes');

      await db.users.put({
        id: data[0].auth_id,
        name: getValues('name'),
        email: getValues('email'),
        age: getValues('age'),
        sex: getValues('sex').toLowerCase() as 'male' | 'female',
        isNsfw: getValues('isNsfw') || false,
        isSynced: true
      });

      reset();
      setOtp('');
      return <Navigate to="/" replace={true} />;
    } catch (error) {
      console.error('OTP Verification Error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong'
      );
      setScreen('signup');
      setOtp('');
      return;
    }
  }

  return (
    <main className="motion-opacity-in motion-duration-1000 mx-auto flex min-h-screen max-w-[90%] flex-col justify-center py-8">
      {screen === 'signup' ? (
        <>
          <h1 className="mb-4 text-7xl font-bold">Create a new account</h1>

          <form onSubmit={handleSubmit(onSignUp)} className="space-y-4">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                {...register('name')}
                className={
                  errors.name
                    ? 'ring ring-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
              {errors.name && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                {...register('age', { valueAsNumber: true })}
                className={
                  errors.age
                    ? 'ring ring-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
              {errors.age && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {errors.age.message}
                </p>
              )}
            </div>

            <div>
              <Label>Sex</Label>
              <Controller
                name="sex"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-4 text-lg">
                    <div
                      onClick={() => field.onChange('Male')}
                      className={`flex h-20 w-full items-center justify-center rounded-xs bg-blue-600 duration-500 ${
                        field.value === 'Male' ? '' : 'grayscale'
                      } cursor-pointer`}
                    >
                      Male
                    </div>
                    <div
                      onClick={() => field.onChange('Female')}
                      className={`flex h-20 w-full items-center justify-center rounded-xs bg-pink-600 duration-500 ${
                        field.value === 'Female' ? '' : 'grayscale'
                      } cursor-pointer`}
                    >
                      Female
                    </div>
                  </div>
                )}
              />
            </div>

            <div>
              <Label>Adult Content</Label>
              <Controller
                name="isNsfw"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-4 text-lg">
                    <div
                      onClick={() => field.onChange(false)}
                      className={`flex h-20 w-full items-center justify-center rounded-xs bg-green-600 duration-500 ${
                        !field.value ? '' : 'grayscale'
                      } cursor-pointer`}
                    >
                      No, I'm good
                    </div>
                    <div
                      onClick={() => field.onChange(true)}
                      className={`flex h-20 w-full items-center justify-center rounded-xs bg-red-600 duration-500 ${
                        field.value ? '' : 'grayscale'
                      } cursor-pointer`}
                    >
                      Yeah Sure
                    </div>
                  </div>
                )}
              />
            </div>

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={
                  errors.email
                    ? 'ring ring-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
              {errors.email && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="terms"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="terms"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />

                {/* TODO: Add terms and conditions dialog */}
                <Label className="leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I have read and agree to the{' '}
                  <span className="text-blue-600 underline underline-offset-2">
                    terms and conditions
                  </span>
                </Label>
              </div>

              {errors.terms && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {errors.terms.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xs bg-rose-600 py-3 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner className="animate-spin" />}
                {isSubmitting ? 'Sending you an OTP' : 'Continue'}
              </button>
            </div>

            <div>
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

export default SignUp;

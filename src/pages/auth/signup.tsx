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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { AnimatePresence, motion } from 'motion/react';
import Confetti from 'react-confetti';
import { useUserStore } from '@/context/UserStore';
import { useColorStore } from '@/context/ColorStore';

const terms = `
**1. Agreement to Terms:** By accessing and using Vibes, you agree to these Terms and Conditions. If you disagree, do not use Vibes.

**2. Service Description:** Vibes is a book reading application that aggregates content from various online platforms. We strive to provide a diverse reading experience.

**3. Content & Usage:**
**"As Is" Content:** Content on Vibes is provided "as is" and we do not guarantee its accuracy, completeness, or legality.

**Personal Use:** Vibes is for your personal, non-commercial use only.

**Respectful Use:** Use Vibes responsibly and legally. Do not misuse or disrupt the service.

**4. Adult Content (NSFW):**
**Optional Access:** Vibes may offer access to adult-themed content ("NSFW").

**Age Verification (Implied):** By choosing to view NSFW content, you confirm you are of legal age in your jurisdiction to view adult material.

**Explicit Consent:** You must explicitly consent to view NSFW content. This is a conscious choice you make.

**No Objections Allowed:** **By agreeing to view NSFW content, you irrevocably waive any right to object to its nature, content, or exposure.** You acknowledge that you were warned and chose to proceed.

**Your Responsibility:** Viewing NSFW content is entirely at your own discretion and risk. We are not responsible for the nature of the NSFW content itself.

**5. Intellectual Property:** Content on Vibes is sourced from various platforms. We do not claim ownership of external content. Respect copyright laws and the rights of content creators.

**6. Disclaimer of Warranties:** Vibes is provided without warranties of any kind, express or implied. We do not guarantee uninterrupted service, error-free operation, or content suitability.

**7. Limitation of Liability:** To the maximum extent permitted by law, Vibes (and its operators) will not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of Vibes, including but not limited to content issues or exposure.

**8. Indemnification:** You agree to indemnify and hold Vibes harmless from any claims, losses, or liabilities arising from your use of Vibes or violation of these Terms.

**9. Termination:** We may terminate your access to Vibes at any time, for any reason, without notice.

**10. Changes to Terms:** We may update these Terms at any time. Continued use after changes means you accept the updated Terms.

**11. Contact:** For any questions, please contact me via [mail](mailto:amanchandinc@gmail.com).

**TLDR**: _Use Vibes legally and responsibly. NSFW content is optional and comes with a "no complaints" policy if you choose to view it. Vibes is not responsible for content or issues arising from use._
`;

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
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const setUser = useUserStore.getState().setUser;
  const clearUser = useUserStore.getState().clearUser;
  const clearColor = useColorStore.getState().clearColor;
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

  useEffect(() => {
    document.title = 'Signup - Vibes';
  }, []);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    if (!isSubmitSuccessful) {
      toast.warning('You’re already logged in. Redirecting');
    }
    return <Navigate to="/" replace={true} />;
  }

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  async function onSignUp(data: SignUpFormData) {
    if (!hasReadTerms) {
      toast.error('You must read all the terms to continue');
      setIsDrawerOpen(true);
      return;
    }
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
          is_nsfw: getValues('isNsfw'),
          scrolled_posts: [],
          read_posts: []
        })
        .select('auth_id');

      if (seedError) {
        throw seedError;
      }

      await db.users.clear();
      await db.likes.clear();
      await db.bookmarks.clear();
      clearUser();
      clearColor();

      const localUser = {
        id: data[0].auth_id,
        name: getValues('name'),
        email: getValues('email'),
        age: getValues('age'),
        sex: getValues('sex').toLowerCase() as 'male' | 'female',
        avatarUrl: '',
        isNsfw: getValues('isNsfw') || false,
        scrolledPosts: [],
        readPosts: []
      };

      await db.users.put(localUser);
      setUser(localUser);

      toast.success('Welcome to Vibes', {
        duration: 5000
      });

      reset();
      setOtp('');
      setHasReadTerms(false);
      setShowConfetti(true);
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
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              numberOfPieces={250}
              gravity={0.1}
            />
          </motion.div>
        )}
      </AnimatePresence>

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

                <Label className="leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I have read and agree to all the{' '}
                  <Drawer
                    open={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                  >
                    <span
                      className="text-blue-600 underline underline-offset-2"
                      onClick={() => setIsDrawerOpen(true)}
                    >
                      terms and conditions
                    </span>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle className="text-center">
                          Terms & Conditions - Vibes
                        </DrawerTitle>
                        <DrawerDescription className="-mb-6 h-[60dvh] overflow-y-auto">
                          <Markdown
                            components={{
                              p: ({ node, ...props }) => (
                                <p {...props} className="mb-2 text-lg" />
                              ),
                              a: ({ node, ...props }) => (
                                <a
                                  {...props}
                                  className={`cursor-pointer text-white underline decoration-rose-600 underline-offset-2`}
                                />
                              )
                            }}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {terms}
                          </Markdown>
                        </DrawerDescription>
                      </DrawerHeader>
                      <DrawerFooter className="">
                        <DrawerClose className="w-full">
                          <button
                            onClick={() => {
                              setHasReadTerms(true);
                            }}
                            className="w-full rounded-xs bg-rose-600 py-3 text-lg"
                          >
                            I have read all the terms
                          </button>
                        </DrawerClose>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
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
        <section className="motion-opacity-in motion-duration-1000 flex flex-col items-center justify-center">
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
        </section>
      )}
    </main>
  );
}

export default SignUp;

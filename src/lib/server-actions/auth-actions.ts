'use server';

import { z } from 'zod';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { FormSchema } from '../types';
import { cookies } from 'next/headers';

export async function actionLoginUser(formData: z.infer<typeof FormSchema>) {
  'use server';
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const response = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });
  return response;
}

export async function actionSignUpUser(formData: z.infer<typeof FormSchema>) {
  'use server';
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('email', formData.email);

  if (data?.length) return { error: { message: 'User already exists', data } };

  const response = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    },
  });

  return response;
}

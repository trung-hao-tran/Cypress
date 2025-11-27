'use server';

import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { FormSchema } from '../types';
import { cookies } from 'next/headers';

export async function actionLoginUser(formData: z.infer<typeof FormSchema>) {
  'use server';
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const response = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });
  return response;
}

export async function actionSignUpUser(formData: z.infer<typeof FormSchema>) {
  'use server';
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

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

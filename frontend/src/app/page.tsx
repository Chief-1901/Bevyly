import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const hasAuth = cookieStore.has('access_token');
  
  if (hasAuth) {
    redirect('/briefing');
  } else {
    redirect('/login');
  }
}


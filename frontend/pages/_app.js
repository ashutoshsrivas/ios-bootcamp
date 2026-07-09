import '../styles/globals.css';
import Head from 'next/head';
import { AuthProvider } from '../lib/auth';
import { BootcampProvider } from '../lib/bootcamp';
import { PrefsProvider } from '../lib/prefs';
import { ToastProvider } from '../components/UI';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>iOS Bootcamp</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <PrefsProvider>
        <ToastProvider>
          <AuthProvider>
            <BootcampProvider>
              <Component {...pageProps} />
            </BootcampProvider>
          </AuthProvider>
        </ToastProvider>
      </PrefsProvider>
    </>
  );
}

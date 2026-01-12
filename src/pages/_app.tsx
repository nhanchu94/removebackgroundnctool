import type { AppProps } from 'next/app';
import { ApiKeyProvider } from '../context/ApiKeyContext';
import { JobQueueProvider } from '../context/JobQueueContext';
import '../app/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ApiKeyProvider>
      <JobQueueProvider>
        <Component {...pageProps} />
      </JobQueueProvider>
    </ApiKeyProvider>
  );
}

"use client";

import React from 'react';
import { ApiKeyProvider } from '../context/ApiKeyContext';
import { JobQueueProvider } from '../context/JobQueueContext';

// Wraps global context providers for the app router
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApiKeyProvider>
      <JobQueueProvider>
        {children}
      </JobQueueProvider>
    </ApiKeyProvider>
  );
}

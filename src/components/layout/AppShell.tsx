"use client";

import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { Page } from '../../types';

const pageToPath: Record<Page, string> = {
  [Page.TEXT_TO_IMAGE]: '/text-to-image',
  [Page.REMIX_IMAGE]: '/remix-image',
  [Page.REMOVE_BACKGROUND]: '/remove-background',
  [Page.GENERATE_VIDEO]: '/text-to-video',
  [Page.QUEUE]: '/queue',
  [Page.SETTINGS]: '/settings',
};

const pathToPage = new Map<string, Page>([
  ['/text-to-image', Page.TEXT_TO_IMAGE],
  ['/remix-image', Page.REMIX_IMAGE],
  ['/remove-background', Page.REMOVE_BACKGROUND],
  ['/text-to-video', Page.GENERATE_VIDEO],
  ['/queue', Page.QUEUE],
  ['/settings', Page.SETTINGS],
]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const currentPage = useMemo(() => {
    // Normalize pathname without trailing slash
    const normalized = pathname?.replace(/\/$/, '') || '/text-to-image';
    return pathToPage.get(normalized) || Page.TEXT_TO_IMAGE;
  }, [pathname]);

  const handleNavigate = (page: Page) => {
    const target = pageToPath[page];
    if (target && target !== pathname) {
      router.push(target);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      <Sidebar currentPage={currentPage} setCurrentPage={handleNavigate} />
      <div className="flex-1 flex flex-col ml-64">
        <Header currentPage={currentPage} />
        <main className="flex-1 p-6 overflow-y-auto bg-gray-950/60">
          {children}
        </main>
      </div>
    </div>
  );
}

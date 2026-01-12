
import React from 'react';
import { Page } from '../../types';
import { useJobQueue } from '../../context/JobQueueContext';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{
  page: Page;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  icon: React.ReactElement;
  badgeCount?: number;
}> = ({ page, currentPage, setCurrentPage, icon, badgeCount = 0 }) => (
  <li>
    <button
      onClick={() => setCurrentPage(page)}
      className={`w-full flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
        currentPage === page
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-3 flex-1 text-left">{page}</span>
      {badgeCount > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 ml-3 text-xs font-medium text-blue-100 bg-blue-800 rounded-full">
              {badgeCount}
          </span>
      )}
    </button>
  </li>
);

// SVG Icon components defined internally
const TextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18.1H3"/></svg>;
const RemixIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.1 13.3-2.5-2.5a3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l2.5-2.5a3.5 3.5 0 0 0 0-4.95Z"/><path d="m12.05 12.05 4.9-4.9"/><path d="m4.9 19.1 2.5-2.5a3.5 3.5 0 0 0 0-4.95l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l2.5-2.5"/><path d="m14.1 14.1 4.9-4.9"/></svg>;
const RemoveBgIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7z"/><path d="M22 21H7"/><path d="m5 12 5 5"/></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>;
const QueueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M16 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M3 3h18v10H3z"/><path d="M3 13v5"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.15l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.15l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const { getJobStats } = useJobQueue();
  const stats = getJobStats();
  const queueBadgeCount = stats.pending + stats.inProgress;

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 h-full fixed top-0 left-0 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">NC Tool - AI Image AIO</h2>
      </div>
      <nav className="flex-1 px-2 py-4">
        <ul>
            <NavItem page={Page.TEXT_TO_IMAGE} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<TextIcon />} />
            <NavItem page={Page.REMIX_IMAGE} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<RemixIcon />} />
            <NavItem page={Page.REMOVE_BACKGROUND} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<RemoveBgIcon />} />
            <NavItem page={Page.GENERATE_VIDEO} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<VideoIcon />} />
            <NavItem page={Page.QUEUE} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<QueueIcon />} badgeCount={queueBadgeCount} />
        </ul>
      </nav>
      <div className="px-2 py-4 border-t border-gray-700">
        <ul>
            <NavItem page={Page.SETTINGS} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<SettingsIcon />} />
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
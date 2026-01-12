
import React from 'react';
import { Page } from '../../types';

interface HeaderProps {
    currentPage: Page;
}

const Header: React.FC<HeaderProps> = ({ currentPage }) => {
    return (
        <header className="bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 p-4 border-b border-gray-700">
            <h1 className="text-2xl font-bold text-white">{currentPage}</h1>
        </header>
    );
};

export default Header;

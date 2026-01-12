
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { ApiKeys } from '../types';

interface ApiKeyContextType {
  apiKeys: ApiKeys;
  saveApiKeys: (keys: ApiKeys) => void;
  isGeminiKeySet: boolean;
  isPhotoRoomKeySet: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ gemini: '', photoRoom: '' });

  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem('apiKeys');
      if (storedKeys) {
        const parsed = JSON.parse(storedKeys);
        setApiKeys({
            gemini: parsed.gemini || '',
            photoRoom: parsed.photoRoom || '',
        });
      }
    } catch (error) {
        console.error("Failed to load keys from localStorage", error);
    }
  }, []);

  const saveApiKeys = (keys: ApiKeys) => {
    setApiKeys(keys);
    try {
      localStorage.setItem('apiKeys', JSON.stringify(keys));
    } catch (error) {
      console.error("Failed to save keys to localStorage", error);
    }
  };
  
  const isGeminiKeySet = !!apiKeys.gemini;
  const isPhotoRoomKeySet = !!apiKeys.photoRoom;

  return (
    <ApiKeyContext.Provider value={{ apiKeys, saveApiKeys, isGeminiKeySet, isPhotoRoomKeySet }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKeys = () => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKeys must be used within an ApiKeyProvider');
  }
  return context;
};

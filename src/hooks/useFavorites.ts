'use client'

import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'shamil_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to localStorage whenever favorites change
  const saveFavorites = useCallback((newFavorites: string[]) => {
    setFavorites(newFavorites);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const addFavorite = useCallback((municipality: string) => {
    setFavorites(prev => {
      if (prev.includes(municipality)) return prev;
      const updated = [...prev, municipality];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((municipality: string) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f !== municipality);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((municipality: string) => {
    setFavorites(prev => {
      const updated = prev.includes(municipality)
        ? prev.filter(f => f !== municipality)
        : [...prev, municipality];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const isFavorite = useCallback((municipality: string) => {
    return favorites.includes(municipality);
  }, [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}

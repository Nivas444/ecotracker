import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '../../types';

// ── Types ─────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

// ── Context ───────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  /**
   * Simulate async login.
   * "admin" → role: admin | anything else → role: viewer
   * Any password is accepted (demo only).
   */
  const login = useCallback(
    async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
      await delay(600); // simulate network latency

      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        return { success: false, error: 'Username is required.' };
      }
      if (!password) {
        return { success: false, error: 'Password is required.' };
      }

      const lowerUser = trimmedUsername.toLowerCase();
      let role: User['role'];
      let displayName: string;
      let avatarInitials: string;

      if (lowerUser === 'greencarib_admin' && password === 'GreenCarib@123') {
        role = 'admin';
        displayName = 'GreenCarib Admin';
        avatarInitials = 'GA';
      } else if (lowerUser === 'driver_john' && password === 'Driver@123') {
        role = 'driver';
        displayName = 'John Williams';
        avatarInitials = 'JW';
      } else {
        return { success: false, error: 'Invalid username or password.' };
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        username: lowerUser,
        role,
        displayName,
        avatarInitials,
      };

      setUser(newUser);
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

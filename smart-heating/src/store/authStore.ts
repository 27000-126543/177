import { createContext, useContext, useState, createElement } from 'react';
import type { ReactNode } from 'react';
import type { UserInfo, UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../types';
import { MOCK_USERS, generateAlerts } from '../mock/data';

interface AuthContextType {
  currentUser: UserInfo | null;
  isAuthenticated: boolean;
  pendingAlerts: number;
  userRegion: string;
  userStationIds: string[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const initialAlerts = generateAlerts().filter(a => a.status === 'pending').length;

function loadSavedAuth(): { user: UserInfo | null; region: string; stationIds: string[] } {
  try {
    const saved = localStorage.getItem('heating_auth');
    if (saved) {
      const parsed = JSON.parse(saved);
      const user = MOCK_USERS.find(u => u.id === parsed.userId);
      if (user) {
        return { user, region: user.region || '', stationIds: user.stationIds || [] };
      }
    }
  } catch {}
  return { user: null, region: '', stationIds: [] };
}

const saved = loadSavedAuth();

const AuthContext = createContext<AuthContextType>({
  currentUser: saved.user,
  isAuthenticated: !!saved.user,
  pendingAlerts: initialAlerts,
  userRegion: saved.region,
  userStationIds: saved.stationIds,
  login: () => false,
  logout: () => {},
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(saved.user);
  const [isAuthenticated, setIsAuthenticated] = useState(!!saved.user);
  const [pendingAlerts] = useState(initialAlerts);
  const [userRegion, setUserRegion] = useState(saved.region);
  const [userStationIds, setUserStationIds] = useState<string[]>(saved.stationIds);

  const login = (username: string, password: string): boolean => {
    if (password !== '123456') return false;
    const user = MOCK_USERS.find(u => u.name === username);
    if (!user) return false;
    setCurrentUser(user);
    setIsAuthenticated(true);
    setUserRegion(user.region || '');
    setUserStationIds(user.stationIds || []);
    localStorage.setItem('heating_auth', JSON.stringify({ userId: user.id }));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setUserRegion('');
    setUserStationIds([]);
    localStorage.removeItem('heating_auth');
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    return ROLE_PERMISSIONS[currentUser.role as UserRole].includes(permission);
  };

  return createElement(
    AuthContext.Provider,
    { value: { currentUser, isAuthenticated, pendingAlerts, userRegion, userStationIds, login, logout, hasPermission } },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

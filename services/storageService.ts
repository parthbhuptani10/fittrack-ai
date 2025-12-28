import { User, WeeklyPlan, ProgressLog } from '../types';

const KEYS = {
  USERS_DB: 'fittrack_users_db', // Stores array of all registered users
  SESSION: 'fittrack_session',   // Stores currently logged in user ID
  PLAN_PREFIX: 'fittrack_plan_', // Prefix + userId
  LOGS_PREFIX: 'fittrack_logs_', // Prefix + userId
  CHAT_PREFIX: 'fittrack_chat_', // Prefix + userId
  THEME: 'fittrack_theme',
};

export const StorageService = {
  // --- AUTH METHODS ---
  
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS_DB);
    return data ? JSON.parse(data) : [];
  },

  register: (user: User): boolean => {
    const users = StorageService.getUsers();
    if (users.find(u => u.email === user.email)) {
      return false; // User exists
    }
    users.push(user);
    localStorage.setItem(KEYS.USERS_DB, JSON.stringify(users));
    StorageService.setSession(user);
    return true;
  },

  login: (email: string, password: string): User | null => {
    const users = StorageService.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      StorageService.setSession(user);
      return user;
    }
    return null;
  },

  setSession: (user: User) => {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },

  logout: () => {
    localStorage.removeItem(KEYS.SESSION);
  },

  // --- DATA METHODS (User Scoped) ---

  savePlan: (userId: string, plan: WeeklyPlan) => {
    localStorage.setItem(KEYS.PLAN_PREFIX + userId, JSON.stringify(plan));
  },

  getPlan: (userId: string): WeeklyPlan | null => {
    const data = localStorage.getItem(KEYS.PLAN_PREFIX + userId);
    return data ? JSON.parse(data) : null;
  },

  saveLog: (userId: string, log: ProgressLog) => {
    const logs = StorageService.getLogs(userId);
    const index = logs.findIndex((l) => l.date === log.date);
    if (index >= 0) {
      logs[index] = { ...logs[index], ...log };
    } else {
      logs.push(log);
    }
    localStorage.setItem(KEYS.LOGS_PREFIX + userId, JSON.stringify(logs));
  },

  getLogs: (userId: string): ProgressLog[] => {
    const data = localStorage.getItem(KEYS.LOGS_PREFIX + userId);
    return data ? JSON.parse(data) : [];
  },

  // --- CHAT HISTORY ---

  saveChatHistory: (userId: string, history: { role: 'user' | 'model'; text: string }[]) => {
    localStorage.setItem(KEYS.CHAT_PREFIX + userId, JSON.stringify(history));
  },

  getChatHistory: (userId: string): { role: 'user' | 'model'; text: string }[] => {
    const data = localStorage.getItem(KEYS.CHAT_PREFIX + userId);
    return data ? JSON.parse(data) : [];
  },

  // --- SETTINGS ---

  setTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  getTheme: (): 'light' | 'dark' => {
    return (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') || 'light';
  },
};

import { create } from 'zustand';

export interface UIState {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isLogModalOpen: boolean;
  isFaceModalOpen: boolean;
  pendingCheckoutData: any;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebarCollapse: () => void;
  openLogModal: (data: any) => void;
  closeLogModal: () => void;
  openFaceModal: () => void;
  closeFaceModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  isSidebarCollapsed: false,
  isLogModalOpen: false,
  isFaceModalOpen: false,
  pendingCheckoutData: null,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  openLogModal: (checkoutData) => set({ isLogModalOpen: true, pendingCheckoutData: checkoutData }),
  closeLogModal: () => set({ isLogModalOpen: false, pendingCheckoutData: null }),
  openFaceModal: () => set({ isFaceModalOpen: true }),
  closeFaceModal: () => set({ isFaceModalOpen: false })
}));

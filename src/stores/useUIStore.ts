import { create } from 'zustand';

export interface UIState {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isLogModalOpen: boolean;
  isFaceModalOpen: boolean;
  pendingCheckoutData: any;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  openLogModal: (data: any) => void;
  closeLogModal: () => void;
  openFaceModal: () => void;
  closeFaceModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  isLogModalOpen: false,
  isFaceModalOpen: false,
  pendingCheckoutData: null,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  openLogModal: (checkoutData) => set({ isLogModalOpen: true, pendingCheckoutData: checkoutData }),
  closeLogModal: () => set({ isLogModalOpen: false, pendingCheckoutData: null }),
  openFaceModal: () => set({ isFaceModalOpen: true }),
  closeFaceModal: () => set({ isFaceModalOpen: false })
}));

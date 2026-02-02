// client/src/stores/useAppStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface User {
    id: string;
    username: string;
    fullName?: string;
    full_name?: string;
    role: string;
    appScriptUrl?: string;
    telegram_chat_id?: string;
    telegramThemeId?: string;
    phone?: string;
}

interface Client {
    id: string;
    full_name: string;
    phone: string;
    rooms: number[];
    floor_min: number | null;
    floor_max: number | null;
    total_floors_min: number | null;
    total_floors_max: number | null;
    price_min: number | null;
    price_max: number | null;
    notes: string;
    preferred_locations: Array<{ tuman: string; kvartils: string[] }>;
    assigned_realtor_id: string | null;
    assigned_realtor_name: string | null;
    assigned_objects: any[];
    status: string;
}

interface ObjectType {
    id: string;
    kvartil: string;
    xet: string;
    m2: number;
    narx: number;
    turi: string;
    tell: string;
    rieltor: string;
    rasmlar?: string;
    elonStatus?: string;
    opisaniya?: string;
}

interface ObjectFilters {
    searchText: string;
    id: string;
    kvartil: string;
    rieltor: string;
    status: string;
    minPrice: string;
    maxPrice: string;
}

interface ClientFilters {
    searchText: string;
}

interface AppState {
    // Modals
    userModalVisible: boolean;
    setUserModalVisible: (visible: boolean) => void;

    clientModalVisible: boolean;
    setClientModalVisible: (visible: boolean) => void;

    objectModalVisible: boolean;
    setObjectModalVisible: (visible: boolean) => void;

    settingModalVisible: boolean;
    setSettingModalVisible: (visible: boolean) => void;

    // Editing state
    editingUser: User | null;
    setEditingUser: (user: User | null) => void;

    editingClient: Client | null;
    setEditingClient: (client: Client | null) => void;

    editingObject: ObjectType | null;
    setEditingObject: (object: ObjectType | null) => void;

    // Filters
    objectFilters: ObjectFilters;
    setObjectFilters: (filters: Partial<ObjectFilters>) => void;
    clearObjectFilters: () => void;

    clientFilters: ClientFilters;
    setClientFilters: (filters: Partial<ClientFilters>) => void;
    clearClientFilters: () => void;

    // Current selections
    currentCategory: string;
    setCurrentCategory: (category: string) => void;

    currentLang: string;
    setCurrentLang: (lang: string) => void;
}

export const useAppStore = create<AppState>()(
    devtools(
        (set) => ({

            userModalVisible: false,
            setUserModalVisible: (visible) => set({ userModalVisible: visible }),

            clientModalVisible: false,
            setClientModalVisible: (visible) => set({ clientModalVisible: visible }),

            objectModalVisible: false,
            setObjectModalVisible: (visible) => set({ objectModalVisible: visible }),

            settingModalVisible: false,
            setSettingModalVisible: (visible) => set({ settingModalVisible: visible }),

            // Editing state
            editingUser: null,
            setEditingUser: (user) => set({ editingUser: user }),

            editingClient: null,
            setEditingClient: (client) => set({ editingClient: client }),

            editingObject: null,
            setEditingObject: (object) => set({ editingObject: object }),

            // Filters
            objectFilters: {
                searchText: '',
                id: '',
                kvartil: '',
                rieltor: '',
                status: '',
                minPrice: '',
                maxPrice: ''
            },
            setObjectFilters: (filters) =>
                set((state) => ({
                    objectFilters: { ...state.objectFilters, ...filters }
                })),
            clearObjectFilters: () =>
                set({
                    objectFilters: {
                        searchText: '',
                        id: '',
                        kvartil: '',
                        rieltor: '',
                        status: '',
                        minPrice: '',
                        maxPrice: ''
                    }
                }),

            clientFilters: {
                searchText: ''
            },
            setClientFilters: (filters) =>
                set((state) => ({
                    clientFilters: { ...state.clientFilters, ...filters }
                })),
            clearClientFilters: () =>
                set({ clientFilters: { searchText: '' } }),

            // Current selections
            currentCategory: 'balkon',
            setCurrentCategory: (category) => set({ currentCategory: category }),

            currentLang: 'uz',
            setCurrentLang: (lang) => set({ currentLang: lang }),
        }),
        { name: 'AppStore' }
    )
);
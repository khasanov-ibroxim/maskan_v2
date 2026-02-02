// client/src/hooks/useQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useToast } from './use-toast';

// ========================================
// USERS
// ========================================

export const useUsers = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/api/users/users');
            return response.data.users || [];
        },
        staleTime: 5 * 60 * 1000,
        refetchInterval: 10 * 60 * 1000,
    });
};

export const useActiveSessions = () => {
    return useQuery({
        queryKey: ['sessions', 'active'],
        queryFn: async () => {
            const response = await api.get('/api/users/sessions/active');
            return response.data.sessions || [];
        },
        staleTime: 5 * 60 * 1000,
        refetchInterval: 10 * 60 * 1000,
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (userData: any) => {
            const response = await api.post('/api/users/users', userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "User yaratildi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "User yaratishda xato",
                variant: "destructive"
            });
        }
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.put(`/api/users/users/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "User yangilandi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Xato yuz berdi",
                variant: "destructive"
            });
        }
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/api/users/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "User o'chirildi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "O'chirishda xato",
                variant: "destructive"
            });
        }
    });
};

// ========================================
// CLIENTS
// ========================================

export const useClients = () => {
    return useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const response = await api.get('/api/clients');
            return response.data.data || [];
        },
        staleTime: 3 * 60 * 1000,
    });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (clientData: any) => {
            const response = await api.post('/api/clients', clientData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Client qo'shildi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Saqlashda xato",
                variant: "destructive"
            });
        }
    });
};

export const useUpdateClient = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.put(`/api/clients/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Client yangilandi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Saqlashda xato",
                variant: "destructive"
            });
        }
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (clientId: string) => {
            await api.delete(`/api/clients/${clientId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Client o'chirildi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "O'chirishda xato",
                variant: "destructive"
            });
        }
    });
};

export const useAssignRealtor = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ clientId, realtorId }: { clientId: string; realtorId: string | null }) => {
            await api.post(`/api/clients/${clientId}/assign-realtor`, { realtorId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Rieltor biriktirildi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Xato yuz berdi",
                variant: "destructive"
            });
        }
    });
};

// ========================================
// OBJECTS
// ========================================

export const useObjects = () => {
    return useQuery({
        queryKey: ['objects'],
        queryFn: async () => {
            const response = await api.get('/api/excel/objects');
            return response.data.objects || [];
        },
        staleTime: 3 * 60 * 1000,
    });
};

export const useQueueStatus = () => {
    return useQuery({
        queryKey: ['queue-status'],
        queryFn: async () => {
            const response = await api.get('/api/excel/queue-status');
            return response.data;
        },
        staleTime: 1 * 60 * 1000,
        refetchInterval: 10 * 60 * 1000,
    });
};

export const usePostAd = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (objectId: string) => {
            const response = await api.post('/api/excel/post-ad', { objectId });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['objects'] });
            queryClient.invalidateQueries({ queryKey: ['queue-status'] });
            toast({
                title: "Elon navbatga qo'shildi",
                description: `Navbatda: ${data.queuePosition}`,
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Elon berishda xato",
                variant: "destructive"
            });
        }
    });
};

export const useUpdateObject = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.put(`/api/excel/objects/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['objects'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Obyekt yangilandi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Saqlashda xato",
                variant: "destructive"
            });
        }
    });
};

export const useDeleteObject = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (objectId: string) => {
            await api.delete(`/api/excel/objects/${objectId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['objects'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Obyekt o'chirildi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "O'chirishda xato",
                variant: "destructive"
            });
        }
    });
};

// ========================================
// SETTINGS
// ========================================

export const useSettingsQuery = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const response = await api.get('/api/settings');
            return response.data.data || {};
        },
        staleTime: 10 * 60 * 1000,
    });
};

export const useTelegramChats = () => {
    return useQuery({
        queryKey: ['telegram-chats'],
        queryFn: async () => {
            const response = await api.get('/api/telegram-chats');
            return response.data.data || [];
        },
        staleTime: 10 * 60 * 1000,
    });
};

export const useGlobalConfig = () => {
    return useQuery({
        queryKey: ['global-config'],
        queryFn: async () => {
            const response = await api.get('/api/settings/global-config');
            return response.data.data || {
                telegram_bot_token: '',
                glavniy_app_script_url: '',
                company_phone: '',
                default_telegram_chat_id: ''
            };
        },
        staleTime: 10 * 60 * 1000,
    });
};

export const useUpdateGlobalConfig = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (config: any) => {
            const response = await api.put('/api/settings/global-config', config);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-config'] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Global sozlamalar saqlandi"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Saqlashda xato",
                variant: "destructive"
            });
        }
    });
};

// ========================================
// REALTORS
// ========================================

export const useRealtorsQuery = () => {
    return useQuery({
        queryKey: ['realtors'],
        queryFn: async () => {
            const response = await api.get('/api/users/realtors');
            return response.data.realtors || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

// ========================================
// CASCADER (Tuman/Kvartil)
// ========================================

export const useCascaderDataQuery = () => {
    return useQuery({
        queryKey: ['cascader'],
        queryFn: async () => {
            const response = await api.get('/api/settings/cascader');
            return response.data.data || [];
        },
        staleTime: 10 * 60 * 1000,
    });
};
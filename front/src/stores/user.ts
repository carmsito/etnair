import { defineStore } from 'pinia';
import { authApi, type User } from '@/services/api';

// #####################################################################################################################
// Creation of the user store to manage user state across the application and get the data accessible from any component
// #####################################################################################################################

export interface UserState {
    id: number | null;
    username: string | null;
    email: string | null;
    phone: string | null;
    role: 'USER' | 'ADMIN' | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export const useUserStore = defineStore('user', {
    state: (): UserState => ({
        id: null,
        username: null,
        email: null,
        phone: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
    }),

    getters: {
        isAdmin: (state) => state.role === 'ADMIN',
        isLoggedIn: (state) => state.isAuthenticated,
        user: (state) => state.isAuthenticated ? {
            id: state.id,
            username: state.username,
            email: state.email,
            phone: state.phone,
            role: state.role,
        } : null,
        currentUser: (state) => ({
            id: state.id,
            username: state.username,
            email: state.email,
            phone: state.phone,
            role: state.role,
        }),
    },

    actions: {
        setUser(user: User) {
            this.id = user.id;
            this.username = user.username;
            this.email = user.email;
            this.phone = user.phone || null;
            this.role = user.role;
            this.isAuthenticated = true;
        },

        async login(email: string, password: string) {
            this.isLoading = true;
            try {
                const response = await authApi.login({ email, password });
                this.setUser(response.user);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message || 'Erreur de connexion' };
            } finally {
                this.isLoading = false;
            }
        },

        async register(username: string, email: string, password: string, phone?: string) {
            this.isLoading = true;
            try {
                const response = await authApi.register({ username, email, password, phone });
                this.setUser(response.user);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message || 'Erreur d\'inscription' };
            } finally {
                this.isLoading = false;
            }
        },

        async fetchCurrentUser() {
            if (!authApi.isAuthenticated()) {
                return false;
            }
            this.isLoading = true;
            try {
                const user = await authApi.getMe();
                this.setUser(user);
                return true;
            } catch {
                this.logOut();
                return false;
            } finally {
                this.isLoading = false;
            }
        },

        async logOut() {
            try {
                await authApi.logout();
            } catch {
                // Ignorer les erreurs de logout
            } finally {
                this.id = null;
                this.username = null;
                this.email = null;
                this.phone = null;
                this.role = null;
                this.isAuthenticated = false;
            }
        },

        async checkAuth() {
            if (authApi.isAuthenticated() && !this.isAuthenticated) {
                await this.fetchCurrentUser();
            }
        },
    },
});
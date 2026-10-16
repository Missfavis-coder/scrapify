
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { authService } from "@/lib/services/auth.service";
import type {
  RegisterPayload,
  LoginPayload,
} from "@/lib/types/auth";

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      authService.register(payload),

    onSuccess: async (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      toast.success("Account created successfully!");
      router.push("/login");
    },

    onError: (error: Error) => {
      toast.error(error.message || "Unable to create your account.");
    },
  });
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      authService.login(payload),

    onSuccess: async (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      toast.success("Welcome back!");
      router.push("/dashboard/home");
    },

    onError: (error: Error) => {
      toast.error(error.message || "Unable to log in.");
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authService.me,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,

    onSuccess: () => {
      queryClient.clear();
      toast.success("You have been logged out.");
      router.replace("/login");
    },

    onError: (error: Error) => {
      toast.error(error.message || "Unable to log out.");
    },
  });
}

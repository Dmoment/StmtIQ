import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "../types/generated/services.gen";
import type { User, OtpResponse, AuthResponse } from "../types/api";
import type { PostV1AuthSendOtpData, PostV1AuthVerifyOtpData, PostV1AuthResendOtpData, PatchV1AuthMeData } from "../types/generated/types.gen";
import { authKeys } from "./keys";

// ============================================
// Queries
// ============================================

/**
 * Get current user profile
 * Uses auto-generated AuthService
 */
export const useCurrentUser = (enabled = true) => {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const response = await AuthService.getV1AuthMe();
      return response as unknown as User;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Send OTP to phone number
 * Uses auto-generated AuthService
 */
export const useSendOtp = () => {
  return useMutation<OtpResponse, Error, PostV1AuthSendOtpData["requestBody"]>({
    mutationFn: async (data) => {
      const response = await AuthService.postV1AuthSendOtp({
        requestBody: data,
      });
      return response as unknown as OtpResponse;
    },
  });
};

/**
 * Verify OTP and login
 * Uses auto-generated AuthService
 */
export const useVerifyOtp = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, PostV1AuthVerifyOtpData["requestBody"]>({
    mutationFn: async (data) => {
      const response = await AuthService.postV1AuthVerifyOtp({
        requestBody: data,
      });
      return response as unknown as AuthResponse;
    },
    onSuccess: (data) => {
      // Update the current user in cache
      queryClient.setQueryData(authKeys.me(), data.user);
    },
  });
};

/**
 * Resend OTP
 * Uses auto-generated AuthService
 */
export const useResendOtp = () => {
  return useMutation<OtpResponse, Error, PostV1AuthResendOtpData["requestBody"]>({
    mutationFn: async (data) => {
      const response = await AuthService.postV1AuthResendOtp({
        requestBody: data,
      });
      return response as unknown as OtpResponse;
    },
  });
};

/**
 * Logout - invalidate session
 * Uses auto-generated AuthService
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await AuthService.deleteV1AuthLogout();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
    },
  });
};

/**
 * Update user profile
 * Uses auto-generated AuthService
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<User, Error, PatchV1AuthMeData["requestBody"]>({
    mutationFn: async (data) => {
      const response = await AuthService.patchV1AuthMe({
        requestBody: data,
      });
      return response as unknown as User;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authKeys.me(), updatedUser);
    },
  });
};

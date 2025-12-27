import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAuthHeaders } from "../lib/api";
import type { User, OtpResponse, AuthResponse } from "../types/api";
import type { components } from "../types/generated/api";
import { authKeys } from "./keys";

// ============================================
// Types
// ============================================
type SendOtpData = components["schemas"]["postV1AuthSendOtp"];
type VerifyOtpData = components["schemas"]["postV1AuthVerifyOtp"];
type ResendOtpData = components["schemas"]["postV1AuthResendOtp"];
type UpdateProfileData = components["schemas"]["patchV1AuthMe"];

// ============================================
// Queries
// ============================================

/**
 * Get current user profile
 */
export const useCurrentUser = (enabled = true) => {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/auth/me", {
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch user profile");
      return data as unknown as User;
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
 */
export const useSendOtp = () => {
  return useMutation<OtpResponse, Error, SendOtpData>({
    mutationFn: async (data) => {
      const { data: response, error } = await api.POST("/v1/auth/send_otp", {
        body: data,
      });
      if (error) throw new Error("Failed to send OTP");
      return response as unknown as OtpResponse;
    },
  });
};

/**
 * Verify OTP and login
 */
export const useVerifyOtp = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, VerifyOtpData>({
    mutationFn: async (data) => {
      const { data: response, error } = await api.POST("/v1/auth/verify_otp", {
        body: data,
      });
      if (error) throw new Error("Invalid OTP");
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
 */
export const useResendOtp = () => {
  return useMutation<OtpResponse, Error, ResendOtpData>({
    mutationFn: async (data) => {
      const { data: response, error } = await api.POST("/v1/auth/resend_otp", {
        body: data,
      });
      if (error) throw new Error("Failed to resend OTP");
      return response as unknown as OtpResponse;
    },
  });
};

/**
 * Logout - invalidate session
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await api.DELETE("/v1/auth/logout", {
        headers: getAuthHeaders(),
      });
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
    },
  });
};

/**
 * Update user profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<User, Error, UpdateProfileData>({
    mutationFn: async (data) => {
      const { data: response, error } = await api.PATCH("/v1/auth/me", {
        body: data,
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to update profile");
      return response as unknown as User;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authKeys.me(), updatedUser);
    },
  });
};


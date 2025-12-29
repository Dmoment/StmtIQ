import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CategoriesService } from "../types/generated/services.gen";
import type { Category } from "../types/api";
import type { PostV1CategoriesData, PatchV1CategoriesIdData } from "../types/generated/types.gen";
import { categoryKeys } from "./keys";

// ============================================
// Queries
// ============================================

/**
 * List all categories
 * Uses auto-generated CategoriesService
 */
export const useCategories = () => {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: async () => {
      const response = await CategoriesService.getV1Categories();
      return response as unknown as Category[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Get a single category
 * Uses auto-generated CategoriesService
 */
export const useCategory = (id: number, enabled = true) => {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: async () => {
      const response = await CategoriesService.getV1CategoriesId({ id });
      return response as unknown as Category;
    },
    enabled: enabled && id > 0,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Create a new category
 * Uses auto-generated CategoriesService
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, PostV1CategoriesData["requestBody"]>({
    mutationFn: async (data) => {
      const response = await CategoriesService.postV1Categories({
        requestBody: data,
      });
      return response as unknown as Category;
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.setQueryData(categoryKeys.detail(newCategory.id), newCategory);
    },
  });
};

/**
 * Update a category
 * Uses auto-generated CategoriesService
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, { id: number; data: PatchV1CategoriesIdData["requestBody"] }>({
    mutationFn: async ({ id, data }) => {
      const response = await CategoriesService.patchV1CategoriesId({
        id,
        requestBody: data,
      });
      return response as unknown as Category;
    },
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.setQueryData(
        categoryKeys.detail(updatedCategory.id),
        updatedCategory
      );
    },
  });
};

/**
 * Delete a category
 * Uses auto-generated CategoriesService
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await CategoriesService.deleteV1CategoriesId({ id });
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.removeQueries({ queryKey: categoryKeys.detail(deletedId) });
    },
  });
};

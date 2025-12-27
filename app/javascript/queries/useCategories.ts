import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAuthHeaders } from "../lib/api";
import type { Category } from "../types/api";
import type { components } from "../types/generated/api";
import { categoryKeys } from "./keys";

// ============================================
// Types
// ============================================
type CreateCategoryData = components["schemas"]["postV1Categories"];
type UpdateCategoryData = components["schemas"]["patchV1CategoriesId"];

// ============================================
// Queries
// ============================================

/**
 * List all categories
 */
export const useCategories = () => {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/categories", {
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch categories");
      return data as unknown as Category[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Get a single category
 */
export const useCategory = (id: number, enabled = true) => {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/categories/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch category");
      return data as unknown as Category;
    },
    enabled: enabled && id > 0,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Create a new category
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, CreateCategoryData>({
    mutationFn: async (data) => {
      const { data: response, error } = await api.POST("/v1/categories", {
        body: data,
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to create category");
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
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, { id: number; data: UpdateCategoryData }>({
    mutationFn: async ({ id, data }) => {
      const { data: response, error } = await api.PATCH("/v1/categories/{id}", {
        params: { path: { id } },
        body: data,
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to update category");
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
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const { error } = await api.DELETE("/v1/categories/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to delete category");
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.removeQueries({ queryKey: categoryKeys.detail(deletedId) });
    },
  });
};


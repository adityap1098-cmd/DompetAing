import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Category, SubCategory } from "@dompetaing/shared";

// ── Query Keys ──
const CATEGORIES_KEY = ["categories"] as const;
const categoryKey = (id: string) => ["categories", id] as const;

// ── Input Types ──
export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income" | "both";
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  icon?: string;
  color?: string;
  type?: "expense" | "income" | "both";
}

export interface CreateSubCategoryInput {
  categoryId: string;
  name: string;
}

export interface UpdateSubCategoryInput {
  categoryId: string;
  subId: string;
  name: string;
}

export interface DeleteSubCategoryInput {
  categoryId: string;
  subId: string;
}

// ── Fetch Hooks ──
export function useCategories(params?: { type?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();

  return useQuery<Category[]>({
    queryKey: [...CATEGORIES_KEY, params],
    queryFn: () => api.get<Category[]>(`/categories${qs ? `?${qs}` : ""}`),
  });
}

export function useCategory(id: string) {
  return useQuery<Category>({
    queryKey: categoryKey(id),
    queryFn: () => api.get<Category>(`/categories/${id}`),
    enabled: !!id,
  });
}

// ── Mutation Hooks ──
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, CreateCategoryInput>({
    mutationFn: (data) => api.post<Category>("/categories", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, UpdateCategoryInput>({
    mutationFn: ({ id, ...data }) => api.put<Category>(`/categories/${id}`, data),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      void queryClient.invalidateQueries({ queryKey: categoryKey(updated.id) });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; force?: boolean }>({
    mutationFn: ({ id, force }) =>
      api.delete<void>(`/categories/${id}${force ? "?force=true" : ""}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useCreateSubCategory() {
  const queryClient = useQueryClient();
  return useMutation<SubCategory, Error, CreateSubCategoryInput>({
    mutationFn: ({ categoryId, name }) =>
      api.post<SubCategory>(`/categories/${categoryId}/sub`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useUpdateSubCategory() {
  const queryClient = useQueryClient();
  return useMutation<SubCategory, Error, UpdateSubCategoryInput>({
    mutationFn: ({ categoryId, subId, name }) =>
      api.put<SubCategory>(`/categories/${categoryId}/sub/${subId}`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useDeleteSubCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeleteSubCategoryInput>({
    mutationFn: ({ categoryId, subId }) =>
      api.delete<void>(`/categories/${categoryId}/sub/${subId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

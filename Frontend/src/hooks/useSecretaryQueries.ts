/**
 * Custom React Query hooks for Secretary operations.
 * Handles proper data fetching, mutation, and cascade invalidation.
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { secretaryQueryKeys, invalidationPatterns } from "@/lib/queryKeys";
import { dashboardApi, housesApi, maintenanceApi, expendituresApi, vehiclesApi, authApi } from "@/lib/api";
import { secretaryResidentsApi } from "@/lib/secretaryApi";
import type { House, MaintenanceRecord, Expenditure, Vehicle } from "@/lib/data";
import type { Resident } from "@/lib/secretaryApi";

// ──── Dashboard Hooks ────

export function useSecretaryDashboard(enabled = true) {
  return useQuery({
    queryKey: secretaryQueryKeys.dashboardMetrics(),
    queryFn: dashboardApi.getMetrics,
    enabled,
    staleTime: 30000,
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

// ──── Scope Hook ────

type EffectiveScope = {
  role: string;
  houseIds: string[];
  blocks: string[];
  scopeVersion: number;
};

export function useSecretaryScope(enabled = true): UseQueryResult<EffectiveScope> {
  return useQuery({
    queryKey: secretaryQueryKeys.scope(),
    queryFn: authApi.effectiveScope as any,
    enabled,
    staleTime: 60000,
  });
}

// ──── Houses Hooks ────

export function useSecretaryHouses(filters?: { block?: string; status?: string }, enabled = true) {
  return useQuery({
    queryKey: secretaryQueryKeys.housesList(filters),
    queryFn: housesApi.getAll,
    enabled,
    staleTime: 30000,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useSecretaryHouseDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: secretaryQueryKeys.housesDetail(id),
    queryFn: () => housesApi.getById(id),
    enabled,
    staleTime: 30000,
  });
}

export function useCreateSecretaryHouse(): UseMutationResult<any, Error, Partial<House>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<House>) => housesApi.create(data),
    onSuccess: (newHouse) => {
      // Cascade invalidation
      invalidationPatterns.house.create.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });

      // Optionally update cache with new house
      const previousHouses = queryClient.getQueryData(secretaryQueryKeys.houses());
      if (Array.isArray(previousHouses)) {
        queryClient.setQueryData(secretaryQueryKeys.houses(), [...previousHouses, newHouse]);
      }
    },
  });
}

export function useUpdateSecretaryHouse(): UseMutationResult<any, Error, { id: string; data: Partial<House> }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => housesApi.update(id, data),
    onSuccess: (updatedHouse, { id }) => {
      // Cascade invalidation
      invalidationPatterns.house.update.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });

      // Update specific house detail
      queryClient.setQueryData(secretaryQueryKeys.housesDetail(id), updatedHouse);
    },
  });
}

export function useDeleteSecretaryHouse(): UseMutationResult<any, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => housesApi.delete(id),
    onSuccess: (_, id) => {
      // Cascade invalidation
      invalidationPatterns.house.delete.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });

      // Remove from cache
      const previousHouses = queryClient.getQueryData(secretaryQueryKeys.houses());
      if (Array.isArray(previousHouses)) {
        queryClient.setQueryData(
          secretaryQueryKeys.houses(),
          previousHouses.filter((h: House) => h.id !== id)
        );
      }
    },
  });
}

// ──── Residents Hooks ────

export function useSecretaryResidents(filters?: { block?: string; status?: string }, enabled = true) {
  return useQuery({
    queryKey: secretaryQueryKeys.residentsList(filters),
    queryFn: secretaryResidentsApi.getAll,
    enabled,
    staleTime: 30000,
    refetchInterval: 12000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useSecretaryResidentDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: secretaryQueryKeys.residentsDetail(id),
    queryFn: () => secretaryResidentsApi.getById(id),
    enabled,
    staleTime: 30000,
  });
}

export function useCreateSecretaryResident(): UseMutationResult<
  any,
  Error,
  { name: string; email: string; password: string; houseId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => secretaryResidentsApi.create(data),
    onSuccess: (response) => {
      // Cascade invalidation
      invalidationPatterns.resident.create.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });
    },
  });
}

export function useUpdateSecretaryResident(): UseMutationResult<
  any,
  Error,
  { id: string; data: { name?: string; email?: string } }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => secretaryResidentsApi.update(id, data),
    onSuccess: (_, { id }) => {
      invalidationPatterns.resident.update.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });
    },
  });
}

export function useDeleteSecretaryResident(): UseMutationResult<any, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => secretaryResidentsApi.delete(id),
    onSuccess: () => {
      invalidationPatterns.resident.delete.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });
    },
  });
}

// ──── Maintenance Hooks ────

export function useSecretaryMaintenance(
  filters?: { status?: string; block?: string; overdue?: boolean },
  enabled = true
) {
  return useQuery({
    queryKey: secretaryQueryKeys.maintenanceList(filters),
    queryFn: maintenanceApi.getAll,
    enabled,
    staleTime: 30000,
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useSecretaryMaintenanceDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: secretaryQueryKeys.maintenanceDetail(id),
    queryFn: () => maintenanceApi.getById(id),
    enabled,
    staleTime: 30000,
  });
}

// ──── Vehicles Hooks ────

export function useSecretaryVehicles(filters?: { type?: string; block?: string }, enabled = true) {
  return useQuery({
    queryKey: secretaryQueryKeys.vehiclesList(filters),
    queryFn: vehiclesApi.getAll,
    enabled,
    staleTime: 30000,
  });
}

// ──── Expenditures Hooks ────

export function useSecretaryExpenditures(
  filters?: { category?: string; dateRange?: [string, string] },
  enabled = true
) {
  return useQuery({
    queryKey: secretaryQueryKeys.expendituresList(filters),
    queryFn: expendituresApi.getAll,
    enabled,
    staleTime: 30000,
  });
}

export function useCreateSecretaryExpenditure(): UseMutationResult<any, Error, Partial<Expenditure>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Expenditure>) => expendituresApi.create(data),
    onSuccess: () => {
      invalidationPatterns.expenditure.create.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });
    },
  });
}

export function useUpdateSecretaryExpenditure(): UseMutationResult<any, Error, { id: string; data: Partial<Expenditure> }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => expendituresApi.update(id, data),
    onSuccess: () => {
      invalidationPatterns.expenditure.update.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });
    },
  });
}

export function useDeleteSecretaryExpenditure(): UseMutationResult<any, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expendituresApi.delete(id),
    onSuccess: () => {
      invalidationPatterns.expenditure.delete.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey } as any);
      });
    },
  });
}

/**
 * Centralized React Query key management for Secretary operations.
 * Ensures consistent query dependency tracking and cascade invalidation.
 */

export const secretaryQueryKeys = {
  // Root
  all: ["secretary"] as const,

  // Scope - independent
  scope: () => [...secretaryQueryKeys.all, "scope"] as const,

  // Dashboard - depends on: houses, maintenance, vehicles, expenditures
  dashboard: () => [...secretaryQueryKeys.all, "dashboard"] as const,
  dashboardMetrics: () => [...secretaryQueryKeys.dashboard(), "metrics"] as const,

  // Houses - independent root query
  houses: () => [...secretaryQueryKeys.all, "houses"] as const,
  housesList: (filters?: { block?: string; status?: string }) =>
    [...secretaryQueryKeys.houses(), "list", filters] as const,
  housesDetail: (id: string) => [...secretaryQueryKeys.houses(), "detail", id] as const,

  // Residents - independent root query (secretary-scoped)
  residents: () => [...secretaryQueryKeys.all, "residents"] as const,
  residentsList: (filters?: { block?: string; status?: string }) =>
    [...secretaryQueryKeys.residents(), "list", filters] as const,
  residentsDetail: (id: string) => [...secretaryQueryKeys.residents(), "detail", id] as const,

  // Maintenance - depends on: houses
  maintenance: () => [...secretaryQueryKeys.all, "maintenance"] as const,
  maintenanceList: (filters?: { status?: string; block?: string; overdue?: boolean }) =>
    [...secretaryQueryKeys.maintenance(), "list", filters] as const,
  maintenanceDetail: (id: string) => [...secretaryQueryKeys.maintenance(), "detail", id] as const,

  // Vehicles - depends on: houses
  vehicles: () => [...secretaryQueryKeys.all, "vehicles"] as const,
  vehiclesList: (filters?: { type?: string; block?: string }) =>
    [...secretaryQueryKeys.vehicles(), "list", filters] as const,
  vehiclesDetail: (id: string) => [...secretaryQueryKeys.vehicles(), "detail", id] as const,

  // Expenditures - depends on: houses
  expenditures: () => [...secretaryQueryKeys.all, "expenditures"] as const,
  expendituresList: (filters?: { category?: string; dateRange?: [string, string] }) =>
    [...secretaryQueryKeys.expenditures(), "list", filters] as const,
  expendituresDetail: (id: string) => [...secretaryQueryKeys.expenditures(), "detail", id] as const,

  // Activities/History
  activities: () => [...secretaryQueryKeys.all, "activities"] as const,
  activitiesList: (filters?: { limit?: number; offset?: number }) =>
    [...secretaryQueryKeys.activities(), "list", filters] as const,

  // Pending tasks - computed from maintenance
  pendingTasks: () => [...secretaryQueryKeys.all, "pending-tasks"] as const,
};

/**
 * Mutation invalidation patterns - which queries to invalidate for each operation.
 * Defines cascade dependencies for automated synchronization.
 */
export const invalidationPatterns = {
  // When a house is created/updated/deleted
  house: {
    create: [
      secretaryQueryKeys.housesList(),
      secretaryQueryKeys.houses(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
    update: [
      secretaryQueryKeys.housesList(),
      secretaryQueryKeys.houses(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
    delete: [
      secretaryQueryKeys.housesList(),
      secretaryQueryKeys.houses(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.vehiclesList(),
      secretaryQueryKeys.vehicles(),
      secretaryQueryKeys.maintenanceList(),
      secretaryQueryKeys.maintenance(),
      secretaryQueryKeys.activitiesList(),
    ],
  },

  // When a resident is created/updated/deleted
  resident: {
    create: [
      secretaryQueryKeys.residentsList(),
      secretaryQueryKeys.residents(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
    update: [
      secretaryQueryKeys.residentsList(),
      secretaryQueryKeys.residents(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
    delete: [
      secretaryQueryKeys.residentsList(),
      secretaryQueryKeys.residents(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
  },

  // When maintenance is created/updated/deleted
  maintenance: {
    create: [
      secretaryQueryKeys.maintenanceList(),
      secretaryQueryKeys.maintenance(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.pendingTasks(),
      secretaryQueryKeys.activitiesList(),
    ],
    update: [
      secretaryQueryKeys.maintenanceList(),
      secretaryQueryKeys.maintenance(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.pendingTasks(),
      secretaryQueryKeys.activitiesList(),
    ],
    delete: [
      secretaryQueryKeys.maintenanceList(),
      secretaryQueryKeys.maintenance(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.pendingTasks(),
      secretaryQueryKeys.activitiesList(),
    ],
  },

  // When a vehicle is created/updated/deleted
  vehicle: {
    create: [
      secretaryQueryKeys.vehiclesList(),
      secretaryQueryKeys.vehicles(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
    update: [
      secretaryQueryKeys.vehiclesList(),
      secretaryQueryKeys.vehicles(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
    delete: [
      secretaryQueryKeys.vehiclesList(),
      secretaryQueryKeys.vehicles(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
  },

  // When an expenditure is created/updated/deleted
  expenditure: {
    create: [
      secretaryQueryKeys.expendituresList(),
      secretaryQueryKeys.expenditures(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
    update: [
      secretaryQueryKeys.expendituresList(),
      secretaryQueryKeys.expenditures(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
    delete: [
      secretaryQueryKeys.expendituresList(),
      secretaryQueryKeys.expenditures(),
      secretaryQueryKeys.dashboardMetrics(),
      secretaryQueryKeys.dashboard(),
      secretaryQueryKeys.activitiesList(),
    ],
  },
};

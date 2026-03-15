import type { ServiceStatus } from "@/lib/api/types";

/**
 * Mock status for preview services.
 * Isolated so real backend status can replace this later.
 */
export type StatusMap = Record<string, ServiceStatus>;

export function createInitialStatusMap(
  serviceIds: string[],
  defaultStatus: ServiceStatus = "draft"
): StatusMap {
  const map: StatusMap = {};
  for (const id of serviceIds) {
    map[id] = defaultStatus;
  }
  return map;
}

export function setServiceStatus(
  map: StatusMap,
  serviceId: string,
  status: ServiceStatus
): StatusMap {
  return { ...map, [serviceId]: status };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HRUserService } from "../services/hr-user-service";
import type { HRUser } from "../models/hr-user-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all HRUser records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, hRUserName, active, email
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useHRUserList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["hRUser-list", options],
    queryFn: () => HRUserService.getAll(options),
  });
}

/**
 * Retrieve a single HRUser record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useHRUser(id: string) {
  return useQuery({
    queryKey: ["hRUser", id],
    queryFn: () => HRUserService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new HRUser record.
 * @remarks Form validation: use CreateHRUserSchema with zodResolver for type-safe create forms
 */
export function useCreateHRUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<HRUser, "id">) => HRUserService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["hRUser-list"] });
    },
  });
}

/**
 * Update an existing HRUser record.
 * @remarks Form validation: use UpdateHRUserSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateHRUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<HRUser, "id">>;
    }) => HRUserService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["hRUser-list"] });
      client.invalidateQueries({ queryKey: ["hRUser", variables.id] });
    },
  });
}

/**
 * Delete a HRUser record by its unique identifier.
 */
export function useDeleteHRUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => HRUserService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["hRUser-list"] });
      client.invalidateQueries({ queryKey: ["hRUser", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const HRUser_DATA_SOURCE_TYPE = 'InMemory' as const;

export { HRUserSchema, CreateHRUserSchema, UpdateHRUserSchema } from "../validators/hruser-validator";
export type { HRUserInput, CreateHRUserInput, UpdateHRUserInput } from "../validators/hruser-validator";
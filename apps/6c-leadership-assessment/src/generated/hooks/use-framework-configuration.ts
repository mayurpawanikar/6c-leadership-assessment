import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FrameworkConfigurationService } from "../services/framework-configuration-service";
import type { FrameworkConfiguration } from "../models/framework-configuration-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all FrameworkConfiguration records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, frameworkConfigurationName, active, definition, dimension, displayOrder, exactQuestion, factorKey, frameworkVersion, rating1Label, rating2Label, rating3Label, rating4Label
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useFrameworkConfigurationList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["frameworkConfiguration-list", options],
    queryFn: () => FrameworkConfigurationService.getAll(options),
  });
}

/**
 * Retrieve a single FrameworkConfiguration record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useFrameworkConfiguration(id: string) {
  return useQuery({
    queryKey: ["frameworkConfiguration", id],
    queryFn: () => FrameworkConfigurationService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new FrameworkConfiguration record.
 * @remarks Form validation: use CreateFrameworkConfigurationSchema with zodResolver for type-safe create forms
 */
export function useCreateFrameworkConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<FrameworkConfiguration, "id">) => FrameworkConfigurationService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["frameworkConfiguration-list"] });
    },
  });
}

/**
 * Update an existing FrameworkConfiguration record.
 * @remarks Form validation: use UpdateFrameworkConfigurationSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateFrameworkConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<FrameworkConfiguration, "id">>;
    }) => FrameworkConfigurationService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["frameworkConfiguration-list"] });
      client.invalidateQueries({ queryKey: ["frameworkConfiguration", variables.id] });
    },
  });
}

/**
 * Delete a FrameworkConfiguration record by its unique identifier.
 */
export function useDeleteFrameworkConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => FrameworkConfigurationService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["frameworkConfiguration-list"] });
      client.invalidateQueries({ queryKey: ["frameworkConfiguration", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const FrameworkConfiguration_DATA_SOURCE_TYPE = 'InMemory' as const;

export { FrameworkConfigurationSchema, CreateFrameworkConfigurationSchema, UpdateFrameworkConfigurationSchema } from "../validators/framework-configuration-validator";
export type { FrameworkConfigurationInput, CreateFrameworkConfigurationInput, UpdateFrameworkConfigurationInput } from "../validators/framework-configuration-validator";
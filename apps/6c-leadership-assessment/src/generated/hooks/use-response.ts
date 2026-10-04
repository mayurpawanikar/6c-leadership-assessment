import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ResponseService } from "../services/response-service";
import type { Response } from "../models/response-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Response records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, responseName, employeeComment, employeeRating, lockedDimension, lockedFactorKey, lockedQuestionText, managerComment, managerRating
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useResponseList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["response-list", options],
    queryFn: () => ResponseService.getAll(options),
  });
}

/**
 * Retrieve a single Response record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useResponse(id: string) {
  return useQuery({
    queryKey: ["response", id],
    queryFn: () => ResponseService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Response record.
 * @remarks Form validation: use CreateResponseSchema with zodResolver for type-safe create forms
 */
export function useCreateResponse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Response, "id">) => ResponseService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["response-list"] });
    },
  });
}

/**
 * Update an existing Response record.
 * @remarks Form validation: use UpdateResponseSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateResponse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Response, "id">>;
    }) => ResponseService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["response-list"] });
      client.invalidateQueries({ queryKey: ["response", variables.id] });
    },
  });
}

/**
 * Delete a Response record by its unique identifier.
 */
export function useDeleteResponse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ResponseService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["response-list"] });
      client.invalidateQueries({ queryKey: ["response", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Response_DATA_SOURCE_TYPE = 'InMemory' as const;

export { ResponseSchema, CreateResponseSchema, UpdateResponseSchema } from "../validators/response-validator";
export type { ResponseInput, CreateResponseInput, UpdateResponseInput } from "../validators/response-validator";
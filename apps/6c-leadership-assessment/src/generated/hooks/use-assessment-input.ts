import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AssessmentInputService } from "../services/assessment-input-service";
import type { AssessmentInput } from "../models/assessment-input-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all AssessmentInput records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, assessmentInputName, inputText, inputTypeKey, sequence
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useAssessmentInputList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["assessmentInput-list", options],
    queryFn: () => AssessmentInputService.getAll(options),
  });
}

/**
 * Retrieve a single AssessmentInput record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useAssessmentInput(id: string) {
  return useQuery({
    queryKey: ["assessmentInput", id],
    queryFn: () => AssessmentInputService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new AssessmentInput record.
 * @remarks Form validation: use CreateAssessmentInputSchema with zodResolver for type-safe create forms
 */
export function useCreateAssessmentInput() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AssessmentInput, "id">) => AssessmentInputService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["assessmentInput-list"] });
    },
  });
}

/**
 * Update an existing AssessmentInput record.
 * @remarks Form validation: use UpdateAssessmentInputSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateAssessmentInput() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<AssessmentInput, "id">>;
    }) => AssessmentInputService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["assessmentInput-list"] });
      client.invalidateQueries({ queryKey: ["assessmentInput", variables.id] });
    },
  });
}

/**
 * Delete a AssessmentInput record by its unique identifier.
 */
export function useDeleteAssessmentInput() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AssessmentInputService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["assessmentInput-list"] });
      client.invalidateQueries({ queryKey: ["assessmentInput", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const AssessmentInput_DATA_SOURCE_TYPE = 'InMemory' as const;

export { AssessmentInputSchema, CreateAssessmentInputSchema, UpdateAssessmentInputSchema } from "../validators/assessment-input-validator";
export type { AssessmentInputInput, CreateAssessmentInputInput, UpdateAssessmentInputInput } from "../validators/assessment-input-validator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ParticipantService } from "../services/participant-service";
import type { Participant } from "../models/participant-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Participant records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, participantName, completedDate, gCMLevelKey, invitedDate, leadershipRoleKey, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useParticipantList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["participant-list", options],
    queryFn: () => ParticipantService.getAll(options),
  });
}

/**
 * Retrieve a single Participant record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useParticipant(id: string) {
  return useQuery({
    queryKey: ["participant", id],
    queryFn: () => ParticipantService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Participant record.
 * @remarks Form validation: use CreateParticipantSchema with zodResolver for type-safe create forms
 */
export function useCreateParticipant() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Participant, "id">) => ParticipantService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["participant-list"] });
    },
  });
}

/**
 * Update an existing Participant record.
 * @remarks Form validation: use UpdateParticipantSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateParticipant() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Participant, "id">>;
    }) => ParticipantService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["participant-list"] });
      client.invalidateQueries({ queryKey: ["participant", variables.id] });
    },
  });
}

/**
 * Delete a Participant record by its unique identifier.
 */
export function useDeleteParticipant() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ParticipantService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["participant-list"] });
      client.invalidateQueries({ queryKey: ["participant", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Participant_DATA_SOURCE_TYPE = 'InMemory' as const;

export { ParticipantSchema, CreateParticipantSchema, UpdateParticipantSchema } from "../validators/participant-validator";
export type { ParticipantInput, CreateParticipantInput, UpdateParticipantInput } from "../validators/participant-validator";
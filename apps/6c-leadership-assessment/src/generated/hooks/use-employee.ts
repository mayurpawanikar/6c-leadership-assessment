import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmployeeService } from "../services/employee-service";
import type { Employee } from "../models/employee-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Employee records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, employeeName, active, email, employeeNumber, jobTitle
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useEmployeeList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["employee-list", options],
    queryFn: () => EmployeeService.getAll(options),
  });
}

/**
 * Retrieve a single Employee record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => EmployeeService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Employee record.
 * @remarks Form validation: use CreateEmployeeSchema with zodResolver for type-safe create forms
 */
export function useCreateEmployee() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Employee, "id">) => EmployeeService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["employee-list"] });
    },
  });
}

/**
 * Update an existing Employee record.
 * @remarks Form validation: use UpdateEmployeeSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateEmployee() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Employee, "id">>;
    }) => EmployeeService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["employee-list"] });
      client.invalidateQueries({ queryKey: ["employee", variables.id] });
    },
  });
}

/**
 * Delete a Employee record by its unique identifier.
 */
export function useDeleteEmployee() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => EmployeeService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["employee-list"] });
      client.invalidateQueries({ queryKey: ["employee", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Employee_DATA_SOURCE_TYPE = 'InMemory' as const;

export { EmployeeSchema, CreateEmployeeSchema, UpdateEmployeeSchema } from "../validators/employee-validator";
export type { EmployeeInput, CreateEmployeeInput, UpdateEmployeeInput } from "../validators/employee-validator";
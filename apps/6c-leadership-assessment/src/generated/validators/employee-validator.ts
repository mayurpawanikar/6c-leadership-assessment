import { z } from 'zod';

/**
 * Zod schema for Employee validation
 */
export const EmployeeSchema = z.object({
  id: z.string().uuid(),
  employeeName: z.string().min(1, { message: "Employee Name is required" }),
  active: z.boolean(),
  email: z.string().email().min(1, { message: "Email is required" }),
  employeeNumber: z.string().min(1, { message: "Employee Number is required" }),
  jobTitle: z.string().min(1, { message: "Job Title is required" }),
  manager: z.object({ id: z.string().uuid(), employeeName: z.string() }).optional(),
});

/**
 * Schema for creating a new Employee (omits system-generated ID)
 */
export const CreateEmployeeSchema = EmployeeSchema.omit({ id: true });

/**
 * Schema for updating an existing Employee
 */
export const UpdateEmployeeSchema = EmployeeSchema;

export type EmployeeInput = z.infer<typeof EmployeeSchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
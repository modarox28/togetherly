import { z } from "zod";

// Reglas de los formularios de cuenta. Se usan en el navegador y en el servidor.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe tu contraseña.").max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 letras.").max(50, "El nombre es muy largo."),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200, "La contraseña es muy larga."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

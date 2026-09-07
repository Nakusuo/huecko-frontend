import { BrandingPanel, MobileLogo } from '../../components/BrandingPanel';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { registerUser } from '../../services/authService';

const registerSchema = z
  .object({
    nombre: z
      .string()
      .min(1, 'El nombre es requerido')
      .min(2, 'Mínimo 2 caracteres'),
    email: z
      .string()
      .min(1, 'El correo es requerido')
      .email('Ingresa un correo válido'),
    password: z
      .string()
      .min(1, 'La contraseña es requerida')
      .min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contraseña'),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    }
  );

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    try {
      const response = await registerUser({
        nombre: data.nombre,
        email: data.email,
        password: data.password,
      });
      login(response.user, response.token);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error inesperado. Intenta de nuevo.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-dvh bg-surface flex text-on-surface">
      {/* Columna de marca: solo en pantallas anchas. */}
      <BrandingPanel />

      {/* El formulario se lleva el resto. En móvil, la pantalla entera. */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[27rem] py-4">
          <MobileLogo />

          <div className="bg-surface-container-lowest rounded-3xl p-7 md:p-9 elev-2">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface font-headline mb-1.5">
                Crea tu cuenta
              </h2>
              <p className="text-on-surface-variant text-sm">
                Únete a Huecko y empieza a coordinar horarios sin esfuerzo.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Campo Nombre */}
              <div className="space-y-1.5">
                <label
                  htmlFor="nombre"
                  className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                >
                  Nombre completo
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant flex items-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">person</span>
                  </span>
                  <input
                    id="nombre"
                    type="text"
                    autoComplete="name"
                    placeholder="Alex Rodríguez"
                    {...register('nombre')}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-surface-container-lowest text-on-surface placeholder-outline border outline-none transition-all duration-200 focus:ring-2 focus:ring-secondary/30 focus:border-primary ${
                      errors.nombre
                        ? 'border-error/50 bg-error-container/50'
                        : 'border-outline-variant hover:border-secondary'
                    }`}
                  />
                </div>
                {errors.nombre && (
                  <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">error</span>
                    {errors.nombre.message}
                  </p>
                )}
              </div>

              {/* Campo Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant flex items-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">mail</span>
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    {...register('email')}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-surface-container-lowest text-on-surface placeholder-outline border outline-none transition-all duration-200 focus:ring-2 focus:ring-secondary/30 focus:border-primary ${
                      errors.email
                        ? 'border-error/50 bg-error-container/50'
                        : 'border-outline-variant hover:border-secondary'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">error</span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Campo Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant flex items-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">lock</span>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`w-full pl-11 pr-12 py-3 rounded-xl text-sm bg-surface-container-lowest text-on-surface placeholder-outline border outline-none transition-all duration-200 focus:ring-2 focus:ring-secondary/30 focus:border-primary ${
                      errors.password
                        ? 'border-error/50 bg-error-container/50'
                        : 'border-outline-variant hover:border-secondary'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1 cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">error</span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Campo Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                >
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant flex items-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">lock_reset</span>
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className={`w-full pl-11 pr-12 py-3 rounded-xl text-sm bg-surface-container-lowest text-on-surface placeholder-outline border outline-none transition-all duration-200 focus:ring-2 focus:ring-secondary/30 focus:border-primary ${
                      errors.confirmPassword
                        ? 'border-error/50 bg-error-container/50'
                        : 'border-outline-variant hover:border-secondary'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1 cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">error</span>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Error del Servidor */}
              {serverError && (
                <div className="p-3 rounded-xl bg-error-container border border-error/30 text-xs text-error flex items-start gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px] shrink-0 text-error">
                    cancel
                  </span>
                  <span>{serverError}</span>
                </div>
              )}

              {/* Botón Submit */}
              <button
                id="btn-register"
                type="submit"
                disabled={isSubmitting}
                className="
                  w-full py-3 px-4 rounded-xl font-semibold text-sm mt-3
                  bg-primary hover:bg-primary-hover active:scale-[0.98]
                  text-on-primary shadow-md shadow-primary/25
                  transition-all duration-200 cursor-pointer
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {isSubmitting ? (
                  <>
                    <span aria-hidden="true" className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Creando cuenta...</span>
                  </>
                ) : (
                  <>
                    <span>Crear cuenta</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Separador */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-outline-variant/60" />
              <span className="text-xs text-on-surface-variant">o</span>
              <div className="flex-1 h-px bg-outline-variant/60" />
            </div>

            {/* Enlace Login */}
            <p className="text-center text-sm text-on-surface-variant">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="text-primary hover:text-primary-hover font-bold underline transition-colors"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

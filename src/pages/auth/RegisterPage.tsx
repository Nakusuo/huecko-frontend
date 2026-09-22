import { MobileLogo } from '../../components/BrandingPanel';
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
      // Los mismos límites que el backend: con 6 el formulario dejaba pasar
      // contraseñas que el servidor rechazaba después.
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres'),
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
                {/* El mensaje va en la MISMA fila que la etiqueta, no en una línea
                    propia debajo del campo. Con una línea por error el bloque crecía de
                    golpe al equivocarse y dejaba de verse entero; aquí ocupa un hueco que
                    ya estaba vacío, así que la tarjeta mide igual con errores y sin ellos. */}
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="nombre" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Nombre completo
                  </label>
                  {errors.nombre && (
                    /* `role="alert"` porque al perder tamaño pierde también presencia: quien
                       usa lector de pantalla tiene que enterarse igual. */
                    <p role="alert" className="text-2xs font-semibold text-error text-right">
                      {errors.nombre.message}
                    </p>
                  )}
                </div>
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
              </div>

              {/* Campo Email */}
              <div className="space-y-1.5">
                {/* El mensaje va en la MISMA fila que la etiqueta, no en una línea
                    propia debajo del campo. Con una línea por error el bloque crecía de
                    golpe al equivocarse y dejaba de verse entero; aquí ocupa un hueco que
                    ya estaba vacío, así que la tarjeta mide igual con errores y sin ellos. */}
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Correo electrónico
                  </label>
                  {errors.email && (
                    /* `role="alert"` porque al perder tamaño pierde también presencia: quien
                       usa lector de pantalla tiene que enterarse igual. */
                    <p role="alert" className="text-2xs font-semibold text-error text-right">
                      {errors.email.message}
                    </p>
                  )}
                </div>
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
              </div>

              {/* Campo Password */}
              <div className="space-y-1.5">
                {/* El mensaje va en la MISMA fila que la etiqueta, no en una línea
                    propia debajo del campo. Con una línea por error el bloque crecía de
                    golpe al equivocarse y dejaba de verse entero; aquí ocupa un hueco que
                    ya estaba vacío, así que la tarjeta mide igual con errores y sin ellos. */}
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Contraseña
                  </label>
                  {errors.password && (
                    /* `role="alert"` porque al perder tamaño pierde también presencia: quien
                       usa lector de pantalla tiene que enterarse igual. */
                    <p role="alert" className="text-2xs font-semibold text-error text-right">
                      {errors.password.message}
                    </p>
                  )}
                </div>
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
              </div>

              {/* Campo Confirm Password */}
              <div className="space-y-1.5">
                {/* El mensaje va en la MISMA fila que la etiqueta, no en una línea
                    propia debajo del campo. Con una línea por error el bloque crecía de
                    golpe al equivocarse y dejaba de verse entero; aquí ocupa un hueco que
                    ya estaba vacío, así que la tarjeta mide igual con errores y sin ellos. */}
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Confirmar Contraseña
                  </label>
                  {errors.confirmPassword && (
                    /* `role="alert"` porque al perder tamaño pierde también presencia: quien
                       usa lector de pantalla tiene que enterarse igual. */
                    <p role="alert" className="text-2xs font-semibold text-error text-right">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
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
              </div>

              {/* Error del Servidor */}
              {serverError && (
                <div role="alert" className="px-3 py-2 rounded-xl bg-error-container border border-error/30 text-2xs text-error flex items-start gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px] shrink-0 text-error">
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
  );
}

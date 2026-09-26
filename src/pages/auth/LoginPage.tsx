import { MobileLogo } from '../../components/BrandingPanel';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { DEMO_ADMIN_CREDENTIALS, DEMO_CREDENTIALS, loginUser } from '../../services/authService';
import { isApiEnabled } from '../../lib/apiClient';
import { destinoTrasLogin } from '../../routes/destino';
import { esAdmin } from '../../lib/rol';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'Mínimo 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const sesionExpirada = useAuthStore((s) => s.sesionExpirada);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      const res = await loginUser(data);
      login(res.user, res.token);
      // De vuelta a la página donde estaba (p. ej. si la sesión expiró ahí).
      navigate(destinoTrasLogin(location.state, esAdmin(res.user)), { replace: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión';
      setServerError(msg);
    }
  };

  const fillDemoCredentials = (credenciales: { email: string; password: string }) => {
    setValue('email', credenciales.email, {
      shouldValidate: true,
    });
    setValue('password', credenciales.password, {
      shouldValidate: true,
    });
  };

  return (
    <div className="w-full max-w-[27rem]">
      <MobileLogo />

          <div className="bg-surface-container-lowest rounded-3xl p-7 md:p-9 elev-2">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface font-headline mb-1.5">
                Bienvenido de vuelta
              </h2>
              <p className="text-on-surface-variant text-sm">
                Inicia sesión para coordinar horarios y actividades con tu grupo.
              </p>
            </div>

            {/* Tras un 401 la sesión se cierra sola: sin esto el usuario aparecía
                en el login sin saber por qué. */}
            {sesionExpirada && (
              <div role="status" className="mb-4 px-3 py-2 rounded-xl bg-warning-container border border-warning/30 text-xs text-on-warning-container flex items-start gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] shrink-0">schedule</span>
                <span>Tu sesión expiró, vuelve a entrar.</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Campo Email */}
              <div className="space-y-1.5">
                {/* El mensaje va en la MISMA fila que la etiqueta, no en una línea
                    propia debajo del campo. Con una línea por error el bloque crecía de
                    golpe al equivocarse y dejaba de verse entero; aquí ocupa un hueco que
                    ya estaba vacío, así que la tarjeta mide igual con errores y sin ellos. */}
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
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
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="alex.rodriguez@huecko.com"
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
                  <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
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
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
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
                id="btn-login"
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
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
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

            {/* Enlace Registro */}
            <p className="text-center text-sm text-on-surface-variant">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                state={location.state}
                className="text-primary hover:text-primary-hover font-bold underline transition-colors"
              >
                Regístrate gratis
              </Link>
            </p>

            {/* Tarjeta de Credenciales Demo. Solo en modo demo: con backend esa
                cuenta no existe (el seed está desactivado). */}
            {!isApiEnabled && (
            <div className="mt-5 p-3.5 rounded-2xl border border-dashed border-secondary bg-surface-container-low flex flex-col gap-2">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">key</span>
                Credenciales Demo:
              </span>
              {[
                { rotulo: 'Usuario', credenciales: DEMO_CREDENTIALS },
                { rotulo: 'Admin', credenciales: DEMO_ADMIN_CREDENTIALS },
              ].map(({ rotulo, credenciales }) => (
                <div key={rotulo} className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs text-on-surface-variant font-mono bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/40">
                    <span className="font-sans font-semibold text-on-surface">{rotulo}:</span>{' '}
                    {credenciales.email} / {credenciales.password}
                  </p>
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials(credenciales)}
                    aria-label={`Autocompletar la cuenta ${rotulo.toLowerCase()}`}
                    className="shrink-0 text-2xs font-semibold text-primary bg-surface-container-lowest border border-outline-variant px-2.5 py-0.5 rounded-lg hover:bg-primary-container/50 transition-colors cursor-pointer"
                  >
                    Autocompletar
                  </button>
                </div>
              ))}
            </div>
            )}
      </div>
    </div>
  );
}

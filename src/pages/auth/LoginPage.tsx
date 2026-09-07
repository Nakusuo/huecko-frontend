import { BrandingPanel, MobileLogo } from '../../components/BrandingPanel';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { loginUser } from '../../services/authService';

const loginSchema = z.object({
  email: z
    .string()
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
  const { login } = useAuthStore();
  const navigate = useNavigate();

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
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión';
      setServerError(msg);
    }
  };

  const fillDemoCredentials = () => {
    setValue('email', 'alex.rodriguez@huecko.com', {
      shouldValidate: true,
    });
    setValue('password', 'demo1234', {
      shouldValidate: true,
    });
  };

  return (
    <div className="min-h-dvh bg-surface flex text-on-surface">
      {/* Columna de marca: solo en pantallas anchas. */}
      <BrandingPanel />

      {/* El formulario se lleva el resto. En móvil, la pantalla entera. */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:p-10 lg:p-12">
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
                    placeholder="alex.rodriguez@huecko.com"
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
                {errors.password && (
                  <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">error</span>
                    {errors.password.message}
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
                className="text-primary hover:text-primary-hover font-bold underline transition-colors"
              >
                Regístrate gratis
              </Link>
            </p>

            {/* Tarjeta de Credenciales Demo */}
            <div className="mt-5 p-3.5 rounded-2xl border border-dashed border-secondary bg-surface-container-low flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">key</span>
                  Credenciales Demo:
                </span>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-2xs font-semibold text-primary bg-surface-container-lowest border border-outline-variant px-2.5 py-0.5 rounded-lg hover:bg-primary-container/50 transition-colors cursor-pointer"
                >
                  Autocompletar
                </button>
              </div>
              <p className="text-xs text-on-surface-variant font-mono bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/40">
                alex.rodriguez@huecko.com / demo1234
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

const SVG_BASE_PROPS = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg {...SVG_BASE_PROPS} width="18" height="18" viewBox="0 0 24 24">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg {...SVG_BASE_PROPS} width="18" height="18" viewBox="0 0 24 24">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...SVG_BASE_PROPS} width="16" height="16" viewBox="0 0 24 24">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg {...SVG_BASE_PROPS} width="16" height="16" viewBox="0 0 24 24">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      {...SVG_BASE_PROPS}
      className="animate-spin"
      width="18"
      height="18"
      viewBox="0 0 24 24"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

const inputBaseClass = `
  w-full py-3 rounded-xl text-sm
  bg-slate-900 border text-white placeholder-slate-600
  outline-none transition-all duration-200
  focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500
`;

const inputErrorClass = 'border-red-500/60 bg-red-950/20';
const inputDefaultClass = 'border-slate-800 hover:border-slate-700';

const FEATURE_PILLS = [
  'Horarios automáticos',
  'Grupos inteligentes',
  'Votación en tiempo real',
  'Sin drama, solo planes',
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await loginUser(data);
      login(response.user, response.token);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Error inesperado. Intenta de nuevo.'
      );
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <BrandingPanel />

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <MobileLogo />

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Bienvenido de vuelta</h2>
            <p className="text-slate-400 text-sm">
              Inicia sesión para coordinar con tu grupo.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="demo@huecko.com"
                  {...register('email')}
                  className={`${inputBaseClass} pl-10 pr-4 ${errors.email ? inputErrorClass : inputDefaultClass}`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400">⚠ {errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`${inputBaseClass} pl-10 pr-12 ${errors.password ? inputErrorClass : inputDefaultClass}`}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">⚠ {errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-sm text-red-300 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">✕</span>
                <span>{serverError}</span>
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={isSubmitting}
              className="
                w-full py-3 rounded-xl font-semibold text-sm mt-2
                bg-gradient-to-r from-violet-600 to-indigo-600
                hover:from-violet-500 hover:to-indigo-500
                text-white shadow-lg shadow-violet-500/20
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none
                flex items-center justify-center gap-2
                active:scale-[0.98]
              "
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600">o</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <p className="text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Regístrate gratis
            </Link>
          </p>

          <div className="mt-6 p-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/50">
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              <span className="text-slate-400 font-medium">Demo:</span>{' '}
              demo@huecko.com / demo1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/3 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 text-center max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
              <span className="text-4xl font-black text-white tracking-tighter">H</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-slate-950 flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-900 rounded-full" />
            </div>
          </div>
        </div>

        <h1 className="text-5xl font-black text-white mb-3 tracking-tight">Huecko</h1>
        <p className="text-violet-300 text-lg font-medium mb-8">
          Coordinación Social, Naturalmente.
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          {FEATURE_PILLS.map((label) => (
            <span
              key={label}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300 backdrop-blur-sm"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-10 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm text-left">
          <p className="text-slate-300 text-sm italic leading-relaxed">
            "Por fin dejamos de discutir en el grupo de WhatsApp de cuándo nos juntamos."
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
              M
            </div>
            <span className="text-xs text-slate-400">María C. — Usuaria Beta</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="lg:hidden flex items-center gap-3 mb-10">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
        <span className="text-xl font-black text-white">H</span>
      </div>
      <span className="text-2xl font-black text-white tracking-tight">Huecko</span>
    </div>
  );
}

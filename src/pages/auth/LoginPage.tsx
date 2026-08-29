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

const FEATURE_PILLS = [
  { icon: 'calendar_month', label: 'Horarios automáticos' },
  { icon: 'groups', label: 'Grupos inteligentes' },
  { icon: 'how_to_vote', label: 'Votación en tiempo real' },
  { icon: 'spa', label: 'Sin drama, solo planes' },
];

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
      const response = await loginUser(data);
      login(response.user, response.token);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Error inesperado. Intenta de nuevo.'
      );
    }
  };

  const fillDemoCredentials = () => {
    setValue('email', 'demo@huecko.com', { shouldValidate: true });
    setValue('password', 'demo1234', { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-[#f4fbf1] flex text-[#161d15]">
      {/* Branding Panel (Desktop) */}
      <BrandingPanel />

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <MobileLogo />

          <div className="bg-[#e9f0e4]/90 border border-[#d5e3cf] rounded-3xl p-7 md:p-9 shadow-lg shadow-[#7fae7a]/10 backdrop-blur-md">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[#161d15] font-headline mb-1.5">
                Bienvenido de vuelta
              </h2>
              <p className="text-[#40493e] text-sm">
                Inicia sesión para coordinar horarios y actividades con tu grupo.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Campo Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#40493e]"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#70796d] flex items-center">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="demo@huecko.com"
                    {...register('email')}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-white text-[#161d15] placeholder-[#8a9486] border outline-none transition-all duration-200 focus:ring-2 focus:ring-[#7fae7a]/30 focus:border-[#416840] ${
                      errors.email
                        ? 'border-red-400 bg-red-50/50'
                        : 'border-[#c0c9bb] hover:border-[#7fae7a]'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Campo Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#40493e]"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#70796d] flex items-center">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`w-full pl-11 pr-12 py-3 rounded-xl text-sm bg-white text-[#161d15] placeholder-[#8a9486] border outline-none transition-all duration-200 focus:ring-2 focus:ring-[#7fae7a]/30 focus:border-[#416840] ${
                      errors.password
                        ? 'border-red-400 bg-red-50/50'
                        : 'border-[#c0c9bb] hover:border-[#7fae7a]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#70796d] hover:text-[#161d15] transition-colors p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Error del Servidor */}
              {serverError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0 text-red-600">
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
                  bg-[#416840] hover:bg-[#345333] active:scale-[0.98]
                  text-white shadow-md shadow-[#416840]/25
                  transition-all duration-200 cursor-pointer
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Separador */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-[#c0c9bb]/60" />
              <span className="text-xs text-[#70796d]">o</span>
              <div className="flex-1 h-px bg-[#c0c9bb]/60" />
            </div>

            {/* Enlace Registro */}
            <p className="text-center text-sm text-[#40493e]">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="text-[#416840] hover:text-[#2a4f2b] font-bold underline transition-colors"
              >
                Regístrate gratis
              </Link>
            </p>

            {/* Tarjeta de Credenciales Demo */}
            <div className="mt-5 p-3.5 rounded-2xl border border-dashed border-[#7fae7a] bg-[#eff6eb] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#416840] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  Credenciales Demo:
                </span>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-[11px] font-semibold text-[#416840] bg-white border border-[#c0c9bb] px-2.5 py-0.5 rounded-full hover:bg-[#c3e5bb]/50 transition-colors cursor-pointer"
                >
                  Autocompletar
                </button>
              </div>
              <p className="text-xs text-[#40493e] font-mono bg-white/70 px-2 py-1 rounded-lg border border-[#c0c9bb]/40">
                demo@huecko.com / demo1234
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12 bg-gradient-to-br from-[#1e3b1f] via-[#2a4f2b] to-[#416840] text-white">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#7fae7a]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-[#c3e5bb]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-3/4 left-1/3 w-48 h-48 bg-[#bcebe9]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#7fae7a] to-[#416840] flex items-center justify-center shadow-2xl shadow-black/30 border border-white/20">
              <span className="text-4xl font-black text-white tracking-tighter">H</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#c3e5bb] rounded-full border-2 border-[#1e3b1f] flex items-center justify-center">
              <div className="w-2 h-2 bg-[#416840] rounded-full" />
            </div>
          </div>
        </div>

        <h1 className="text-5xl font-bold font-headline mb-2 tracking-tight text-white">
          Huecko
        </h1>
        <p className="text-[#c3e5bb] text-lg font-medium mb-8">
          Coordinación Social, Naturalmente.
        </p>

        <div className="flex flex-wrap gap-2.5 justify-center mb-8">
          {FEATURE_PILLS.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 border border-white/15 rounded-full text-xs text-[#eff6eb] backdrop-blur-sm shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-[#c3e5bb]">
                {item.icon}
              </span>
              {item.label}
            </span>
          ))}
        </div>

        <div className="p-4 bg-white/10 border border-white/15 rounded-2xl backdrop-blur-md text-left shadow-lg shadow-black/10">
          <p className="text-[#eff6eb] text-sm italic leading-relaxed">
            "Por fin dejamos de discutir en el grupo de WhatsApp de cuándo nos juntamos."
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7fae7a] to-[#c3e5bb] flex items-center justify-center text-xs font-bold text-[#1e3b1f]">
              M
            </div>
            <span className="text-xs text-[#c3e5bb]">María C. — Estudiante Universitaria</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7fae7a] to-[#416840] flex items-center justify-center shadow-md shadow-[#7fae7a]/20">
        <span className="text-xl font-black text-white">H</span>
      </div>
      <span className="text-2xl font-bold font-headline text-[#161d15] tracking-tight">Huecko</span>
    </div>
  );
}

import PaginaLegal from './PaginaLegal';

export const CORREO_CONTACTO = 'rodriguezmarcela0000@gmail.com';

export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="4 de noviembre de 2026">
      <p>
        Huecko es un proyecto académico del curso Desarrollo Full Stack (UTP) para coordinar horarios y
        planes de grupo. Aquí contamos qué datos guarda, para qué y con quién se comparten.
      </p>

      <section>
        <h2>Qué datos guardamos</h2>
        <ul>
          <li>Tu nombre y tu correo. Si entras con Google, también el identificador de tu cuenta de Google.</li>
          <li>Tu contraseña, solo como un resumen cifrado (BCrypt). Nadie puede leerla.</li>
          <li>Lo que añades en la app: bloques de horario, grupos, planes, votos, fotos y comentarios.</li>
          <li>Lo opcional de tu perfil: carrera, ciclo, descripción, intereses y foto.</li>
        </ul>
      </section>

      <section>
        <h2>Para qué los usamos</h2>
        <ul>
          <li>Para que puedas entrar a tu cuenta y confirmar que el correo es tuyo.</li>
          <li>Para cruzar los horarios de tu grupo y proponer momentos libres.</li>
          <li>
            Tu horario no lo ve nadie más: el grupo solo ve cuántas personas están libres. Las fotos se
            procesan para quitarles la ubicación GPS.
          </li>
        </ul>
        <p className="mt-2">No vendemos tus datos ni los usamos para publicidad.</p>
      </section>

      <section>
        <h2>Con quién se comparten</h2>
        <ul>
          <li>Google: solo si eliges «Continuar con Google», para confirmar tu identidad (nombre y correo).</li>
          <li>Brevo: envía los correos con los códigos de verificación.</li>
          <li>
            Google Gemini: cuando pides funciones de IA (leer un horario desde una foto, sugerencias de
            planes), recibe solo lo necesario para responder.
          </li>
          <li>Render, Supabase y MongoDB Atlas: alojan la app y sus bases de datos.</li>
        </ul>
      </section>

      <section>
        <h2>Tus derechos</h2>
        <p>
          Puedes pedir ver, corregir o borrar tus datos y tu cuenta escribiendo a{' '}
          <a href={`mailto:${CORREO_CONTACTO}`} className="underline">{CORREO_CONTACTO}</a>.
        </p>
      </section>
    </PaginaLegal>
  );
}

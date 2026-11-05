import PaginaLegal from './PaginaLegal';
import { CORREO_CONTACTO } from './PrivacidadPage';

export default function TerminosPage() {
  return (
    <PaginaLegal titulo="Términos del servicio" actualizado="4 de noviembre de 2026">
      <p>
        Huecko es un proyecto académico del curso Desarrollo Full Stack (UTP). Al usarlo aceptas estas
        condiciones.
      </p>

      <section>
        <h2>Uso de la app</h2>
        <ul>
          <li>Usa un correo que sea tuyo y no compartas tu cuenta.</li>
          <li>No subas contenido ofensivo, ilegal ni datos de otras personas sin su permiso.</li>
          <li>La administración puede suspender una cuenta que no cumpla estas normas.</li>
        </ul>
      </section>

      <section>
        <h2>Sin garantías</h2>
        <p>
          Es un proyecto en desarrollo y se ofrece tal cual, sin garantía de disponibilidad. Puede
          apagarse, cambiar o perder datos. No lo uses para nada crítico.
        </p>
      </section>

      <section>
        <h2>Contacto</h2>
        <p>
          Dudas o pedidos: <a href={`mailto:${CORREO_CONTACTO}`} className="underline">{CORREO_CONTACTO}</a>.
        </p>
      </section>
    </PaginaLegal>
  );
}

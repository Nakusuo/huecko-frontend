import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupsStore } from '../store/groupsStore';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { RUTA_CREAR_GRUPO, RUTA_IMPORTAR_HORARIO, rutaProponerPlan } from '../lib/intenciones';
import { StickerRedondo } from './Stickers';

/**
 * Barra de acciones del panel.
 *
 * Antes había dos grupos de acciones: dos botones en la cabecera y una rejilla
 * de tres al **final** de la página, debajo de todo. Las de abajo solo se veían
 * después de recorrer métricas, evento, horario, grupos y votaciones — es
 * decir, casi nunca.
 *
 * Ahora es una sola barra justo bajo el saludo, en el sitio donde el ojo ya
 * está. En móvil se desplaza en horizontal con anclaje, que ocupa una línea en
 * vez de dos filas de rejilla.
 *
 * Cada acción hace lo que dice: la intención viaja en la URL (ver
 * `lib/intenciones`) y la pantalla de destino abre el formulario al llegar.
 * Antes cuatro de las cinco solo cambiaban de pantalla, «Ajustar horario» e
 * «Importar horario» llevaban al mismo sitio, y «Cómo funciona» abría el
 * asistente de bienvenida, que en realidad CREABA otro grupo.
 */

interface Accion {
  icon: string;
  label: string;
  /** Adónde lleva, o `null` si abre la guía aquí mismo. */
  ruta: string | null;
  /** La acción que se espera que alguien haga al entrar. Solo una. */
  principal?: boolean;
}

/** Los cuatro pasos del producto, en el orden en que se viven. */
const PASOS: { titulo: string; texto: string }[] = [
  {
    titulo: 'Carga tu horario',
    texto:
      'Añade tus clases y compromisos a mano o sube una foto o PDF para que Huecko los lea. Tus bloques son privados: el grupo solo ve cuándo estás libre.',
  },
  {
    titulo: 'Crea un grupo',
    texto:
      'Añade a tu gente por el correo con el que se registró y elige el umbral: qué parte del grupo tiene que estar libre para que un hueco cuente.',
  },
  {
    titulo: 'Propón y votad',
    texto:
      'Huecko cruza los horarios y sugiere las franjas donde coincidís. Propón un plan con 2 a 5 opciones y cada cual vota las que le vienen bien.',
  },
  {
    titulo: 'Quedad',
    texto:
      'Al cerrar la votación el plan queda confirmado. Si vas a llegar tarde o te surge algo, avisa desde el inicio y el grupo lo ve al momento.',
  },
];

export function AccionesRapidas() {
  const navigate = useNavigate();
  const groups = useGroupsStore((s) => s.groups);
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  useModalDismiss(guiaAbierta, () => setGuiaAbierta(false));

  const acciones: Accion[] = [
    { icon: 'add', label: 'Proponer plan', ruta: rutaProponerPlan(groups), principal: true },
    { icon: 'group_add', label: 'Crear grupo', ruta: RUTA_CREAR_GRUPO },
    { icon: 'document_scanner', label: 'Importar horario', ruta: RUTA_IMPORTAR_HORARIO },
    { icon: 'help', label: 'Cómo funciona', ruta: null },
  ];

  return (
    <>
      <nav aria-label="Acciones rápidas">
        {/* `-mx-*` + `px-*` deja que la fila sangre hasta el borde al desplazarse
            en móvil, en vez de cortarse contra el margen de la página. */}
        <ul className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {acciones.map((accion) => (
            <li key={accion.label} className="snap-start">
              <button
                type="button"
                onClick={() => (accion.ruta ? navigate(accion.ruta) : setGuiaAbierta(true))}
                aria-haspopup={accion.ruta ? undefined : 'dialog'}
                className={[
                  'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5',
                  'text-xs font-bold transition-colors cursor-pointer active:scale-95',
                  accion.principal
                    ? 'bg-primary text-on-primary hover:bg-primary-hover'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
                ].join(' ')}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  {accion.icon}
                </span>
                {accion.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Guía de solo lectura: explica, no crea nada. */}
      {guiaAbierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guia-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGuiaAbierta(false);
          }}
        >
          <div className="animate-modal-in max-h-[90dvh] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl bg-surface-container-lowest p-6 elev-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="rotulo text-2xs text-on-surface-variant">Guía rápida</p>
                <h2 id="guia-titulo" className="font-headline text-2xl font-bold text-on-surface">
                  Cómo funciona Huecko
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setGuiaAbierta(false)}
                className="cursor-pointer text-on-surface-variant transition-colors hover:text-on-surface"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <ol className="space-y-4">
              {PASOS.map((paso, i) => (
                <li key={paso.titulo} className="flex items-start gap-4">
                  <StickerRedondo
                    tono={i === PASOS.length - 1 ? 'oliva' : 'tinta'}
                    size={40}
                    giro={i % 2 === 0 ? -6 : 5}
                    retardo={i * 80}
                  >
                    <span aria-hidden="true" className="font-headline text-lg leading-none">{i + 1}</span>
                  </StickerRedondo>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">{paso.titulo}</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">{paso.texto}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex justify-end border-t border-outline-variant/40 pt-4">
              <button
                type="button"
                onClick={() => setGuiaAbierta(false)}
                className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary transition-colors hover:bg-primary-hover active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

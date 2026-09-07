import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import { useGroupsStore } from '../store/groupsStore';
import { useAuthStore } from '../store/authStore';
import { CrearGrupoModal } from '../components/CrearGrupoModal';

/**
 * «Mis grupos»: solo la lista.
 *
 * Antes esta pantalla hacía de todo. Al pulsar un grupo, su panel completo
 * —planes, votaciones, heatmap semanal— se desplegaba **debajo de la tarjeta**,
 * dentro de la misma rejilla. Con dos grupos abiertos la página medía varios
 * miles de píxeles y ya no se sabía qué información pertenecía a cuál.
 *
 * Ahora la lista solo lista, y cada grupo tiene su propia dirección
 * (`/groups/:groupId`). Para ver otro hay que volver y entrar en él: es un
 * paso más, y a cambio nunca hay dudas sobre de qué grupo estás leyendo.
 */
export default function GroupsListPage() {
  const navigate = useNavigate();
  const groups = useGroupsStore((s) => s.groups);
  const createGroup = useGroupsStore((s) => s.createGroup);
  const addMemberByEmail = useGroupsStore((s) => s.addMemberByEmail);
  const user = useAuthStore((s) => s.user);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-on-surface">
      <Navbar currentTab="groups" />

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-grow px-6 pb-24 pt-8 md:px-10 md:pb-12"
      >
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">
              Mis grupos
            </h1>
            <p className="mt-1.5 text-sm text-on-surface-variant md:text-base">
              Entra en un grupo para ver sus planes, su horario común y sus integrantes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-on-secondary transition-colors hover:bg-secondary-hover active:scale-95 md:w-auto"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              group_add
            </span>
            Crear grupo
          </button>
        </header>

        {groups.length === 0 ? (
          <EmptyState
            icon="groups"
            title="Aún no tienes ningún grupo"
            description="Crea tu primer grupo, añade a la gente por su correo y Huecko te dirá cuándo coinciden todos."
            actionLabel="Crear mi primer grupo"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="elev-1 elev-hover flex h-full w-full cursor-pointer flex-col rounded-2xl bg-surface-container-lowest p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-headline text-lg font-bold text-on-surface">
                      {group.nombre}
                    </h2>
                    <span className="shrink-0 rounded-lg bg-primary-container px-2 py-0.5 text-2xs font-bold tabular-nums text-on-primary-container">
                      {group.umbralDisponibilidad}%
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-on-surface-variant">
                    {group.descripcion || 'Sin descripción.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <Integrantes miembros={group.miembros} />
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[20px] text-on-surface-variant"
                    >
                      chevron_right
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {isCreateOpen && (
        <CrearGrupoModal
          title="Crear grupo"
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (datos) => {
            const nuevo = await createGroup(
              datos.nombre,
              datos.descripcion,
              datos.umbral,
              user?.email ?? "",
              user?.nombre ?? "",
            );
            /* Las altas van despues de crear: el grupo tiene que existir para
               poder meter a nadie en el. Si alguna falla, el grupo ya esta
               creado y se puede reintentar desde integrantes. */
            for (const correo of datos.correos) {
              await addMemberByEmail(nuevo.id, correo);
            }
            setIsCreateOpen(false);
            // Entrar directo al grupo recién creado: lo siguiente que quiere
            // hacer quien acaba de crearlo es añadir gente.
            navigate(`/groups/${nuevo.id}`);
          }}
        />
      )}
    </div>
  );
}

/**
 * Avatares apilados con el recuento.
 *
 * Se muestran cinco como mucho: a partir de ahí las iniciales dejan de
 * distinguir a nadie y solo importa cuántos son.
 */
function Integrantes({ miembros }: { miembros: { email: string; nombre: string }[] }) {
  const visibles = miembros.slice(0, 5);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {visibles.map((m) => (
          <span
            key={m.email}
            title={m.nombre}
            className="flex size-6 items-center justify-center rounded-full bg-secondary text-2xs font-bold text-on-secondary ring-2 ring-surface-container-lowest"
          >
            {m.nombre.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="text-2xs text-on-surface-variant">
        {miembros.length} {miembros.length === 1 ? 'integrante' : 'integrantes'}
      </span>
    </div>
  );
}

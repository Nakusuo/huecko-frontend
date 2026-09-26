import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import EnConstruccion from '../../components/admin/EnConstruccion';

export default function AdminGruposPage() {
  return (
    <>
      <CabeceraAdmin titulo="Grupos" bajada="Grupos de la plataforma y su actividad. Sin ver agendas ni planes por dentro." />
      <EnConstruccion icon="groups" texto="Aquí irá la lista de grupos, con la opción de archivar los abandonados." />
    </>
  );
}

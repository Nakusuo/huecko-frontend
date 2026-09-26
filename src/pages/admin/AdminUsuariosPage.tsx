import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import EnConstruccion from '../../components/admin/EnConstruccion';

export default function AdminUsuariosPage() {
  return (
    <>
      <CabeceraAdmin titulo="Usuarios" bajada="Cuentas registradas, su actividad y su estado." />
      <EnConstruccion icon="manage_accounts" texto="Aquí irá la lista de cuentas, con búsqueda y suspensión." />
    </>
  );
}

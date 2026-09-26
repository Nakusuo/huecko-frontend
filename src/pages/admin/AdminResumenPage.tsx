import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import EnConstruccion from '../../components/admin/EnConstruccion';

export default function AdminResumenPage() {
  return (
    <>
      <CabeceraAdmin titulo="Resumen" bajada="Cómo se está usando Huecko: cuentas, grupos, planes e imprevistos." />
      <EnConstruccion icon="monitoring" texto="Aquí irán las métricas de la plataforma." />
    </>
  );
}

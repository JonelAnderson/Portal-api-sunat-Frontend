

export interface MenuItems {
  type: "link" | "button";
  id?: "all" | "Activo" | "Inactivo" | "Pendiente" | "Consolidado" | "Presente" | "Tardanza" | "Falta" | "Aprobado" | "Rechazado" | "Nuevo" | "Contactado" | "Negociacion" | "Cierre" | "Perfilado" | "No_perfilado" | "F0" | "F1" | "F2" | "Abierto" | "Cerrado" | "Borrador" | "Procesado" | "Pagado" | "Cancelado";
 icon?: string;
  label: string;
  value?: number;
  class?: {
    icon?: string;
  };
  size?: string;
}

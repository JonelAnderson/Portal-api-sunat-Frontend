export interface TableAction {
    id: string;
    label: string | ((row: any) => string);
    icon: string | ((row: any) => string);
    color?: string | ((row: any) => string);
    tooltip?: string | ((row: any) => string);
    visible?: (row: any) => boolean;
    disabled?: (row: any) => boolean;
    showOnState?: { field: string; value: any };
  }
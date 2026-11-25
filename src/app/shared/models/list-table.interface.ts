export interface TableColumns<T> {
  label: string;
  cssLabel: string[];
  property: keyof T | any;
  cssProperty: string[];
  subProperty?: keyof T | any;
  cssSubProperty?: string[];
  type: "text" | "number" | "date" | "datetime" | "time" | "icon" | "button" | "badge" | "badgeafp" | "description" | "imagen" | "imagen-profile" | "currency"  | "price" |  "actions" | "array" | "auditoria" | "badge-two";
  visible: boolean;
  //sort: boolean;
  //sortProperty?: string;
  action?: (row: T) => void;
  iconColumn?: IconColumn<T>;
  sticky: boolean;
  tooltip?: string;
  imgSize?: number;
  download?: boolean;
  property_download?: string;
}
 
export interface TableFooter<T> {
  label: string;
  property: keyof T | string;
  tooltip: string;
}

export interface TableItem {
  action: string;
  row: any;
}
export interface IconColumn<T> {
  label: string;
  cssLabel: string[];
  property: keyof T | any;
  cssProperty: string[];
  type: "icon";
  visible: boolean;
  sort: boolean;
  sortProperty?: string;
  action?: (row: T) => void;
  sticky: boolean;
  tooltip?: string;
  download?: boolean;
  property_download?: string;
}
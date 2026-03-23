export type BillWithRelations = {
  id: string;
  fv: number;
  fecha: Date;
  valor: { toString(): string };
  abono: { toString(): string } | null;
  reteFuente: { toString(): string } | null;
  iva: { toString(): string } | null;
  vSinIva: { toString(): string } | null;
  vComi: { toString(): string } | null;
  descuentos?: {
    id: string;
    amount: { toString(): string } | number;
    concepto: string;
    createdAt: Date;
  }[];
  comentarios: string | null;
  conditioned?: boolean;
  estado: "PENDIENTE" | "LIQUIDADA";
  cliente: { id: string; nombre: string };
  ciudad: { id: string; nombre: string };
  vendedor: { id: string; nombre: string };
  settlement?: { id: string; month: string } | null;
  payments?: { id: string; amount: { toString(): string }; paidAt: Date }[];
  dias?: number;
};

export type BillColumn = {
  key: keyof BillWithRelations | "saldo";
  label: string;
  money?: boolean;
};

export const COLS: BillColumn[] = [
  { key: "cliente", label: "Cliente" },
  { key: "fv", label: "FV" },
  { key: "fecha", label: "Fecha" },
  { key: "dias", label: "Dias" },
  { key: "ciudad", label: "Ciudad" },
  { key: "vendedor", label: "Vendedor" },
  { key: "valor", label: "Valor", money: true },
  { key: "abono", label: "Abono", money: true },
  { key: "descuentos", label: "Descuentos", money: true },
  { key: "saldo", label: "Saldo", money: true },
  { key: "reteFuente", label: "Rete Fuente", money: true },
  { key: "iva", label: "IVA", money: true },
  { key: "vSinIva", label: "V. Sin IVA", money: true },
  { key: "vComi", label: "V. Comi.", money: true },
  { key: "estado", label: "Estado" },
];

export const FILTERABLE_COLS = ["vendedor", "ciudad", "saldo"] as const;

export type FilterableCol = (typeof FILTERABLE_COLS)[number];

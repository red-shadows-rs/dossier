import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import MuiTable from "@mui/material/Table";
import MuiTableBody from "@mui/material/TableBody";
import MuiTableCell from "@mui/material/TableCell";
import type { TableCellProps } from "@mui/material/TableCell";
import MuiTableContainer from "@mui/material/TableContainer";
import MuiTableHead from "@mui/material/TableHead";
import MuiTableRow from "@mui/material/TableRow";

export function Table({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <MuiTableContainer sx={{ overflowX: "auto", width: "100%", scrollbarWidth: "thin" }}>
      <MuiTable size="small" className={className} sx={{ minWidth: 520 }} {...props}>
        {children}
      </MuiTable>
    </MuiTableContainer>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <MuiTableHead className={className} {...props}>
      {children}
    </MuiTableHead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <MuiTableBody className={className} {...props}>
      {children}
    </MuiTableBody>
  );
}

export function TableRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <MuiTableRow hover className={className} {...props}>
      {children}
    </MuiTableRow>
  );
}

export function TableHeaderCell({
  className,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <MuiTableCell
      component="th"
      scope="col"
      className={className}
      sx={{ fontWeight: 600 }}
      {...(props as unknown as TableCellProps)}
    >
      {children}
    </MuiTableCell>
  );
}

export function TableCell({
  className,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <MuiTableCell className={className} {...(props as unknown as TableCellProps)}>
      {children}
    </MuiTableCell>
  );
}

export function TableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <MuiTableRow>
      <MuiTableCell
        colSpan={colSpan}
        align="center"
        sx={{ py: 4, color: "text.secondary" }}
      >
        {children}
      </MuiTableCell>
    </MuiTableRow>
  );
}
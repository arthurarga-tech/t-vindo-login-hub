import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FinancialTransaction } from "@/hooks/useFinancial";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TransactionListProps {
  transactions: FinancialTransaction[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function TransactionList({ transactions, isLoading, onDelete }: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-12 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum lançamento encontrado para o período selecionado.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead className="w-[80px]">Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Bruto</TableHead>
            <TableHead className="text-right">Taxa</TableHead>
            <TableHead className="text-right">Líquido</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">
                {format(new Date(t.transaction_date), "dd/MM/yy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                {t.type === "income" ? (
                  <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                    <ArrowUpCircle className="h-3 w-3 mr-1" />
                    Rec
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">
                    <ArrowDownCircle className="h-3 w-3 mr-1" />
                    Desp
                  </Badge>
                )}
              </TableCell>
              <TableCell>{t.category?.name || "-"}</TableCell>
              <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(t.gross_amount)}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {t.fee_amount > 0 ? `-${formatCurrency(t.fee_amount)}` : "-"}
              </TableCell>
              <TableCell className={`text-right font-mono font-medium ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                {t.type === "income" ? "+" : "-"}{formatCurrency(t.net_amount)}
              </TableCell>
              <TableCell>
                {!t.order_id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(t.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

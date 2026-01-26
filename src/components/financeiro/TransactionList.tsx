import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { parse, format } from "date-fns";
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
  onEdit?: (transaction: FinancialTransaction) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function TransactionList({ transactions, isLoading, onDelete, onEdit }: TransactionListProps) {
  if (isLoading) {
    return (
      <div 
        className="space-y-3"
        data-testid="transaction-list-loading"
        aria-busy="true"
        aria-label="Carregando transações"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-12 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div 
        className="text-center py-12 text-muted-foreground"
        data-testid="transaction-list-empty"
        role="status"
      >
        Nenhum lançamento encontrado para o período selecionado.
      </div>
    );
  }

  const paymentMethodLabels: Record<string, string> = {
    pix: "Pix",
    credit: "Crédito",
    debit: "Débito",
    cash: "Dinheiro",
  };

  return (
    <div 
      className="rounded-md border"
      data-testid="transaction-list"
      role="region"
      aria-label="Lista de transações financeiras"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead className="w-[80px]">Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Bruto</TableHead>
            <TableHead className="text-right">Taxa</TableHead>
            <TableHead className="text-right">Líquido</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow 
              key={t.id}
              data-testid={`transaction-row-${t.id}`}
            >
              <TableCell 
                className="font-medium"
                data-testid="transaction-date"
              >
                {format(parse(t.transaction_date, "yyyy-MM-dd", new Date()), "dd/MM/yy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                {t.type === "income" ? (
                  <Badge 
                    variant="default" 
                    className="bg-green-100 text-green-700 hover:bg-green-100"
                    data-testid="transaction-type-income"
                    aria-label="Receita"
                  >
                    <ArrowUpCircle className="h-3 w-3 mr-1" />
                    Rec
                  </Badge>
                ) : (
                  <Badge 
                    variant="destructive" 
                    className="bg-red-100 text-red-700 hover:bg-red-100"
                    data-testid="transaction-type-expense"
                    aria-label="Despesa"
                  >
                    <ArrowDownCircle className="h-3 w-3 mr-1" />
                    Desp
                  </Badge>
                )}
              </TableCell>
              <TableCell data-testid="transaction-category">{t.category?.name || "-"}</TableCell>
              <TableCell 
                className="max-w-[200px] truncate"
                data-testid="transaction-description"
              >
                {t.description}
              </TableCell>
              <TableCell 
                className="text-sm text-muted-foreground"
                data-testid="transaction-payment-method"
              >
                {t.payment_method ? paymentMethodLabels[t.payment_method] || t.payment_method : "-"}
              </TableCell>
              <TableCell 
                className="text-right font-mono"
                data-testid="transaction-gross-amount"
              >
                {formatCurrency(t.gross_amount)}
              </TableCell>
              <TableCell 
                className="text-right font-mono text-muted-foreground"
                data-testid="transaction-fee-amount"
              >
                {t.fee_amount > 0 ? `-${formatCurrency(t.fee_amount)}` : "-"}
              </TableCell>
              <TableCell 
                className={`text-right font-mono font-medium ${t.type === "income" ? "text-green-600" : "text-red-600"}`}
                data-testid="transaction-net-amount"
              >
                {t.type === "income" ? "+" : "-"}{formatCurrency(t.net_amount)}
              </TableCell>
              <TableCell>
                {!t.order_id && (
                  <div className="flex gap-1">
                    {onEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onEdit(t)}
                        data-testid="transaction-edit-button"
                        aria-label="Editar transação"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          data-testid="transaction-delete-button"
                          aria-label="Excluir transação"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent data-testid="transaction-delete-dialog">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="transaction-delete-cancel">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(t.id)}
                            data-testid="transaction-delete-confirm"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

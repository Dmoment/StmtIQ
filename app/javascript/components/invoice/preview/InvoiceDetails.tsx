import { formatDate } from '../../../utils/formatters';

interface InvoiceDetailsProps {
  invoiceDate: string;
  dueDate: string;
  currency: string;
}

export function InvoiceDetails({ invoiceDate, dueDate, currency }: InvoiceDetailsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
      <div>
        <div className="text-slate-500 mb-1">Invoice Date</div>
        <div className="font-medium text-slate-900">{formatDate(invoiceDate)}</div>
      </div>
      <div>
        <div className="text-slate-500 mb-1">Due Date</div>
        <div className="font-medium text-slate-900">{formatDate(dueDate)}</div>
      </div>
      <div>
        <div className="text-slate-500 mb-1">Currency</div>
        <div className="font-medium text-slate-900">{currency}</div>
      </div>
    </div>
  );
}

interface InvoiceHeaderProps {
  invoiceTitle: string;
  invoiceSubtitle?: string;
  invoiceNumber: string;
  primaryColor: string;
}

export function InvoiceHeader({
  invoiceTitle,
  invoiceSubtitle,
  invoiceNumber,
  primaryColor,
}: InvoiceHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: primaryColor }}>
          {invoiceTitle}
        </h1>
        {invoiceSubtitle && <p className="text-slate-500">{invoiceSubtitle}</p>}
      </div>
      <div className="text-right">
        <div className="text-sm text-slate-500 mb-1">Invoice No</div>
        <div className="font-semibold text-slate-900">{invoiceNumber}</div>
      </div>
    </div>
  );
}

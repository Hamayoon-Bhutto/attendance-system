import React, { useState } from 'react';
import { FeeRecord, Student } from '../types';
import { X, CheckCircle, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { formatDateKey } from '../lib/attendanceMath';
import { formatPKR } from '../lib/pakistanFormat';

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (feeRecordId: string, amountPaying: number, method: 'cash' | 'bank' | 'online' | 'other', note?: string) => void;
  feeRecord: FeeRecord | null;
  student: Student | null;
}

export const MarkPaidModal: React.FC<MarkPaidModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  feeRecord,
  student,
}) => {
  if (!isOpen || !feeRecord || !student) return null;

  const remaining = Math.max(0, feeRecord.amountDue - feeRecord.amountPaid);
  const [amountPaying, setAmountPaying] = useState(remaining);
  const [method, setMethod] = useState<'cash' | 'bank' | 'online' | 'other'>('cash');
  const [note, setNote] = useState('');
  const [paidDate, setPaidDate] = useState(formatDateKey(new Date()));

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaying <= 0) return;
    onConfirm(feeRecord.id, amountPaying, method, note.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-sky-100 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 dark:border-slate-800 bg-sky-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Record Fee Payment (PKR)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePay} className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-sky-50/40 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Student:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{student.fullName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Fee Month:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {feeRecord.feeType === 'readmission' ? 'Re-Admission Fee' : feeRecord.feeMonth.substring(0, 7)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-sky-100 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Total Due:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatPKR(feeRecord.amountDue)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Already Paid:</span>
              <span className="font-semibold text-emerald-600">{formatPKR(feeRecord.amountPaid)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-sky-100 dark:border-slate-700">
              <span className="text-red-600 dark:text-red-400">Remaining Balance:</span>
              <span className="text-red-600 dark:text-red-400">{formatPKR(remaining)}</span>
            </div>
          </div>

          {/* Amount Paying */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount Paying Now (PKR - Rs.) *
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                min="1"
                max={remaining}
                required
                value={amountPaying}
                onChange={(e) => setAmountPaying(Number(e.target.value))}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
            {amountPaying < remaining && amountPaying > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Will be marked as Partial payment. Remaining balance: {formatPKR(remaining - amountPaying)}.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden appearance-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="online">Online / Easypaisa / JazzCash</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Reference / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid at front desk / Transfer receipt #9821"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

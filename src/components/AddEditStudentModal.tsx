import React, { useEffect, useState } from 'react';
import { Batch, Student, TaekwondoBelt } from '../types';
import { X, User, Phone, Calendar, Layers, Award } from 'lucide-react';
import { formatDateKey } from '../lib/attendanceMath';
import { TAEKWONDO_BELTS } from '../lib/beltUtils';
import { GUARDIAN_PHONE_ERROR, isValidGuardianPhone } from '../lib/studentValidation';

interface AddEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Partial<Student>) => Promise<void>;
  studentToEdit?: Student | null;
  batches: Batch[];
}

export const AddEditStudentModal: React.FC<AddEditStudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  studentToEdit,
  batches,
}) => {
  const [fullName, setFullName] = useState(studentToEdit ? studentToEdit.fullName : '');
  const [guardianName, setGuardianName] = useState(studentToEdit ? studentToEdit.guardianName : '');
  const [guardianPhone, setGuardianPhone] = useState(studentToEdit ? studentToEdit.guardianPhone : '');
  const [batchId, setBatchId] = useState(studentToEdit ? studentToEdit.batchId : batches[0]?.id || '');
  const [beltLevel, setBeltLevel] = useState<TaekwondoBelt>(
    studentToEdit?.beltLevel || studentToEdit?.belt || 'White'
  );
  const [monthlyFee, setMonthlyFee] = useState(studentToEdit ? studentToEdit.monthlyFee : 4000);
  const [admissionDate, setAdmissionDate] = useState(
    studentToEdit ? studentToEdit.admissionDate : formatDateKey(new Date())
  );
  const [photoUrl, setPhotoUrl] = useState(studentToEdit?.photoUrl || '');
  const [status, setStatus] = useState<'active' | 'suspended' | 'left'>(studentToEdit ? studentToEdit.status : 'active');
  const [error, setError] = useState('');
  const phoneIsValid = isValidGuardianPhone(guardianPhone);

  useEffect(() => {
    if (!isOpen) return;
    setFullName(studentToEdit?.fullName || '');
    setGuardianName(studentToEdit?.guardianName || '');
    setGuardianPhone(studentToEdit?.guardianPhone || '');
    setBatchId(studentToEdit?.batchId || batches[0]?.id || '');
    setBeltLevel(studentToEdit?.beltLevel || studentToEdit?.belt || 'White');
    setMonthlyFee(studentToEdit?.monthlyFee ?? 4000);
    setAdmissionDate(studentToEdit?.admissionDate || formatDateKey(new Date()));
    setPhotoUrl(studentToEdit?.photoUrl || '');
    setStatus(studentToEdit?.status || 'active');
    setError('');
  }, [isOpen, studentToEdit, batches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !batchId || !admissionDate || !Number.isFinite(Number(monthlyFee)) || Number(monthlyFee) < 0) {
      setError('Complete the highlighted required fields with valid values.');
      return;
    }
    if (!phoneIsValid) {
      setError(GUARDIAN_PHONE_ERROR);
      return;
    }
    if (!beltLevel) {
      setError('Belt Level is mandatory. Please select a valid Taekwondo belt.');
      return;
    }

    try {
      await onSave({
        ...(studentToEdit ? { id: studentToEdit.id } : {}),
        fullName: fullName.trim(),
        guardianName: guardianName.trim(),
        guardianPhone: guardianPhone.trim(),
        batchId,
        beltLevel,
        belt: beltLevel,
        monthlyFee: Number(monthlyFee) || 0,
        admissionDate,
        photoUrl: photoUrl.trim() || undefined,
        status,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the student to Supabase.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 dark:border-slate-800 bg-sky-50/60 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {studentToEdit ? 'Edit Student Profile' : 'Register New Student'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Student Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Muhammad Ali Khan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Guardian Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Parent / Guardian Name
              </label>
              <input
                type="text"
                placeholder="e.g. Tariq Mehmood"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            {/* Guardian WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Guardian WhatsApp / Phone *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={guardianPhone}
                  maxLength={18}
                  autoComplete="tel"
                  aria-describedby="guardian-phone-error"
                  aria-invalid={guardianPhone.length > 0 && !phoneIsValid}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
              {guardianPhone.length > 0 && !phoneIsValid && <p id="guardian-phone-error" className="mt-1 text-xs text-red-600">{GUARDIAN_PHONE_ERROR}</p>}
            </div>
          </div>

          {/* Taekwondo Belt Level Dropdown & Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="student-belt-level-dropdown" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Belt Level *</span>
                <span className="text-[10px] text-red-500 font-bold">(Mandatory)</span>
              </label>
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                Selected: {beltLevel} Belt
              </span>
            </div>

            {/* Dropdown for belt levels (White, Yellow, Green, Blue, Red, Black) */}
            <div className="relative mb-2">
              <select
                id="student-belt-level-dropdown"
                name="beltLevel"
                required
                value={beltLevel}
                onChange={(e) => setBeltLevel(e.target.value as TaekwondoBelt)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              >
                <option value="White">White (Beginner - 10th Geup)</option>
                <option value="Yellow">Yellow (Sprouting - 8th-7th Geup)</option>
                <option value="Green">Green (Growing - 6th-5th Geup)</option>
                <option value="Blue">Blue (Sky Reaching - 4th-3rd Geup)</option>
                <option value="Red">Red (Power Mastery - 2nd-1st Geup)</option>
                <option value="Black">Black (Mastery - 1st Dan & Above)</option>
              </select>
            </div>

            {/* Visual belt cards grid synced with dropdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TAEKWONDO_BELTS.map((b) => {
                const isSelected = beltLevel === b.id;
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setBeltLevel(b.id)}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                      isSelected
                        ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50 dark:bg-sky-950/40'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-sky-200'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full shrink-0 border ${b.borderColor} ${b.bgColor}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{b.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{b.geupRank}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batch */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch / Class Group
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Monthly Fee */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Monthly Fee (PKR)
              </label>
              <div className="relative">
                <span className="text-xs font-bold text-slate-400 absolute left-3 top-3">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(Number(e.target.value))}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Admission Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Admission Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="left">Left / Inactive</option>
              </select>
            </div>
          </div>

          {/* Photo URL (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Student Photo URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
            >
              {studentToEdit ? 'Save Changes' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

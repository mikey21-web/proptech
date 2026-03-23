'use client';

import { useState } from 'react';
import { X, Save, Plus, Loader2, Trash2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface CommissionRuleFormProps {
  projects: Project[];
  onCreateStructure: (data: { name: string; type: string; isDefault: boolean }) => Promise<{ id: string }>;
  onAddRule: (data: {
    structureId: string;
    minAmount: number;
    maxAmount?: number;
    percentage?: number;
    flatAmount?: number;
    projectId?: string;
    description?: string;
  }) => Promise<void>;
  onClose: () => void;
}

interface RuleEntry {
  minAmount: string;
  maxAmount: string;
  percentage: string;
  flatAmount: string;
  projectId: string;
  description: string;
}

export default function CommissionRuleForm({
  projects,
  onCreateStructure,
  onAddRule,
  onClose,
}: CommissionRuleFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'structure' | 'rules'>('structure');

  const [structureName, setStructureName] = useState('');
  const [structureType, setStructureType] = useState<'percentage' | 'flat' | 'tiered'>('percentage');
  const [isDefault, setIsDefault] = useState(false);
  const [structureId, setStructureId] = useState('');

  const emptyRule: RuleEntry = {
    minAmount: '0',
    maxAmount: '',
    percentage: '',
    flatAmount: '',
    projectId: '',
    description: '',
  };
  const [rules, setRules] = useState<RuleEntry[]>([{ ...emptyRule }]);

  const addRule = () => setRules((prev) => [...prev, { ...emptyRule }]);
  const removeRule = (index: number) => setRules((prev) => prev.filter((_, i) => i !== index));
  const updateRule = (index: number, field: string, value: string) => {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const handleCreateStructure = async () => {
    if (!structureName.trim()) {
      setError('Structure name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await onCreateStructure({
        name: structureName,
        type: structureType,
        isDefault,
      });
      setStructureId(result.id);
      setStep('rules');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create structure');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRules = async () => {
    setLoading(true);
    setError('');
    try {
      for (const rule of rules) {
        await onAddRule({
          structureId,
          minAmount: Number(rule.minAmount) || 0,
          maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
          percentage: rule.percentage ? Number(rule.percentage) : undefined,
          flatAmount: rule.flatAmount ? Number(rule.flatAmount) : undefined,
          projectId: rule.projectId || undefined,
          description: rule.description || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {step === 'structure' ? 'Create Commission Structure' : 'Add Commission Rules'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {step === 'structure' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Structure Name *
                </label>
                <input
                  type="text"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  placeholder="e.g., Standard Commission, Premium Tier"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Commission Type
                </label>
                <select
                  value={structureType}
                  onChange={(e) => setStructureType(e.target.value as typeof structureType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat Amount</option>
                  <option value="tiered">Tiered</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="isDefault" className="text-sm text-slate-700 dark:text-slate-300">
                  Set as default commission structure
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreateStructure}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Next: Add Rules
                </button>
              </div>
            </div>
          )}

          {step === 'rules' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Define commission rules for &ldquo;{structureName}&rdquo; ({structureType})
              </p>

              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Rule {index + 1}
                    </span>
                    {rules.length > 1 && (
                      <button
                        onClick={() => removeRule(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Min Amount</label>
                      <input
                        type="number"
                        value={rule.minAmount}
                        onChange={(e) => updateRule(index, 'minAmount', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Max Amount</label>
                      <input
                        type="number"
                        value={rule.maxAmount}
                        onChange={(e) => updateRule(index, 'maxAmount', e.target.value)}
                        placeholder="Unlimited"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    {structureType !== 'flat' && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Percentage (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={rule.percentage}
                          onChange={(e) => updateRule(index, 'percentage', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                    {structureType !== 'percentage' && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Flat Amount</label>
                        <input
                          type="number"
                          value={rule.flatAmount}
                          onChange={(e) => updateRule(index, 'flatAmount', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Project (Optional)</label>
                      <select
                        value={rule.projectId}
                        onChange={(e) => updateRule(index, 'projectId', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
                      >
                        <option value="">All Projects</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Description</label>
                      <input
                        type="text"
                        value={rule.description}
                        onChange={(e) => updateRule(index, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addRule}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Add Another Rule
              </button>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep('structure')}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveRules}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Rules
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

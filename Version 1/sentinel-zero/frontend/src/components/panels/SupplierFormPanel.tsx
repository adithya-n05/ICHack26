/**
 * SupplierFormPanel - Form for adding new supply chain nodes
 *
 * Following Context7 React form best practices:
 * - Controlled inputs with useState
 * - onChange handlers for state updates
 * - Form validation
 */

import { useState, useCallback } from 'react';
import { useStore } from '../../store';
import type { SupplyNode } from '../../types';

interface SupplierFormPanelProps {
  onClose: () => void;
  initialCoordinates?: [number, number];
}

type NodeType = 'supplier' | 'port' | 'warehouse' | 'factory';

interface FormData {
  name: string;
  type: NodeType;
  company: string;
  country: string;
  countryCode: string;
  products: string;
  capacity: string;
  leadTime: string;
  unitCost: string;
}

const initialFormData: FormData = {
  name: '',
  type: 'supplier',
  company: '',
  country: '',
  countryCode: '',
  products: '',
  capacity: '',
  leadTime: '',
  unitCost: '',
};

const nodeTypeConfig: Record<NodeType, { label: string; icon: string; color: string }> = {
  supplier: { label: 'Supplier', icon: '◆', color: 'text-cyan-400' },
  port: { label: 'Port', icon: '⬡', color: 'text-purple-400' },
  warehouse: { label: 'Warehouse', icon: '■', color: 'text-amber-400' },
  factory: { label: 'Factory', icon: '●', color: 'text-green-400' },
};

export function SupplierFormPanel({ onClose, initialCoordinates }: SupplierFormPanelProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [coordinates, setCoordinates] = useState<[number, number]>(
    initialCoordinates || [0, 0]
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addNode = useStore((state) => state.addNode);
  const setPlacementMode = useStore((state) => state.setPlacementMode);

  // Controlled input handler (Context7 pattern)
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  // Coordinate input handlers
  const handleLngChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setCoordinates(prev => [value, prev[1]]);
  }, []);

  const handleLatChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setCoordinates(prev => [prev[0], value]);
  }, []);

  // Form validation
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }
    if (!formData.countryCode.trim()) {
      newErrors.countryCode = 'Country code is required';
    } else if (formData.countryCode.length !== 2) {
      newErrors.countryCode = 'Must be 2 characters (ISO)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Create new node
      const newNode: SupplyNode = {
        id: crypto.randomUUID(),
        name: formData.name,
        type: formData.type,
        coordinates: coordinates,
        country: formData.country,
        countryCode: formData.countryCode.toUpperCase(),
        riskScore: 25, // Default low risk for new nodes
        metadata: {
          company: formData.company || undefined,
          products: formData.products
            ? formData.products.split(',').map(p => p.trim())
            : undefined,
          capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
          leadTime: formData.leadTime ? parseInt(formData.leadTime) : undefined,
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
        },
      };

      addNode(newNode);
      setPlacementMode(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, coordinates, validate, addNode, setPlacementMode, onClose]);

  return (
    <div className="flex flex-col h-full bg-[#0a0c10]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">+</span>
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Add Node
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span className="text-lg">&times;</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node Type Selection */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
            Node Type
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(nodeTypeConfig) as NodeType[]).map((type) => {
              const config = nodeTypeConfig[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type }))}
                  className={`p-2 rounded border text-center transition-all ${
                    formData.type === type
                      ? 'bg-gray-800 border-cyan-400/50'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <span className={`text-lg ${config.color}`}>{config.icon}</span>
                  <span className="block text-[10px] text-gray-400 mt-1">
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., TSMC Fab 18"
            className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none ${
              errors.name ? 'border-red-400' : 'border-gray-700 focus:border-cyan-400/50'
            }`}
          />
          {errors.name && (
            <p className="text-xs text-red-400 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Company */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
            Company
          </label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="e.g., TSMC"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
          />
        </div>

        {/* Country & Code */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Country *
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="e.g., Taiwan"
              className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none ${
                errors.country ? 'border-red-400' : 'border-gray-700 focus:border-cyan-400/50'
              }`}
            />
            {errors.country && (
              <p className="text-xs text-red-400 mt-1">{errors.country}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Code *
            </label>
            <input
              type="text"
              name="countryCode"
              value={formData.countryCode}
              onChange={handleChange}
              placeholder="TW"
              maxLength={2}
              className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 uppercase focus:outline-none ${
                errors.countryCode ? 'border-red-400' : 'border-gray-700 focus:border-cyan-400/50'
              }`}
            />
            {errors.countryCode && (
              <p className="text-xs text-red-400 mt-1">{errors.countryCode}</p>
            )}
          </div>
        </div>

        {/* Coordinates */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
            Coordinates
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                step="0.01"
                value={coordinates[0]}
                onChange={handleLngChange}
                placeholder="Longitude"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
              />
              <span className="text-[10px] text-gray-600">Longitude</span>
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                value={coordinates[1]}
                onChange={handleLatChange}
                placeholder="Latitude"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
              />
              <span className="text-[10px] text-gray-600">Latitude</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-1">
            Click on map to set location
          </p>
        </div>

        {/* Products */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
            Products
          </label>
          <input
            type="text"
            name="products"
            value={formData.products}
            onChange={handleChange}
            placeholder="e.g., 5nm chips, 3nm chips"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
          />
          <span className="text-[10px] text-gray-600">Comma-separated</span>
        </div>

        {/* Capacity & Lead Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Capacity %
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min="0"
              max="100"
              placeholder="85"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Lead Time (days)
            </label>
            <input
              type="number"
              name="leadTime"
              value={formData.leadTime}
              onChange={handleChange}
              min="0"
              placeholder="45"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>

        {/* Unit Cost */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
            Unit Cost ($)
          </label>
          <input
            type="number"
            name="unitCost"
            value={formData.unitCost}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="2.40"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 rounded text-sm font-medium hover:bg-cyan-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Node'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SupplierFormPanel;

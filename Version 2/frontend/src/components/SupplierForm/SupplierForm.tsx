import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MATERIAL_OPTIONS = [
  'Silicon Wafers',
  'DRAM Chips',
  'NAND Flash',
  'Processors',
  'Logic Chips',
  'Passive Components',
  'PCB',
  'Packaging Materials',
];

interface Supplier {
  name: string;
  location: string;
  materials: string[];
}

interface SupplierFormData {
  company: {
    name: string;
    location: { city: string; country: string };
  };
  suppliers: Supplier[];
}

interface SupplierFormProps {
  onSubmit?: (data: SupplierFormData) => void;
  onSubmitSuccess?: () => void;
  onClose?: () => void;
}

export function SupplierForm({ onSubmit, onSubmitSuccess, onClose }: SupplierFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState({ city: '', country: '' });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier>({
    name: '',
    location: '',
    materials: [],
  });

  const handleAddSupplier = () => {
    if (currentSupplier.name) {
      setSuppliers([...suppliers, currentSupplier]);
      setCurrentSupplier({ name: '', location: '', materials: [] });
    }
  };

  const handleSubmit = async () => {
    const formData: SupplierFormData = {
      company: { name: companyName, location },
      suppliers,
    };

    // Call onSubmit prop if provided
    onSubmit?.(formData);

    // POST to API
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/user-supply-chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: {
            name: companyName,
            city: location.city,
            country: location.country,
          },
          suppliers: suppliers.map(s => {
            const [city, country] = s.location.split(',').map(p => p.trim());
            return {
              name: s.name,
              city: city || s.location,
              country: country || '',
              materials: s.materials,
            };
          }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save supply chain');
      }

      console.log('Supply chain saved successfully');
      onSubmitSuccess?.();
    } catch (error) {
      console.error('Error saving supply chain:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) {
      return (
        companyName.trim() !== '' &&
        location.city.trim() !== '' &&
        location.country.trim() !== ''
      );
    }
    if (step === 2) {
      return suppliers.length > 0;
    }
    return true;
  };

  return (
    <form className="bg-bg-secondary p-6 rounded border border-border-color max-w-lg">
      {/* Header with close button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-text-primary font-mono text-lg">Add Your Supply Chain</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl"
          >
            ×
          </button>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono
              ${step >= s ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary text-text-secondary'}`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Step 1: Company Info */}
      {step === 1 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Your Company</h3>
          <div className="mb-4">
            <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
              className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
                City
              </label>
              <input
                type="text"
                value={location.city}
                onChange={(e) =>
                  setLocation({ ...location, city: e.target.value })
                }
                placeholder="City"
                className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
                Country
              </label>
              <input
                type="text"
                value={location.country}
                onChange={(e) =>
                  setLocation({ ...location, country: e.target.value })
                }
                placeholder="Country"
                className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Add Suppliers */}
      {step === 2 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Add Suppliers</h3>
          {suppliers.length > 0 && (
            <div className="mb-4 p-2 bg-bg-tertiary rounded">
              <p className="text-text-secondary text-xs mb-2">
                Added suppliers:
              </p>
              {suppliers.map((s, i) => (
                <p key={i} className="text-text-primary text-sm">
                  {s.name}
                </p>
              ))}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
              Supplier Name
            </label>
            <input
              type="text"
              value={currentSupplier.name}
              onChange={(e) =>
                setCurrentSupplier({ ...currentSupplier, name: e.target.value })
              }
              placeholder="Supplier company name"
              className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
              Location
            </label>
            <input
              type="text"
              value={currentSupplier.location}
              onChange={(e) =>
                setCurrentSupplier({
                  ...currentSupplier,
                  location: e.target.value,
                })
              }
              placeholder="City, Country"
              className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
              Materials
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MATERIAL_OPTIONS.map((material) => (
                <label
                  key={material}
                  className="flex items-center gap-2 text-text-primary text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={currentSupplier.materials.includes(material)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCurrentSupplier({
                          ...currentSupplier,
                          materials: [...currentSupplier.materials, material],
                        });
                      } else {
                        setCurrentSupplier({
                          ...currentSupplier,
                          materials: currentSupplier.materials.filter(
                            (m) => m !== material
                          ),
                        });
                      }
                    }}
                    className="accent-accent-cyan"
                  />
                  {material}
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddSupplier}
            className="text-accent-cyan text-sm hover:underline"
          >
            + Add Supplier
          </button>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Review</h3>
          <div className="mb-4 p-3 bg-bg-tertiary rounded">
            <p className="text-text-secondary text-xs mb-1">Company</p>
            <p className="text-text-primary">{companyName}</p>
            <p className="text-text-secondary text-sm">
              {location.city}, {location.country}
            </p>
          </div>
          <div className="mb-4">
            <p className="text-text-secondary text-xs mb-2">
              Suppliers ({suppliers.length})
            </p>
            {suppliers.map((s, i) => (
              <div key={i} className="p-2 bg-bg-tertiary rounded mb-2">
                <p className="text-text-primary text-sm">{s.name}</p>
                <p className="text-text-secondary text-xs">{s.location}</p>
                <p className="text-accent-cyan text-xs">
                  {s.materials.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-4 py-2 text-text-secondary disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (step === 3) {
              handleSubmit();
            } else if (canAdvance()) {
              setStep((s) => Math.min(3, s + 1));
            }
          }}
          disabled={(!canAdvance() && step !== 3) || isSubmitting}
          className="px-4 py-2 bg-accent-cyan text-bg-primary rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : step === 3 ? 'Submit' : 'Next'}
        </button>
      </div>
    </form>
  );
}

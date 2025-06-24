import React, { useState } from 'react';

interface ComplaintFormData {
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  attachment?: File;
}

export function ComplaintForm() {
  const [formData, setFormData] = useState<ComplaintFormData>({
    category: '',
    description: '',
    priority: 'low'
  });

  const categories = [
    'Hardware Issue',
    'Software Problem',
    'Network Connection',
    'Account Access',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would make an API call to submit the complaint
    console.log('Submitting complaint:', formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, attachment: e.target.files[0] });
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Submit a Complaint</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Please describe your issue in detail..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Priority Level
          </label>
          <div className="mt-2 space-x-4">
            {['low', 'medium', 'high'].map((priority) => (
              <label key={priority} className="inline-flex items-center">
                <input
                  type="radio"
                  value={priority}
                  checked={formData.priority === priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="form-radio h-4 w-4 text-indigo-600"
                />
                <span className="ml-2 capitalize">{priority}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Attachment
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Submit Complaint
          </button>
        </div>
      </form>
    </div>
  );
}

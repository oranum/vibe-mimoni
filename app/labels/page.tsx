import { AuthRequired } from '@/components/auth/AuthRequired';
import { LabelList } from '@/components/transactions/LabelList';
import { Tag } from 'lucide-react';

export default function LabelsPage() {
  return (
    <AuthRequired>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Tag className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Labels</h1>
            </div>
            <p className="text-gray-600">
              Organize and manage your transaction labels. Create, edit, and delete labels to categorize your transactions effectively.
            </p>
          </div>

          {/* Labels Management */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Label List */}
            <div className="lg:col-span-2">
              <LabelList />
            </div>

            {/* Statistics Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Labels</span>
                    <span className="font-medium">Loading...</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Recurring Labels</span>
                    <span className="font-medium">Loading...</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Most Used</span>
                    <span className="font-medium">Loading...</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Tips</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Use recurring labels for expenses that happen regularly</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Choose distinct colors to quickly identify categories</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Labels with transactions can&apos;t be deleted - remove from transactions first</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>You can apply multiple labels to a single transaction</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthRequired>
  );
} 
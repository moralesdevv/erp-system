import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard | ERP System' };

export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to the ERP system.</p>
    </main>
  );
}

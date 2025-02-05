import React, { useState, useEffect } from 'react';
import { accountingService } from '../../services/AccountingService';
import { LineChart, BarChart, PieChart } from '@tremor/react';
import { formatCurrency } from '../../utils/formatters';

const AccountingDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const dates = getDateRange(selectedPeriod);
      
      // Load all data in parallel
      const [txns, balance, income, cash] = await Promise.all([
        accountingService.getTransactions({
          startDate: dates.start,
          endDate: dates.end
        }),
        accountingService.generateBalanceSheet(),
        accountingService.generateIncomeStatement(dates.start, dates.end),
        accountingService.generateCashFlow(dates.start, dates.end)
      ]);

      setTransactions(txns);
      setBalanceSheet(balance);
      setIncomeStatement(income);
      setCashFlow(cash);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = (period) => {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Financial Dashboard
        </h1>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700
            dark:text-white focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Revenue"
          value={incomeStatement?.revenue || 0}
          change={10} // Calculate actual change
          type="currency"
        />
        <MetricCard
          title="Net Income"
          value={incomeStatement?.netIncome || 0}
          change={5} // Calculate actual change
          type="currency"
        />
        <MetricCard
          title="Cash Balance"
          value={balanceSheet?.assets || 0}
          change={2} // Calculate actual change
          type="currency"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Revenue vs Expenses
          </h2>
          <LineChart
            data={transactions}
            index="timestamp"
            categories={['revenue', 'expenses']}
            colors={['emerald', 'red']}
            valueFormatter={formatCurrency}
            yAxisWidth={60}
          />
        </div>

        {/* Cash Flow */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Cash Flow
          </h2>
          <BarChart
            data={[cashFlow]}
            index="period"
            categories={['operating', 'investing', 'financing']}
            colors={['blue', 'amber', 'emerald']}
            valueFormatter={formatCurrency}
            yAxisWidth={60}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Recent Transactions
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.slice(0, 5).map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(transaction.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${transaction.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, change, type }) => {
  const formattedValue = type === 'currency' ? formatCurrency(value) : value;
  const changeColor = change >= 0 ? 'text-green-500' : 'text-red-500';
  const changeIcon = change >= 0 ? '↑' : '↓';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {formattedValue}
        </p>
        <span className={`ml-2 text-sm font-medium ${changeColor}`}>
          {changeIcon} {Math.abs(change)}%
        </span>
      </div>
    </div>
  );
};

export default AccountingDashboard;

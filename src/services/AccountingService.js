import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

class AccountingService {
  constructor() {
    this.transactionsRef = collection(db, 'transactions');
    this.accountsRef = collection(db, 'accounts');
    this.invoicesRef = collection(db, 'invoices');
    this.revenueRef = collection(db, 'revenue');
  }

  // Transaction Management
  async recordTransaction(data) {
    const transaction = {
      ...data,
      timestamp: new Date().toISOString(),
      status: 'pending',
      reconciled: false
    };

    try {
      const docRef = await addDoc(this.transactionsRef, transaction);
      await this.updateAccountBalance(data.accountId, data.amount, data.type);
      return docRef.id;
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw error;
    }
  }

  async getTransactions(filters = {}) {
    try {
      let q = this.transactionsRef;
      
      if (filters.accountId) {
        q = query(q, where('accountId', '==', filters.accountId));
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.startDate && filters.endDate) {
        q = query(q, 
          where('timestamp', '>=', filters.startDate),
          where('timestamp', '<=', filters.endDate)
        );
      }
      
      q = query(q, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  // Account Management
  async createAccount(data) {
    try {
      const account = {
        ...data,
        balance: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      const docRef = await addDoc(this.accountsRef, account);
      return docRef.id;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async updateAccountBalance(accountId, amount, type) {
    try {
      const accountRef = doc(this.accountsRef, accountId);
      const accountSnap = await getDoc(accountRef);
      
      if (!accountSnap.exists()) {
        throw new Error('Account not found');
      }

      const currentBalance = accountSnap.data().balance;
      const newBalance = type === 'credit' 
        ? currentBalance + amount 
        : currentBalance - amount;

      await updateDoc(accountRef, {
        balance: newBalance,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating account balance:', error);
      throw error;
    }
  }

  // Invoice Management
  async createInvoice(data) {
    try {
      const invoice = {
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString(),
        dueDate: this.calculateDueDate(data.terms)
      };
      
      const docRef = await addDoc(this.invoicesRef, invoice);
      return docRef.id;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async updateInvoiceStatus(invoiceId, status) {
    try {
      const invoiceRef = doc(this.invoicesRef, invoiceId);
      await updateDoc(invoiceRef, {
        status,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  // Revenue Tracking
  async recordRevenue(data) {
    try {
      const revenue = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      const docRef = await addDoc(this.revenueRef, revenue);
      return docRef.id;
    } catch (error) {
      console.error('Error recording revenue:', error);
      throw error;
    }
  }

  async getRevenueReport(startDate, endDate) {
    try {
      const q = query(
        this.revenueRef,
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting revenue report:', error);
      throw error;
    }
  }

  // Financial Reports
  async generateBalanceSheet(date = new Date()) {
    try {
      const accounts = await this.getAllAccounts();
      const assets = accounts.filter(a => a.type === 'asset');
      const liabilities = accounts.filter(a => a.type === 'liability');
      const equity = accounts.filter(a => a.type === 'equity');

      return {
        date: date.toISOString(),
        assets: this.calculateTotalByType(assets),
        liabilities: this.calculateTotalByType(liabilities),
        equity: this.calculateTotalByType(equity)
      };
    } catch (error) {
      console.error('Error generating balance sheet:', error);
      throw error;
    }
  }

  async generateIncomeStatement(startDate, endDate) {
    try {
      const revenue = await this.getRevenueReport(startDate, endDate);
      const expenses = await this.getExpenses(startDate, endDate);

      const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        startDate,
        endDate,
        revenue: totalRevenue,
        expenses: totalExpenses,
        netIncome: totalRevenue - totalExpenses
      };
    } catch (error) {
      console.error('Error generating income statement:', error);
      throw error;
    }
  }

  async generateCashFlow(startDate, endDate) {
    try {
      const transactions = await this.getTransactions({
        startDate,
        endDate
      });

      const operatingActivities = transactions.filter(t => t.category === 'operating');
      const investingActivities = transactions.filter(t => t.category === 'investing');
      const financingActivities = transactions.filter(t => t.category === 'financing');

      return {
        startDate,
        endDate,
        operatingCashFlow: this.calculateNetCashFlow(operatingActivities),
        investingCashFlow: this.calculateNetCashFlow(investingActivities),
        financingCashFlow: this.calculateNetCashFlow(financingActivities)
      };
    } catch (error) {
      console.error('Error generating cash flow:', error);
      throw error;
    }
  }

  // Helper Methods
  calculateDueDate(terms) {
    const date = new Date();
    date.setDate(date.getDate() + terms);
    return date.toISOString();
  }

  calculateTotalByType(accounts) {
    return accounts.reduce((total, account) => total + account.balance, 0);
  }

  calculateNetCashFlow(transactions) {
    return transactions.reduce((net, t) => {
      return t.type === 'credit' ? net + t.amount : net - t.amount;
    }, 0);
  }

  async getAllAccounts() {
    const snapshot = await getDocs(this.accountsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getExpenses(startDate, endDate) {
    const q = query(
      this.transactionsRef,
      where('type', '==', 'expense'),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

export const accountingService = new AccountingService();

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, Wallet } from '@/types/database.types';
import { AuthContext } from './AuthContext';

interface WalletContextType {
  wallet: Wallet | null;
  transactions: Transaction[];
  loading: boolean;
  rechargeWallet: (amount: number) => Promise<boolean>;
  deductFromWallet: (amount: number, description: string) => Promise<boolean>;
  updateWalletSettings: (settings: Partial<Wallet>) => Promise<boolean>;
  refreshWallet: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextType>({
  wallet: null,
  transactions: [],
  loading: true,
  rechargeWallet: async () => false,
  deductFromWallet: async () => false,
  updateWalletSettings: async () => false,
  refreshWallet: async () => {},
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useContext(AuthContext);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn && user) {
      fetchWallet();
      fetchTransactions();
    } else {
      setWallet(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [isLoggedIn, user]);

  const fetchWallet = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const rechargeWallet = async (amount: number): Promise<boolean> => {
    if (!user || !wallet) return false;

    try {
      const newBalance = Number(wallet.balance) + amount;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Create transaction record
      const { error: txnError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            date: new Date().toISOString().split('T')[0],
            type: 'recharge',
            amount: amount,
            status: 'success',
            description: 'Wallet recharge',
          },
        ]);

      if (txnError) throw txnError;

      await fetchWallet();
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Recharge Error:', error);
      return false;
    }
  };

  const deductFromWallet = async (amount: number, description: string): Promise<boolean> => {
    if (!user || !wallet) return false;

    try {
      const newBalance = Number(wallet.balance) - amount;

      if (newBalance < 0) {
        console.error('Insufficient balance');
        return false;
      }

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Create transaction record
      const { error: txnError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            date: new Date().toISOString().split('T')[0],
            type: 'debit',
            amount: amount,
            status: 'success',
            description: description,
          },
        ]);

      if (txnError) throw txnError;

      await fetchWallet();
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Deduct Error:', error);
      return false;
    }
  };

  const updateWalletSettings = async (settings: Partial<Wallet>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('wallets')
        .update(settings)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchWallet();
      return true;
    } catch (error) {
      console.error('Update Settings Error:', error);
      return false;
    }
  };

  const refreshWallet = async () => {
    await fetchWallet();
    await fetchTransactions();
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        transactions,
        loading,
        rechargeWallet,
        deductFromWallet,
        updateWalletSettings,
        refreshWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};


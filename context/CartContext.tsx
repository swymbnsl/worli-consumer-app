import React, { createContext, useState } from 'react';

interface CartItem {
  quantity: number;
  date: string;
}

interface CartContextType {
  cart: CartItem;
  setCart: (cart: CartItem) => void;
  updateQuantity: (quantity: number) => void;
  updateDate: (date: string) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType>({
  cart: { quantity: 1, date: new Date().toISOString().split('T')[0] },
  setCart: () => {},
  updateQuantity: () => {},
  updateDate: () => {},
  clearCart: () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem>({
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
  });

  const updateQuantity = (quantity: number) => {
    setCart({ ...cart, quantity });
  };

  const updateDate = (date: string) => {
    setCart({ ...cart, date });
  };

  const clearCart = () => {
    setCart({ quantity: 1, date: new Date().toISOString().split('T')[0] });
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        updateQuantity,
        updateDate,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
